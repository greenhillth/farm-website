<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import L from 'leaflet';
	import type { TileLayerOptions } from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { MediaQuery } from 'svelte/reactivity';

	import CONFIG from '$lib/config';
	import type { MetricId, MetricOption } from '$lib/config';
	import { findPaddockAt, geometryArea, type GeometryLike } from '$lib/geo';
	import { buildBaseLayer, buildTitleLayer, type TitleFeatureProperties } from '$lib/layers';
	import { normaliseFieldId } from '$lib/soil-status';

	import DetailSheet from './components/DetailSheet.svelte';
	import LocateButton from './components/LocateButton.svelte';
	import MapControls from './components/MapControls.svelte';
	import MetricChips from './components/MetricChips.svelte';
	import MetricLegend from './components/MetricLegend.svelte';
	import PaddockDetails from './components/PaddockDetails.svelte';
	import PaddockSearch from './components/PaddockSearch.svelte';
	import TitleDetails from './components/TitleDetails.svelte';
	import type { LocateFix, PaddockOption } from './components/types';
	import {
		NO_DATA_STYLE,
		OUTLINE_STYLE,
		buildPaddockTooltipHtml,
		computeLegendDetails,
		computeLegendPercents,
		computeMetricStats,
		derivePaddockIdentity,
		formatMetricValue,
		setLayerBaseStyle,
		updatePaddockTooltip,
		viridisColor,
		type BaseLayerConfig,
		type NormalisedSoilSample
	} from './helpers';
	import { indexLatestSamples, paddockSoilSummary } from './soil-status';

	type Panel =
		| { kind: 'layers' }
		| { kind: 'search' }
		| { kind: 'paddock'; id: number }
		| { kind: 'title'; title: TitleFeatureProperties };

	type PaddockEntry = {
		id: number | null;
		name: string;
		displayId: string;
		areaHa: number | null;
		geometry: GeometryLike;
		layer: L.Polygon;
	};

	const SELECTED_STYLE = { color: '#ffffff', weight: 3 };

	const metrics = CONFIG.soilMetrics;
	const metricsById = new Map<MetricId, MetricOption>(metrics.map((metric) => [metric.id, metric]));
	const defaultMetric: MetricId = metrics[0].id;

	const { url: imageryUrl, ...imageryOptions } = CONFIG.map;
	const baseLayers: BaseLayerConfig[] = [
		{
			id: 'imagery',
			label: 'Satellite',
			description: 'Aerial photos of the farm.',
			url: imageryUrl,
			options: imageryOptions as TileLayerOptions
		},
		{
			id: 'streets',
			label: 'Streets',
			description: 'OpenStreetMap roads and place names.',
			url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
			options: { attribution: '© OpenStreetMap contributors', maxZoom: 19 }
		}
	];

	const desktop = new MediaQuery('min-width: 48rem');

	function metricFromUrl(): MetricId {
		const id = page.url.searchParams.get('metric');
		return id !== null && metricsById.has(id) ? id : defaultMetric;
	}

	// Leaflet objects are never proxied: they live in $state.raw and are replaced, not mutated.
	let map = $state.raw<L.Map | null>(null);
	let paddockLayer = $state.raw<L.GeoJSON | null>(null);
	let titleLayer = $state.raw<L.GeoJSON | null>(null);
	let entries = $state.raw<PaddockEntry[]>([]);
	let soilByField = $state.raw(new Map<number, NormalisedSoilSample>());
	let userFix = $state.raw<LocateFix | null>(null);
	let panel = $state.raw<Panel | null>(null);

	let navOpen = $state(true);
	let showLabels = $state(true);
	let showBoundaries = $state(true);
	let showTitles = $state(false);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let titlesLoading = $state(false);
	let titlesError = $state<string | null>(null);
	let titlesCount = $state(0);
	let soilLoading = $state(false);
	let soilError = $state<string | null>(null);
	let activeBaseLayer = $state(baseLayers[0].id);
	let activeMetric = $state<MetricId>(metricFromUrl());
	let toast = $state<string | null>(null);

	let baseBounds: L.LatLngBounds | null = null;
	let centredOnFix = false;
	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	const tileCache = new Map<string, L.TileLayer>();
	let currentTiles: L.TileLayer | null = null;

	const metric = $derived(metricsById.get(activeMetric) ?? metrics[0]);
	const scaleReady = $derived(
		metric.id !== 'none' &&
			typeof metric.c_min === 'number' &&
			typeof metric.c_max === 'number' &&
			metric.c_max > metric.c_min
	);
	const byId = $derived(
		new Map(
			entries
				.filter((entry): entry is PaddockEntry & { id: number } => entry.id !== null)
				.map((entry) => [entry.id, entry])
		)
	);
	const identities = $derived(
		new Map(
			[...byId.values()].map((entry) => [
				entry.id,
				{ name: entry.name, displayId: entry.displayId }
			])
		)
	);
	const stats = $derived(computeMetricStats(metric, soilByField));
	const percents = $derived(computeLegendPercents(metric, stats, scaleReady));
	const details = $derived(computeLegendDetails(metric, stats, soilByField, identities));
	const colouredCount = $derived(
		[...byId.keys()].filter((id) => typeof soilByField.get(id)?.metrics[metric.id] === 'number')
			.length
	);
	const searchOptions: PaddockOption[] = $derived(
		[...byId.values()]
			.map(({ id, name, displayId }) => ({ id, name, displayId }))
			.sort((a, b) => a.name.localeCompare(b.name))
	);
	const selectedId = $derived(panel?.kind === 'paddock' ? panel.id : null);
	const selected = $derived(selectedId === null ? null : (byId.get(selectedId) ?? null));
	const selectedSample = $derived(selectedId === null ? undefined : soilByField.get(selectedId));
	// Hover labels are a desktop feature; on touch they get in the way of taps.
	const labelsHidden = $derived(!desktop.current || !showLabels || !showBoundaries);
	const statusLine = $derived(
		isLoading
			? 'Loading paddock boundaries…'
			: loadError
				? loadError
				: `Showing ${entries.length} mapped paddocks${titlesCount > 0 ? ` and ${titlesCount} title boundaries` : ''}.`
	);

	function writeQuery(changes: Record<string, string | null>) {
		const url = new URL(page.url);
		for (const [key, value] of Object.entries(changes)) {
			if (value === null) url.searchParams.delete(key);
			else url.searchParams.set(key, value);
		}
		replaceState(url, page.state);
	}

	function chooseMetric(id: MetricId) {
		activeMetric = id;
		writeQuery({ metric: id === defaultMetric ? null : id });
	}

	function selectPaddock(id: number, fit: boolean) {
		const entry = byId.get(id);
		if (!entry) return;
		panel = { kind: 'paddock', id };
		if (fit && map) {
			// Keep the paddock clear of the sheet: the card on the right on desktop; on phones the
			// sheet at the bottom and the chips at the top.
			const padding: L.FitBoundsOptions = desktop.current
				? { paddingTopLeft: [48, 48], paddingBottomRight: [480, 48] }
				: { paddingTopLeft: [24, 80], paddingBottomRight: [24, 280] };
			map.fitBounds(entry.layer.getBounds(), { ...padding, maxZoom: 17 });
		}
		writeQuery({ paddock: String(id) });
	}

	function selectTitle(title: TitleFeatureProperties) {
		if (panel?.kind === 'paddock') writeQuery({ paddock: null });
		panel = { kind: 'title', title };
	}

	function closePanel() {
		if (panel?.kind === 'paddock') writeQuery({ paddock: null });
		panel = null;
	}

	function showToast(message: string) {
		toast = message;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), 5000);
	}

	function resetView() {
		if (map && baseBounds?.isValid()) map.fitBounds(baseBounds, { padding: [24, 24] });
	}

	async function loadFarmData() {
		const target = map;
		if (!target) return;
		isLoading = true;
		loadError = null;
		try {
			const response = await fetch(CONFIG.backend.farm);
			if (!response.ok) throw new Error(`Request failed (${response.status})`);
			const geojson = await response.json();

			if (paddockLayer) target.removeLayer(paddockLayer);
			const layer = buildBaseLayer(geojson, L);
			const next: PaddockEntry[] = [];
			layer.eachLayer((child) => {
				const polygon = child as L.Polygon;
				const feature = polygon.feature;
				const identity = derivePaddockIdentity(
					(feature?.properties ?? {}) as Record<string, unknown>
				);
				const id =
					typeof identity.fieldId === 'number' && Number.isInteger(identity.fieldId)
						? identity.fieldId
						: null;
				const area = geometryArea(feature?.geometry);
				next.push({
					id,
					name: identity.name,
					displayId: identity.displayId,
					areaHa: area > 0 ? area / 10_000 : null,
					geometry: feature?.geometry,
					layer: polygon
				});
				polygon.on('click', () => {
					if (id !== null) selectPaddock(id, false);
				});
			});
			paddockLayer = layer;
			entries = next;

			const bounds = layer.getBounds();
			if (bounds.isValid()) baseBounds = bounds;

			// Fit either the linked paddock or the whole farm, not both: Leaflet ignores a second
			// fit while the first one's zoom animation is running.
			const fromUrl = normaliseFieldId(page.url.searchParams.get('paddock'));
			if (fromUrl !== null && byId.has(fromUrl)) selectPaddock(fromUrl, true);
			else if (baseBounds) target.fitBounds(baseBounds, { padding: [24, 24] });
		} catch (err) {
			console.error('Failed to load farm data', err);
			loadError = err instanceof Error ? err.message : 'Failed to load farm data.';
		} finally {
			isLoading = false;
		}
	}

	async function loadSoilTests() {
		if (soilLoading) return;
		soilLoading = true;
		soilError = null;
		try {
			const response = await fetch(CONFIG.backend.latestTest);
			if (!response.ok) throw new Error(`Request failed (${response.status})`);
			const payload = await response.json();
			if (!Array.isArray(payload)) throw new Error('Unexpected soil test response.');
			soilByField = indexLatestSamples(payload, metrics);
		} catch (err) {
			console.error('Failed to load soil test data', err);
			soilError = "Couldn't load soil tests. Check the connection and try again.";
			soilByField = new Map();
		} finally {
			soilLoading = false;
		}
	}

	async function loadTitleBoundaries() {
		const target = map;
		if (!target || titlesLoading) return;
		titlesLoading = true;
		titlesError = null;
		try {
			const response = await fetch(CONFIG.backend.titles);
			if (!response.ok) throw new Error(`Request failed (${response.status})`);
			const geojson = await response.json();
			titlesCount = Array.isArray(geojson?.features) ? geojson.features.length : 0;
			if (titleLayer) target.removeLayer(titleLayer);
			titleLayer = buildTitleLayer(geojson, L, selectTitle);
		} catch (err) {
			console.error('Failed to load title boundaries', err);
			titlesError = "Couldn't load title boundaries.";
		} finally {
			titlesLoading = false;
		}
	}

	function handleFix(fix: LocateFix) {
		userFix = fix;
		if (centredOnFix || !map) return;
		centredOnFix = true;
		map.setView([fix.lat, fix.lon], Math.max(map.getZoom(), 16));
		const hit = findPaddockAt(fix.lat, fix.lon, entries);
		if (hit?.id != null) selectPaddock(hit.id, false);
		else showToast("You're not inside a mapped paddock.");
	}

	function handleLocateStop() {
		centredOnFix = false;
		userFix = null;
	}

	function toggleLayer(target: L.Map, layer: L.Layer, visible: boolean) {
		if (visible && !target.hasLayer(layer)) layer.addTo(target);
		else if (!visible && target.hasLayer(layer)) target.removeLayer(layer);
	}

	function stylePaddock(entry: PaddockEntry, isSelected: boolean) {
		const sample = entry.id === null ? undefined : soilByField.get(entry.id);
		const value = sample?.metrics[metric.id];
		const hasValue = typeof value === 'number' && Number.isFinite(value);
		let style = metric.id === 'none' ? OUTLINE_STYLE : {};
		let valueText: string | null = null;

		if (scaleReady && hasValue) {
			style = {
				fillColor: viridisColor(value, metric.c_min as number, metric.c_max as number),
				fillOpacity: 0.88,
				color: '#0f172a',
				weight: 1
			};
			valueText = formatMetricValue(value, metric);
		} else if (scaleReady) {
			style = NO_DATA_STYLE;
			valueText = 'No data';
		} else if (hasValue) {
			valueText = formatMetricValue(value, metric);
		} else if (sample) {
			valueText = 'No data';
		}

		setLayerBaseStyle(entry.layer, isSelected ? { ...style, ...SELECTED_STYLE } : style);
		if (isSelected) entry.layer.bringToFront();
		updatePaddockTooltip(
			entry.layer,
			buildPaddockTooltipHtml({
				name: entry.name,
				displayId: entry.displayId,
				metric,
				valueText,
				sampleDate: sample?.sampleDate ?? null,
				colorable: scaleReady
			})
		);
	}

	const createMap: Attachment<HTMLDivElement> = (node) => {
		const instance = L.map(node, { zoomControl: false }).setView([-41.2, 146.4], 14);
		L.control.zoom({ position: 'bottomright' }).addTo(instance);
		const observer = new ResizeObserver(() => instance.invalidateSize());
		observer.observe(node);
		map = instance;
		untrack(() => {
			loadFarmData();
			loadSoilTests();
			loadTitleBoundaries();
		});
		return () => {
			observer.disconnect();
			clearTimeout(toastTimer);
			tileCache.clear();
			currentTiles = null;
			// Leaflet 1.9 ends a zoom animation from an uncancelled 250ms timeout; leaving the page
			// mid-zoom would run it on the removed map and throw. Clearing the flag makes it a no-op.
			(instance as unknown as { _animatingZoom: boolean })._animatingZoom = false;
			instance.remove();
			map = null;
		};
	};

	$effect(() => {
		const target = map;
		const config = baseLayers.find((layer) => layer.id === activeBaseLayer);
		if (!target || !config) return;
		untrack(() => {
			if (currentTiles) target.removeLayer(currentTiles);
			let tiles = tileCache.get(config.id);
			if (!tiles) {
				tiles = L.tileLayer(config.url, config.options);
				tileCache.set(config.id, tiles);
			}
			tiles.addTo(target);
			currentTiles = tiles;
		});
	});

	$effect(() => {
		if (map && paddockLayer) toggleLayer(map, paddockLayer, showBoundaries);
	});

	$effect(() => {
		if (map && titleLayer) toggleLayer(map, titleLayer, showTitles);
	});

	// Colour, highlight and label every paddock whenever the metric, data or selection changes.
	$effect(() => {
		for (const entry of entries) stylePaddock(entry, entry.id !== null && entry.id === selectedId);
	});

	$effect(() => {
		const target = map;
		const fix = userFix;
		if (!target || !fix) return;
		const marker = L.layerGroup([
			L.circle([fix.lat, fix.lon], {
				radius: fix.accuracy,
				color: '#78bdf0',
				weight: 1,
				fillOpacity: 0.15,
				interactive: false
			}),
			L.circleMarker([fix.lat, fix.lon], {
				radius: 7,
				color: '#ffffff',
				weight: 2,
				fillColor: '#78bdf0',
				fillOpacity: 1,
				interactive: false
			})
		]).addTo(target);
		return () => {
			marker.remove();
		};
	});
