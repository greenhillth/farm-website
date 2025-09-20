<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import L from 'leaflet';
import type { TileLayerOptions } from 'leaflet';
import { onDestroy, onMount } from 'svelte';

import CONFIG from '$lib/config';
import type { MetricId, MetricOption } from '$lib/config';
import { buildBaseLayer } from '$lib/layers';

import 'leaflet/dist/leaflet.css';

import {
	quickLinks as helperQuickLinks,
	type BaseLayerConfig,
	type LegendDetails,
	type LegendPercents,
	type MetricStats,
	type NormalisedSoilSample,
	NO_DATA_STYLE,
	VIRIDIS_GRADIENT,
	keepTooltipInView,
	derivePaddockIdentity,
	pickMetricValue,
	parseDateMs,
	setLayerBaseStyle,
	updatePaddockTooltip,
	formatLegendTick,
	formatMetricValue,
	formatSampleDate,
	formatPercent,
	formatFieldList,
	viridisColor,
	computeMetricStats,
	computeLegendDetails,
	computeLegendPercents,
	EMPTY_LEGEND_DETAILS,
	EMPTY_LEGEND_PERCENTS,
	extractFieldId
} from './helpers';

const quickLinks = helperQuickLinks;

const metricOptions = CONFIG.soilMetrics;
if (metricOptions.length === 0) {
	throw new Error('CONFIG.soilMetrics is empty; need at least one metric.');
}

const metricsById = new Map<MetricId, MetricOption>(metricOptions.map((m) => [m.id, m]));

// Default to first metric id (type-safe)
const defaultMetric: MetricId = metricOptions[0].id;

const { url: imageryUrl, ...imageryOptions } = CONFIG.map;
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
let isStreetsBase = activeBaseLayer === 'streets';
let legendPercents: LegendPercents = EMPTY_LEGEND_PERCENTS;
let legendDetails: LegendDetails = EMPTY_LEGEND_DETAILS;
let paddockIdentities = new Map<string, { name: string; displayId: string }>();

// Derived active metric object + message (no O(n) lookups on render)
$: activeMetricObj = metricsById.get(activeMetric)!; // safe due to guards below
$: styleUpdateMarker = `${activeMetric}:${soilMetricsVersion}`;
$: metricScaleReady =
	activeMetricObj.id !== 'none' &&
	typeof activeMetricObj.c_min === 'number' &&
	typeof activeMetricObj.c_max === 'number' &&
	activeMetricObj.c_max > activeMetricObj.c_min;
