<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import L from 'leaflet'; // removed unused layerGroup
	import type { PathOptions, TileLayerOptions } from 'leaflet';
	import { onDestroy, onMount } from 'svelte';

import CONFIG from '$lib/config';
import type { MetricId, MetricOption } from '$lib/config';
import { DEFAULT_PADDOCK_STYLE, buildBaseLayer } from '$lib/layers';

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

	type SoilTestRecord = Record<string, unknown>;

	type NormalisedSoilSample = {
		fieldId: string;
		sampleDate: string | null;
		sampleDateMs: number | null;
		sampleName: string | null;
		metrics: Partial<Record<MetricId, number>>;
		raw: SoilTestRecord;
	};

	type MetricStats = {
		min: number;
		max: number;
		mean: number;
		median: number;
		count: number;
	};

	const VIRIDIS_STOPS = ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'];
	const VIRIDIS_GRADIENT = `linear-gradient(to right, ${VIRIDIS_STOPS.map((color, index) => {
		const pct = (100 * index) / (VIRIDIS_STOPS.length - 1);
		return `${color} ${pct.toFixed(1)}%`;
	}).join(', ')})`;
	const NO_DATA_STYLE = {
		fillColor: '#1f2937',
		fillOpacity: 0.25,
		color: '#2f3748',
		weight: 1
	};

	const METRIC_VALUE_KEYS: Record<MetricId, string[]> = {
		none: [],
		OM: ['OM', 'om', 'OrganicMatter', 'organic_matter', 'total_C', 'Total_C'],
		P: ['P', 'p', 'Phosphorus'],
		K: ['K', 'k', 'Potassium'],
		M: ['Mg', 'mg', 'Magnesium', 'magnesium'],
		Ca: ['Ca', 'ca', 'Calcium', 'calcium'],
		pH: ['ph_water', 'pH', 'ph', 'ph_H2O', 'ph_h2o']
	};

	const FIELD_ID_KEYS = [
		'fieldID',
		'fieldId',
		'FIELDID',
		'FIELD_ID',
		'ADSFLDID',
		'adsfldid',
		'field_id',
		'id_field',
		'paddockId',
		'paddock_id'
	];

	function normaliseFieldId(value: unknown): string {
		if (value === null || value === undefined) return '';
		const text = String(value).trim();
		return text;
	}

	function extractFieldId(record: SoilTestRecord): string {
		for (const key of FIELD_ID_KEYS) {
			if (key in record) {
				const candidate = normaliseFieldId(record[key]);
				if (candidate) return candidate;
			}
		}
		return '';
	}

	function toNumber(value: unknown): number | null {
		if (value === null || value === undefined) return null;
		const candidate = typeof value === 'string' ? value.trim() : value;
		if (candidate === '') return null;
		const num = Number(candidate);
		return Number.isFinite(num) ? num : null;
	}

	function pickMetricValue(record: SoilTestRecord, metricId: MetricId): number | null {
		const keys = METRIC_VALUE_KEYS[metricId] ?? [];
		for (const key of keys) {
			if (!(key in record)) continue;
			const candidate = toNumber(record[key]);
			if (candidate !== null) return candidate;
		}
		return null;
	}

	function parseDateMs(value: unknown): number | null {
		if (!value) return null;
		const timestamp = Date.parse(String(value));
		return Number.isNaN(timestamp) ? null : timestamp;
	}

	function hexToRgb(hex: string): [number, number, number] {
		const clean = hex.replace('#', '');
		const int = parseInt(clean, 16);
		return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
	}

	function rgbToHex([r, g, b]: [number, number, number]): string {
		return `#${[r, g, b]
			.map((value) => Math.max(0, Math.min(255, value)))
			.map((value) => value.toString(16).padStart(2, '0'))
			.join('')}`;
	}

	function lerp(a: number, b: number, t: number): number {
		return a + (b - a) * t;
	}

	function lerpColor(a: string, b: string, t: number): string {
		const [ar, ag, ab] = hexToRgb(a);
		const [br, bg, bb] = hexToRgb(b);
		return rgbToHex([
			Math.round(lerp(ar, br, t)),
			Math.round(lerp(ag, bg, t)),
			Math.round(lerp(ab, bb, t))
		]);
	}

	function clamp(value: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, value));
	}

	function viridisColor(value: number, min: number, max: number): string {
		if (Number.isNaN(value) || !Number.isFinite(value)) {
			return VIRIDIS_STOPS[0];
		}
		const span = max - min;
		const safeSpan = span === 0 ? 1 : span;
		const t = clamp((value - min) / safeSpan, 0, 1);
		const scaled = t * (VIRIDIS_STOPS.length - 1);
		const idx = Math.floor(scaled);
		const nextIdx = Math.min(VIRIDIS_STOPS.length - 1, idx + 1);
		const localT = scaled - idx;
		return lerpColor(VIRIDIS_STOPS[idx], VIRIDIS_STOPS[nextIdx], localT);
	}

	function derivePaddockIdentity(props: Record<string, unknown>) {
		const name =
			(props.FIELDNAME as string | undefined) ??
			(props.fieldName as string | undefined) ??
			(props.FIELD_NAME as string | undefined) ??
			(props.name as string | undefined) ??
			(props.Name as string | undefined) ??
			'Unnamed paddock';
		const displayCandidates = [
			props.ADSFLDID,
			props.fieldID,
			props.FIELDID,
			props.FIELD_ID,
			props.fieldId,
			props.id,
			props.Id
		];
		const displayValue = displayCandidates.find(
			(candidate) => candidate !== null && candidate !== undefined && String(candidate).trim() !== ''
		);
		const displayId = displayValue === undefined ? '–' : String(displayValue);
		const fieldId = extractFieldId(props as SoilTestRecord) || normaliseFieldId(displayValue);
		return { name, displayId, fieldId };
	}

	const valueFormatter = new Intl.NumberFormat('en-AU', {
		maximumFractionDigits: 2,
		minimumFractionDigits: 0
	});

	function formatLegendTick(value: number | null | undefined): string {
		if (value === null || value === undefined || Number.isNaN(value)) return '–';
		return valueFormatter.format(value);
	}

	function formatMetricValue(value: number | undefined, metric: MetricOption): string {
		if (value === undefined || value === null || Number.isNaN(value)) {
			return 'No data';
		}
		const abs = Math.abs(value);
		const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
		const formatted = value.toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
		return metric.unit ? `${formatted} ${metric.unit}` : formatted;
	}

	function formatSampleDate(value: string | null): string {
		if (!value) return '';
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return value;
		return parsed.toLocaleDateString('en-AU', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function setLayerBaseStyle(layer: any, style: Partial<PathOptions>) {
		if (!layer || typeof layer.setStyle !== 'function') return;
		const nextStyle = {
			...DEFAULT_PADDOCK_STYLE,
			...style
		};
		layer.__baseStyle = nextStyle;
		layer.setStyle(nextStyle);
	}

	function updatePaddockTooltip(layer: any, html: string) {
		if (typeof layer.getTooltip === 'function') {
			const existing = layer.getTooltip();
			if (existing) {
				existing.setContent(html);
				return;
			}
		}
		if (typeof layer.bindTooltip === 'function') {
			layer.bindTooltip(html, {
				sticky: true,
				direction: 'top',
				className: 'paddock-tooltip',
				opacity: 0.95
			});
		}
	}

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
	let activeBase: BaseLayerConfig | undefined = baseLayerConfigs.find(
		(layer) => layer.id === activeBaseLayer
	);
	let paddockCount = 0;
	let soilMetricsByField = new Map<string, NormalisedSoilSample>();
	let soilMetricsVersion = 0;
	let soilDataLoading = false;
	let soilDataError: string | null = null;
	let activeMetricStats: MetricStats | null = null;
	let activeMetricPaddockCount = 0;
	let styleUpdateMarker = '';
	let metricScaleReady = false;

	// Derived active metric object + message (no O(n) lookups on render)
	$: activeMetricObj = metricsById.get(activeMetric)!; // safe due to guards below
	$: styleUpdateMarker = `${activeMetric}:${soilMetricsVersion}`;
	$: metricScaleReady =
		activeMetricObj.id !== 'none' &&
		typeof activeMetricObj.c_min === 'number' &&
		typeof activeMetricObj.c_max === 'number' &&
		activeMetricObj.c_max > activeMetricObj.c_min;
	$: activeMetricStats = computeMetricStats(activeMetricObj, soilMetricsVersion);
	$: if (paddockLayer && styleUpdateMarker) {
		applySoilMetricStyles();
	}

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

	async function loadSoilTests(force = false) {
		if (soilDataLoading) return;
		if (!force && soilMetricsByField.size > 0 && !soilDataError) return;

		soilDataLoading = true;
		soilDataError = null;

		try {
			const response = await fetch(`${CONFIG.data.tests}?latest=true`);
			if (!response.ok) {
				throw new Error(`Request failed (${response.status})`);
			}

			const payload = await response.json();
			if (!Array.isArray(payload)) {
				throw new Error('Unexpected soil test response payload.');
			}

			const index = buildSoilMetricIndex(payload as SoilTestRecord[]);
			soilMetricsByField = index;
		} catch (err) {
			console.error('Failed to load soil test data', err);
			soilDataError = err instanceof Error ? err.message : 'Failed to load soil test data.';
			soilMetricsByField = new Map();
		} finally {
			soilDataLoading = false;
			soilMetricsVersion += 1;
			scheduleInvalidate(80);
		}
	}

	function buildSoilMetricIndex(records: SoilTestRecord[]): Map<string, NormalisedSoilSample> {
		const next = new Map<string, NormalisedSoilSample>();
		for (const entry of records) {
			if (!entry || typeof entry !== 'object') continue;
			const fieldId = extractFieldId(entry);
			if (!fieldId) continue;

			const metrics: NormalisedSoilSample['metrics'] = {};
			for (const metric of metricOptions) {
				if (metric.id === 'none') continue;
				const value = pickMetricValue(entry, metric.id);
				if (value !== null) {
					metrics[metric.id] = value;
				}
			}

			const sampleDateSource =
				(entry.sample_date ??
					entry.sampleDate ??
					entry.sample_datetime ??
					entry.SampleDate ??
					entry.date ??
					entry.timestamp ??
					null) as unknown;
			const sampleDate = sampleDateSource ? String(sampleDateSource) : null;
			const sampleDateMs = parseDateMs(sampleDateSource);
			const sampleNameSource =
				(entry.name_sample ?? entry.sample_name ?? entry.sampleName ?? entry.SampleName ?? null) as unknown;
			const sampleName = sampleNameSource === null || sampleNameSource === undefined ? null : String(sampleNameSource);

			const existing = next.get(fieldId);
			if (existing) {
				const existingMs = existing.sampleDateMs ?? -Infinity;
				const candidateMs = sampleDateMs ?? -Infinity;
				if (candidateMs < existingMs) {
					continue;
				}
			}

			next.set(fieldId, {
				fieldId,
				sampleDate,
				sampleDateMs,
				sampleName,
				metrics,
				raw: entry
			});
		}
		return next;
	}

	function applySoilMetricStyles() {
		if (!paddockLayer) return;
		const metric = metricsById.get(activeMetric);
		if (!metric) return;

		const cMin = typeof metric.c_min === 'number' ? metric.c_min : null;
		const cMax = typeof metric.c_max === 'number' ? metric.c_max : null;
		const colorable = metricScaleReady && cMin !== null && cMax !== null;
		let withValues = 0;

		paddockLayer.eachLayer((layer: any) => {
			const featureProps = (layer?.feature?.properties ?? {}) as Record<string, unknown>;
			const { name, displayId, fieldId } = derivePaddockIdentity(featureProps);
			const sample = fieldId ? soilMetricsByField.get(fieldId) : undefined;
			const metricValue = sample?.metrics?.[metric.id];

			let valueText: string | null = null;

			if (colorable && typeof metricValue === 'number' && Number.isFinite(metricValue)) {
				const fillColor = viridisColor(metricValue, cMin!, cMax!);
				setLayerBaseStyle(layer, {
					fillColor,
					fillOpacity: 0.88,
					color: '#0f172a',
					weight: 1
				});
				valueText = formatMetricValue(metricValue, metric);
				withValues += 1;
			} else if (colorable) {
				setLayerBaseStyle(layer, NO_DATA_STYLE);
				valueText = 'No data';
			} else {
				setLayerBaseStyle(layer, {});
				if (typeof metricValue === 'number' && Number.isFinite(metricValue)) {
					valueText = formatMetricValue(metricValue, metric);
				} else if (sample) {
					valueText = 'No data';
				}
			}

			const parts = [
				`<div><strong>${name}</strong></div>`,
				`<div>ID: ${displayId}</div>`
			];

			if (metric.id !== 'none') {
				parts.push(`<div>${metric.label}: ${valueText ?? 'No data'}</div>`);
				if (sample?.sampleDate) {
					parts.push(`<div class="text-[0.7rem] opacity-80">Sample: ${formatSampleDate(sample.sampleDate)}</div>`);
				} else if (colorable) {
					parts.push('<div class="text-[0.7rem] opacity-80">No recent sample</div>');
				}
			}

			updatePaddockTooltip(layer, parts.join(''));
		});

		activeMetricPaddockCount = withValues;
	}

	function computeMetricStats(metric: MetricOption, version: number): MetricStats | null {
		void version;
		if (!metric || metric.id === 'none') return null;
		const values: number[] = [];
		soilMetricsByField.forEach((sample) => {
			const value = sample.metrics[metric.id];
			if (typeof value === 'number' && Number.isFinite(value)) {
				values.push(value);
			}
		});
		if (values.length === 0) return null;
		values.sort((a, b) => a - b);
		const min = values[0];
		const max = values[values.length - 1];
		const median = values[Math.floor(values.length / 2)];
		const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
		return { min, max, median, mean, count: values.length };
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
		loadSoilTests(true);
	}

	onMount(() => {
		map = L.map(mapContainer, {
			zoomControl: false
		});
		map.setView([-41.2, 146.4], 14);
		L.control.zoom({ position: 'bottomright' }).addTo(map);

		applyBaseLayer(activeBaseLayer);
		loadFarmData();
		loadSoilTests();

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
					<div class="space-y-2 text-xs text-muted/60">
						{#if activeMetricObj.id === 'none'}
							<p>Choose a dataset to colour paddocks using recent soil test data.</p>
						{:else if soilDataLoading}
							<p>Loading the latest soil test results…</p>
						{:else if soilDataError}
							<p class="text-red-300">{soilDataError}</p>
							<button
								type="button"
								class="inline-flex items-center gap-1 rounded-md border border-red-300/40 bg-red-300/10 px-2 py-1 text-[11px] text-red-200 transition hover:border-red-300/60 hover:bg-red-300/20"
								on:click={() => loadSoilTests(true)}
							>
								Retry
							</button>
						{:else if !metricScaleReady}
							<p>We don't have a colour scale configured for {activeMetricObj.label} yet.</p>
						{:else if activeMetricStats}
							{@const stats = activeMetricStats!}
							<p>
								Colouring {activeMetricPaddockCount} paddock{activeMetricPaddockCount === 1 ? '' : 's'} using {activeMetricObj.label}.
							</p>
							<div class="space-y-2 rounded-md border border-white/10 bg-white/5 p-3 text-[11px] text-muted/70">
								<div class="h-2 w-full rounded-full" style={`background: ${VIRIDIS_GRADIENT};`}></div>
								<div class="flex justify-between text-muted/60">
									<span>
										Scale {formatLegendTick(activeMetricObj.c_min)}{activeMetricObj.unit ? ` ${activeMetricObj.unit}` : ''}
									</span>
									<span>
										{formatLegendTick(activeMetricObj.c_max)}{activeMetricObj.unit ? ` ${activeMetricObj.unit}` : ''}
									</span>
								</div>
								<div class="flex justify-between text-muted/50">
									<span>
										Samples {formatLegendTick(stats.min)}{activeMetricObj.unit ? ` ${activeMetricObj.unit}` : ''}
									</span>
									<span>
										{formatLegendTick(stats.max)}{activeMetricObj.unit ? ` ${activeMetricObj.unit}` : ''}
									</span>
								</div>
								<div class="flex justify-between text-muted/50">
									<span>Median {formatLegendTick(stats.median)}{activeMetricObj.unit ? ` ${activeMetricObj.unit}` : ''}</span>
									<span>n = {stats.count}</span>
								</div>
							</div>
						{:else}
							<p>No paddocks have recent samples for {activeMetricObj.label} yet.</p>
						{/if}
					</div>
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
