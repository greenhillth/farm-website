import { linearGradientCSS } from "./utils.js";

export function buildMetricLayer(geojson, metric, optima, cfg) {
  const low = optima[metric][0],
    high = optima[metric][1];
  // compute vmin/vmax centred at mid with maxDevFactor
  const values = geojson.features
    .map((f) => Number(f.properties?.[metric]))
    .filter((v) => Number.isFinite(v));
  const mid = (low + high) / 2;
  const half = (high - low) / 2 || 1e-9;
  const obsMin = Math.min(...values),
    obsMax = Math.max(...values);
  const halfExtent = Math.max(
    half * cfg.maxDevFactor,
    Math.abs(obsMin - mid),
    Math.abs(obsMax - mid)
  );
  const vmin = mid - halfExtent,
    vmax = mid + halfExtent;

  const stops = [vmin, low, mid, high, vmax];
  const pct = (x) => (100 * (x - vmin)) / (vmax - vmin);
  const stopsPct = stops.map(pct);

  // Leaflet layer
  const layer = L.geoJSON(geojson, {
    style: (f) => {
      const v = Number(f.properties?.[metric]);
      if (!Number.isFinite(v))
        return {
          color: "#333",
          weight: 0.5,
          fillColor: "#e5e7eb",
          fillOpacity: 0.4,
        };
      const t = (v - vmin) / (vmax - vmin);
      const color = sampleRamp(cfg.palette, t);
      return {
        color: "#333",
        weight: 0.5,
        fillColor: color,
        fillOpacity: 0.85,
      };
    },
    onEachFeature: (f, lyr) => {
      const name = f.properties.fieldName ?? f.properties.fieldID ?? "Field";
      lyr.bindTooltip(
        `${name}<br>${metric}: ${f.properties?.[metric] ?? "–"}`,
        { sticky: false }
      );
    },
  });

  const legend = {
    title: metric,
    ticks: { vmin, low, mid, high, vmax },
    gradientCSS: linearGradientCSS(cfg.palette, [
      0,
      pct(low),
      pct(mid),
      pct(high),
      100,
    ]),
  };

  return { layer, legend };
}

// simple 5-stop interpolation (no external lib)
function sampleRamp(colors, t) {
  if (t <= 0) return colors[0];
  if (t >= 1) return colors[colors.length - 1];
  const pos = t * (colors.length - 1);
  const i = Math.floor(pos),
    frac = pos - i;
  return mixHex(colors[i], colors[i + 1], frac);
}
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16),
    pb = parseInt(b.slice(1), 16);
  const ra = (pa >> 16) & 255,
    ga = (pa >> 8) & 255,
    ba = pa & 255;
  const rb = (pb >> 16) & 255,
    gb = (pb >> 8) & 255,
    bb = pb & 255;
  const r = Math.round(ra + (rb - ra) * t),
    g = Math.round(ga + (gb - ga) * t),
    bch = Math.round(ba + (bb - ba) * t);
  return "#" + [r, g, bch].map((x) => x.toString(16).padStart(2, "0")).join("");
}
