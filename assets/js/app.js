import CONFIG from "./config.js";
import { $ } from "./utils.js";
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
  // --- Load bounds + data
  let farmBounds = null;
  try {
    farmBounds = await loadJSON(CONFIG.data.bounds);
  } catch {
    /* optional */
  }

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

  // ESRI World Imagery
  L.tileLayer(CONFIG.tiles.url, {
    attribution: CONFIG.tiles.attribution,
    maxZoom: CONFIG.tiles.maxZoom ?? 20,
  }).addTo(map);

  // Fit view
  if (Array.isArray(farmBounds) && farmBounds.length === 2) {
    map.fitBounds(farmBounds);
  } else if (geojson) {
    const b = L.geoJSON(geojson).getBounds();
    if (b && b.isValid()) map.fitBounds(b);
  } else {
    map.setView([0, 0], 2);
  }

  // --- Active metric/layer
  let activeMetric = CONFIG.defaultMetric;
  let activeLayer = null;

  // Sidebar nav/legend
  const legendPanel = $("#legendPanel");
  const navEl = $("#metricNav");

  renderMetricNav(navEl, CONFIG.metrics, activeMetric);
  bindMetricNav(navEl, (metric) => {
    if (metric !== activeMetric) activateMetric(metric);
  });

  $("#fitBounds").addEventListener("click", () => {
    if (farmBounds) map.fitBounds(farmBounds);
  });

  $("#showLabels").addEventListener("change", () => {
    if (!activeLayer) return;
    const show = $("#showLabels").checked;
    activeLayer.eachLayer((l) => {
      l.unbindTooltip?.();
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

  function activateMetric(metric) {
    if (!geojson || !optima || !optima[metric]) return;
    if (activeLayer) {
      map.removeLayer(activeLayer);
      activeLayer = null;
    }
    activeMetric = metric;
    const { layer, legend } = buildMetricLayer(geojson, metric, optima, CONFIG);
    activeLayer = layer.addTo(map);
    renderLegend(legendPanel, legend);
    setActiveMetric(navEl, metric);

    // Respect "Show labels"
    if (!$("#showLabels").checked) {
      activeLayer.eachLayer((l) => l.unbindTooltip && l.unbindTooltip());
    }
  }

  // Initial paint
  activateMetric(activeMetric);

  // --- Embed etiquette (hover-only wheel zoom)
  const qs = new URLSearchParams(location.search);
  if (qs.has("embed")) {
    document.body.style.overflow = "hidden";
    const el = map.getContainer();
    map.scrollWheelZoom.disable();
    el.addEventListener("mouseenter", () => map.scrollWheelZoom.enable());
    el.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());
    setTimeout(() => map.invalidateSize(false), 200);
  }

  // --- Sidebar collapse logic
  const sidebar = document.getElementById("sidebar");
  const collapse = document.getElementById("collapseSidebar");
  const reopenBtn = document.getElementById("openSidebar");
  const mainPane = document.getElementById("main"); // ensure <main id="main" class="relative flex-1 min-w-0">

  function setCollapsed(collapsed) {
    if (collapsed) {
      // remove wide classes; add collapsed classes
      sidebar.classList.remove("w-80", "p-4", "border-r");
      sidebar.classList.add(
        "w-0",
        "p-0",
        "opacity-0",
        "pointer-events-none",
        "border-r-0"
      );
      reopenBtn.classList.remove("hidden");
      reopenBtn.setAttribute("aria-expanded", "false");
    } else {
      sidebar.classList.remove(
        "w-0",
        "p-0",
        "opacity-0",
        "pointer-events-none",
        "border-r-0"
      );
      sidebar.classList.add("w-80", "p-4", "border-r");
      reopenBtn.classList.add("hidden");
      reopenBtn.setAttribute("aria-expanded", "true");
    }
  }

  // Invalidate when the width transition completes (and coalesce multi-prop events)
  let transitionTimer = null;
  sidebar.addEventListener("transitionend", (e) => {
    if (e.target !== sidebar) return;
    // coalesce any padding/opacity events into one invalidate
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => map.invalidateSize(false), 0);
  });

  // Also react to container size changes
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => map.invalidateSize(false)).observe(mainPane);
  } else {
    window.addEventListener("resize", () => map.invalidateSize(false));
  }

  // Initial state (collapsed for ?sidebar=0 or ?embed=1)
  let collapsed = qs.get("sidebar") === "0" || qs.has("embed");
  setCollapsed(collapsed);

  // First-paint nudges (helps Safari/Firefox with flex transitions)
  requestAnimationFrame(() => map.invalidateSize(false));
  setTimeout(() => map.invalidateSize(false), 50);

  // Buttons + keyboard toggle
  collapse.addEventListener("click", () => {
    collapsed = true;
    setCollapsed(true);
  });
  reopenBtn.addEventListener("click", () => {
    collapsed = false;
    setCollapsed(false);
  });
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "s" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      collapsed = !collapsed;
      setCollapsed(collapsed);
    }
  });
})();
