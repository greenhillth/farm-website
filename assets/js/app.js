import CONFIG from "./config.js";
import { $, fmt } from "./utils.js";
import { buildMetricLayer } from "./layers.js";
import {
  renderMetricNav,
  bindMetricNav,
  setActiveMetric,
  renderLegend,
} from "./ui.js";

async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
  return r.json();
}

(async function () {
  // --- Load bounds and data needed for shading
  let farmBounds = null;
  try {
    farmBounds = await loadJSON(CONFIG.data.bounds);
  } catch {}
  const [geojson, optima] = await Promise.all([
    loadJSON(CONFIG.data.geojson).catch(() => null),
    loadJSON(CONFIG.data.optima).catch(() => null),
  ]);

  // --- Map (wheel zoom on by default)
  const map = L.map("map", {
    scrollWheelZoom: true,
    wheelDebounceTime: 40,
    wheelPxPerZoomLevel: 60,
  });

  // ESRI World Imagery basemap
  L.tileLayer(CONFIG.tiles.url, {
    attribution: CONFIG.tiles.attribution,
    maxZoom: CONFIG.tiles.maxZoom ?? 20,
  }).addTo(map);

  // Fit to farm
  if (Array.isArray(farmBounds) && farmBounds.length === 2) {
    map.fitBounds(farmBounds);
  } else if (geojson) {
    const b = L.geoJSON(geojson).getBounds();
    if (b && b.isValid()) map.fitBounds(b);
  } else {
    map.setView([0, 0], 2);
  }

  // --- Active metric + layer
  let activeMetric = CONFIG.defaultMetric;
  let activeLayer = null;

  const legendPanel = $("#legendPanel");
  const navEl = $("#metricNav");

  // Build initial nav
  renderMetricNav(navEl, CONFIG.metrics, activeMetric);
  bindMetricNav(navEl, (metric) => {
    if (metric === activeMetric) return;
    activateMetric(metric);
  });

  // Controls
  $("#fitBounds").addEventListener("click", () => {
    if (farmBounds) map.fitBounds(farmBounds);
  });

  $("#showLabels").addEventListener("change", () => {
    // rebind tooltips for current layer
    if (!activeLayer) return;
    const show = $("#showLabels").checked;
    activeLayer.eachLayer((l) => {
      if (!l.feature) return;
      l.unbindTooltip();
      if (show) {
        const f = l.feature;
        const name = f.properties.fieldName ?? f.properties.fieldID ?? "Field";
        const val = f.properties?.[activeMetric];
        l.bindTooltip(`${name}<br>${activeMetric}: ${val ?? "–"}`, {
          sticky: false,
        });
      }
    });
  });

  // Embed etiquette
  const qs = new URLSearchParams(location.search);
  if (qs.has("embed")) {
    document.body.style.overflow = "hidden";
    const el = map.getContainer();
    map.scrollWheelZoom.disable();
    el.addEventListener("mouseenter", () => map.scrollWheelZoom.enable());
    el.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());
    setTimeout(() => map.invalidateSize(), 200);
  }

  // --- Activate one metric (create layer if needed)
  function activateMetric(metric) {
    if (!geojson || !optima || !optima[metric]) {
      console.warn("Missing data/optima for metric", metric);
      return;
    }
    // remove previous
    if (activeLayer) {
      map.removeLayer(activeLayer);
      activeLayer = null;
    }
    activeMetric = metric;

    const { layer, legend } = buildMetricLayer(geojson, metric, optima, CONFIG);
    activeLayer = layer.addTo(map);
    renderLegend(legendPanel, legend);
    setActiveMetric(navEl, metric);

    // respect Show labels toggle
    if (!$("#showLabels").checked) {
      activeLayer.eachLayer((l) => l.unbindTooltip && l.unbindTooltip());
    }
  }

  // Initial render
  activateMetric(activeMetric);
})();