$: {
	void soilMetricsVersion;
	activeMetricStats = computeMetricStats(activeMetricObj, soilMetricsByField);
}
$: legendPercents = computeLegendPercents(activeMetricObj, activeMetricStats, metricScaleReady);
$: legendDetails = computeLegendDetails(
	activeMetricObj,
	activeMetricStats,
	soilMetricsByField,
	paddockIdentities
);
$: isStreetsBase = activeBaseLayer === 'streets';
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
		const response = await fetch(CONFIG.backend.farm);
		if (!response.ok) {
			throw new Error(`Request failed (${response.status})`);
		}

		const geojson = await response.json();
		farmData = geojson;
		paddockCount = Array.isArray(geojson?.features) ? geojson.features.length : 0;
		paddockIdentities = new Map();
		if (Array.isArray(geojson?.features)) {
			for (const feature of geojson.features) {
				const props = (feature?.properties ?? {}) as Record<string, unknown>;
				const identity = derivePaddockIdentity(props);
				if (identity.fieldId) {
					paddockIdentities.set(identity.fieldId, {
						name: identity.name,
						displayId: identity.displayId
					});
				}
			}
		}

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
		const response = await fetch(`${CONFIG.backend.tests}?latest=true`);
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

		const sampleDateSource = (entry.sample_date ??
			entry.sampleDate ??
			entry.sample_datetime ??
			entry.SampleDate ??
			entry.date ??
			entry.timestamp ??
			null) as unknown;
		const sampleDate = sampleDateSource ? String(sampleDateSource) : null;
		const sampleDateMs = parseDateMs(sampleDateSource);
		const sampleNameSource = (entry.name_sample ??
			entry.sample_name ??
			entry.sampleName ??
			entry.SampleName ??
			null) as unknown;
		const sampleName =
			sampleNameSource === null || sampleNameSource === undefined
				? null
				: String(sampleNameSource);

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

		const parts = [`<div><strong>${name}</strong></div>`, `<div>ID: ${displayId}</div>`];

		if (metric.id !== 'none') {
			parts.push(`<div>${metric.label}: ${valueText ?? 'No data'}</div>`);
			if (sample?.sampleDate) {
				parts.push(
					`<div class="text-[0.7rem] opacity-80">Sample: ${formatSampleDate(sample.sampleDate)}</div>`
				);
			} else if (colorable) {
				parts.push('<div class="text-[0.7rem] opacity-80">No recent sample</div>');
			}
		}

		updatePaddockTooltip(layer, parts.join(''));
	});

	activeMetricPaddockCount = withValues;
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
			data-tooltip-boundary
			class={`sidebar-panel bg-panel/95 text-muted flex h-full w-full flex-col gap-6 border-r border-white/10 text-sm transition-[padding,opacity] duration-300 ease-in-out ${navOpen ? 'pointer-events-auto overflow-x-visible overflow-y-auto px-6 py-6 opacity-100' : 'pointer-events-none overflow-hidden px-0 py-0 opacity-0'}`}
			aria-hidden={!navOpen}
		>
			<header class="flex items-start gap-4 text-white">
				<a href="/" class="flex items-center gap-3">
					<img
						src="/img/logo.png"
						alt="Greenhill Bros logo"
						class="h-10 w-10 rounded-md border border-white/10 bg-white/10 p-1"
					/>
					<div class="leading-tight">
						<p class="text-muted/70 text-xs tracking-wider uppercase">Greenhill Bros Farm</p>
						<h1 class="text-lg font-semibold">Interactive map</h1>
					</div>
				</a>
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
					<div class="text-muted/60 space-y-2 text-xs">
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
							{@const perc = legendPercents}
							{@const details = legendDetails}
							{@const cmin =
								typeof activeMetricObj.c_min === 'number' ? activeMetricObj.c_min : null}
							{@const cmax =
								typeof activeMetricObj.c_max === 'number' ? activeMetricObj.c_max : null}
							{@const unitSuffix = activeMetricObj.unit ? ` ${activeMetricObj.unit}` : ''}
							<p>
								Colouring {activeMetricPaddockCount} paddock{activeMetricPaddockCount === 1
									? ''
									: 's'} using {activeMetricObj.label}.
							</p>
							<div
								class="text-muted/70 space-y-2 rounded-md border border-white/10 bg-white/5 p-3 text-[11px]"
							>
								<div class="text-center font-semibold">
									Scale{unitSuffix ? ` (${activeMetricObj.unit})` : ''}
								</div>
								<div class="relative h-2 w-full rounded-full">
									<div
										class="pointer-events-none absolute inset-0 rounded-full"
										style={`background: ${VIRIDIS_GRADIENT};`}
									></div>
									{#if perc.showOpt}
										<button
											type="button"
											class="group absolute inset-y-[-6px] flex items-center justify-center bg-transparent p-0 focus:outline-none"
											style={`left:${perc.optLoPct}%; width:${perc.optWidth}%`}
											aria-label={`Optimal range ${formatLegendTick(details.opt.range?.[0])}${unitSuffix} to ${formatLegendTick(details.opt.range?.[1])}${unitSuffix}`}
										>
											<div
												class="pointer-events-none absolute inset-0 rounded-full bg-white/30"
											></div>
											<div
												use:keepTooltipInView
												class="pointer-events-none absolute -top-24 left-1/2 hidden w-60 -translate-x-1/2 rounded-md bg-slate-950/95 px-3 py-2 text-[11px] text-slate-100 shadow-xl group-hover:block group-focus-visible:block"
												role="tooltip"
											>
												<div class="font-semibold">
													Optimal {formatLegendTick(details.opt.range?.[0])}{unitSuffix} – {formatLegendTick(
														details.opt.range?.[1]
													)}{unitSuffix}
												</div>
												{#if details.opt.within.total > 0}
													<div class="mt-1 text-[10px] text-slate-200/80">
														{details.opt.within.count} of {details.opt.within.total} paddocks ({formatPercent(
															details.opt.within.pct
														)})
													</div>
												{:else}
													<div class="mt-1 text-[10px] text-slate-200/80">
														No sampled paddocks yet
													</div>
												{/if}
											</div>
										</button>
									{/if}
									<button
										type="button"
										class="group absolute -top-3 flex h-8 w-8 -translate-x-1/2 cursor-default items-end justify-center bg-transparent p-0 focus:outline-none"
										style={`left:${perc.lowPct}%`}
										aria-label={`Minimum value ${formatLegendTick(details.min.value)}${unitSuffix}`}
									>
										<div class="pointer-events-none h-full w-[6px] rounded-full bg-white/85"></div>
										<div
											use:keepTooltipInView
											class="pointer-events-none absolute -top-24 left-1/2 hidden w-56 -translate-x-1/2 rounded-md bg-slate-950/95 px-3 py-2 text-[11px] text-slate-100 shadow-xl group-hover:block group-focus-visible:block"
											role="tooltip"
										>
											<div class="font-semibold">
												Min {formatLegendTick(details.min.value)}{unitSuffix}
											</div>
											<div class="mt-1 text-[10px] text-slate-200/80">
												Paddocks: {formatFieldList(details.min.fields)}
											</div>
										</div>
									</button>
									<button
										type="button"
										class="group absolute -top-3 flex h-8 w-8 -translate-x-1/2 cursor-default items-end justify-center bg-transparent p-0 focus:outline-none"
										style={`left:${perc.highPct}%`}
										aria-label={`Maximum value ${formatLegendTick(details.max.value)}${unitSuffix}`}
									>
										<div class="pointer-events-none h-full w-[6px] rounded-full bg-white/85"></div>
										<div
											use:keepTooltipInView
											class="pointer-events-none absolute -top-24 left-1/2 hidden w-56 -translate-x-1/2 rounded-md bg-slate-950/95 px-3 py-2 text-[11px] text-slate-100 shadow-xl group-hover:block group-focus-visible:block"
											role="tooltip"
										>
											<div class="font-semibold">
												Max {formatLegendTick(details.max.value)}{unitSuffix}
											</div>
											<div class="mt-1 text-[10px] text-slate-200/80">
												Paddocks: {formatFieldList(details.max.fields)}
											</div>
										</div>
									</button>
								</div>
								<div class="text-muted/60 flex justify-between text-[11px]">
									<span>{formatLegendTick(cmin)}</span>
									<span>{formatLegendTick(cmax)}</span>
								</div>
								<div class="text-muted/60 flex justify-between text-[10px]">
									<span
										>Median: <span class="font-semibold"
											>{formatLegendTick(stats.median)}{unitSuffix}</span
										></span
									>
								</div>
								{#if details.opt.range}
									<div class="text-[10px] text-emerald-200/90">
										{details.opt.within.count} of {details.opt.within.total} paddocks within optimal
										({formatPercent(details.opt.within.pct)})
									</div>
								{/if}
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
				class={`border-border/80 bg-panel/90 text-muted hover:bg-panel focus:ring-accent/40 absolute top-3 left-4 z-[1200] rounded-md border px-3 py-2 text-sm backdrop-blur transition hover:text-white focus:ring-2 focus:outline-none ${
					isStreetsBase
						? 'border-white/50 bg-slate-950/95 text-slate-200 shadow-black/40'
						: 'border-border/80 bg-panel/80 text-muted'
				}`}
				on:click={() => toggleNav()}
			>
				Open controls
			</button>
		{/if}

		<!-- Floating info panel: use activeMetricObj and fix class interpolation -->
		{#if activeMetricObj.id !== defaultMetric}
			<div
				class={`pointer-events-none absolute ${navOpen ? 'top-3' : 'top-15'} left-4 z-[1100] max-w-xs rounded-xl border px-4 py-3 text-xs shadow-lg backdrop-blur ${
					isStreetsBase
						? 'border-white/50 bg-slate-950/95 text-slate-200 shadow-black/40'
						: 'border-border/80 bg-panel/80 text-muted'
				}`}
			>
				<div class="text-sm font-semibold text-white">{activeMetricObj.label}</div>
				<p class={`mt-1 leading-relaxed ${isStreetsBase ? 'text-slate-100' : 'text-muted'}`}>
					{activeMetricObj.description}
				</p>
				<p
					class={`mt-1 leading-relaxed font-semibold ${isStreetsBase ? 'text-slate-200' : 'text-muted/70'}`}
				>
					Optimal range: {activeMetricObj.range_optimal[0]}{activeMetricObj.unit} to {activeMetricObj
						.range_optimal[1]}{activeMetricObj.unit}
				</p>
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
			class={`map-home focus-visible:ring-accent/40 absolute top-4 right-4 z-[1000] inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:text-white focus:outline-none focus-visible:ring-2 ${
				isStreetsBase
					? 'border-white/60 bg-slate-950/95 text-white shadow-xl hover:border-white/80'
					: 'bg-panel/95 border-white/10 text-white shadow-lg hover:border-white/30'
			}`}
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
