import type { PathOptions } from 'leaflet';

import { linearGradientCSS } from './utils';

export const DEFAULT_PADDOCK_STYLE = {
  color: "#374151",
  weight: 1,
  fillColor: "#6b7280",
  fillOpacity: 0.85,
};

const DEFAULT_HOVER_STYLE = {
  weight: 2,
  fillOpacity: 0.95,
};

/** Build a colored GeoJSON layer + legend for a given metric. */
export function buildMetricLayer(
  geojson: any,
  metric: string,
  optima: Record<string, [number, number]>,
  cfg: { palette: string[]; maxDevFactor: number },
  L: typeof import('leaflet')
): {
  layer: any;
  legend: { title: string; gradientCSS: string; ticks: Record<string, number> };
} {
  const [low, high] = optima[metric];
  const values = geojson.features
    .map((f: any) => Number(f.properties?.[metric]))
    .filter((v: number) => Number.isFinite(v));

  const mid = (low + high) / 2;
  const half = (high - low) / 2 || 1e-9;

  const obsMin = Math.min(...values);
  const obsMax = Math.max(...values);

  const halfExtent = Math.max(
    half * cfg.maxDevFactor,
    Math.abs(obsMin - mid),
    Math.abs(obsMax - mid)
  );
  const vmin = mid - halfExtent;
  const vmax = mid + halfExtent;

  const clamp = (x: number) => Math.max(vmin, Math.min(vmax, x));
  const t = (x: number) => (clamp(x) - vmin) / (vmax - vmin); // 0..1

  // five-stop palette: low .. high around mid
  const stops = [vmin, low, mid, high, vmax];
  const stopsPct = stops.map((x) => (100 * (x - vmin)) / (vmax - vmin));
  const gradientCSS = linearGradientCSS(cfg.palette, stopsPct);

  // simple 0..1 → color interpolation over 4 segments
  function lerpColor(a: string, b: string, u: number) {
    const pa = parseInt(a.slice(1), 16),
      pb = parseInt(b.slice(1), 16);
    const ra = (pa >> 16) & 255,
      ga = (pa >> 8) & 255,
      ba = pa & 255;
    const rb = (pb >> 16) & 255,
      gb = (pb >> 8) & 255,
      bb = pb & 255;
    const r = Math.round(ra + (rb - ra) * u);
    const g = Math.round(ga + (gb - ga) * u);
    const bch = Math.round(ba + (bb - ba) * u);
    return `#${[r, g, bch]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")}`;
  }

  function colorFor(x: number) {
    const u = t(x);
    const idx = Math.min(3, Math.max(0, Math.floor(u * 4))); // 0..3 segment
    const localU = u * 4 - idx;
    return lerpColor(cfg.palette[idx], cfg.palette[idx + 1], localU);
  }

  // Leaflet style function
  // @ts-ignore
  const layer = L.geoJSON(geojson, {
    style: (f: any) => {
      const v = Number(f.properties?.[metric]);
      if (!Number.isFinite(v))
        return { color: "#555", weight: 1, fillOpacity: 0.1 };
      return {
        color: "#00000000",
        weight: 0,
        fillColor: colorFor(v),
        fillOpacity: 0.8,
      };
    },
  });

  const legend = {
    title: `${metric} (optimal ${Math.round(low)}–${Math.round(high)})`,
    gradientCSS,
    ticks: { vmin, low, mid, high, vmax },
  };
  return { layer, legend };
}

export function buildBaseLayer(
  geojson: any,
  L: typeof import("leaflet")
) {
  return L.geoJSON(geojson, {
    style: () => ({ ...DEFAULT_PADDOCK_STYLE }),
    onEachFeature: (feature: any, layer: any) => {
      const typedLayer = layer as typeof layer & {
        __baseStyle?: PathOptions;
      };
      typedLayer.__baseStyle = { ...DEFAULT_PADDOCK_STYLE };

      const props = feature?.properties ?? {};
      const name =
        props.FIELDNAME ?? props.fieldName ?? props.FIELD_NAME ?? "Unnamed paddock";
      const id = props.ADSFLDID ?? props.fieldID ?? props.id ?? "–";

      const tooltip = `<div><strong>${name}</strong></div><div>ID: ${id}</div>`;
      if ("bindTooltip" in layer && typeof (layer as any).bindTooltip === "function") {
        (layer as any).bindTooltip(tooltip, {
          sticky: true,
          direction: "top",
          className: "paddock-tooltip",
          opacity: 0.95,
        });
      }

      if ("setStyle" in layer && typeof (layer as any).setStyle === "function") {
        layer.on("mouseover", () => {
          const base = typedLayer.__baseStyle ?? DEFAULT_PADDOCK_STYLE;
          (layer as any).setStyle({
            ...base,
            weight: DEFAULT_HOVER_STYLE.weight,
            fillOpacity: Math.min(1, DEFAULT_HOVER_STYLE.fillOpacity),
          });
          if ("bringToFront" in layer && typeof (layer as any).bringToFront === "function") {
            (layer as any).bringToFront();
          }
        });
        layer.on("mouseout", () => {
          const base = typedLayer.__baseStyle ?? DEFAULT_PADDOCK_STYLE;
          (layer as any).setStyle(base);
        });
      }
    },
  });
}
