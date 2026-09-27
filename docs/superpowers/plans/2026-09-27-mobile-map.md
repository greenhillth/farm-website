# Map on phones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Before creating or editing any `.svelte` file or `.svelte.ts` module, load the `svelte:svelte-code-writer` skill and use its documentation lookup and autofixer; every `.svelte` file you change must come back clean from the autofixer. Before building or changing visible UI, load `frontend-design:frontend-design` and read `docs/superpowers/specs/2026-09-27-ui-direction.md`; the direction document wins where they disagree.

**Goal:** On a phone, opening `/map` shows the map with a row of metric chips; tapping a paddock (or locating yourself) opens a sheet with that paddock's soil status; desktop keeps its sidebar, now with search.

**Architecture:** The 1,070-line legacy `src/routes/map/+page.svelte` becomes a runes orchestrator. Pure logic moves into tested modules (`src/lib/geo.ts`, `src/routes/map/soil-status.ts`), and the UI splits into focused components under `src/routes/map/components/`. Leaflet stays imperative: the map is created in an attachment, and `$effect`s push state (base layer, visibility, styles, selection, the user's position) into it. Layout switches on `MediaQuery('min-width: 48rem')`.

**Tech Stack:** Svelte 5.57 (runes, snippets, attachments, `svelte/reactivity` `MediaQuery`, `$app/state`, `$app/navigation` `replaceState`), SvelteKit 2.70, Leaflet 1.9, Tailwind 4, Vitest 5 (`server` project for `*.test.ts`, `client` project for `*.svelte.test.ts` in headless Chromium with `vitest-browser-svelte`).

**Spec:** `docs/superpowers/specs/2026-09-27-mobile-map-design.md` and `docs/superpowers/specs/2026-09-27-ui-direction.md`. Read both before starting. UX 1 (app shell, `$lib/soil-status`, `StatusBadge`, `scripts/screenshot.mjs`) is already on `staging`.

## Global Constraints

- Work only in your own worktree under `.claude/worktrees/`. Never edit or switch branches in the main checkout (`/home/tom/gbros/farm-website`).
- Setup: run `npm ci` in the worktree. If it fails with `Tsconfig not found .../.svelte-kit/tsconfig.json`, run `npx svelte-kit sync` in the main checkout and retry. Run `npx playwright install chromium` if browser tests say Chromium is missing.
- Before your first commit, move off the `worktree-<name>` branch: `git fetch origin`, `git switch --no-track -c feat/mobile-map origin/staging`, then `git branch -d <the worktree-… branch>`.
- Before changing anything, record the ESLint baseline: `npx eslint src 2>&1 | tail -3`. At the end, the error count must be less than or equal to it.
- Runes only in new or rewritten Svelte code: no `export let`, `$:`, `<slot>`, `on:`, `use:`, `createEventDispatcher`, `class:` or `$app/stores`. Leaflet objects go in `$state.raw` (never deep `$state`, which would proxy them).
- Internal links use `resolve()` from `$app/paths`. External links use `target="_blank" rel="external noopener noreferrer"` and a visually hidden "(opens in a new tab)".
- The shell renders the app's only `<main>`. The page has exactly one `<h1>`.
- Smallest text is 12px (`text-xs`): no `text-[10px]`/`text-[11px]` anywhere under `src/routes/map/`. Interactive elements are at least 44×44px (`min-h-11`, `size-11`); list rows in sheets are 48px (`min-h-12`). No `→` appended to link text, no ALL-CAPS labels (`uppercase`, `tracking-wider`) under `src/routes/map/`.
- Status is never colour alone: use `StatusBadge` (word plus dot).
- Motion only on action: sheets slide up in 180ms `ease-out`, and nothing animates under `prefers-reduced-motion: reduce`.
- Component tests import `src/app.css` (relative path) when the component has icon-only buttons: without the stylesheet an unsized SVG renders at 300×150 and clicks miss the button.
- In component tests, images use `data:` URIs, and `$app/paths` is mocked: `vi.mock('$app/paths', () => ({ resolve: (path: string) => path }))`.
- Prettier: tabs, single quotes, no trailing commas, width 100. Run `npx prettier --write` on the files you touch.
- Files you may touch: `src/routes/map/**`, `src/lib/geo.ts`, `src/lib/geo.test.ts`, `src/lib/layers.ts`, and the `<script>` geometry helpers of `src/routes/paddocks/+page.svelte`. UX 3 owns `src/routes/soiltests/**` and `src/lib/soil-tests/**`; UX 4 owns `src/app.css`, `src/lib/config.ts`, weather and the home page. Don't touch them.
- Before pushing: `npm run check`, `npm test`, `npx prettier --check .`, `npm run build`, `scripts/smoke-test.sh --local` must all pass.
- Push the branch and open a PR into `staging` (`--base staging`) that says `Closes #16`. Don't merge it.

## Review Focus

1. The latest soil tests request fails or returns something other than a list (the smoke test's stub echoes an object) → the map still draws every paddock in the no-data style, and a selected paddock's sheet says "Soil data unavailable" with a Retry button (Task 7 page test).
2. `/map?paddock=` with an ID that isn't on the map, or isn't a number → ignored: no sheet, no error, the map still fits the farm (Task 7 page test).
3. A GeoJSON feature with no usable field ID → still drawn and coloured, but not offered in search and not selectable (Task 2 and Task 7 tests).
4. Pressing Escape while the search suggestions are open → closes only the suggestions; the sheet around the search stays open until a second Escape (Task 4 and Task 7 tests).
5. Location permission denied, or the page served over plain `http` on the LAN → a plain message ("Location is turned off for this site.") or no locate button at all, never a stuck spinner (Task 6 tests).

---

### Task 1: Geometry module

Move the paddock area and centroid helpers out of `/paddocks` and add point-in-polygon lookup for "which paddock am I in".

**Files:**

- Create: `src/lib/geo.ts`
- Create: `src/lib/geo.test.ts`
- Modify: `src/routes/paddocks/+page.svelte` (script: delete the local geometry helpers, import them)

**Interfaces:**

- Produces (`src/lib/geo.ts`):
  - `type Position = [number, number]` (GeoJSON order: `[lon, lat]`)
  - `type GeometryLike = { type: string; coordinates?: unknown } | null | undefined`
  - `type GeoFeature = { geometry?: GeometryLike }`
  - `ringArea(coords: Position[]): number` (signed, m²)
  - `polygonArea(coords: Position[][]): number` (m², holes subtracted, never negative)
  - `geometryArea(geometry: GeometryLike): number` (m², 0 for anything but Polygon/MultiPolygon)
  - `geometryCentroid(geometry: GeometryLike): { lon: number; lat: number } | null`
  - `pointInGeometry(lat: number, lon: number, geometry: GeometryLike): boolean`
  - `findPaddockAt<F extends GeoFeature>(lat: number, lon: number, features: readonly F[]): F | null`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/geo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
	findPaddockAt,
	geometryArea,
	geometryCentroid,
	pointInGeometry,
	type Position
} from './geo';

// A 0.01° square at the equator: R² · Δλ · (sin φ2 − sin φ1) ≈ 1,239,203 m².
const square = (x: number, y: number, size: number): Position[] => [
	[x, y],
	[x + size, y],
	[x + size, y + size],
	[x, y + size],
	[x, y]
];
const polygon = { type: 'Polygon', coordinates: [square(0, 0, 0.01)] };
const withHole = {
	type: 'Polygon',
	coordinates: [square(0, 0, 0.01), square(0.004, 0.004, 0.002)]
};
const multi = {
	type: 'MultiPolygon',
	coordinates: [[square(0, 0, 0.01)], [square(0.02, 0, 0.01)]]
};

describe('geometryArea', () => {
	it('measures a known square in square metres', () => {
		expect(geometryArea(polygon) / 1e6).toBeCloseTo(1.2392, 3);
	});

	it('subtracts holes', () => {
		const hole = geometryArea({ type: 'Polygon', coordinates: [square(0.004, 0.004, 0.002)] });
		expect(geometryArea(withHole)).toBeCloseTo(geometryArea(polygon) - hole, 0);
	});

	it('adds the parts of a MultiPolygon', () => {
		expect(geometryArea(multi)).toBeCloseTo(2 * geometryArea(polygon), -1);
	});

	it('is 0 for missing or unsupported geometry', () => {
		expect(geometryArea(null)).toBe(0);
		expect(geometryArea({ type: 'Point', coordinates: [0, 0] })).toBe(0);
	});
});

describe('geometryCentroid', () => {
	it('finds the middle of a square', () => {
		const centroid = geometryCentroid({ type: 'Polygon', coordinates: [square(0, 0, 2)] });
		expect(centroid?.lon).toBeCloseTo(1, 6);
		expect(centroid?.lat).toBeCloseTo(1, 6);
	});

	it('returns null without geometry', () => {
		expect(geometryCentroid(undefined)).toBeNull();
	});
});

describe('pointInGeometry', () => {
	it('is true inside and false outside a polygon', () => {
		expect(pointInGeometry(0.005, 0.005, polygon)).toBe(true);
		expect(pointInGeometry(0.02, 0.005, polygon)).toBe(false);
	});

	it('is false inside a hole', () => {
		expect(pointInGeometry(0.005, 0.005, withHole)).toBe(false);
		expect(pointInGeometry(0.001, 0.001, withHole)).toBe(true);
	});

	it('finds a point in the second part of a MultiPolygon', () => {
		expect(pointInGeometry(0.005, 0.025, multi)).toBe(true);
		expect(pointInGeometry(0.005, 0.015, multi)).toBe(false);
	});

	it('is false for missing or unsupported geometry', () => {
		expect(pointInGeometry(0, 0, null)).toBe(false);
		expect(pointInGeometry(0, 0, { type: 'LineString', coordinates: [] })).toBe(false);
	});
});

describe('findPaddockAt', () => {
	const features = [
		{ id: 'a', geometry: polygon },
		{ id: 'b', geometry: { type: 'Polygon', coordinates: [square(0.02, 0, 0.01)] } }
	];

	it('returns the first feature containing the point', () => {
		expect(findPaddockAt(0.005, 0.025, features)?.id).toBe('b');
	});

	it('returns null outside every feature', () => {
		expect(findPaddockAt(1, 1, features)).toBeNull();
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project server src/lib/geo.test.ts`
Expected: FAIL, "Failed to resolve import './geo'".

- [ ] **Step 3: Create `src/lib/geo.ts`**

The area and centroid code is moved unchanged from `src/routes/paddocks/+page.svelte`, apart from exports and types.

```ts
/** GeoJSON coordinate order: [longitude, latitude]. */
export type Position = [number, number];
export type GeometryLike = { type: string; coordinates?: unknown } | null | undefined;
export type GeoFeature = { geometry?: GeometryLike };

const EARTH_RADIUS = 6378137;

const toRadians = (value: number) => (value * Math.PI) / 180;

function ensureClosed(coords: Position[]): Position[] {
	if (coords.length === 0) return coords;
	const [firstLon, firstLat] = coords[0];
	const [lastLon, lastLat] = coords[coords.length - 1];
	if (firstLon === lastLon && firstLat === lastLat) return coords;
	return [...coords, coords[0]];
}

/** Signed spherical area of a ring in square metres. */
export function ringArea(coords: Position[]): number {
	const ring = ensureClosed(coords);
	if (ring.length < 3) return 0;
	let total = 0;
	for (let i = 0; i < ring.length - 1; i += 1) {
		const [lon1, lat1] = ring[i];
		const [lon2, lat2] = ring[i + 1];
		total += toRadians(lon2 - lon1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
	}
	return (total * EARTH_RADIUS * EARTH_RADIUS) / 2;
}

/** Outer ring minus holes, in square metres. */
export function polygonArea(coords: Position[][]): number {
	if (!coords || coords.length === 0) return 0;
	let area = Math.abs(ringArea(coords[0] ?? []));
	for (let i = 1; i < coords.length; i += 1) {
		area -= Math.abs(ringArea(coords[i] ?? []));
	}
	return Math.max(area, 0);
}

export function geometryArea(geometry: GeometryLike): number {
	if (!geometry) return 0;
	if (geometry.type === 'Polygon') {
		return polygonArea(geometry.coordinates as Position[][]);
	}
	if (geometry.type === 'MultiPolygon') {
		return (geometry.coordinates as Position[][][]).reduce(
			(sum, polygon) => sum + polygonArea(polygon),
			0
		);
	}
	return 0;
}

function polygonCentroid(coords: Position[][]): { lon: number; lat: number } | null {
	const outer = coords?.[0];
	if (!outer || outer.length < 3) return null;
	const ring = ensureClosed(outer);
	let twiceArea = 0;
	let cx = 0;
	let cy = 0;
	for (let i = 0; i < ring.length - 1; i += 1) {
		const [x1, y1] = ring[i];
		const [x2, y2] = ring[i + 1];
		const cross = x1 * y2 - x2 * y1;
		twiceArea += cross;
		cx += (x1 + x2) * cross;
		cy += (y1 + y2) * cross;
	}
	const area = twiceArea / 2;
	if (!Number.isFinite(area) || Math.abs(area) < 1e-12) {
		const unique = ring.slice(0, -1);
		if (unique.length === 0) return null;
		const sum = unique.reduce(
			(acc, point) => ({ lon: acc.lon + point[0], lat: acc.lat + point[1] }),
			{ lon: 0, lat: 0 }
		);
		return { lon: sum.lon / unique.length, lat: sum.lat / unique.length };
	}
	return { lon: cx / (6 * area), lat: cy / (6 * area) };
}

export function geometryCentroid(geometry: GeometryLike): { lon: number; lat: number } | null {
	if (!geometry) return null;
	if (geometry.type === 'Polygon') {
		return polygonCentroid(geometry.coordinates as Position[][]);
	}
	if (geometry.type === 'MultiPolygon') {
		let totalArea = 0;
		let lonSum = 0;
		let latSum = 0;
		for (const polygon of geometry.coordinates as Position[][][]) {
			const area = polygonArea(polygon);
			const centroid = polygonCentroid(polygon);
			if (!centroid) continue;
			if (area > 0) {
				lonSum += centroid.lon * area;
				latSum += centroid.lat * area;
				totalArea += area;
			}
		}
		if (totalArea > 0) {
			return { lon: lonSum / totalArea, lat: latSum / totalArea };
		}
		const centroids = (geometry.coordinates as Position[][][])
			.map((polygon) => polygonCentroid(polygon))
			.filter((value): value is { lon: number; lat: number } => Boolean(value));
		if (centroids.length === 0) return null;
		const sum = centroids.reduce(
			(acc, point) => ({ lon: acc.lon + point.lon, lat: acc.lat + point.lat }),
			{ lon: 0, lat: 0 }
		);
		return { lon: sum.lon / centroids.length, lat: sum.lat / centroids.length };
	}
	return null;
}

/** Ray casting; points exactly on an edge may land either side, which is fine at paddock scale. */
function pointInRing(lon: number, lat: number, ring: Position[]): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
			inside = !inside;
		}
	}
	return inside;
}

function pointInPolygon(lon: number, lat: number, rings: Position[][]): boolean {
	if (!rings?.[0] || !pointInRing(lon, lat, rings[0])) return false;
	for (let i = 1; i < rings.length; i += 1) {
		if (pointInRing(lon, lat, rings[i])) return false;
	}
	return true;
}

export function pointInGeometry(lat: number, lon: number, geometry: GeometryLike): boolean {
	if (!geometry) return false;
	if (geometry.type === 'Polygon') {
		return pointInPolygon(lon, lat, geometry.coordinates as Position[][]);
	}
	if (geometry.type === 'MultiPolygon') {
		return (geometry.coordinates as Position[][][]).some((polygon) =>
			pointInPolygon(lon, lat, polygon)
		);
	}
	return false;
}

/** The first feature whose geometry contains the point, or null. */
export function findPaddockAt<F extends GeoFeature>(
	lat: number,
	lon: number,
	features: readonly F[]
): F | null {
	for (const feature of features) {
		if (pointInGeometry(lat, lon, feature.geometry)) return feature;
	}
	return null;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run --project server src/lib/geo.test.ts`
Expected: PASS.

- [ ] **Step 5: Use the module in `/paddocks`**

In `src/routes/paddocks/+page.svelte`, delete `type Position`, `EARTH_RADIUS`, `toRadians`, `ensureClosed`, `ringArea`, `polygonArea`, `geometryArea`, `polygonCentroid` and `geometryCentroid` from the script (keep the two `Intl.NumberFormat` formatters), and add:

```ts
import { geometryArea, geometryCentroid } from '$lib/geo';
```

Change nothing else in that file; it stays in legacy mode.

Run: `npm run check && npx vitest run --project server src/lib/geo.test.ts`
Expected: no errors, tests pass. With the backend running, `/paddocks` still lists sizes and coordinates.

- [ ] **Step 6: Commit**

```bash
git add src/lib/geo.ts src/lib/geo.test.ts src/routes/paddocks/+page.svelte
git commit -m "Move paddock geometry into \$lib/geo and add point-in-paddock lookup"
```

---

### Task 2: Soil rows for the paddock sheet

Move the "latest sample per paddock" index out of the page into a tested module, and add the rows the paddock sheet shows.

**Files:**

- Create: `src/routes/map/soil-status.ts`
- Create: `src/routes/map/soil-status.test.ts`

**Interfaces:**

- Consumes: `metricStatus`, `MetricStatus`, `extractFieldId`, `parseDateMs`, `pickMetricValue`, `SoilTestRecord` from `$lib/soil-status`; `NormalisedSoilSample`, `formatMetricValue` from `./helpers`.
- Produces (`src/routes/map/soil-status.ts`):
  - `type SoilRow = { id: MetricId; label: string; valueText: string; status: MetricStatus }`
  - `indexLatestSamples(records: unknown, metrics: readonly MetricOption[]): Map<number, NormalisedSoilSample>` (newest sample per field ID; empty map for non-arrays)
  - `paddockSoilSummary(sample: NormalisedSoilSample | undefined, metrics: readonly MetricOption[]): SoilRow[]`

- [ ] **Step 1: Write the failing tests**

Create `src/routes/map/soil-status.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import CONFIG from '$lib/config';
import { indexLatestSamples, paddockSoilSummary } from './soil-status';

const metrics = CONFIG.soilMetrics;

describe('indexLatestSamples', () => {
	it('keeps the newest sample for each paddock', () => {
		const index = indexLatestSamples(
			[
				{ fieldID: '42', sample_date: '2020-01-01', name_sample: 'old', ph_water: 5 },
				{ fieldID: '42', sample_date: '2024-05-01', name_sample: 'new', ph_water: 6.5 },
				{ fieldID: '7', sample_date: '2023-03-01', P: 30 }
			],
			metrics
		);

		expect(index.size).toBe(2);
		expect(index.get(42)?.sampleName).toBe('new');
		expect(index.get(42)?.metrics.pH).toBe(6.5);
		expect(index.get(7)?.metrics.P).toBe(30);
	});

	it('skips rows without a paddock id and anything that is not a list', () => {
		expect(indexLatestSamples([{ sample_date: '2024-01-01', ph_water: 6 }], metrics).size).toBe(0);
		expect(indexLatestSamples({ method: 'GET' }, metrics).size).toBe(0);
		expect(indexLatestSamples(null, metrics).size).toBe(0);
	});
});

describe('paddockSoilSummary', () => {
	const sample = indexLatestSamples(
		[{ fieldID: '42', sample_date: '2024-05-01', ph_water: 5.5, P: 120 }],
		metrics
	).get(42);

	it('lists every metric except None, in config order', () => {
		const rows = paddockSoilSummary(sample, metrics);
		expect(rows.map((row) => row.id)).toEqual(
			metrics.filter((metric) => metric.id !== 'none').map((metric) => metric.id)
		);
	});

	it('classifies values and formats them with units', () => {
		const rows = paddockSoilSummary(sample, metrics);
		expect(rows.find((row) => row.id === 'pH')).toEqual({
			id: 'pH',
			label: 'Soil pH',
			valueText: '5.5',
			status: 'low'
		});
		expect(rows.find((row) => row.id === 'P')).toMatchObject({
			valueText: '120 mg/kg',
			status: 'high'
		});
	});

	it('marks missing metrics as no data', () => {
		const rows = paddockSoilSummary(sample, metrics);
		expect(rows.find((row) => row.id === 'K')).toMatchObject({
			valueText: 'No data',
			status: 'no-data'
		});
	});

	it('handles a paddock with no sample at all', () => {
		const rows = paddockSoilSummary(undefined, metrics);
		expect(rows.length).toBeGreaterThan(0);
		expect(rows.every((row) => row.status === 'no-data')).toBe(true);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project server src/routes/map/soil-status.test.ts`
Expected: FAIL, "Failed to resolve import './soil-status'".

- [ ] **Step 3: Create `src/routes/map/soil-status.ts`**

`indexLatestSamples` is the page's `buildSoilMetricIndex` moved here unchanged, with an array guard.

```ts
import type { MetricId, MetricOption } from '$lib/config';
import {
	extractFieldId,
	metricStatus,
	parseDateMs,
	pickMetricValue,
	type MetricStatus,
	type SoilTestRecord
} from '$lib/soil-status';
import { formatMetricValue, type NormalisedSoilSample } from './helpers';

export type SoilRow = { id: MetricId; label: string; valueText: string; status: MetricStatus };

/** The newest sample for each paddock in a `/soil-tests?latest=true` response. */
export function indexLatestSamples(
	records: unknown,
	metrics: readonly MetricOption[]
): Map<number, NormalisedSoilSample> {
	const next = new Map<number, NormalisedSoilSample>();
	if (!Array.isArray(records)) return next;

	for (const row of records) {
		if (!row || typeof row !== 'object') continue;
		const entry = row as SoilTestRecord;
		const fieldId = extractFieldId(entry);
		if (fieldId === null) continue;

		const values: NormalisedSoilSample['metrics'] = {};
		for (const metric of metrics) {
			if (metric.id === 'none') continue;
			const value = pickMetricValue(entry, metric.id);
			if (value !== null) values[metric.id] = value;
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
			sampleNameSource === null || sampleNameSource === undefined ? null : String(sampleNameSource);

		const existing = next.get(fieldId);
		if (existing && (sampleDateMs ?? -Infinity) < (existing.sampleDateMs ?? -Infinity)) continue;

		next.set(fieldId, {
			fieldId,
			sampleDate,
			sampleDateMs,
			sampleName,
			metrics: values,
			raw: entry
		});
	}
	return next;
}

/** One row per metric (except None) for the paddock sheet, in config order. */
export function paddockSoilSummary(
	sample: NormalisedSoilSample | undefined,
	metrics: readonly MetricOption[]
): SoilRow[] {
	return metrics
		.filter((metric) => metric.id !== 'none')
		.map((metric) => {
			const raw = sample?.metrics[metric.id];
			const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
			return {
				id: metric.id,
				label: metric.label,
				valueText: value === null ? 'No data' : formatMetricValue(value, metric),
				status: metricStatus(value, metric)
			};
		});
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run --project server src/routes/map/soil-status.test.ts && npm run check`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/map/soil-status.ts src/routes/map/soil-status.test.ts
git commit -m "Add a tested latest-sample index and soil rows for the paddock sheet"
```

---

### Task 3: Metric chips and legend

**Files:**

- Create: `src/routes/map/components/MetricChips.svelte`
- Create: `src/routes/map/components/MetricChips.svelte.test.ts`
- Create: `src/routes/map/components/MetricLegend.svelte`
- Create: `src/routes/map/components/MetricLegend.svelte.test.ts`

**Interfaces:**

- Consumes: `MetricOption`, `MetricId` from `$lib/config`; `LegendPercents`, `LegendDetails`, `MetricStats`, `VIRIDIS_GRADIENT`, `formatLegendTick`, `formatPercent`, `formatFieldList`, `keepTooltipInView` from `../helpers`.
- Produces:
  - `MetricChips` props `{ metrics: readonly MetricOption[]; active: MetricId; onchange: (id: MetricId) => void; layout: 'row' | 'wrap' }`. Each chip is a `<button aria-pressed>`.
  - `MetricLegend` props `{ metric: MetricOption; stats: MetricStats | null; percents: LegendPercents; details: LegendDetails; colouredCount: number; scaleReady: boolean; loading: boolean; error: string | null; onretry: () => void; compact?: boolean }`.

- [ ] **Step 1: Write the failing `MetricChips` test**

Create `src/routes/map/components/MetricChips.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import CONFIG from '$lib/config';
import MetricChips from './MetricChips.svelte';

describe('MetricChips.svelte', () => {
	it('marks the active metric and reports a new choice', async () => {
		const onchange = vi.fn();
		render(MetricChips, { metrics: CONFIG.soilMetrics, active: 'pH', onchange, layout: 'row' });

		await expect
			.element(page.getByRole('button', { name: 'Soil pH' }))
			.toHaveAttribute('aria-pressed', 'true');
		await expect
			.element(page.getByRole('button', { name: 'Phosphorus' }))
			.toHaveAttribute('aria-pressed', 'false');

		await page.getByRole('button', { name: 'Phosphorus' }).click();
		expect(onchange).toHaveBeenCalledWith('P');
	});

	it('does not report the chip that is already active', async () => {
		const onchange = vi.fn();
		render(MetricChips, { metrics: CONFIG.soilMetrics, active: 'pH', onchange, layout: 'wrap' });

		await page.getByRole('button', { name: 'Soil pH' }).click();
		expect(onchange).not.toHaveBeenCalled();
	});
});
```

Run: `npx vitest run --project client src/routes/map/components/MetricChips.svelte.test.ts`
Expected: FAIL, cannot resolve `./MetricChips.svelte`.

- [ ] **Step 2: Create `src/routes/map/components/MetricChips.svelte`**

```svelte
<script lang="ts">
	import type { MetricId, MetricOption } from '$lib/config';

	type Props = {
		metrics: readonly MetricOption[];
		active: MetricId;
		onchange: (id: MetricId) => void;
		layout: 'row' | 'wrap';
	};

	let { metrics, active, onchange, layout }: Props = $props();
</script>

<div
	role="group"
	aria-label="Soil metric"
	class={['flex gap-2', layout === 'row' ? 'flex-nowrap' : 'flex-wrap']}
>
	{#each metrics as metric (metric.id)}
		{@const pressed = metric.id === active}
		<button
			type="button"
			aria-pressed={pressed}
			onclick={() => {
				if (!pressed) onchange(metric.id);
			}}
			class={[
				'inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm whitespace-nowrap shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
				pressed
					? 'border-accent bg-accent/20 text-text'
					: 'border-border bg-panel/95 text-muted hover:text-text'
			]}
		>
			{metric.label}
		</button>
	{/each}
</div>
```

Run the autofixer, then the test again. Expected: PASS.

- [ ] **Step 3: Write the failing `MetricLegend` test**

Create `src/routes/map/components/MetricLegend.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import CONFIG from '$lib/config';
import type { MetricOption } from '$lib/config';
import MetricLegend from './MetricLegend.svelte';
import type { LegendDetails, LegendPercents } from '../helpers';

const pH = CONFIG.soilMetrics.find((metric) => metric.id === 'pH') as MetricOption;
const stats = { min: 5.2, max: 7.4, mean: 6.1, median: 6.0, count: 20 };
const percents: LegendPercents = {
	lowPct: 7,
	highPct: 80,
	showOpt: true,
	optLoPct: 33,
	optHiPct: 67,
	optWidth: 34,
	optMidPct: 50
};
const details: LegendDetails = {
	min: { value: 5.2, fields: ['Creek'] },
	max: { value: 7.4, fields: ['North flat'] },
	opt: { range: [6, 7], within: { count: 12, pct: 60, total: 20 } }
};
const base = {
	metric: pH,
	stats,
	percents,
	details,
	colouredCount: 20,
	scaleReady: true,
	loading: false,
	error: null,
	onretry: () => {}
};

describe('MetricLegend.svelte', () => {
	it('summarises the optimal range in the full legend', async () => {
		render(MetricLegend, base);

		await expect.element(page.getByText('Colouring 20 paddocks using Soil pH.')).toBeVisible();
		await expect
			.element(page.getByText('12 of 20 paddocks in the optimal range (60%)'))
			.toBeVisible();
	});

	it('expands the compact legend to show the details in words', async () => {
		render(MetricLegend, { ...base, compact: true });

		const toggle = page.getByRole('button', { name: /12 of 20 in optimal range/ });
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
		await toggle.click();
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect.element(page.getByText('Optimal 6 to 7')).toBeVisible();
		await expect.element(page.getByText('Lowest 5.2: Creek')).toBeVisible();
	});

	it('offers Retry when soil data failed to load', async () => {
		const onretry = vi.fn();
		render(MetricLegend, { ...base, stats: null, error: "Couldn't load soil tests.", onretry });

		await page.getByRole('button', { name: 'Retry' }).click();
		expect(onretry).toHaveBeenCalledOnce();
	});
});
```

Run: `npx vitest run --project client src/routes/map/components/MetricLegend.svelte.test.ts`
Expected: FAIL, cannot resolve `./MetricLegend.svelte`.

- [ ] **Step 4: Create `src/routes/map/components/MetricLegend.svelte`**

The full variant is the sidebar legend from the old page (its lines 630–767) moved to runes, with every `text-[10px]`/`text-[11px]` raised to `text-xs` and `use:keepTooltipInView` turned into an attachment. The compact variant is new: one tappable summary bar that expands into the same facts written out, because hover tooltips don't work on touch.

```svelte
<script lang="ts">
	import { fromAction } from 'svelte/attachments';

	import type { MetricOption } from '$lib/config';
	import {
		VIRIDIS_GRADIENT,
		formatFieldList,
		formatLegendTick,
		formatPercent,
		keepTooltipInView,
		type LegendDetails,
		type LegendPercents,
		type MetricStats
	} from '../helpers';

	type Props = {
		metric: MetricOption;
		stats: MetricStats | null;
		percents: LegendPercents;
		details: LegendDetails;
		colouredCount: number;
		scaleReady: boolean;
		loading: boolean;
		error: string | null;
		onretry: () => void;
		compact?: boolean;
	};

	let {
		metric,
		stats,
		percents,
		details,
		colouredCount,
		scaleReady,
		loading,
		error,
		onretry,
		compact = false
	}: Props = $props();

	let expanded = $state(false);
	const panelId = $props.id();

	const unit = $derived(metric.unit ? ` ${metric.unit}` : '');
	const cmin = $derived(typeof metric.c_min === 'number' ? metric.c_min : null);
	const cmax = $derived(typeof metric.c_max === 'number' ? metric.c_max : null);
	const within = $derived(details.opt.within);
	const tooltipInView = fromAction(keepTooltipInView);
</script>

{#snippet bar(height: string)}
	<div class={['relative w-full rounded-full', height]}>
		<div
			class="pointer-events-none absolute inset-0 rounded-full"
			style:background={VIRIDIS_GRADIENT}
		></div>
		{#if percents.showOpt}
			<div
				class="pointer-events-none absolute inset-y-0 rounded-full bg-white/35 ring-1 ring-white/70"
				style:left="{percents.optLoPct}%"
				style:width="{percents.optWidth}%"
			></div>
		{/if}
	</div>
{/snippet}

{#snippet status()}
	{#if metric.id === 'none'}
		<p>Choose a soil metric to colour paddocks by their latest test.</p>
	{:else if loading}
		<p>Loading the latest soil test results…</p>
	{:else if error}
		<p class="text-danger">{error}</p>
		<button
			type="button"
			onclick={onretry}
			class="mt-2 inline-flex min-h-11 items-center rounded-lg border border-danger/40 bg-danger/10 px-4 text-sm text-text hover:bg-danger/20"
		>
			Retry
		</button>
	{:else if !scaleReady}
		<p>There's no colour scale for {metric.label} yet.</p>
	{:else if !stats}
		<p>No paddocks have recent samples for {metric.label} yet.</p>
	{/if}
{/snippet}

{#if compact}
	<div
		class="rounded-xl border border-border bg-panel/95 text-xs text-muted shadow-lg backdrop-blur"
	>
		{#if stats && scaleReady && !error && !loading}
			<button
				type="button"
				aria-expanded={expanded}
				aria-controls={panelId}
				onclick={() => (expanded = !expanded)}
				class="flex min-h-11 w-full flex-col gap-1.5 px-3 py-2 text-left"
			>
				{@render bar('h-2')}
				<span class="flex w-full justify-between gap-2">
					<span>{formatLegendTick(cmin)}</span>
					<span class="text-text">
						{within.count} of {within.total} in optimal range
					</span>
					<span>{formatLegendTick(cmax)}</span>
				</span>
			</button>
			{#if expanded}
				<ul id={panelId} class="space-y-1 border-t border-border px-3 py-2 text-sm">
					{#if details.opt.range}
						<li>
							Optimal {formatLegendTick(details.opt.range[0])} to {formatLegendTick(
								details.opt.range[1]
							)}{unit}
						</li>
					{/if}
					<li>
						Lowest {formatLegendTick(details.min.value)}{unit}: {formatFieldList(
							details.min.fields
						)}
					</li>
					<li>
						Highest {formatLegendTick(details.max.value)}{unit}: {formatFieldList(
							details.max.fields
						)}
					</li>
					<li>Median {formatLegendTick(stats.median)}{unit}</li>
				</ul>
			{/if}
		{:else}
			<div class="px-3 py-2 text-sm">{@render status()}</div>
		{/if}
	</div>
{:else}
	<div class="space-y-2 text-xs text-muted">
		{#if stats && scaleReady && !error && !loading && metric.id !== 'none'}
			<p class="text-sm">
				Colouring {colouredCount} paddock{colouredCount === 1 ? '' : 's'} using {metric.label}.
			</p>
			<div class="space-y-2 rounded-lg border border-border bg-white/5 p-3">
				<p class="font-semibold text-text">Scale{metric.unit ? ` (${metric.unit})` : ''}</p>
				<div class="relative">
					{@render bar('h-2.5')}
					{#if percents.showOpt}
						<button
							type="button"
							class="group absolute -inset-y-2 cursor-default focus-visible:outline-2 focus-visible:outline-accent"
							style:left="{percents.optLoPct}%"
							style:width="{percents.optWidth}%"
							aria-label={`Optimal range ${formatLegendTick(details.opt.range?.[0])}${unit} to ${formatLegendTick(details.opt.range?.[1])}${unit}`}
						>
							<span
								{@attach tooltipInView}
								role="tooltip"
								class="pointer-events-none absolute -top-20 left-1/2 hidden w-60 -translate-x-1/2 rounded-lg bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-xl group-hover:block group-focus-visible:block"
							>
								Optimal {formatLegendTick(details.opt.range?.[0])}{unit} to {formatLegendTick(
									details.opt.range?.[1]
								)}{unit}
							</span>
						</button>
					{/if}
					{#each [{ label: 'Lowest', pct: percents.lowPct, value: details.min.value, fields: details.min.fields }, { label: 'Highest', pct: percents.highPct, value: details.max.value, fields: details.max.fields }] as marker (marker.label)}
						<button
							type="button"
							class="group absolute -top-3 flex h-8 w-8 -translate-x-1/2 cursor-default items-end justify-center focus-visible:outline-2 focus-visible:outline-accent"
							style:left="{marker.pct}%"
							aria-label={`${marker.label} value ${formatLegendTick(marker.value)}${unit}`}
						>
							<span class="pointer-events-none h-full w-1.5 rounded-full bg-white/85"></span>
							<span
								{@attach tooltipInView}
								role="tooltip"
								class="pointer-events-none absolute -top-20 left-1/2 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-xl group-hover:block group-focus-visible:block"
							>
								{marker.label}
								{formatLegendTick(marker.value)}{unit}: {formatFieldList(marker.fields)}
							</span>
						</button>
					{/each}
				</div>
				<div class="flex justify-between">
					<span>{formatLegendTick(cmin)}</span>
					<span>Median {formatLegendTick(stats.median)}{unit}</span>
					<span>{formatLegendTick(cmax)}</span>
				</div>
				{#if details.opt.range}
					<p class="text-accent">
						{within.count} of {within.total} paddocks in the optimal range ({formatPercent(
							within.pct
						)})
					</p>
				{/if}
			</div>
		{:else}
			<div class="text-sm">{@render status()}</div>
		{/if}
	</div>
{/if}
```

Run the autofixer, then: `npx vitest run --project client src/routes/map/components/MetricLegend.svelte.test.ts`
Expected: PASS. If `fromAction` complains about `keepTooltipInView`'s return type, give `keepTooltipInView` in `helpers.ts` an explicit `ActionReturn` return type (`import type { ActionReturn } from 'svelte/action'`); change nothing else in that function.

- [ ] **Step 5: Commit**

```bash
git add src/routes/map/components/MetricChips.svelte src/routes/map/components/MetricChips.svelte.test.ts src/routes/map/components/MetricLegend.svelte src/routes/map/components/MetricLegend.svelte.test.ts src/routes/map/helpers.ts
git commit -m "Add metric chips and a legend with a compact phone variant"
```

---

### Task 4: Paddock search and map controls

**Files:**

- Create: `src/routes/map/components/PaddockSearch.svelte`
- Create: `src/routes/map/components/PaddockSearch.svelte.test.ts`
- Create: `src/routes/map/components/MapControls.svelte`
- Create: `src/routes/map/components/MapControls.svelte.test.ts`

**Interfaces:**

- Produces:
  - `PaddockSearch` props `{ paddocks: readonly PaddockOption[]; onselect: (id: number) => void }`, where `PaddockOption = { id: number; name: string; displayId: string }` is exported from `src/routes/map/components/types.ts` (create it in this task). Matches name or display ID, case-insensitive, at most 8 suggestions. ArrowDown/ArrowUp move, Enter picks (or picks the only match), Escape closes suggestions and stops the event from reaching the sheet.
  - `MapControls` props `{ baseLayers: BaseLayerConfig[]; activeBaseLayer: string; onbasechange: (id: string) => void; showBoundaries: boolean (bindable); showLabels: boolean (bindable); showTitles: boolean (bindable); showLabelToggle: boolean; titles: { loading: boolean; error: string | null; count: number }; onretrytitles: () => void; onreset: () => void }`.

- [ ] **Step 1: Create `src/routes/map/components/types.ts`**

```ts
export type PaddockOption = { id: number; name: string; displayId: string };
```

- [ ] **Step 2: Write the failing `PaddockSearch` tests**

Create `src/routes/map/components/PaddockSearch.svelte.test.ts`:

```ts
import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import PaddockSearch from './PaddockSearch.svelte';

const paddocks = [
	{ id: 42, name: 'North flat', displayId: '42' },
	{ id: 7, name: 'Creek', displayId: '7' },
	{ id: 9, name: 'Northern hill', displayId: '9' }
];

describe('PaddockSearch.svelte', () => {
	it('filters by name, case-insensitively', async () => {
		render(PaddockSearch, { paddocks, onselect: () => {} });

		await page.getByRole('combobox', { name: 'Find a paddock' }).fill('NORTH');
		await expect.element(page.getByRole('option', { name: /North flat/ })).toBeVisible();
		await expect.element(page.getByRole('option', { name: /Northern hill/ })).toBeVisible();
		await expect.element(page.getByRole('option', { name: /Creek/ })).not.toBeInTheDocument();
	});

	it('matches an ID', async () => {
		render(PaddockSearch, { paddocks, onselect: () => {} });

		await page.getByRole('combobox', { name: 'Find a paddock' }).fill('7');
		await expect.element(page.getByRole('option', { name: /Creek/ })).toBeVisible();
	});

	it('picks a suggestion with the arrow keys and Enter', async () => {
		const onselect = vi.fn();
		render(PaddockSearch, { paddocks, onselect });

		await page.getByRole('combobox', { name: 'Find a paddock' }).fill('north');
		await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
		expect(onselect).toHaveBeenCalledWith(9);
		await expect.element(page.getByRole('listbox')).not.toBeInTheDocument();
	});

	it('picks a suggestion with a click', async () => {
		const onselect = vi.fn();
		render(PaddockSearch, { paddocks, onselect });

		await page.getByRole('combobox', { name: 'Find a paddock' }).fill('creek');
		await page.getByRole('option', { name: /Creek/ }).click();
		expect(onselect).toHaveBeenCalledWith(7);
	});

	it('closes the suggestions on Escape without letting the key reach the sheet', async () => {
		const outer = vi.fn();
		document.addEventListener('keydown', outer);
		render(PaddockSearch, { paddocks, onselect: () => {} });

		await page.getByRole('combobox', { name: 'Find a paddock' }).fill('north');
		await userEvent.keyboard('{Escape}');
		await expect.element(page.getByRole('listbox')).not.toBeInTheDocument();
		expect(outer).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
		document.removeEventListener('keydown', outer);
	});

	it('says so when nothing matches', async () => {
		render(PaddockSearch, { paddocks, onselect: () => {} });

		await page.getByRole('combobox', { name: 'Find a paddock' }).fill('zzz');
		await expect.element(page.getByText('No paddock matches “zzz”.')).toBeVisible();
	});
});
```

Run: `npx vitest run --project client src/routes/map/components/PaddockSearch.svelte.test.ts`
Expected: FAIL, cannot resolve `./PaddockSearch.svelte`.

- [ ] **Step 3: Create `src/routes/map/components/PaddockSearch.svelte`**

```svelte
<script lang="ts">
	import type { PaddockOption } from './types';

	type Props = { paddocks: readonly PaddockOption[]; onselect: (id: number) => void };

	let { paddocks, onselect }: Props = $props();

	const uid = $props.id();
	let query = $state('');
	let open = $state(false);
	let activeIndex = $state(-1);

	const term = $derived(query.trim().toLowerCase());
	const matches = $derived(
		term === ''
			? []
			: paddocks
					.filter(
						(paddock) =>
							paddock.name.toLowerCase().includes(term) ||
							paddock.displayId.toLowerCase().includes(term)
					)
					.slice(0, 8)
	);
	const expanded = $derived(open && matches.length > 0);

	function choose(paddock: PaddockOption) {
		onselect(paddock.id);
		query = paddock.name;
		open = false;
		activeIndex = -1;
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			open = true;
			activeIndex = Math.min(matches.length - 1, activeIndex + 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			activeIndex = Math.max(0, activeIndex - 1);
		} else if (event.key === 'Enter') {
			const pick = matches[activeIndex] ?? (matches.length === 1 ? matches[0] : undefined);
			if (pick) {
				event.preventDefault();
				choose(pick);
			}
		} else if (event.key === 'Escape' && expanded) {
			// Only close the suggestions; the sheet around this search closes on a second Escape.
			event.stopPropagation();
			open = false;
			activeIndex = -1;
		}
	}
</script>

<div class="relative">
	<label for="{uid}-input" class="mb-1 block text-sm text-muted">Find a paddock</label>
	<input
		id="{uid}-input"
		type="search"
		role="combobox"
		autocomplete="off"
		placeholder="Name or ID"
		aria-expanded={expanded}
		aria-controls="{uid}-list"
		aria-autocomplete="list"
		aria-activedescendant={expanded && activeIndex >= 0
			? `${uid}-option-${activeIndex}`
			: undefined}
		bind:value={query}
		oninput={() => {
			open = true;
			activeIndex = -1;
		}}
		onblur={() => (open = false)}
		{onkeydown}
		class="min-h-11 w-full rounded-lg border border-border bg-white/5 px-3 text-base text-text placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
	/>
	{#if expanded}
		<ul
			id="{uid}-list"
			role="listbox"
			aria-label="Matching paddocks"
			class="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-panel p-1 shadow-lg"
		>
			{#each matches as paddock, index (paddock.id)}
				<li
					id="{uid}-option-{index}"
					role="option"
					aria-selected={index === activeIndex}
					tabindex="-1"
					onmousedown={(event) => event.preventDefault()}
					onclick={() => choose(paddock)}
					onkeydown={(event) => {
						if (event.key === 'Enter') choose(paddock);
					}}
					class={[
						'flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md px-3',
						index === activeIndex ? 'bg-accent/15 text-text' : 'text-text hover:bg-white/5'
					]}
				>
					<span>{paddock.name}</span>
					<span class="text-sm text-muted">ID {paddock.displayId}</span>
				</li>
			{/each}
		</ul>
	{:else if open && term !== ''}
		<p class="mt-2 text-sm text-muted">No paddock matches “{query.trim()}”.</p>
	{/if}
</div>
```

(`onmousedown` keeps focus in the input so its `onblur` doesn't close the list before the click lands.)

Run the autofixer, then the tests. Expected: PASS.

- [ ] **Step 4: Write the failing `MapControls` test**

Create `src/routes/map/components/MapControls.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import MapControls from './MapControls.svelte';

const baseLayers = [
	{ id: 'imagery', label: 'Satellite', description: 'Aerial imagery.', url: '', options: {} },
	{ id: 'streets', label: 'Streets', description: 'Road map.', url: '', options: {} }
];
const props = {
	baseLayers,
	activeBaseLayer: 'imagery',
	onbasechange: () => {},
	showBoundaries: true,
	showLabels: true,
	showTitles: false,
	showLabelToggle: true,
	titles: { loading: false, error: null, count: 0 },
	onretrytitles: () => {},
	onreset: () => {}
};

describe('MapControls.svelte', () => {
	it('reports a base map change', async () => {
		const onbasechange = vi.fn();
		render(MapControls, { ...props, onbasechange });

		await expect
			.element(page.getByRole('button', { name: 'Satellite' }))
			.toHaveAttribute('aria-pressed', 'true');
		await page.getByRole('button', { name: 'Streets' }).click();
		expect(onbasechange).toHaveBeenCalledWith('streets');
	});

	it('hides the labels toggle when asked (phones have no hover labels)', async () => {
		render(MapControls, { ...props, showLabelToggle: false });

		await expect.element(page.getByLabelText('Show field boundaries')).toBeVisible();
		await expect.element(page.getByLabelText('Show paddock labels')).not.toBeInTheDocument();
	});

	it('uses sentence-case headings', async () => {
		render(MapControls, props);

		await expect.element(page.getByRole('heading', { name: 'Base map' })).toBeVisible();
		expect(page.getByRole('heading', { name: 'Base map' }).element().className).not.toContain(
			'uppercase'
		);
	});
});
```

Run: `npx vitest run --project client src/routes/map/components/MapControls.svelte.test.ts`
Expected: FAIL, cannot resolve `./MapControls.svelte`.

- [ ] **Step 5: Create `src/routes/map/components/MapControls.svelte`**

The Base map, Display and Reset sections of the old sidebar (its lines 587–609 and 771–840) moved to runes. The metric section is no longer here: `MetricChips` and `MetricLegend` render it.

```svelte
<script lang="ts">
	import type { BaseLayerConfig } from '../helpers';

	type Props = {
		baseLayers: BaseLayerConfig[];
		activeBaseLayer: string;
		onbasechange: (id: string) => void;
		showBoundaries: boolean;
		showLabels: boolean;
		showTitles: boolean;
		showLabelToggle: boolean;
		titles: { loading: boolean; error: string | null; count: number };
		onretrytitles: () => void;
		onreset: () => void;
	};

	let {
		baseLayers,
		activeBaseLayer,
		onbasechange,
		showBoundaries = $bindable(),
		showLabels = $bindable(),
		showTitles = $bindable(),
		showLabelToggle,
		titles,
		onretrytitles,
		onreset
	}: Props = $props();

	const activeBase = $derived(baseLayers.find((layer) => layer.id === activeBaseLayer));
	const toggleRow =
		'flex min-h-11 items-center gap-3 rounded-lg border border-border bg-white/5 px-3 text-sm text-text focus-within:border-accent';
</script>

<div class="space-y-6">
	<section class="space-y-3">
		<h3 class="text-sm font-semibold text-text">Base map</h3>
		<div class="flex flex-wrap gap-2">
			{#each baseLayers as layer (layer.id)}
				<button
					type="button"
					aria-pressed={activeBaseLayer === layer.id}
					onclick={() => onbasechange(layer.id)}
					class={[
						'inline-flex min-h-11 items-center rounded-lg border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
						activeBaseLayer === layer.id
							? 'border-accent bg-accent/20 text-text'
							: 'border-border bg-white/5 text-muted hover:text-text'
					]}
				>
					{layer.label}
				</button>
			{/each}
		</div>
		{#if activeBase}
			<p class="text-xs text-muted">{activeBase.description}</p>
		{/if}
	</section>

	<section class="space-y-2">
		<h3 class="text-sm font-semibold text-text">Display</h3>
		<label class={toggleRow}>
			<input type="checkbox" class="size-5 accent-accent" bind:checked={showBoundaries} />
			Show field boundaries
		</label>
		{#if showLabelToggle}
			<label class={toggleRow}>
				<input
					type="checkbox"
					class="size-5 accent-accent disabled:opacity-50"
					bind:checked={showLabels}
					disabled={!showBoundaries}
				/>
				Show paddock labels
			</label>
		{/if}
		<label class={toggleRow}>
			<input type="checkbox" class="size-5 accent-accent" bind:checked={showTitles} />
			Show title boundaries
		</label>
		{#if showTitles}
			<div class="pl-1 text-xs text-muted">
				{#if titles.loading}
					<p>Loading title boundaries…</p>
				{:else if titles.error}
					<p class="text-danger">{titles.error}</p>
					<button
						type="button"
						onclick={onretrytitles}
						class="mt-2 inline-flex min-h-11 items-center rounded-lg border border-danger/40 bg-danger/10 px-4 text-sm text-text hover:bg-danger/20"
					>
						Retry
					</button>
				{:else if titles.count > 0}
					<p>{titles.count} title boundaries loaded. Tap one for details.</p>
				{/if}
			</div>
		{/if}
	</section>

	<button
		type="button"
		onclick={onreset}
		class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white/5 px-4 text-sm text-text hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			class="size-5"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
			/>
		</svg>
		Reset view
	</button>
</div>
```

Run the autofixer, then the test. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes/map/components/types.ts src/routes/map/components/PaddockSearch.svelte src/routes/map/components/PaddockSearch.svelte.test.ts src/routes/map/components/MapControls.svelte src/routes/map/components/MapControls.svelte.test.ts
git commit -m "Add a paddock search combobox and shared map controls"
```

---

### Task 5: Detail sheet, paddock details and title details

**Files:**

- Create: `src/routes/map/components/DetailSheet.svelte`
- Create: `src/routes/map/components/DetailSheet.svelte.test.ts`
- Create: `src/routes/map/components/PaddockDetails.svelte`
- Create: `src/routes/map/components/PaddockDetails.svelte.test.ts`
- Create: `src/routes/map/components/TitleDetails.svelte`

**Interfaces:**

- Consumes: `SoilRow` from `../soil-status` (Task 2); `StatusBadge` from `$lib/components/StatusBadge.svelte`; `formatSampleDate` from `../helpers`; `TitleFeatureProperties`, `formatOwners` from `$lib/layers`.
- Produces:
  - `DetailSheet` props `{ title: string; subtitle?: string; onclose: () => void; children: Snippet }`. Renders a non-modal `role="dialog"` labelled by its title: bottom sheet below `md`, floating card at bottom-right from `md`. Moves focus into itself on open, returns it to the previously focused element on close, and closes on Escape.
  - `PaddockDetails` props `{ fieldId: number; areaHa: number | null; sampleDate: string | null; sampleName: string | null; rows: SoilRow[]; hasSample: boolean; soilLoading: boolean; soilError: string | null; onretry: () => void }`.
  - `TitleDetails` props `{ title: TitleFeatureProperties }`.

- [ ] **Step 1: Write the failing `DetailSheet` test**

Create `src/routes/map/components/DetailSheet.svelte.test.ts`:

```ts
import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';

import '../../../app.css';
import DetailSheet from './DetailSheet.svelte';

const children = createRawSnippet(() => ({ render: () => '<p>Sheet body</p>' }));

describe('DetailSheet.svelte', () => {
	it('is a dialog named by its title and takes focus when it opens', async () => {
		render(DetailSheet, {
			title: 'North flat',
			subtitle: 'Paddock 42',
			onclose: () => {},
			children
		});

		const sheet = page.getByRole('dialog', { name: 'North flat' });
		await expect.element(sheet).toBeVisible();
		await expect.element(sheet).toHaveFocus();
		await expect.element(page.getByText('Paddock 42')).toBeVisible();
	});

	it('closes on Escape and with the close button', async () => {
		const onclose = vi.fn();
		render(DetailSheet, { title: 'North flat', onclose, children });

		await userEvent.keyboard('{Escape}');
		expect(onclose).toHaveBeenCalledTimes(1);
		await page.getByRole('button', { name: 'Close' }).click();
		expect(onclose).toHaveBeenCalledTimes(2);
	});
});
```

Run: `npx vitest run --project client src/routes/map/components/DetailSheet.svelte.test.ts`
Expected: FAIL, cannot resolve `./DetailSheet.svelte`.

- [ ] **Step 2: Create `src/routes/map/components/DetailSheet.svelte`**

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';

	type Props = { title: string; subtitle?: string; onclose: () => void; children: Snippet };

	let { title, subtitle, onclose, children }: Props = $props();

	const titleId = $props.id();

	// Focus moves in when the sheet opens and back to where it was when the sheet closes.
	const focusIn: Attachment<HTMLElement> = (node) => {
		const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		node.focus();
		return () => {
			if (previous?.isConnected) previous.focus();
		};
	};

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.stopPropagation();
			onclose();
		}
	}
</script>

<div
	role="dialog"
	aria-labelledby={titleId}
	tabindex="-1"
	{onkeydown}
	{@attach focusIn}
	class="detail-sheet absolute inset-x-0 bottom-0 z-[1100] flex max-h-[70%] flex-col rounded-t-2xl border border-border bg-panel/95 text-text shadow-2xl backdrop-blur outline-none md:inset-x-auto md:right-4 md:bottom-6 md:max-h-[calc(100%-3rem)] md:w-96 md:rounded-2xl"
>
	<header class="flex items-start gap-3 border-b border-border py-2 pr-2 pl-4">
		<div class="min-w-0 flex-1 py-1">
			<h2 id={titleId} class="text-lg font-semibold">{title}</h2>
			{#if subtitle}
				<p class="text-sm text-muted">{subtitle}</p>
			{/if}
		</div>
		<button
			type="button"
			onclick={onclose}
			aria-label="Close"
			class="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="size-5"
				aria-hidden="true"
			>
				<path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" />
			</svg>
		</button>
	</header>
	<div class="overflow-y-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
		{@render children()}
	</div>
</div>

<style>
	@media (prefers-reduced-motion: no-preference) and (max-width: 47.999rem) {
		.detail-sheet {
			animation: sheet-up 180ms ease-out;
		}
	}

	@keyframes sheet-up {
		from {
			transform: translateY(100%);
		}
	}
</style>
```

Run the autofixer, then the test. Expected: PASS.

- [ ] **Step 3: Write the failing `PaddockDetails` test**

Create `src/routes/map/components/PaddockDetails.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import PaddockDetails from './PaddockDetails.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

const rows = [
	{ id: 'pH', label: 'Soil pH', valueText: '5.5', status: 'low' as const },
	{ id: 'P', label: 'Phosphorus', valueText: '60 mg/kg', status: 'optimal' as const },
	{ id: 'K', label: 'Potassium', valueText: 'No data', status: 'no-data' as const }
];
const props = {
	fieldId: 42,
	areaHa: 12.345,
	sampleDate: '2024-05-01',
	sampleName: 'NF-2024',
	rows,
	hasSample: true,
	soilLoading: false,
	soilError: null,
	onretry: () => {}
};

describe('PaddockDetails.svelte', () => {
	it('shows each metric with its value and status in words', async () => {
		render(PaddockDetails, props);

		await expect.element(page.getByText('12.3 ha')).toBeVisible();
		await expect.element(page.getByText('1 May 2024 (NF-2024)')).toBeVisible();
		const pH = page.getByRole('listitem').filter({ hasText: 'Soil pH' });
		await expect.element(pH.getByText('5.5')).toBeVisible();
		await expect.element(pH.getByText('Low')).toBeVisible();
		await expect
			.element(
				page.getByRole('listitem').filter({ hasText: 'Potassium' }).getByText('No data').last()
			)
			.toBeVisible();
	});

	it('links to that paddock’s soil tests', async () => {
		render(PaddockDetails, props);

		await expect
			.element(page.getByRole('link', { name: 'See soil tests' }))
			.toHaveAttribute('href', '/soiltests?paddock=42');
	});

	it('says when the paddock has never been tested', async () => {
		render(PaddockDetails, { ...props, hasSample: false, sampleDate: null, sampleName: null });

		await expect.element(page.getByText('No soil tests for this paddock yet.')).toBeVisible();
	});

	it('offers Retry when soil data failed to load', async () => {
		const onretry = vi.fn();
		render(PaddockDetails, { ...props, soilError: 'failed', onretry });

		await expect.element(page.getByText('Soil data unavailable')).toBeVisible();
		await page.getByRole('button', { name: 'Retry' }).click();
		expect(onretry).toHaveBeenCalledOnce();
	});
});
```

Run: `npx vitest run --project client src/routes/map/components/PaddockDetails.svelte.test.ts`
Expected: FAIL, cannot resolve `./PaddockDetails.svelte`.

- [ ] **Step 4: Create `src/routes/map/components/PaddockDetails.svelte`**

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { formatSampleDate } from '../helpers';
	import type { SoilRow } from '../soil-status';

	type Props = {
		fieldId: number;
		areaHa: number | null;
		sampleDate: string | null;
		sampleName: string | null;
		rows: SoilRow[];
		hasSample: boolean;
		soilLoading: boolean;
		soilError: string | null;
		onretry: () => void;
	};

	let {
		fieldId,
		areaHa,
		sampleDate,
		sampleName,
		rows,
		hasSample,
		soilLoading,
		soilError,
		onretry
	}: Props = $props();

	const areaFormatter = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 });
	const latest = $derived(
		sampleDate
			? `${formatSampleDate(sampleDate)}${sampleName ? ` (${sampleName})` : ''}`
			: (sampleName ?? '-')
	);
</script>

<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
	<dt class="text-muted">Area</dt>
	<dd>{areaHa === null ? '-' : `${areaFormatter.format(areaHa)} ha`}</dd>
	{#if hasSample}
		<dt class="text-muted">Latest sample</dt>
		<dd>{latest}</dd>
	{/if}
</dl>

<div class="mt-4">
	{#if soilError}
		<p class="font-semibold">Soil data unavailable</p>
		<p class="text-sm text-muted">Check the connection and try again.</p>
		<button
			type="button"
			onclick={onretry}
			class="mt-2 inline-flex min-h-11 items-center rounded-lg border border-border bg-white/5 px-4 text-sm hover:bg-white/10"
		>
			Retry
		</button>
	{:else if soilLoading}
		<p class="text-sm text-muted">Loading soil results…</p>
	{:else if !hasSample}
		<p class="text-sm text-muted">No soil tests for this paddock yet.</p>
	{:else}
		<ul class="divide-y divide-border">
			{#each rows as row (row.id)}
				<li class="flex min-h-12 items-center justify-between gap-3">
					<span>{row.label}</span>
					<span class="flex items-center gap-3">
						<span class="tabular-nums">{row.valueText}</span>
						<StatusBadge status={row.status} />
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<a
	href={`${resolve('/soiltests')}?paddock=${fieldId}`}
	class="mt-4 inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline"
>
	See soil tests
</a>
```

(ESLint's `svelte/no-navigation-without-resolve` can't see through the query string on the soil tests link; that's one expected error, and the old sidebar's unresolved `href="/"` it replaces is removed in Task 7, so the count doesn't rise.)

Run the autofixer, then the test. Expected: PASS. If `formatSampleDate('2024-05-01')` renders a different order than `1 May 2024` in the test browser's locale, it's using `en-AU` already, so check the date string and fix the assertion only if the formatter's output legitimately differs (for example `01 May 2024`).

- [ ] **Step 5: Create `src/routes/map/components/TitleDetails.svelte`**

The body of the old title card (its lines 964–1000) moved to runes. The header and close button now come from `DetailSheet`.

```svelte
<script lang="ts">
	import { formatOwners, type TitleFeatureProperties } from '$lib/layers';

	type Props = { title: TitleFeatureProperties };

	let { title }: Props = $props();

	const listUrl = $derived(
		`https://www.thelist.tas.gov.au/app/content/property/property-search?propertySearchCriteria.volume=&propertySearchCriteria.folio=&propertySearchCriteria.dealingNo=&propertySearchCriteria.surname=&propertySearchCriteria.givenName=&propertySearchCriteria.companyName=&propertySearchCriteria.propertyId=${encodeURIComponent(String(title.pid))}&addressString=&propertySearchCriteria.propertyName=&streetNumber=&propertySearchCriteria.streetName=`
	);
</script>

<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
	<dt class="text-muted">Title reference</dt>
	<dd>{title.titleRef || '-'}</dd>
	<dt class="text-muted">PID</dt>
	<dd>{title.pid ?? '-'}</dd>
	<dt class="text-muted">Owners</dt>
	<dd>{formatOwners(title.owners)}</dd>
	<dt class="text-muted">Ownership</dt>
	<dd>{title.ownershipPct || '-'}</dd>
	<dt class="text-muted">Volume and folio</dt>
	<dd>{title.volume || '-'} / {title.folio ?? '-'}</dd>
</dl>

{#if title.pid}
	<a
		href={listUrl}
		target="_blank"
		rel="external noopener noreferrer"
		class="mt-4 inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline"
	>
		View on the LIST
		<span class="sr-only">(opens in a new tab)</span>
	</a>
{/if}
```

Run the autofixer.

- [ ] **Step 6: Commit**

```bash
git add src/routes/map/components/DetailSheet.svelte src/routes/map/components/DetailSheet.svelte.test.ts src/routes/map/components/PaddockDetails.svelte src/routes/map/components/PaddockDetails.svelte.test.ts src/routes/map/components/TitleDetails.svelte
git commit -m "Add the detail sheet with paddock soil status and title details"
```

---

### Task 6: Locate button

**Files:**

- Create: `src/routes/map/components/LocateButton.svelte`
- Create: `src/routes/map/components/LocateButton.svelte.test.ts`

**Interfaces:**

- Produces:
  - `type LocateFix = { lat: number; lon: number; accuracy: number }`, exported from `src/routes/map/components/types.ts` (add it beside `PaddockOption`).
  - `LocateButton` props `{ onposition: (fix: LocateFix) => void; onerror: (message: string) => void; onstop: () => void; geolocation?: Geolocation; secure?: boolean }`. `geolocation` defaults to `navigator.geolocation` and `secure` to `window.isSecureContext`; tests pass both. Renders nothing when not secure or no geolocation.

- [ ] **Step 1: Add `LocateFix` to `src/routes/map/components/types.ts`**

```ts
export type LocateFix = { lat: number; lon: number; accuracy: number };
```

- [ ] **Step 2: Write the failing tests**

Create `src/routes/map/components/LocateButton.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../../app.css';
import LocateButton from './LocateButton.svelte';

function stubGeolocation(
	respond: (success: PositionCallback, failure: PositionErrorCallback) => void
) {
	return {
		// Browsers always call back asynchronously, after watchPosition has returned its id.
		watchPosition: vi.fn((success: PositionCallback, failure: PositionErrorCallback) => {
			setTimeout(() => respond(success, failure), 0);
			return 7;
		}),
		clearWatch: vi.fn(),
		getCurrentPosition: vi.fn()
	} as unknown as Geolocation & { clearWatch: ReturnType<typeof vi.fn> };
}

const fix = { coords: { latitude: -41.2, longitude: 146.4, accuracy: 12 } } as GeolocationPosition;
const failure = (code: number) => ({ code, PERMISSION_DENIED: 1 }) as GeolocationPositionError;
const handlers = () => ({ onposition: vi.fn(), onerror: vi.fn(), onstop: vi.fn() });

describe('LocateButton.svelte', () => {
	it('reports positions while on, and stops watching when turned off', async () => {
		const geolocation = stubGeolocation((success) => success(fix));
		const on = handlers();
		render(LocateButton, { ...on, geolocation, secure: true });

		await page.getByRole('button', { name: 'Show my location' }).click();
		await vi.waitFor(() =>
			expect(on.onposition).toHaveBeenCalledWith({ lat: -41.2, lon: 146.4, accuracy: 12 })
		);

		const stop = page.getByRole('button', { name: 'Stop showing my location' });
		await expect.element(stop).toHaveAttribute('aria-pressed', 'true');
		await stop.click();
		expect(geolocation.clearWatch).toHaveBeenCalledWith(7);
		expect(on.onstop).toHaveBeenCalledOnce();
	});

	it('explains a denied permission and turns itself off', async () => {
		const geolocation = stubGeolocation((_, fail) => fail(failure(1)));
		const on = handlers();
		render(LocateButton, { ...on, geolocation, secure: true });

		await page.getByRole('button', { name: 'Show my location' }).click();
		await vi.waitFor(() =>
			expect(on.onerror).toHaveBeenCalledWith('Location is turned off for this site.')
		);
		await expect
			.element(page.getByRole('button', { name: 'Show my location' }))
			.toHaveAttribute('aria-pressed', 'false');
	});

	it('explains an unavailable position or a timeout', async () => {
		const geolocation = stubGeolocation((_, fail) => fail(failure(3)));
		const on = handlers();
		render(LocateButton, { ...on, geolocation, secure: true });

		await page.getByRole('button', { name: 'Show my location' }).click();
		await vi.waitFor(() => expect(on.onerror).toHaveBeenCalledWith("Couldn't find your location."));
	});

	it('is hidden on an insecure connection', async () => {
		const geolocation = stubGeolocation(() => {});
		render(LocateButton, { ...handlers(), geolocation, secure: false });

		await expect
			.element(page.getByRole('button', { name: 'Show my location' }))
			.not.toBeInTheDocument();
	});
});
```

Run: `npx vitest run --project client src/routes/map/components/LocateButton.svelte.test.ts`
Expected: FAIL, cannot resolve `./LocateButton.svelte`.

- [ ] **Step 3: Create `src/routes/map/components/LocateButton.svelte`**

```svelte
<script lang="ts">
	import { onDestroy } from 'svelte';

	import type { LocateFix } from './types';

	type Props = {
		onposition: (fix: LocateFix) => void;
		onerror: (message: string) => void;
		onstop: () => void;
		geolocation?: Geolocation;
		secure?: boolean;
	};

	let {
		onposition,
		onerror,
		onstop,
		geolocation = typeof navigator === 'undefined' ? undefined : navigator.geolocation,
		secure = typeof window !== 'undefined' && window.isSecureContext
	}: Props = $props();

	let watchId: number | null = $state(null);

	function start() {
		if (!geolocation) return;
		watchId = geolocation.watchPosition(
			(position) =>
				onposition({
					lat: position.coords.latitude,
					lon: position.coords.longitude,
					accuracy: position.coords.accuracy
				}),
			(error) => {
				if (error.code === error.PERMISSION_DENIED) {
					onerror('Location is turned off for this site.');
					stop();
				} else {
					onerror("Couldn't find your location.");
				}
			},
			{ enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
		);
	}

	function stop() {
		if (watchId !== null) geolocation?.clearWatch(watchId);
		watchId = null;
		onstop();
	}

	onDestroy(() => {
		if (watchId !== null) geolocation?.clearWatch(watchId);
	});
</script>

{#if secure && geolocation}
	<button
		type="button"
		aria-pressed={watchId !== null}
		aria-label={watchId !== null ? 'Stop showing my location' : 'Show my location'}
		onclick={() => (watchId !== null ? stop() : start())}
		class={[
			'inline-flex size-11 items-center justify-center rounded-full border shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
			watchId !== null
				? 'border-status-high bg-status-high/20 text-status-high'
				: 'border-border bg-panel/95 text-text'
		]}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			class="size-6"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4" />
			<path stroke-linecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
		</svg>
	</button>
{/if}
```

Run the autofixer, then the tests. Expected: PASS. (The denied test's `stop()` also calls `onstop`; that's intended, because the page clears the dot either way.)

- [ ] **Step 4: Commit**

```bash
git add src/routes/map/components/types.ts src/routes/map/components/LocateButton.svelte src/routes/map/components/LocateButton.svelte.test.ts
git commit -m "Add a locate button that watches the device position"
```

---

### Task 7: Rebuild the map page on runes

**Files:**

- Modify: `src/routes/map/+page.svelte` (rewrite)
- Create: `src/routes/map/map-page.svelte.test.ts`
- Modify: `src/routes/map/helpers.ts` (delete exports that nothing imports any more, if `npm run check` and a grep confirm it)

**Interfaces:**

- Consumes: everything from Tasks 1–6; `buildBaseLayer`, `buildTitleLayer`, `TitleFeatureProperties` from `$lib/layers`; `NO_DATA_STYLE`, `buildPaddockTooltipHtml`, `computeLegendDetails`, `computeLegendPercents`, `computeMetricStats`, `derivePaddockIdentity`, `formatMetricValue`, `setLayerBaseStyle`, `updatePaddockTooltip`, `viridisColor`, `BaseLayerConfig`, `NormalisedSoilSample` from `./helpers`.
- Produces: `/map?paddock=<fieldId>` selects that paddock on load and fits it; `?metric=` sets the metric; selecting updates both with `replaceState`.

- [ ] **Step 1: Write the failing page test**

Create `src/routes/map/map-page.svelte.test.ts`. It renders the real page with Leaflet in the test browser and a stubbed `fetch`; map tiles fail to load offline, which doesn't matter here.

```ts
import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const app = vi.hoisted(() => ({
	page: { url: new URL('http://localhost/map'), state: {} },
	replaceState: vi.fn()
}));
vi.mock('$app/state', () => ({ page: app.page }));
vi.mock('$app/navigation', () => ({ replaceState: app.replaceState }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

import '../../app.css';
import MapPage from './+page.svelte';

const square = (x: number, y: number) => [
	[
		[x, y],
		[x + 0.01, y],
		[x + 0.01, y + 0.01],
		[x, y + 0.01],
		[x, y]
	]
];
const farm = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			properties: { fieldID: '42', FIELDNAME: 'North flat' },
			geometry: { type: 'Polygon', coordinates: square(146.4, -41.2) }
		},
		{
			type: 'Feature',
			properties: { fieldID: '7', FIELDNAME: 'Creek' },
			geometry: { type: 'Polygon', coordinates: square(146.42, -41.2) }
		},
		{
			type: 'Feature',
			properties: { FIELDNAME: 'No id' },
			geometry: { type: 'Polygon', coordinates: square(146.44, -41.2) }
		}
	]
};
const latest = [{ fieldID: '42', sample_date: '2024-05-01', name_sample: 'NF', ph_water: 5.5 }];

function stubFetch(soil: () => Response = () => Response.json(latest)) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.startsWith('/api/soil-tests')) return soil();
			if (url.startsWith('/api/farm/titles'))
				return Response.json({ type: 'FeatureCollection', features: [] });
			if (url.startsWith('/api/farm')) return Response.json(farm);
			return new Response('not found', { status: 404 });
		})
	);
}

function openAt(path: string) {
	app.page.url = new URL(`http://localhost${path}`);
	render(MapPage);
}

afterEach(() => {
	vi.unstubAllGlobals();
	app.replaceState.mockClear();
});

describe('map page on a phone', () => {
	beforeEach(async () => {
		await page.viewport(390, 844);
	});

	it('shows the map with metric chips and no sidebar', async () => {
		stubFetch();
		openAt('/map');

		await expect.element(page.getByRole('button', { name: 'Layers' })).toBeVisible();
		await expect.element(page.getByRole('group', { name: 'Soil metric' })).toBeVisible();
		await expect
			.element(page.getByRole('heading', { name: 'Map controls' }))
			.not.toBeInTheDocument();
	});

	it('selects the paddock named in ?paddock= and shows its soil status', async () => {
		stubFetch();
		openAt('/map?paddock=42');

		const sheet = page.getByRole('dialog', { name: 'North flat' });
		await expect.element(sheet).toBeVisible();
		await expect.element(sheet.getByText('Low')).toBeVisible();
	});

	it('ignores an unknown or non-numeric ?paddock=', async () => {
		for (const path of ['/map?paddock=999', '/map?paddock=abc']) {
			stubFetch();
			openAt(path);
			await expect.element(page.getByRole('button', { name: 'Layers' })).toBeVisible();
			await new Promise((done) => setTimeout(done, 200));
			expect(page.getByRole('dialog').elements()).toHaveLength(0);
			document.body.innerHTML = '';
		}
	});

	it('says soil data is unavailable when the soil request returns something that is not a list', async () => {
		stubFetch(() => Response.json({ method: 'GET', path: '/api/soil-tests' }));
		openAt('/map?paddock=42');

		const sheet = page.getByRole('dialog', { name: 'North flat' });
		await expect.element(sheet.getByText('Soil data unavailable')).toBeVisible();
	});

	it('searches from the Layers sheet; Escape closes the suggestions first, then the sheet', async () => {
		stubFetch();
		openAt('/map');

		await page.getByRole('button', { name: 'Layers' }).click();
		const search = page.getByRole('combobox', { name: 'Find a paddock' });
		await search.fill('no id');
		await expect.element(page.getByText('No paddock matches “no id”.')).toBeVisible();

		await search.fill('cre');
		await expect.element(page.getByRole('option', { name: /Creek/ })).toBeVisible();
		await userEvent.keyboard('{Escape}');
		await expect.element(page.getByRole('dialog', { name: 'Layers' })).toBeVisible();
		await userEvent.keyboard('{Escape}');
		await expect.element(page.getByRole('dialog', { name: 'Layers' })).not.toBeInTheDocument();
	});

	it('writes the selected paddock into the URL', async () => {
		stubFetch();
		openAt('/map');

		await page.getByRole('button', { name: 'Find a paddock' }).click();
		await page.getByRole('combobox', { name: 'Find a paddock' }).fill('creek');
		await page.getByRole('option', { name: /Creek/ }).click();

		await expect.element(page.getByRole('dialog', { name: 'Creek' })).toBeVisible();
		const [url] = app.replaceState.mock.lastCall as [URL];
		expect(url.searchParams.get('paddock')).toBe('7');
	});
});

describe('map page on a desktop', () => {
	beforeEach(async () => {
		await page.viewport(1280, 800);
	});

	it('keeps the sidebar, with search, and no chips row', async () => {
		stubFetch();
		openAt('/map');

		await expect.element(page.getByRole('heading', { name: 'Map controls' })).toBeVisible();
		await expect.element(page.getByRole('combobox', { name: 'Find a paddock' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Layers' })).not.toBeInTheDocument();
	});
});
```

Run: `npx vitest run --project client src/routes/map/map-page.svelte.test.ts`
Expected: FAIL (the legacy page has no Layers button, reads `$app/stores`, and so on).

- [ ] **Step 2: Rewrite `src/routes/map/+page.svelte`**

Replace the whole file with the following. It keeps the old page's loading, error, colouring and tooltip behaviour, and moves every piece of UI into the Task 3–6 components.

```svelte
<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import L from 'leaflet';
	import type { TileLayerOptions } from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { MediaQuery } from 'svelte/reactivity';

	import CONFIG from '$lib/config';
	import type { MetricId, MetricOption } from '$lib/config';
	import { findPaddockAt, geometryArea, type GeometryLike } from '$lib/geo';
	import { buildBaseLayer, buildTitleLayer, type TitleFeatureProperties } from '$lib/layers';
	import { normaliseFieldId } from '$lib/soil-status';

	import DetailSheet from './components/DetailSheet.svelte';
	import LocateButton from './components/LocateButton.svelte';
	import MapControls from './components/MapControls.svelte';
	import MetricChips from './components/MetricChips.svelte';
	import MetricLegend from './components/MetricLegend.svelte';
	import PaddockDetails from './components/PaddockDetails.svelte';
	import PaddockSearch from './components/PaddockSearch.svelte';
	import TitleDetails from './components/TitleDetails.svelte';
	import type { LocateFix, PaddockOption } from './components/types';
	import {
		NO_DATA_STYLE,
		buildPaddockTooltipHtml,
		computeLegendDetails,
		computeLegendPercents,
		computeMetricStats,
		derivePaddockIdentity,
		formatMetricValue,
		setLayerBaseStyle,
		updatePaddockTooltip,
		viridisColor,
		type BaseLayerConfig,
		type NormalisedSoilSample
	} from './helpers';
	import { indexLatestSamples, paddockSoilSummary } from './soil-status';

	type Panel =
		| { kind: 'layers' }
		| { kind: 'search' }
		| { kind: 'paddock'; id: number }
		| { kind: 'title'; title: TitleFeatureProperties };

	type PaddockEntry = {
		id: number | null;
		name: string;
		displayId: string;
		areaHa: number | null;
		geometry: GeometryLike;
		layer: L.Polygon;
	};

	const SELECTED_STYLE = { color: '#ffffff', weight: 3 };

	const metrics = CONFIG.soilMetrics;
	const metricsById = new Map<MetricId, MetricOption>(metrics.map((metric) => [metric.id, metric]));
	const defaultMetric: MetricId = metrics[0].id;

	const { url: imageryUrl, ...imageryOptions } = CONFIG.map;
	const baseLayers: BaseLayerConfig[] = [
		{
			id: 'imagery',
			label: 'Satellite',
			description: 'Aerial photos of the farm.',
			url: imageryUrl,
			options: imageryOptions as TileLayerOptions
		},
		{
			id: 'streets',
			label: 'Streets',
			description: 'OpenStreetMap roads and place names.',
			url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
			options: { attribution: '© OpenStreetMap contributors', maxZoom: 19 }
		}
	];

	const desktop = new MediaQuery('min-width: 48rem');

	function metricFromUrl(): MetricId {
		const id = page.url.searchParams.get('metric');
		return id !== null && metricsById.has(id) ? id : defaultMetric;
	}

	// Leaflet objects are never proxied: they live in $state.raw and are replaced, not mutated.
	let map = $state.raw<L.Map | null>(null);
	let paddockLayer = $state.raw<L.GeoJSON | null>(null);
	let titleLayer = $state.raw<L.GeoJSON | null>(null);
	let entries = $state.raw<PaddockEntry[]>([]);
	let soilByField = $state.raw(new Map<number, NormalisedSoilSample>());
	let userFix = $state.raw<LocateFix | null>(null);
	let panel = $state.raw<Panel | null>(null);

	let navOpen = $state(true);
	let showLabels = $state(true);
	let showBoundaries = $state(true);
	let showTitles = $state(false);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	let titlesLoading = $state(false);
	let titlesError = $state<string | null>(null);
	let titlesCount = $state(0);
	let soilLoading = $state(false);
	let soilError = $state<string | null>(null);
	let activeBaseLayer = $state(baseLayers[0].id);
	let activeMetric = $state<MetricId>(metricFromUrl());
	let toast = $state<string | null>(null);

	let baseBounds: L.LatLngBounds | null = null;
	let centredOnFix = false;
	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	const tileCache = new Map<string, L.TileLayer>();
	let currentTiles: L.TileLayer | null = null;

	const metric = $derived(metricsById.get(activeMetric) ?? metrics[0]);
	const scaleReady = $derived(
		metric.id !== 'none' &&
			typeof metric.c_min === 'number' &&
			typeof metric.c_max === 'number' &&
			metric.c_max > metric.c_min
	);
	const byId = $derived(
		new Map(
			entries
				.filter((entry): entry is PaddockEntry & { id: number } => entry.id !== null)
				.map((entry) => [entry.id, entry])
		)
	);
	const identities = $derived(
		new Map(
			[...byId.values()].map((entry) => [
				entry.id,
				{ name: entry.name, displayId: entry.displayId }
			])
		)
	);
	const stats = $derived(computeMetricStats(metric, soilByField));
	const percents = $derived(computeLegendPercents(metric, stats, scaleReady));
	const details = $derived(computeLegendDetails(metric, stats, soilByField, identities));
	const colouredCount = $derived(
		[...byId.keys()].filter((id) => typeof soilByField.get(id)?.metrics[metric.id] === 'number')
			.length
	);
	const searchOptions: PaddockOption[] = $derived(
		[...byId.values()]
			.map(({ id, name, displayId }) => ({ id, name, displayId }))
			.sort((a, b) => a.name.localeCompare(b.name))
	);
	const selectedId = $derived(panel?.kind === 'paddock' ? panel.id : null);
	const selected = $derived(selectedId === null ? null : (byId.get(selectedId) ?? null));
	const selectedSample = $derived(selectedId === null ? undefined : soilByField.get(selectedId));
	// Hover labels are a desktop feature; on touch they get in the way of taps.
	const labelsHidden = $derived(!desktop.current || !showLabels || !showBoundaries);
	const statusLine = $derived(
		isLoading
			? 'Loading paddock boundaries…'
			: loadError
				? loadError
				: `Showing ${entries.length} mapped paddocks${titlesCount > 0 ? ` and ${titlesCount} title boundaries` : ''}.`
	);

	function writeQuery(changes: Record<string, string | null>) {
		const url = new URL(page.url);
		for (const [key, value] of Object.entries(changes)) {
			if (value === null) url.searchParams.delete(key);
			else url.searchParams.set(key, value);
		}
		replaceState(url, page.state);
	}

	function chooseMetric(id: MetricId) {
		activeMetric = id;
		writeQuery({ metric: id === defaultMetric ? null : id });
	}

	function selectPaddock(id: number, fit: boolean) {
		const entry = byId.get(id);
		if (!entry) return;
		panel = { kind: 'paddock', id };
		if (fit && map) map.fitBounds(entry.layer.getBounds(), { padding: [48, 48], maxZoom: 17 });
		writeQuery({ paddock: String(id) });
	}

	function selectTitle(title: TitleFeatureProperties) {
		if (panel?.kind === 'paddock') writeQuery({ paddock: null });
		panel = { kind: 'title', title };
	}

	function closePanel() {
		if (panel?.kind === 'paddock') writeQuery({ paddock: null });
		panel = null;
	}

	function showToast(message: string) {
		toast = message;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = null), 5000);
	}

	function resetView() {
		if (map && baseBounds?.isValid()) map.fitBounds(baseBounds, { padding: [24, 24] });
	}

	async function loadFarmData() {
		const target = map;
		if (!target) return;
		isLoading = true;
		loadError = null;
		try {
			const response = await fetch(CONFIG.backend.farm);
			if (!response.ok) throw new Error(`Request failed (${response.status})`);
			const geojson = await response.json();

			if (paddockLayer) target.removeLayer(paddockLayer);
			const layer = buildBaseLayer(geojson, L);
			const next: PaddockEntry[] = [];
			layer.eachLayer((child) => {
				const polygon = child as L.Polygon;
				const feature = polygon.feature;
				const identity = derivePaddockIdentity(
					(feature?.properties ?? {}) as Record<string, unknown>
				);
				const id =
					typeof identity.fieldId === 'number' && Number.isInteger(identity.fieldId)
						? identity.fieldId
						: null;
				const area = geometryArea(feature?.geometry);
				next.push({
					id,
					name: identity.name,
					displayId: identity.displayId,
					areaHa: area > 0 ? area / 10_000 : null,
					geometry: feature?.geometry,
					layer: polygon
				});
				polygon.on('click', () => {
					if (id !== null) selectPaddock(id, false);
				});
			});
			paddockLayer = layer;
			entries = next;

			const bounds = layer.getBounds();
			if (bounds.isValid()) {
				baseBounds = bounds;
				target.fitBounds(bounds, { padding: [24, 24] });
			}

			const fromUrl = normaliseFieldId(page.url.searchParams.get('paddock'));
			if (fromUrl !== null && byId.has(fromUrl)) selectPaddock(fromUrl, true);
		} catch (err) {
			console.error('Failed to load farm data', err);
			loadError = err instanceof Error ? err.message : 'Failed to load farm data.';
		} finally {
			isLoading = false;
		}
	}

	async function loadSoilTests() {
		if (soilLoading) return;
		soilLoading = true;
		soilError = null;
		try {
			const response = await fetch(CONFIG.backend.latestTest);
			if (!response.ok) throw new Error(`Request failed (${response.status})`);
			const payload = await response.json();
			if (!Array.isArray(payload)) throw new Error('Unexpected soil test response.');
			soilByField = indexLatestSamples(payload, metrics);
		} catch (err) {
			console.error('Failed to load soil test data', err);
			soilError = "Couldn't load soil tests. Check the connection and try again.";
			soilByField = new Map();
		} finally {
			soilLoading = false;
		}
	}

	async function loadTitleBoundaries() {
		const target = map;
		if (!target || titlesLoading) return;
		titlesLoading = true;
		titlesError = null;
		try {
			const response = await fetch(CONFIG.backend.titles);
			if (!response.ok) throw new Error(`Request failed (${response.status})`);
			const geojson = await response.json();
			titlesCount = Array.isArray(geojson?.features) ? geojson.features.length : 0;
			if (titleLayer) target.removeLayer(titleLayer);
			titleLayer = buildTitleLayer(geojson, L, selectTitle);
		} catch (err) {
			console.error('Failed to load title boundaries', err);
			titlesError = "Couldn't load title boundaries.";
		} finally {
			titlesLoading = false;
		}
	}

	function handleFix(fix: LocateFix) {
		userFix = fix;
		if (centredOnFix || !map) return;
		centredOnFix = true;
		map.setView([fix.lat, fix.lon], Math.max(map.getZoom(), 16));
		const hit = findPaddockAt(fix.lat, fix.lon, entries);
		if (hit?.id != null) selectPaddock(hit.id, false);
		else showToast("You're not inside a mapped paddock.");
	}

	function handleLocateStop() {
		centredOnFix = false;
		userFix = null;
	}

	function toggleLayer(target: L.Map, layer: L.Layer, visible: boolean) {
		if (visible && !target.hasLayer(layer)) layer.addTo(target);
		else if (!visible && target.hasLayer(layer)) target.removeLayer(layer);
	}

	function stylePaddock(entry: PaddockEntry, isSelected: boolean) {
		const sample = entry.id === null ? undefined : soilByField.get(entry.id);
		const value = sample?.metrics[metric.id];
		const hasValue = typeof value === 'number' && Number.isFinite(value);
		let style = {};
		let valueText: string | null = null;

		if (scaleReady && hasValue) {
			style = {
				fillColor: viridisColor(value, metric.c_min as number, metric.c_max as number),
				fillOpacity: 0.88,
				color: '#0f172a',
				weight: 1
			};
			valueText = formatMetricValue(value, metric);
		} else if (scaleReady) {
			style = NO_DATA_STYLE;
			valueText = 'No data';
		} else if (hasValue) {
			valueText = formatMetricValue(value, metric);
		} else if (sample) {
			valueText = 'No data';
		}

		setLayerBaseStyle(entry.layer, isSelected ? { ...style, ...SELECTED_STYLE } : style);
		if (isSelected) entry.layer.bringToFront();
		updatePaddockTooltip(
			entry.layer,
			buildPaddockTooltipHtml({
				name: entry.name,
				displayId: entry.displayId,
				metric,
				valueText,
				sampleDate: sample?.sampleDate ?? null,
				colorable: scaleReady
			})
		);
	}

	const createMap: Attachment<HTMLDivElement> = (node) => {
		const instance = L.map(node, { zoomControl: false }).setView([-41.2, 146.4], 14);
		L.control.zoom({ position: 'bottomright' }).addTo(instance);
		const observer = new ResizeObserver(() => instance.invalidateSize());
		observer.observe(node);
		map = instance;
		untrack(() => {
			loadFarmData();
			loadSoilTests();
			loadTitleBoundaries();
		});
		return () => {
			observer.disconnect();
			clearTimeout(toastTimer);
			tileCache.clear();
			currentTiles = null;
			instance.remove();
			map = null;
		};
	};

	$effect(() => {
		const target = map;
		const config = baseLayers.find((layer) => layer.id === activeBaseLayer);
		if (!target || !config) return;
		untrack(() => {
			if (currentTiles) target.removeLayer(currentTiles);
			let tiles = tileCache.get(config.id);
			if (!tiles) {
				tiles = L.tileLayer(config.url, config.options);
				tileCache.set(config.id, tiles);
			}
			tiles.addTo(target);
			currentTiles = tiles;
		});
	});

	$effect(() => {
		if (map && paddockLayer) toggleLayer(map, paddockLayer, showBoundaries);
	});

	$effect(() => {
		if (map && titleLayer) toggleLayer(map, titleLayer, showTitles);
	});

	// Colour, highlight and label every paddock whenever the metric, data or selection changes.
	$effect(() => {
		for (const entry of entries) stylePaddock(entry, entry.id !== null && entry.id === selectedId);
	});

	$effect(() => {
		const target = map;
		const fix = userFix;
		if (!target || !fix) return;
		const marker = L.layerGroup([
			L.circle([fix.lat, fix.lon], {
				radius: fix.accuracy,
				color: '#78bdf0',
				weight: 1,
				fillOpacity: 0.15,
				interactive: false
			}),
			L.circleMarker([fix.lat, fix.lon], {
				radius: 7,
				color: '#ffffff',
				weight: 2,
				fillColor: '#78bdf0',
				fillOpacity: 1,
				interactive: false
			})
		]).addTo(target);
		return () => {
			marker.remove();
		};
	});
</script>

<svelte:head>
	<title>Farm map</title>
</svelte:head>

{#snippet legend(compact: boolean)}
	<MetricLegend
		{metric}
		{stats}
		{percents}
		{details}
		{colouredCount}
		{scaleReady}
		loading={soilLoading}
		error={soilError}
		onretry={loadSoilTests}
		{compact}
	/>
{/snippet}

{#snippet controls(labelToggle: boolean)}
	<MapControls
		{baseLayers}
		{activeBaseLayer}
		onbasechange={(id) => (activeBaseLayer = id)}
		bind:showBoundaries
		bind:showLabels
		bind:showTitles
		showLabelToggle={labelToggle}
		titles={{ loading: titlesLoading, error: titlesError, count: titlesCount }}
		onretrytitles={loadTitleBoundaries}
		onreset={resetView}
	/>
{/snippet}

<div class="map-shell relative flex bg-bg">
	<h1 class="sr-only">Farm map</h1>

	{#if desktop.current}
		<aside
			inert={!navOpen}
			class={[
				'relative h-full shrink-0 overflow-hidden border-r border-border bg-panel transition-[width] duration-300 ease-in-out motion-reduce:transition-none',
				navOpen ? 'w-80' : 'w-0'
			]}
		>
			<div
				data-tooltip-boundary
				class="flex h-full w-80 flex-col gap-6 overflow-y-auto px-5 py-5 text-sm text-muted"
			>
				<div class="flex items-center gap-3">
					<h2 class="flex-1 text-lg font-semibold text-text">Map controls</h2>
					<button
						type="button"
						onclick={() => (navOpen = false)}
						aria-label="Hide map controls"
						class="inline-flex size-11 items-center justify-center rounded-lg border border-border text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							class="size-5"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15.75 19.5 8.25 12l7.5-7.5"
							/>
						</svg>
					</button>
				</div>
				<PaddockSearch paddocks={searchOptions} onselect={(id) => selectPaddock(id, true)} />
				<section class="space-y-3" aria-labelledby="metric-heading">
					<h3 id="metric-heading" class="text-sm font-semibold text-text">Soil metric</h3>
					<MetricChips {metrics} active={activeMetric} onchange={chooseMetric} layout="wrap" />
					{@render legend(false)}
				</section>
				{@render controls(true)}
				<p class="rounded-lg border border-border bg-white/5 px-4 py-3 text-xs">{statusLine}</p>
			</div>
		</aside>
	{/if}

	<div class="relative min-w-0 flex-1">
		<div
			{@attach createMap}
			class={['map-canvas absolute inset-0', labelsHidden && 'labels-hidden']}
		></div>

		{#if desktop.current}
			{#if !navOpen}
				<button
					type="button"
					onclick={() => (navOpen = true)}
					class="absolute top-3 left-3 z-[1050] inline-flex min-h-11 items-center rounded-lg border border-border bg-panel/95 px-4 text-sm text-text shadow-lg hover:bg-panel"
				>
					Show map controls
				</button>
			{/if}
			{#if metric.id !== 'none'}
				<div
					class={[
						'pointer-events-none absolute left-3 z-[1040] max-w-xs rounded-xl border border-border bg-panel/95 px-4 py-3 text-sm shadow-lg',
						navOpen ? 'top-3' : 'top-16'
					]}
				>
					<p class="font-semibold text-text">{metric.label}</p>
					<p class="mt-1 text-muted">{metric.description}</p>
					<p class="mt-1 text-muted">
						Optimal range {metric.range_optimal[0]} to {metric.range_optimal[1]}{metric.unit
							? ` ${metric.unit}`
							: ''}
					</p>
				</div>
			{/if}
		{:else}
			<div class="absolute inset-x-0 top-0 z-[1050] flex items-center gap-2 px-3 pt-3">
				<div class="min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto">
					<MetricChips {metrics} active={activeMetric} onchange={chooseMetric} layout="row" />
				</div>
				<button
					type="button"
					aria-label="Find a paddock"
					onclick={() => (panel = { kind: 'search' })}
					class="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-panel/95 text-text shadow-lg"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						class="size-5"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
						/>
					</svg>
				</button>
				<button
					type="button"
					onclick={() => (panel = { kind: 'layers' })}
					class="inline-flex min-h-11 shrink-0 items-center rounded-full border border-border bg-panel/95 px-4 text-sm text-text shadow-lg"
				>
					Layers
				</button>
			</div>
			{#if metric.id !== 'none' && panel === null}
				<div class="absolute right-16 bottom-3 left-3 z-[1050]">{@render legend(true)}</div>
			{/if}
		{/if}

		<div class="absolute right-2.5 bottom-24 z-[1050]">
			<LocateButton onposition={handleFix} onerror={showToast} onstop={handleLocateStop} />
		</div>

		<div
			role="status"
			aria-live="polite"
			class="pointer-events-none absolute inset-x-3 top-20 z-[1150] flex justify-center md:top-4"
		>
			{#if toast}
				<p
					class="rounded-lg border border-border bg-panel/95 px-4 py-3 text-sm text-text shadow-lg"
				>
					{toast}
				</p>
			{/if}
		</div>

		{#if loadError}
			<div class="map-status">
				<h2 class="text-lg font-semibold text-text">We couldn't load the farm map</h2>
				<p class="mt-1 text-sm text-muted">{loadError}</p>
				<button
					type="button"
					onclick={() => {
						loadFarmData();
						loadSoilTests();
					}}
					class="mt-3 inline-flex min-h-11 items-center rounded-lg border border-border bg-white/10 px-4 text-sm text-text hover:bg-white/20"
				>
					Try again
				</button>
			</div>
		{:else if isLoading}
			<div class="map-status" aria-live="polite">
				<p class="text-sm text-muted">Preparing paddock boundaries…</p>
			</div>
		{/if}

		{#if panel?.kind === 'paddock' && selected}
			<DetailSheet
				title={selected.name}
				subtitle={`Paddock ${selected.displayId}`}
				onclose={closePanel}
			>
				<PaddockDetails
					fieldId={panel.id}
					areaHa={selected.areaHa}
					sampleDate={selectedSample?.sampleDate ?? null}
					sampleName={selectedSample?.sampleName ?? null}
					rows={paddockSoilSummary(selectedSample, metrics)}
					hasSample={selectedSample !== undefined}
					{soilLoading}
					{soilError}
					onretry={loadSoilTests}
				/>
			</DetailSheet>
		{:else if panel?.kind === 'title'}
			<DetailSheet
				title={panel.title.address || 'Untitled property'}
				subtitle="Property title"
				onclose={closePanel}
			>
				<TitleDetails title={panel.title} />
			</DetailSheet>
		{:else if panel?.kind === 'layers' && !desktop.current}
			<DetailSheet title="Layers" onclose={closePanel}>
				<div class="space-y-6">
					<PaddockSearch paddocks={searchOptions} onselect={(id) => selectPaddock(id, true)} />
					{@render controls(false)}
					<p class="text-xs text-muted">{statusLine}</p>
				</div>
			</DetailSheet>
		{:else if panel?.kind === 'search' && !desktop.current}
			<DetailSheet title="Find a paddock" onclose={closePanel}>
				<PaddockSearch paddocks={searchOptions} onselect={(id) => selectPaddock(id, true)} />
			</DetailSheet>
		{/if}
	</div>
</div>

<style>
	.map-shell {
		height: calc(100dvh - var(--shell-top) - var(--shell-bottom));
		min-height: 420px;
	}

	.map-status {
		position: absolute;
		inset: auto 1.5rem 1.5rem 1.5rem;
		max-width: 22rem;
		margin: 0 auto;
		border-radius: 0.75rem;
		border: 1px solid rgb(var(--border));
		background: rgb(var(--panel) / 0.95);
		padding: 1.5rem;
		text-align: center;
		z-index: 900;
	}

	:global(.map-canvas.labels-hidden .leaflet-tooltip) {
		display: none !important;
	}

	:global(.paddock-tooltip),
	:global(.title-tooltip) {
		color: #f9fafb;
		border-radius: 0.5rem;
		padding: 0.35rem 0.55rem;
		box-shadow: 0 4px 12px rgba(15, 23, 42, 0.35);
		font-size: 0.875rem;
	}

	:global(.paddock-tooltip) {
		background-color: rgba(17, 24, 39, 0.94);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	:global(.title-tooltip) {
		background-color: rgba(30, 15, 60, 0.94);
		border: 1px solid rgba(250, 204, 21, 0.35);
	}

	:global(.paddock-tooltip strong),
	:global(.title-tooltip strong) {
		font-weight: 600;
		display: block;
		margin-bottom: 0.1rem;
	}

	:global(.paddock-tooltip div:last-child),
	:global(.title-tooltip div:last-child) {
		font-size: 0.75rem;
		opacity: 0.85;
	}
</style>
```

Notes for this step:

- The paddock sheet's `?paddock=` is read once, after the farm data loads. The URL is written with `replaceState`, so there are no history entries to sync back from, and the old `$page.url` → metric sync is gone.
- `buildPaddockTooltipHtml` still emits `text-[0.7rem]` classes for tooltips inside Leaflet. Change both to `text-xs` in `helpers.ts` and update the matching assertions in `helpers.test.ts` if any check the class.
- If `L.Polygon['feature']` isn't typed on your version of `@types/leaflet`, read it through `(child as L.Polygon & { feature?: GeoJSON.Feature }).feature`.
- If the autofixer asks for `$state` on `baseBounds`, `centredOnFix`, `toastTimer` or `currentTiles`, don't: nothing renders from them.
- The autofixer lists "calling a function inside an `$effect`" suggestions for `toggleLayer`, `stylePaddock`, `untrack` and the Leaflet calls. They mutate Leaflet objects, not component state, so they're acceptable; so is its "use `SvelteMap`" suggestion for `soilByField`, which is always replaced, never mutated.
- ESLint reports two expected errors in the new page: `prefer-svelte-reactivity` on that `new Map` and `no-navigation-without-resolve` on `replaceState(url, …)` (the URL is the current page with a changed query). The map folder still goes from about 25 errors to about 5.

Run the autofixer on the page until it's clean.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run --project client src/routes/map && npx vitest run --project server src/routes/map src/lib/geo.test.ts && npm run check`
Expected: PASS, no type errors.

- [ ] **Step 4: Remove what nothing uses**

Run: `grep -rn "keepTooltipInView\|EMPTY_LEGEND_PERCENTS\|EMPTY_LEGEND_DETAILS\|VIRIDIS_GRADIENT\|getFieldDisplayName\|formatPercent\|formatFieldList" src --include=*.ts --include=*.svelte | grep -v "helpers.ts"`

For each helper export in `src/routes/map/helpers.ts` with no match outside `helpers.ts` and its test file, delete it and its tests. Keep everything the components still import. Then check the grep for the rules in the Global Constraints:

Run: `grep -rn "text-\[1[01]px\]\|uppercase\|tracking-wider\|\$app/stores\|on:\|export let\|\$:" src/routes/map`
Expected: no output.

- [ ] **Step 5: Browser check and design review**

Load `frontend-design:frontend-design` and re-read `docs/superpowers/specs/2026-09-27-ui-direction.md`. With the backend running (`../gbros-api`) and `npm run dev`, run `node scripts/screenshot.mjs /tmp/shots-map /map /map?paddock=<a real field ID> /map?metric=pH`. Check at 390px: the map fills the screen above the tab bar, the chips row scrolls sideways, the compact legend doesn't collide with the zoom and locate buttons, the sheet leaves the top of the map visible. At 1280px: sidebar as before with search at the top, the floating card at bottom-right. Then by hand in DevTools device mode: Layers opens and closes, tapping a paddock opens its sheet, Escape closes it and returns focus. Fix what doesn't match and re-run the tests.

- [ ] **Step 6: Commit**

```bash
git add src/routes/map
git commit -m "Rebuild the map on runes with phone chips, sheets, search and locate"
```

---

### Task 8: Full verification and PR

- [ ] **Step 1: Run everything CI runs**

```bash
npm run check
npm test
npx prettier --check .
npx eslint src 2>&1 | tail -3   # compare with the baseline; must not be higher
npm run build
scripts/smoke-test.sh --local
```

Expected: all pass; the ESLint error count is at or below the baseline.

- [ ] **Step 2: Final design review**

Load `frontend-design:frontend-design`. With the backend and dev server running, run `node scripts/screenshot.mjs /tmp/shots-final /map /map?paddock=<a real field ID> /paddocks`. Review against the direction document: nothing below 12px, all controls at least 44px, sentence-case headings, statuses in words, no horizontal scroll. On a phone (or DevTools with a mocked location inside a paddock) check Locate: dot, centring, sheet opens; with a location outside the farm, the toast appears and the dot stays.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/mobile-map
gh pr create --base staging --title "Map on phones (UX 2)" --body "$(cat <<'EOF'
Implements docs/superpowers/plans/2026-09-27-mobile-map.md.

- Phones: metric chips over the map, a Layers sheet, a compact legend, and a paddock sheet with soil status in words
- Desktop: the sidebar keeps its sections and gains paddock search; paddock details open in a floating card
- Locate me: shows your position and opens the paddock you're standing in
- `/map?paddock=<id>` selects a paddock (the Paddocks page links here)
- The map page moves to runes and splits into components; geometry helpers move to `$lib/geo`

Closes #16

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Leave the worktree in place until the PR merges.
