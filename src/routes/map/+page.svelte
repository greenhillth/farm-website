<script lang="ts">
	import { onMount } from 'svelte';
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import CONFIG from '$lib/config';
	import Panel from '$lib/components/Panel.svelte';
	import { buildBaseLayer } from '$lib/layers';

	type MetricOption = { id: string; label: string };
	type QuickLink = { href: string; label: string };

	const quickLinks: QuickLink[] = [
		{ href: '/', label: 'Back to home' },
		{ href: '/paddocks', label: 'Paddock manager' },
		{ href: '/soiltests', label: 'Soil tests' },
		{ href: '/weather', label: 'Weather station' }
	];

	const soilMetrics: MetricOption[] = CONFIG.soilMetrics;
	const baseMetricId = soilMetrics[0]?.id ?? 'none';

	const metricDescriptions: Record<string, string> = {
		none: 'Satellite imagery with field boundaries. Useful for general navigation.',
		K: 'Highlight potassium levels to quickly identify paddocks that may need attention.',
		pH: 'Visualise soil acidity to spot areas that may need balancing.'
	};

	let mapContainer: HTMLDivElement;
	let map: L.Map | null = null;
	let baseLayer: L.GeoJSON<any> | null = null;
	let baseBounds: L.LatLngBounds | null = null;

	let geojson: any = null;
	let collapsed = false;
	let showFieldBoundaries = true;
	let activeMetric: string = baseMetricId;
	let loading = true;
	let error: string | null = null;
	let isMounted = false;

	function invalidateSizeSoon(delay = 320) {
		setTimeout(() => {
			map?.invalidateSize();
		}, delay);
	}

	function toggleSidebar(force?: boolean) {
		collapsed = typeof force === 'boolean' ? force : !collapsed;
		invalidateSizeSoon(340);
	}

	function resetView() {
		if (map && baseBounds) {
			map.fitBounds(baseBounds, { padding: [24, 24] });
		}
	}

	async function loadFarm() {
		if (!map) return;
		loading = true;
		error = null;

		try {
			const response = await fetch(CONFIG.data.farm);
			if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
			const data = await response.json();
			geojson = data;

			if (baseLayer && map.hasLayer(baseLayer)) {
				baseLayer.removeFrom(map);
			}

			baseLayer = buildBaseLayer(data, L);
			if (showFieldBoundaries) {
				baseLayer.addTo(map);
			}

			const bounds = baseLayer.getBounds();
			if (bounds?.isValid()) {
				baseBounds = bounds;
				map.fitBounds(bounds, { padding: [24, 24] });
			}
		} catch (err) {
			console.error('Failed to load farm data', err);
			error = err instanceof Error ? err.message : 'Failed to load farm data';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const metricFromQuery = params.get('metric');
		if (metricFromQuery && soilMetrics.some((metric) => metric.id === metricFromQuery)) {
			activeMetric = metricFromQuery;
		}

		map = L.map(mapContainer, { zoomControl: false });
		L.tileLayer(CONFIG.tiles.url, CONFIG.tiles).addTo(map);
		L.control.zoom({ position: 'bottomright' }).addTo(map);

		void loadFarm();
		invalidateSizeSoon(80);

		const handleResize = () => map?.invalidateSize();
		window.addEventListener('resize', handleResize);
		isMounted = true;

		return () => {
			window.removeEventListener('resize', handleResize);
			map?.remove();
		};
	});

	$: activeMetricLabel =
		soilMetrics.find((metric) => metric.id === activeMetric)?.label ?? activeMetric;

	$: metricMessage = metricDescriptions[activeMetric] ?? 'Overlay data coming soon.';

	$: if (isMounted) {
		const params = new URLSearchParams(window.location.search);
		const targetMetric = activeMetric === baseMetricId ? null : activeMetric;

		if (targetMetric) {
			if (params.get('metric') !== targetMetric) {
				params.set('metric', targetMetric);
				const query = params.toString();
				history.replaceState({}, '', `${window.location.pathname}?${query}`);
			}
		} else if (params.has('metric')) {
			params.delete('metric');
			const query = params.toString();
			const suffix = query ? `?${query}` : '';
			history.replaceState({}, '', `${window.location.pathname}${suffix}`);
		}
	}

	$: if (map && baseLayer) {
		if (showFieldBoundaries) {
			if (!map.hasLayer(baseLayer)) {
				baseLayer.addTo(map);
			}
		} else if (map.hasLayer(baseLayer)) {
			baseLayer.removeFrom(map);
		}
	}
</script>

<div
	class="map-page relative flex h-dvh bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950 text-white"
