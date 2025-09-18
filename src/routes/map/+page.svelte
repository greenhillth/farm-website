<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import L from 'leaflet';
  import type { TileLayerOptions } from 'leaflet';
  import { onDestroy, onMount } from 'svelte';

  import CONFIG from '$lib/config';
  import { buildBaseLayer } from '$lib/layers';

  import 'leaflet/dist/leaflet.css';

  type MetricOption = (typeof CONFIG.soilMetrics)[number];

  type BaseLayerConfig = {
    id: string;
    label: string;
    description: string;
    url: string;
    options: TileLayerOptions;
  };

  const metricOptions: MetricOption[] = CONFIG.soilMetrics;
  const defaultMetric = metricOptions[0]?.id ?? 'none';

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
  let activeMetric: string = defaultMetric;

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

  function chooseMetric(id: string) {
    if (id === activeMetric) return;
    activeMetric = id;

    const url = new URL($page.url);
    if (id === defaultMetric) {
      url.searchParams.delete('metric');
    } else {
      url.searchParams.set('metric', id);
    }

    goto(`${url.pathname}${url.search}`, {
      keepFocus: true,
      replaceState: true,
      noScroll: true
    });
  }

  function retryLoad() {
    loadFarmData();
  }

  onMount(() => {
    map = L.map(mapContainer, {
      zoomControl: true
    });
    map.setView([-41.2, 146.4], 14);

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

  let metricFromQuery: string | null = null;

  $: metricFromQuery = $page.url.searchParams.get('metric');
  $: if (metricFromQuery) {
    if (metricOptions.some((option) => option.id === metricFromQuery)) {
      if (metricFromQuery !== activeMetric) {
        activeMetric = metricFromQuery;
      }
    }
  } else if (activeMetric !== defaultMetric) {
    activeMetric = defaultMetric;
  }
</script>

<div class="map-shell relative flex h-dvh min-h-[540px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
  <aside
    bind:this={navPanel}
    class={`map-sidebar relative flex h-full shrink-0 overflow-visible transition-[width] duration-300 ease-in-out ${navOpen ? 'w-80 max-w-full' : 'w-0'}`}
    on:transitionend={handleNavTransition}
  >
    <div
      class={`sidebar-panel flex h-full w-full flex-col gap-6 border-r border-white/10 bg-panel/95 text-sm text-muted transition-[padding,opacity] duration-300 ease-in-out ${navOpen ? 'px-6 py-6 opacity-100 pointer-events-auto overflow-y-auto' : 'px-0 py-0 opacity-0 pointer-events-none overflow-hidden'}`}
      aria-hidden={!navOpen}
    >
      <header class="flex items-start gap-4 text-white">
        <div class="flex items-center gap-3">
          <img src="/img/logo.png" alt="Greenhill Bros logo" class="h-10 w-10 rounded-md border border-white/10 bg-white/10 p-1" />
          <div class="leading-tight">
            <p class="text-xs uppercase tracking-wider text-muted/70">Greenhill Bros Farm</p>
            <h1 class="text-lg font-semibold">Interactive map</h1>
          </div>
        </div>
      </header>

      <nav id="map-controls" aria-label="Map controls" class="space-y-8">
        <section class="space-y-3">
          <div>
            <h2 class="text-xs font-semibold uppercase tracking-wider text-muted/70">Base map</h2>
            <p class="mt-1 text-xs text-muted/60">Choose the imagery used beneath the farm overlays.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            {#each baseLayerConfigs as layer}
              <button
                type="button"
                class={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${activeBaseLayer === layer.id ? 'border-accent/60 bg-accent/20 text-white shadow' : 'border-white/10 bg-white/5 text-muted hover:border-white/20 hover:text-white'}`}
                aria-pressed={activeBaseLayer === layer.id}
                on:click={() => selectBaseLayer(layer.id)}
              >
                {layer.label}
              </button>
            {/each}
          </div>
          {#if activeBase}
            <p class="text-xs text-muted/70">{activeBase.description}</p>
          {/if}
        </section>

        <section class="space-y-3">
          <div>
            <h2 class="text-xs font-semibold uppercase tracking-wider text-muted/70">Overlays</h2>
            <p class="mt-1 text-xs text-muted/60">Switch between soil metrics as datasets become available.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            {#each metricOptions as metric}
              <button
                type="button"
                class={`rounded-md border px-3 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${activeMetric === metric.id ? 'border-accent/60 bg-accent/20 text-white shadow' : 'border-white/10 bg-white/5 text-muted hover:border-white/20 hover:text-white'}`}
                aria-pressed={activeMetric === metric.id}
                on:click={() => chooseMetric(metric.id)}
              >
                {metric.label}
              </button>
            {/each}
          </div>
          <p class="text-xs text-muted/60">
            {#if activeMetric === defaultMetric}
              Choose a dataset to overlay paddock performance when it is published.
            {:else}
              {metricOptions.find((metric) => metric.id === activeMetric)?.label} overlay coming soon.
            {/if}
          </p>
        </section>

        <section class="space-y-3">
          <div>
            <h2 class="text-xs font-semibold uppercase tracking-wider text-muted/70">Display</h2>
            <p class="mt-1 text-xs text-muted/60">Toggle contextual information on top of the base map.</p>
          </div>
          <div class="space-y-2">
            <label class="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-muted transition hover:border-white/20 hover:text-white focus-within:border-accent/60">
              <input type="checkbox" class="accent-accent" bind:checked={showBoundaries} />
              <span>Show field boundaries</span>
            </label>
            <label class="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-muted transition hover:border-white/20 hover:text-white focus-within:border-accent/60">
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
            class="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-muted transition hover:border-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            on:click={resetView}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
              <path
                fill-rule="evenodd"
                d="M10 3.5a6.5 6.5 0 1 0 6.03 9h-1.7a4.75 4.75 0 1 1 0-4h1.7A6.5 6.5 0 0 0 10 3.5Zm.75.75V2a.75.75 0 0 0-1.5 0v2.25a.75.75 0 0 0 1.5 0ZM4.28 5.53a.75.75 0 0 0 0-1.06l-1.59-1.6a.75.75 0 1 0-1.06 1.07l1.59 1.59a.75.75 0 0 0 1.06 0Zm-1.59 9.6 1.59 1.59a.75.75 0 0 1-1.06 1.06l-1.59-1.58a.75.75 0 1 1 1.06-1.06ZM16.5 5.75a.75.75 0 0 1 1.5 0v2.25a.75.75 0 0 1-1.5 0V5.75Zm.53 8.47.8.8a.75.75 0 0 1-1.06 1.06l-.8-.8a.75.75 0 0 1 1.06-1.06Z"
                clip-rule="evenodd"
              />
            </svg>
            Reset view
          </button>
        </section>

        <section class="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-xs text-muted/70">
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
    </div>

    <button
      type="button"
      class={`map-toggle pointer-events-auto absolute top-1/2 z-40 flex -translate-y-1/2 items-center gap-2 rounded-full border border-white/10 bg-panel/90 px-3 py-2 text-sm text-muted shadow-lg transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${navOpen ? 'left-full -translate-x-1/2 rounded-l-none' : 'left-0 translate-x-1/2'}`}
      on:click={toggleNav}
      aria-controls="map-controls"
      aria-expanded={navOpen}
      aria-label={navOpen ? 'Hide navigation' : 'Show navigation'}
      title={navOpen ? 'Hide navigation' : 'Show navigation'}
    >
      {#if navOpen}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
          <path
            fill-rule="evenodd"
            d="M12.78 15.53a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 1 1 1.06 1.06L9.31 10l3.47 3.47a.75.75 0 0 1 0 1.06Z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="hidden sm:inline">Hide</span>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
          <path
            fill-rule="evenodd"
            d="M7.22 4.47a.75.75 0 0 0 0 1.06L10.69 10l-3.47 3.47a.75.75 0 1 0 1.06 1.06l4-4a.75.75 0 0 0 0-1.06l-4-4a.75.75 0 0 0-1.06 0Z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="hidden sm:inline">Show</span>
      {/if}
    </button>
  </aside>

  <main class="map-main relative flex-1 min-w-0 bg-bg">
    <div
      bind:this={mapContainer}
      class="map-canvas absolute inset-0"
      class:labels-hidden={!showLabels}
    ></div>

    {#if loadError}
      <div class="map-status">
        <div class="space-y-3">
          <h2 class="text-base font-semibold text-white">We couldn’t load the farm map</h2>
          <p class="text-sm text-muted">{loadError}</p>
          <div class="flex justify-center">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              on:click={retryLoad}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    {:else if isLoading}
      <div class="map-status" aria-live="polite">
        <p class="text-sm text-muted">Preparing paddock boundaries…</p>
      </div>
    {/if}

    <a
      href="/"
      class="map-home absolute right-4 top-4 z-[1000] inline-flex items-center gap-2 rounded-full border border-white/10 bg-panel/95 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      aria-label="Back to home"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
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
