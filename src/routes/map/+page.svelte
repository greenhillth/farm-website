<script lang="ts">
  import { onMount } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import CONFIG from '$lib/config';
  import { buildMetricLayer } from '$lib/layers';
  import { renderMetricNav, setActiveMetric, renderLegend } from '$lib/ui';

  let mapDiv: HTMLDivElement;
  let sidebar: HTMLElement;
  let metricNav: HTMLElement;
  let legendPanel: HTMLElement;
  let collapsed = false;
  let map: L.Map;

  function invalidateSoon(delay = 320) {
    // Wait until CSS transition completes, then tell Leaflet to recalc size
    setTimeout(() => {
      map?.invalidateSize();
    }, delay);
  }

  onMount(async () => {
    // Init map
    map = L.map(mapDiv).setView([-41.2, 146.4], 14); // start coords
    L.tileLayer(CONFIG.tiles.url, CONFIG.tiles).addTo(map);

    // Load data
    const [bounds, geojson, optima] = await Promise.all([
      fetch(CONFIG.data.bounds).then(r => r.json()).catch(() => null),
      fetch(CONFIG.data.geojson).then(r => r.json()).catch(() => null),
      fetch(CONFIG.data.optima).then(r => r.json()).catch(() => null),
    ]);

    if (!geojson || !optima) return;

    // Active metric
    let active = CONFIG.defaultMetric;
    let { layer, legend } = buildMetricLayer(geojson, active, optima, CONFIG, L);
    layer.addTo(map);
    renderLegend(legendPanel, legend);
    renderMetricNav(metricNav, CONFIG.metrics, active, (m) => {
      active = m;
      map.removeLayer(layer);
      const result = buildMetricLayer(geojson, active, optima, CONFIG, L);
      layer = result.layer;
      legend = result.legend;
      layer.addTo(map);
      renderLegend(legendPanel, legend);
      setActiveMetric(metricNav, active);
    });

    // Fit bounds
    if (bounds) map.fitBounds(bounds);
    document.getElementById('fitBounds')?.addEventListener('click', () => {
      if (bounds) map.fitBounds(bounds);
    });

    // Ensure first render has correct size
    invalidateSoon(50);
  });
</script>

<div id="app" class="relative flex h-dvh">
  <!-- Sidebar -->
  <aside bind:this={sidebar} id="sidebar"
    class={`relative bg-panel border-r border-border transition-[width,opacity,padding] duration-300 ease-in-out flex-none ${collapsed ? 'w-0 p-0 opacity-0 overflow-hidden' : 'w-80 p-4 opacity-100 overflow-auto'}`}
    aria-hidden={collapsed}
    on:transitionend={(e) => { if (e.target === sidebar) map?.invalidateSize(); }}
  >
    <header class="flex items-center justify-between gap-2 mb-3">
      <div class="flex items-center gap-2">
        <img src="/img/logo.png" alt="" class="size-7" />
        <h1 class="text-lg font-semibold">Greenhill Bros Farm</h1>
      </div>
    </header>

    <section class="space-y-4 px-1">
      <nav aria-label="Layers">
        <div class="text-sm text-muted mb-2 px-3">Soil Data</div>
        <div bind:this={metricNav} id="metricNav" class="space-y-1"></div>
      </nav>
      <label class="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" id="showLabels" class="accent-accent" checked />
        <span>Show field labels</span>
      </label>
      <div class="flex gap-2 text-sm">
        <button id="fitBounds" class="border border-border rounded px-2 py-1">Reset view</button>
      </div>
      <div bind:this={legendPanel} id="legendPanel" class="mt-2 text-sm text-muted"></div>
    </section>
    <!-- Collapse tab (expanded state) -->
    <button aria-label="Collapse sidebar" on:click={() => { collapsed = true; invalidateSoon(); }}
      class="absolute top-1/2 -translate-y-1/2 -right-3 z-50 rounded-md border border-border bg-panel/90 backdrop-blur px-2 py-3 text-muted hover:text-white hover:bg-panel focus:outline-none focus:ring-2 focus:ring-accent/40 shadow">
      <!-- chevron-left icon -->
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="size-5" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.78 15.53a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 1 1 1.06 1.06L9.31 10l3.47 3.47a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd"/></svg>
    </button>
  </aside>

  <!-- Map -->
  <main id="main" class="relative flex-1 min-w-0">
    <div bind:this={mapDiv} id="map" class="absolute inset-0"></div>
    <a href="/" id="goHome" aria-label="Back to home"
      class="absolute top-3 right-3 z-[1000] rounded-full border border-border bg-panel/95 backdrop-blur px-3 py-2 text-sm text-white hover:bg-panel focus:outline-none focus:ring-2 focus:ring-accent/40 shadow-md flex items-center gap-2">
      <!-- home icon -->
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="size-5" viewBox="0 0 24 24"><path d="M12 3.172 3 10.5V21h6v-6h6v6h6V10.5L12 3.172z"/></svg>
      <span class="hidden sm:inline">Home</span>
    </a>
  </main>

  <!-- Expand tab (collapsed state) -->
  {#if collapsed}
    <button aria-label="Expand sidebar" on:click={() => { collapsed = false; invalidateSoon(); }}
      class="absolute top-1/2 -translate-y-1/2 left-0 z-50 rounded-md border border-border bg-panel/90 backdrop-blur px-2 py-3 text-muted hover:text-white hover:bg-panel focus:outline-none focus:ring-2 focus:ring-accent/40 shadow">
      <!-- chevron-right icon -->
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="size-5" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.22 4.47a.75.75 0 0 0 0 1.06L10.69 10l-3.47 3.47a.75.75 0 1 0 1.06 1.06l4-4a.75.75 0 0 0 0-1.06l-4-4a.75.75 0 0 0-1.06 0Z" clip-rule="evenodd"/></svg>
    </button>
  {/if}
</div>