>
	<aside
		class={`map-sidebar border-border/70 bg-panel/95 relative z-20 flex h-full flex-col border-r backdrop-blur transition-[width,opacity] duration-300 ease-out ${
			collapsed ? 'pointer-events-none w-0 overflow-hidden opacity-0' : 'w-80 opacity-100'
		}`}
		aria-hidden={collapsed}
	>
		<div class="flex h-full flex-col gap-6 px-5 py-6">
			<header class="flex items-start justify-between gap-4">
				<div>
					<p class="text-muted/70 text-xs tracking-wide uppercase">Greenhill Bros</p>
					<h1 class="mt-1 text-lg font-semibold">Farm map</h1>
					<p class="text-muted/80 text-xs">Explore paddocks, overlays and quick links.</p>
				</div>
				<button
					class="border-border/80 text-muted focus:ring-accent/40 rounded-md border bg-white/5 p-2 hover:bg-white/10 hover:text-white focus:ring-2 focus:outline-none"
					on:click={() => toggleSidebar(true)}
					aria-label="Collapse sidebar"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						class="size-4"
					>
						<path
							fill-rule="evenodd"
							d="M12.78 15.53a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 1 1 1.06 1.06L9.31 10l3.47 3.47a.75.75 0 0 1 0 1.06Z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</header>

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

			<Panel title="Soil overlay">
				<div class="space-y-3">
					<p class="text-muted/80 text-xs leading-relaxed">
						Choose a soil metric to prepare the overlay. Overlays will appear when data is
						available.
					</p>
					<div class="space-y-1">
						{#each soilMetrics as metric (metric.id)}
							<label
								class={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
									activeMetric === metric.id
										? 'bg-white/10 text-white'
										: 'text-muted hover:bg-white/5 hover:text-white'
								}`}
							>
								<input
									type="radio"
									name="metric"
									value={metric.id}
									class="accent-accent"
									bind:group={activeMetric}
								/>
								<span>{metric.label}</span>
							</label>
						{/each}
					</div>
					{#if activeMetric !== baseMetricId}
						<div
							class="border-border/70 text-muted rounded-md border bg-white/5 px-3 py-2 text-xs leading-relaxed"
						>
							{metricMessage}
						</div>
					{/if}
				</div>
			</Panel>
			<Panel title="Map layers">
				<div class="space-y-3">
					<label class="text-muted flex items-center gap-3 text-sm">
						<input
							type="checkbox"
							class="accent-accent size-4"
							bind:checked={showFieldBoundaries}
						/>
						<span>Field boundaries</span>
					</label>
					<p class="text-muted/80 text-xs leading-relaxed">
						Toggle outlines for each paddock. Turn this off to view imagery without the overlay.
					</p>
				</div>
			</Panel>

			<Panel title="Map actions">
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="border-border/80 text-muted focus:ring-accent/40 rounded-md border bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10 hover:text-white focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
						on:click={resetView}
						disabled={!baseBounds}
					>
						Reset view
					</button>
					<button
						type="button"
						class="border-border/80 text-muted focus:ring-accent/40 rounded-md border bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10 hover:text-white focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
						on:click={() => loadFarm()}
						disabled={loading}
					>
						{loading ? 'Loading…' : 'Reload data'}
					</button>
				</div>
				{#if loading}
					<p class="text-muted mt-3 text-xs">Loading farm boundaries…</p>
				{:else if error}
					<p class="mt-3 text-xs text-red-400">{error}</p>
				{:else if geojson}
					<p class="text-muted mt-3 text-xs">Farm data loaded.</p>
				{/if}
			</Panel>

			<div class="text-muted/70 mt-auto text-xs leading-relaxed">
				Adjust the controls to explore different layers. Collapse the panel for a full-width map
				view.
			</div>
		</div>
	</aside>

	<main class="relative flex-1">
		<div bind:this={mapContainer} class="absolute inset-0"></div>

		{#if collapsed}
			<button
				class="border-border/80 bg-panel/90 text-muted hover:bg-panel focus:ring-accent/40 absolute top-3 left-3 z-[1200] rounded-md border px-3 py-2 text-sm backdrop-blur transition hover:text-white focus:ring-2 focus:outline-none"
				on:click={() => toggleSidebar(false)}
			>
				Open controls
			</button>
		{/if}

		<div
			class="border-border/80 bg-panel/80 text-muted pointer-events-none absolute top-4 left-4 z-[1100] max-w-xs rounded-xl border px-4 py-3 text-xs shadow-lg backdrop-blur"
		>
			<div class="text-sm font-semibold text-white">{activeMetricLabel}</div>
			<p class="mt-1 leading-relaxed">
				{activeMetric === baseMetricId
					? 'Viewing satellite imagery with current paddock outlines.'
					: metricMessage}
			</p>
		</div>

		<a
			href="/"
			class="border-border/80 bg-panel/95 hover:bg-panel absolute top-3 right-3 z-[1200] flex items-center gap-2 rounded-full border px-3 py-2 text-sm text-white shadow-lg backdrop-blur transition"
			aria-label="Back to home"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="currentColor"
				class="size-5"
			>
				<path d="M12 3.172 3 10.5V21h6v-6h6v6h6V10.5L12 3.172z" />
			</svg>
			<span class="hidden sm:inline">Home</span>
		</a>
	</main>
</div>

<style>
	:global(.paddock-tooltip) {
		background-color: rgba(15, 23, 34, 0.95);
		color: #f9fafb;
		border-radius: 0.5rem;
		padding: 0.4rem 0.6rem;
		border: 1px solid rgba(148, 163, 184, 0.35);
		box-shadow: 0 10px 28px rgba(8, 15, 28, 0.35);
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
