<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import L from 'leaflet'; // removed unused layerGroup
	import type { TileLayerOptions } from 'leaflet';
	import { onDestroy, onMount } from 'svelte';

	import CONFIG from '$lib/config';
	import type { MetricId, MetricOption } from '$lib/config';
	import { buildBaseLayer } from '$lib/layers';

	import 'leaflet/dist/leaflet.css';

	type QuickLink = { href: string; label: string };

	const quickLinks: QuickLink[] = [
		{ href: '/', label: 'Back to home' },
		{ href: '/paddocks', label: 'Paddock manager' },
		{ href: '/soiltests', label: 'Soil tests' },
		{ href: '/weather', label: 'Weather station' }
	];

	type BaseLayerConfig = {
		id: string;
		label: string;
		description: string;
		url: string;
		options: TileLayerOptions;
	};

	const metricOptions = CONFIG.soilMetrics;
	if (metricOptions.length === 0) {
		throw new Error('CONFIG.soilMetrics is empty; need at least one metric.');
	}

	const metricsById = new Map<MetricId, MetricOption>(metricOptions.map((m) => [m.id, m]));

	// Default to first metric id (type-safe)
	const defaultMetric: MetricId = metricOptions[0].id;

	const { url: imageryUrl, ...imageryOptions } = CONFIG.tiles;
	const baseLayerConfigs: BaseLayerConfig[] = [
		{
			id: 'imagery',
			label: 'Satellite',
			description: 'High-resolution aerial imagery for situational awareness.',
			url: imageryUrl,
			options: imageryOptions as TileLayerOptions
		},
		{
			id: 'streets',
			label: 'Streets',
			description: 'OpenStreetMap base map with roads and place labels.',
			url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
			options: {
				attribution: '© OpenStreetMap contributors',
				maxZoom: 19
			}
		}
	];

	let mapContainer: HTMLDivElement;
	let navPanel: HTMLElement;

	let map: L.Map | null = null;
	let baseTileLayer: L.TileLayer | null = null;
	let paddockLayer: L.GeoJSON | null = null;
	let baseBounds: L.LatLngBounds | null = null;
	let farmData: any = null;

	let navOpen = true;
	let showLabels = true;
	let showBoundaries = true;
	let isLoading = true;
	let loadError: string | null = null;

	let activeBaseLayer: string = baseLayerConfigs[0]?.id ?? 'imagery';
	let activeMetric: MetricId = defaultMetric;

	// Derived active metric object + message (no O(n) lookups on render)
	$: activeMetricObj = metricsById.get(activeMetric)!; // safe due to guards below

	let activeBase: BaseLayerConfig | undefined = baseLayerConfigs.find(
		(layer) => layer.id === activeBaseLayer
	);
	let paddockCount = 0;

	const tileLayerCache = new Map<string, L.TileLayer>();

	let resizeObserver: ResizeObserver | null = null;
	let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

	function scheduleInvalidate(delay = 240) {
		if (!map) return;
		if (invalidateTimer) clearTimeout(invalidateTimer);
		invalidateTimer = setTimeout(() => {
			map?.invalidateSize();
		}, delay);
	}

	function applyBaseLayer(id: string) {
		if (!map) return;
		const config = baseLayerConfigs.find((layer) => layer.id === id);
		if (!config) return;

		if (baseTileLayer && map.hasLayer(baseTileLayer)) {
			map.removeLayer(baseTileLayer);
		}

		let layer = tileLayerCache.get(id);
		if (!layer) {
			layer = L.tileLayer(config.url, config.options);
			tileLayerCache.set(id, layer);
		}

		layer.addTo(map);
		baseTileLayer = layer;
	}

	async function loadFarmData() {
		if (!map) return;

		isLoading = true;
		loadError = null;

		try {
			const response = await fetch(CONFIG.data.farm);
			if (!response.ok) {
				throw new Error(`Request failed (${response.status})`);
			}

			const geojson = await response.json();
			farmData = geojson;
			paddockCount = Array.isArray(geojson?.features) ? geojson.features.length : 0;

			if (paddockLayer && map.hasLayer(paddockLayer)) {
				map.removeLayer(paddockLayer);
			}

			paddockLayer = buildBaseLayer(geojson, L);
			if (showBoundaries) {
				paddockLayer.addTo(map);
			}

			const bounds = paddockLayer.getBounds?.();
			if (bounds?.isValid()) {
				baseBounds = bounds;
				map.fitBounds(bounds, { padding: [24, 24] });
			}
		} catch (err) {
			console.error('Failed to load farm data', err);
			loadError = err instanceof Error ? err.message : 'Failed to load farm data.';
		} finally {
			isLoading = false;
			scheduleInvalidate(120);
		}
	}

	function resetView() {
		if (map && baseBounds && baseBounds.isValid()) {
			map.fitBounds(baseBounds, { padding: [24, 24] });
		}
	}

	function collapseNav() {
		navOpen = false;
		scheduleInvalidate();
	}

	function expandNav() {
		navOpen = true;
		scheduleInvalidate();
	}

	function toggleNav() {
		if (navOpen) {
			collapseNav();
		} else {
			expandNav();
		}
	}

	function handleNavTransition(event: TransitionEvent) {
		if (event.target === navPanel) {
			scheduleInvalidate(16);
		}
	}

	function selectBaseLayer(id: string) {
		if (id === activeBaseLayer) return;
		activeBaseLayer = id;
		applyBaseLayer(id);
	}

	function chooseMetric(id: MetricId) {
		if (id === activeMetric) return;
		activeMetric = id;

		// Clone current URL and update ?metric
		const url = new URL($page.url);
		if (id === defaultMetric) {
			url.searchParams.delete('metric');
		} else {
			url.searchParams.set('metric', id);
		}

		goto(`${url.pathname}${url.search}`, {
			keepFocus: true, // fixed casing
			replaceState: true,
			noScroll: true // fixed casing
		});
	}

	function retryLoad() {
		loadFarmData();
	}

	onMount(() => {
		map = L.map(mapContainer, {
			zoomControl: false
		});
		map.setView([-41.2, 146.4], 14);
		L.control.zoom({ position: 'bottomright' }).addTo(map);

		applyBaseLayer(activeBaseLayer);
		loadFarmData();

		resizeObserver = new ResizeObserver(() => {
			map?.invalidateSize();
		});
		resizeObserver.observe(mapContainer);
		scheduleInvalidate(80);
	});

	onDestroy(() => {
		if (invalidateTimer) clearTimeout(invalidateTimer);
		resizeObserver?.disconnect();
		tileLayerCache.forEach((layer) => layer.remove());
		tileLayerCache.clear();
		map?.remove();
		map = null;
	});

	$: activeBase = baseLayerConfigs.find((layer) => layer.id === activeBaseLayer);

	$: if (map && paddockLayer) {
		if (showBoundaries) {
			if (!map.hasLayer(paddockLayer)) {
				paddockLayer.addTo(map);
			}
		} else if (map.hasLayer(paddockLayer)) {
			map.removeLayer(paddockLayer);
		}
	}

	$: if (!showBoundaries) {
		showLabels = false;
	}

	// --- URL -> activeMetric sync (type-safe via metricsById) ---
	let metricFromQuery: MetricId | null = null;

	$: metricFromQuery = $page.url.searchParams.get('metric') as MetricId | null;

	$: {
		if (metricFromQuery && metricsById.has(metricFromQuery)) {
			if (metricFromQuery !== activeMetric) {
				activeMetric = metricFromQuery;
			}
		} else if (activeMetric !== defaultMetric) {
			activeMetric = defaultMetric;
		}
	}