</script>

<svelte:head>
	<title>Farm map</title>
</svelte:head>

{#snippet legend(compact: boolean)}
	<MetricLegend
		{metric}
		{stats}
		{percents}
		{details}
		{colouredCount}
		{scaleReady}
		loading={soilLoading}
		error={soilError}
		onretry={loadSoilTests}
		{compact}
	/>
{/snippet}

{#snippet controls(labelToggle: boolean)}
	<MapControls
		{baseLayers}
		{activeBaseLayer}
		onbasechange={(id) => (activeBaseLayer = id)}
		bind:showBoundaries
		bind:showLabels
		bind:showTitles
		showLabelToggle={labelToggle}
		titles={{ loading: titlesLoading, error: titlesError, count: titlesCount }}
		onretrytitles={loadTitleBoundaries}
		onreset={resetView}
	/>
{/snippet}

<div class="map-shell relative flex bg-bg">
	<h1 class="sr-only">Farm map</h1>

	{#if desktop.current}
		<aside
			inert={!navOpen}
			class={[
				'relative h-full shrink-0 overflow-hidden border-r border-border bg-panel transition-[width] duration-300 ease-in-out motion-reduce:transition-none',
				navOpen ? 'w-80' : 'w-0'
			]}
		>
			<div
				data-tooltip-boundary
				class="flex h-full w-80 flex-col gap-6 overflow-y-auto px-5 py-5 text-sm text-muted"
			>
				<div class="flex items-center gap-3">
					<h2 class="flex-1 text-lg font-semibold text-text">Map controls</h2>
					<button
						type="button"
						onclick={() => (navOpen = false)}
						aria-label="Hide map controls"
						class="inline-flex size-11 items-center justify-center rounded-lg border border-border text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							class="size-5"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15.75 19.5 8.25 12l7.5-7.5"
							/>
						</svg>
					</button>
				</div>
				<PaddockSearch paddocks={searchOptions} onselect={(id) => selectPaddock(id, true)} />
				<section class="space-y-3" aria-labelledby="metric-heading">
					<h3 id="metric-heading" class="text-sm font-semibold text-text">Soil metric</h3>
					<MetricChips {metrics} active={activeMetric} onchange={chooseMetric} layout="wrap" />
					{@render legend(false)}
				</section>
				{@render controls(true)}
				<p class="rounded-lg border border-border bg-white/5 px-4 py-3 text-xs">{statusLine}</p>
			</div>
		</aside>
	{/if}

	<div class={['relative min-w-0 flex-1', labelsHidden && 'labels-hidden']}>
		<!-- Leaflet adds its own classes to this element, so its class attribute must never change:
		     Svelte would overwrite them and the map would lose its layout. -->
		<div {@attach createMap} class="map-canvas absolute inset-0"></div>

		{#if desktop.current}
			{#if !navOpen}
				<button
					type="button"
					onclick={() => (navOpen = true)}
					class="absolute top-3 left-3 z-[1050] inline-flex min-h-11 items-center rounded-lg border border-border bg-panel/95 px-4 text-sm text-text shadow-lg hover:bg-panel"
				>
					Show map controls
				</button>
			{/if}
			{#if metric.id !== 'none'}
				<div
					class={[
						'pointer-events-none absolute left-3 z-[1040] max-w-xs rounded-xl border border-border bg-panel/95 px-4 py-3 text-sm shadow-lg',
						navOpen ? 'top-3' : 'top-16'
					]}
				>
					<p class="font-semibold text-text">{metric.label}</p>
					<p class="mt-1 text-muted">{metric.description}</p>
					<p class="mt-1 text-muted">
						Optimal range {metric.range_optimal[0]} to {metric.range_optimal[1]}{metric.unit
							? ` ${metric.unit}`
							: ''}
					</p>
				</div>
			{/if}
		{:else}
			<div class="absolute inset-x-0 top-0 z-[1050] flex items-center gap-2 px-3 pt-3">
				<div class="min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto">
					<MetricChips {metrics} active={activeMetric} onchange={chooseMetric} layout="row" />
				</div>
				<button
					type="button"
					aria-label="Find a paddock"
					onclick={() => (panel = { kind: 'search' })}
					class="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-panel/95 text-text shadow-lg"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						class="size-5"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
						/>
					</svg>
				</button>
				<button
					type="button"
					onclick={() => (panel = { kind: 'layers' })}
					class="inline-flex min-h-11 shrink-0 items-center rounded-full border border-border bg-panel/95 px-4 text-sm text-text shadow-lg"
				>
					Layers
				</button>
			</div>
			{#if metric.id !== 'none' && panel === null}
				<div class="absolute right-16 bottom-3 left-3 z-[1050]">{@render legend(true)}</div>
			{/if}
		{/if}

		<div class="absolute right-2.5 bottom-24 z-[1050]">
			<LocateButton onposition={handleFix} onerror={showToast} onstop={handleLocateStop} />
		</div>

		<div
			role="status"
			aria-live="polite"
			class="pointer-events-none absolute inset-x-3 top-20 z-[1150] flex justify-center md:top-4"
		>
			{#if toast}
				<p
					class="rounded-lg border border-border bg-panel/95 px-4 py-3 text-sm text-text shadow-lg"
				>
					{toast}
				</p>
			{/if}
		</div>

		{#if loadError}
			<div class="map-status">
				<h2 class="text-lg font-semibold text-text">We couldn't load the farm map</h2>
				<p class="mt-1 text-sm text-muted">{loadError}</p>
				<button
					type="button"
					onclick={() => {
						loadFarmData();
						loadSoilTests();
					}}
					class="mt-3 inline-flex min-h-11 items-center rounded-lg border border-border bg-white/10 px-4 text-sm text-text hover:bg-white/20"
				>
					Try again
				</button>
			</div>
		{:else if isLoading}
			<div class="map-status" aria-live="polite">
				<p class="text-sm text-muted">Preparing paddock boundaries…</p>
			</div>
		{/if}

		{#if panel?.kind === 'paddock' && selected}
			<DetailSheet
				title={selected.name}
				subtitle={`Paddock ${selected.displayId}`}
				onclose={closePanel}
			>
				<PaddockDetails
					fieldId={panel.id}
					areaHa={selected.areaHa}
					sampleDate={selectedSample?.sampleDate ?? null}
					sampleName={selectedSample?.sampleName ?? null}
					rows={paddockSoilSummary(selectedSample, metrics)}
					hasSample={selectedSample !== undefined}
					{soilLoading}
					{soilError}
					onretry={loadSoilTests}
				/>
			</DetailSheet>
		{:else if panel?.kind === 'title'}
			<DetailSheet
				title={panel.title.address || 'Untitled property'}
				subtitle="Property title"
				onclose={closePanel}
			>
				<TitleDetails title={panel.title} />
			</DetailSheet>
		{:else if panel?.kind === 'layers' && !desktop.current}
			<DetailSheet title="Layers" onclose={closePanel}>
				<div class="space-y-6">
					<PaddockSearch paddocks={searchOptions} onselect={(id) => selectPaddock(id, true)} />
					{@render controls(false)}
					<p class="text-xs text-muted">{statusLine}</p>
				</div>
			</DetailSheet>
		{:else if panel?.kind === 'search' && !desktop.current}
			<DetailSheet title="Find a paddock" onclose={closePanel}>
				<PaddockSearch paddocks={searchOptions} onselect={(id) => selectPaddock(id, true)} />
			</DetailSheet>
		{/if}
	</div>
</div>

<style>
	.map-shell {
		height: calc(100dvh - var(--shell-top) - var(--shell-bottom));
		min-height: 420px;
	}

	.map-status {
		position: absolute;
		inset: auto 1.5rem 1.5rem 1.5rem;
		max-width: 22rem;
		margin: 0 auto;
		border-radius: 0.75rem;
		border: 1px solid rgb(var(--border));
		background: rgb(var(--panel) / 0.95);
		padding: 1.5rem;
		text-align: center;
		z-index: 900;
	}

	:global(.labels-hidden .map-canvas .leaflet-tooltip) {
		display: none !important;
	}

	:global(.paddock-tooltip),
	:global(.title-tooltip) {
		color: #f9fafb;
		border-radius: 0.5rem;
		padding: 0.35rem 0.55rem;
		box-shadow: 0 4px 12px rgba(15, 23, 42, 0.35);
		font-size: 0.875rem;
	}

	:global(.paddock-tooltip) {
		background-color: rgba(17, 24, 39, 0.94);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	:global(.title-tooltip) {
		background-color: rgba(30, 15, 60, 0.94);
		border: 1px solid rgba(250, 204, 21, 0.35);
	}

	:global(.paddock-tooltip strong),
	:global(.title-tooltip strong) {
		font-weight: 600;
		display: block;
		margin-bottom: 0.1rem;
	}

	:global(.paddock-tooltip div:last-child),
	:global(.title-tooltip div:last-child) {
		font-size: 0.75rem;
		opacity: 0.85;
	}
</style>
