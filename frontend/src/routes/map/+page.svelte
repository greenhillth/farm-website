<script lang="ts">
  import { onMount } from 'svelte';
  import L from 'leaflet';
  import CONFIG from '$lib/config';
  import { buildMetricLayer } from '$lib/layers';
  import { renderMetricNav, setActiveMetric, renderLegend } from '$lib/ui';

  let mapDiv: HTMLDivElement;
  let sidebar: HTMLElement;
  let metricNav: HTMLElement;
  let legendPanel: HTMLElement;

  onMount(async () => {
    // Init map
    const map = L.map(mapDiv).setView([-41.2, 146.4], 14); // start coords
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
    let { layer, legend } = buildMetricLayer(geojson, active, optima, CONFIG);
    layer.addTo(map);
    renderLegend(legendPanel, legend);
    renderMetricNav(metricNav, CONFIG.metrics, active, (m) => {
      active = m;
      map.removeLayer(layer);
      const result = buildMetricLayer(geojson, active, optima, CONFIG);
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

    // Sidebar toggle
    const collapseBtn = document.getElementById('collapseSidebar');
    const openBtn = document.getElementById('openSidebar');
    collapseBtn?.addEventListener('click', () => {
      sidebar.style.width = '0';
      sidebar.style.padding = '0';
      sidebar.style.opacity = '0';
      openBtn?.classList.remove('hidden');
    });
    openBtn?.addEventListener('click', () => {
      sidebar.style.width = '20rem';
      sidebar.style.padding = '1rem';
      sidebar.style.opacity = '1';
      openBtn?.classList.add('hidden');
    });
  });
</script>

<div id="app" class="flex h-dvh">
  <!-- Sidebar -->
  <aside bind:this={sidebar} id="sidebar"
    class="bg-panel border-r border-border overflow-auto w-80 shrink-0 transition-[width,opacity,padding] duration-300 ease-in-out p-4">
    <header class="flex items-center justify-between gap-2 mb-3">
      <div class="flex items-center gap-2">
        <img src="/img/logo.png" alt="" class="size-7" />
        <h1 class="text-lg font-semibold">Greenhill Bros Farm</h1>
      </div>
      <button id="collapseSidebar"
        class="rounded-md px-2 py-1 text-sm text-muted hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-accent/40">
        <!-- chevron-left icon -->
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="size-5" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.78 15.53a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 1 1 1.06 1.06L9.31 10l3.47 3.47a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd"/></svg>
      </button>
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
  </aside>

  <!-- Map -->
  <main id="main" class="relative flex-1 min-w-0">
    <div bind:this={mapDiv} id="map" class="absolute inset-0"></div>
    <button id="openSidebar"
      class="hidden absolute top-3 left-3 z-50 rounded-full border border-border bg-panel/80 backdrop-blur px-3 py-2 text-sm text-muted hover:text-white hover:bg-panel/95 focus:outline-none focus:ring-2 focus:ring-accent/40">
      <!-- bars icon -->
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="size-5" viewBox="0 0 24 24"><path d="M3.75 5.25h16.5v1.5H3.75zM3.75 11.25h16.5v1.5H3.75zM3.75 17.25h16.5v1.5H3.75z"/></svg>
    </button>
  </main>
</div>