</script>

<div
	class="map-shell relative flex h-dvh min-h-[540px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
>
	<aside
		bind:this={navPanel}
		class={`map-sidebar relative flex h-full shrink-0 overflow-visible transition-[width] duration-300 ease-in-out ${navOpen ? 'w-80 max-w-full' : 'w-0'}`}
		on:transitionend={handleNavTransition}
	>
		<div
			class={`sidebar-panel bg-panel/95 text-muted flex h-full w-full flex-col gap-6 border-r border-white/10 text-sm transition-[padding,opacity] duration-300 ease-in-out ${navOpen ? 'pointer-events-auto overflow-y-auto px-6 py-6 opacity-100' : 'pointer-events-none overflow-hidden px-0 py-0 opacity-0'}`}
			aria-hidden={!navOpen}
		>
			<header class="flex items-start gap-4 text-white">
				<div class="flex items-center gap-3">
					<img
						src="/img/logo.png"
						alt="Greenhill Bros logo"
						class="h-10 w-10 rounded-md border border-white/10 bg-white/10 p-1"
					/>
					<div class="leading-tight">
						<p class="text-muted/70 text-xs tracking-wider uppercase">Greenhill Bros Farm</p>
						<h1 class="text-lg font-semibold">Interactive map</h1>
					</div>
				</div>
				<div class="ml-auto">
					<button
						class="border-border/80 text-muted focus:ring-accent/40 rounded-md border bg-white/5 p-2 hover:bg-white/10 hover:text-white focus:ring-2 focus:outline-none"
						on:click={() => toggleNav()}
						aria-label="Collapse sidebar"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-4"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15.75 19.5 8.25 12l7.5-7.5"
							/>
						</svg>
					</button>
				</div>
			</header>

			<nav id="map-controls" aria-label="Map controls" class="space-y-8">
				<section class="space-y-3">
					<div>
						<h2 class="text-muted/70 text-xs font-semibold tracking-wider uppercase">Base map</h2>
						<p class="text-muted/60 mt-1 text-xs">
							Choose the imagery used beneath the farm overlays.
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each baseLayerConfigs as layer}
							<button
								type="button"
								class={`focus-visible:ring-accent/40 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition focus:outline-none focus-visible:ring-2 ${activeBaseLayer === layer.id ? 'border-accent/60 bg-accent/20 text-white shadow' : 'text-muted border-white/10 bg-white/5 hover:border-white/20 hover:text-white'}`}
								aria-pressed={activeBaseLayer === layer.id}
								on:click={() => selectBaseLayer(layer.id)}
							>
								{layer.label}
							</button>
						{/each}
					</div>
					{#if activeBase}
						<p class="text-muted/70 text-xs">{activeBase.description}</p>
					{/if}
				</section>

				<section class="space-y-3">
					<div>
						<h2 class="text-muted/70 text-xs font-semibold tracking-wider uppercase">Overlays</h2>
						<p class="text-muted/60 mt-1 text-xs">
							Switch between soil metrics as datasets become available.
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each metricOptions as metric}
							<button
								type="button"
								class={`focus-visible:ring-accent/40 rounded-md border px-3 py-2 text-sm transition focus:outline-none focus-visible:ring-2 ${activeMetric === metric.id ? 'border-accent/60 bg-accent/20 text-white shadow' : 'text-muted border-white/10 bg-white/5 hover:border-white/20 hover:text-white'}`}
								aria-pressed={activeMetric === metric.id}
								on:click={() => chooseMetric(metric.id)}
							>
								{metric.label}
							</button>
						{/each}
					</div>
					<p class="text-muted/60 text-xs">
						{#if activeMetric === defaultMetric}
							Choose a dataset to overlay paddock performance when it is published.
						{:else}
							{activeMetricObj.label} overlay coming soon.
						{/if}
					</p>
				</section>

				<section class="space-y-3">
					<div>
						<h2 class="text-muted/70 text-xs font-semibold tracking-wider uppercase">Display</h2>
						<p class="text-muted/60 mt-1 text-xs">
							Toggle contextual information on top of the base map.
						</p>
					</div>
					<div class="space-y-2">
						<label
							class="text-muted focus-within:border-accent/60 flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:border-white/20 hover:text-white"
						>
							<input type="checkbox" class="accent-accent" bind:checked={showBoundaries} />
							<span>Show field boundaries</span>
						</label>
						<label
							class="text-muted focus-within:border-accent/60 flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:border-white/20 hover:text-white"
						>
							<input
								type="checkbox"
								class="accent-accent disabled:opacity-50"
								bind:checked={showLabels}
								disabled={!showBoundaries}
							/>
							<span>Show paddock labels</span>
						</label>
					</div>
					<button
						type="button"
						class="text-muted focus-visible:ring-accent/40 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:border-white/20 hover:text-white focus:outline-none focus-visible:ring-2"
						on:click={resetView}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="h-4 w-4"
						>
							<path
								fill-rule="evenodd"
								d="M10 3.5a6.5 6.5 0 1 0 6.03 9h-1.7a4.75 4.75 0 1 1 0-4h1.7A6.5 6.5 0 0 0 10 3.5Zm.75.75V2a.75.75 0 0 0-1.5 0v2.25a.75.75 0 0 0 1.5 0ZM4.28 5.53a.75.75 0 0 0 0-1.06l-1.59-1.6a.75.75 0 1 0-1.06 1.07l1.59 1.59a.75.75 0 0 0 1.06 0Zm-1.59 9.6 1.59 1.59a.75.75 0 0 1-1.06 1.06l-1.59-1.58a.75.75 0 1 1 1.06-1.06ZM16.5 5.75a.75.75 0 0 1 1.5 0v2.25a.75.75 0 0 1-1.5 0V5.75Zm.53 8.47.8.8a.75.75 0 0 1-1.06 1.06l-.8-.8a.75.75 0 0 1 1.06-1.06Z"
								clip-rule="evenodd"
							/>
						</svg>
						Reset view
					</button>
				</section>

				<section
					class="text-muted/70 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-xs"
				>
					{#if isLoading}
						<p>Loading paddock boundaries…</p>
					{:else if loadError}
						<p class="text-red-200">{loadError}</p>
					{:else}
						<p>
							{#if paddockCount > 0}
								Showing {paddockCount} mapped paddocks.
							{:else}
								Farm boundaries ready to explore.
							{/if}
						</p>
					{/if}
				</section>
			</nav>
			<nav aria-label="Quick links" class="space-y-1 text-sm">
				{#each quickLinks as link}
					<a
						href={link.href}
						class="text-muted flex items-center justify-between rounded-md px-3 py-2 transition hover:bg-white/5 hover:text-white"
					>
						<span>{link.label}</span>
						<span aria-hidden="true" class="text-muted/70 text-xs">→</span>
					</a>
				{/each}
			</nav>
		</div>
	</aside>

	<main class="map-main bg-bg relative min-w-0 flex-1">
		<div
			bind:this={mapContainer}
			class="map-canvas absolute inset-0"
			class:labels-hidden={!showLabels}
		></div>

		{#if !navOpen}
			<button
				class="border-border/80 bg-panel/90 text-muted hover:bg-panel focus:ring-accent/40 absolute top-3 left-4 z-[1200] rounded-md border px-3 py-2 text-sm backdrop-blur transition hover:text-white focus:ring-2 focus:outline-none"
				on:click={() => toggleNav()}
			>
				Open controls
			</button>
		{/if}

		<!-- Floating info panel: use activeMetricObj and fix class interpolation -->
		{#if activeMetricObj.id !== defaultMetric}
			<div
				class={`border-border/80 bg-panel/80 text-muted pointer-events-none absolute ${navOpen ? 'top-3' : 'top-15'} left-4 z-[1100] max-w-xs rounded-xl border px-4 py-3 text-xs shadow-lg backdrop-blur`}
			>
				<div class="text-sm font-semibold text-white">{activeMetricObj.label}</div>
				<p class="mt-1 leading-relaxed">{activeMetricObj.description}</p>
			</div>
		{/if}

		{#if loadError}
			<div class="map-status">
				<div class="space-y-3">
					<h2 class="text-base font-semibold text-white">We couldn't load the farm map</h2>
					<p class="text-muted text-sm">{loadError}</p>
					<div class="flex justify-center">
						<button
							type="button"
							class="focus-visible:ring-accent/40 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition hover:border-white/40 focus:outline-none focus-visible:ring-2"
							on:click={retryLoad}
						>
							Try again
						</button>
					</div>
				</div>
			</div>
		{:else if isLoading}
			<div class="map-status" aria-live="polite">
				<p class="text-muted text-sm">Preparing paddock boundaries…</p>
			</div>
		{/if}

		<a
			href="/"
			class="map-home bg-panel/95 focus-visible:ring-accent/40 absolute top-4 right-4 z-[1000] inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2"
			aria-label="Back to home"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="currentColor"
				class="h-5 w-5"
			>
				<path d="M12 3.172 3 10.5V21h6v-6h6v6h6V10.5L12 3.172z" />
			</svg>
			<span class="hidden sm:inline">Home</span>
		</a>
	</main>
</div>

<style>
	.map-status {
		position: absolute;
		inset: auto 1.5rem 1.5rem 1.5rem;
		max-width: 22rem;
		margin: 0 auto;
		border-radius: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(15, 23, 34, 0.92);
		padding: 1.5rem;
		text-align: center;
		backdrop-filter: blur(12px);
		z-index: 900;
		box-shadow: 0 18px 40px rgba(8, 11, 19, 0.55);
	}

	:global(.map-canvas.labels-hidden .leaflet-tooltip) {
		display: none !important;
	}

	:global(.paddock-tooltip) {
		background-color: rgba(17, 24, 39, 0.94);
		color: #f9fafb;
		border-radius: 0.375rem;
		padding: 0.35rem 0.55rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 4px 12px rgba(15, 23, 42, 0.35);
	}

	:global(.paddock-tooltip strong) {
		font-weight: 600;
		display: block;
		margin-bottom: 0.1rem;
	}

	:global(.paddock-tooltip div:last-child) {
		font-size: 0.75rem;
		opacity: 0.85;
	}
</style>
