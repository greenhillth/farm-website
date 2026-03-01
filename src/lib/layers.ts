import type { PathOptions } from 'leaflet';

import { linearGradientCSS } from './utils';

// ─── Title-boundary related types ──────────────────────────────────────────

export type TitleFeatureProperties = {
	objectID: number;
	pid: number;
	potPid: number;
	volume: string;
	folio: number;
	titleRef: string;
	address: string;
	ownershipPct: string;
	owners: string[];
};

/** Colour palette for ownership-based fills */
const TITLE_OWNERSHIP_COLORS: Record<string, string> = {
	'100%': '#2563eb',
	'50%': '#9333ea',
	'33%': '#dc2626'
};
const TITLE_DEFAULT_COLOR = '#0891b2';

export const DEFAULT_TITLE_STYLE: PathOptions = {
	color: '#facc15',
	weight: 2,
	fillColor: TITLE_DEFAULT_COLOR,
	fillOpacity: 0.18,
	dashArray: '6 4'
};

const TITLE_HOVER_STYLE: Partial<PathOptions> = {
	weight: 3,
	fillOpacity: 0.35
};

/**
 * Format the owners array into readable names.
 * The API returns alternating first/last pairs: ["Stuart","Greenhill","Matthew","Greenhill"]
 */
export function formatOwners(owners: string[]): string {
	if (!Array.isArray(owners) || owners.length === 0) return 'Unknown';
	const names: string[] = [];
	for (let i = 0; i < owners.length; i += 2) {
		const first = owners[i] ?? '';
		const last = owners[i + 1] ?? '';
		names.push(`${first} ${last}`.trim());
	}
	return names.filter(Boolean).join(', ') || 'Unknown';
}

function titleFillColor(ownershipPct: string): string {
	return TITLE_OWNERSHIP_COLORS[ownershipPct] ?? TITLE_DEFAULT_COLOR;
}

function buildTitleTooltipHtml(props: TitleFeatureProperties): string {
	const ownerNames = formatOwners(props.owners);
	const parts: string[] = [
		`<div><strong>${props.address || 'Untitled property'}</strong></div>`,
		`<div>Owners: ${ownerNames}</div>`,
		`<div>Ownership: ${props.ownershipPct || '–'}</div>`,
		`<div class="text-[0.7rem] opacity-80">Title: ${props.titleRef || '–'}</div>`
	];
	return parts.join('');
}

/** Build a GeoJSON layer for title boundary polygons. */
export function buildTitleLayer(
	geojson: any,
	L: typeof import('leaflet'),
	onClick?: (props: TitleFeatureProperties, latlng: L.LatLng) => void
) {
	return L.geoJSON(geojson, {
		style: (feature: any) => {
			const pct: string = feature?.properties?.ownershipPct ?? '';
			return {
				...DEFAULT_TITLE_STYLE,
				fillColor: titleFillColor(pct)
			};
		},
		onEachFeature: (feature: any, layer: any) => {
			const props = (feature?.properties ?? {}) as TitleFeatureProperties;
			const typedLayer = layer as typeof layer & { __baseStyle?: PathOptions };
			const baseStyle = {
				...DEFAULT_TITLE_STYLE,
				fillColor: titleFillColor(props.ownershipPct ?? '')
			};
			typedLayer.__baseStyle = baseStyle;

			const tooltipHtml = buildTitleTooltipHtml(props);
			if (typeof layer.bindTooltip === 'function') {
				layer.bindTooltip(tooltipHtml, {
					sticky: true,
					direction: 'top',
					className: 'title-tooltip',
					opacity: 0.95
				});
			}

			if (typeof layer.setStyle === 'function') {
				layer.on('mouseover', () => {
					layer.setStyle({
						...baseStyle,
						...TITLE_HOVER_STYLE
					});
					if (typeof layer.bringToFront === 'function') {
						layer.bringToFront();
					}
				});
				layer.on('mouseout', () => {
					layer.setStyle(baseStyle);
				});
			}

			if (onClick && typeof layer.on === 'function') {
				layer.on('click', (e: any) => {
					onClick(props, e.latlng);
				});
			}
		}
	});
}

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