# Readability and plain-language status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Before creating or editing any `.svelte` file or `.svelte.ts` module, load the `svelte:svelte-code-writer` skill and use its documentation lookup and autofixer; every `.svelte` file you change must come back clean from the autofixer. Before building or changing visible UI, load `frontend-design:frontend-design` and read `docs/superpowers/specs/2026-09-27-ui-direction.md`; the direction document wins where they disagree.

**Goal:** Text is readable outdoors on a phone, nobody mistakes sample weather data for a real reading, and the weather page answers "can we spray right now?" in words.

**Architecture:** `src/app.css` gets the direction document's type scale and a 16px body, and loses the old static-site rules. The weather provider records which fields it filled from `getMockWeather()` (`mockFields`), and every weather view marks those values. A pure `src/lib/spray.ts` turns wind, gusts, rain and Delta T into a verdict with reasons, shown as the first panel on `/weather` and as a tile on the home page. The weather pages move to runes and draw their charts from the backend's real 24-hour history through a tested `chart.ts`.

**Tech Stack:** Svelte 5.57 (runes, snippets, `svelte/reactivity` `MediaQuery`), SvelteKit 2.70, Tailwind 4 (`@theme` tokens), Vitest 5 (`server` project for `*.test.ts`, `client` project for `*.svelte.test.ts` in headless Chromium).

**Spec:** `docs/superpowers/specs/2026-09-27-readability-and-status-design.md` and `docs/superpowers/specs/2026-09-27-ui-direction.md`. Read both before starting. UX 1 (app shell, home page with the "Right now" strip, `scripts/screenshot.mjs`) is on `staging`.

**Where this plan goes beyond the spec, and why.** Reading the weather code turned up sample data the spec didn't list:

| Found                                                                                                                                                                             | This plan                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/weather` shows hard-coded highs and lows ("↗ 12.7 °C ↘ 4.9 °C", "↗ 828.9 W/m²", pressure ranges) and `/weather/[metric]` a hard-coded "BoM Benchmark". They aren't data at all. | Removed.                                                                                                                                                                                                                                                  |
| The "Outdoor — Daily" chart and the detail page's High/Low always plot `getMockWeather().series`, so `/weather/wind` shows temperature highs and lows.                            | Charts are drawn from `/api/weather?from=&to=` history (already loaded by the detail page), per metric: temperature and dew point, wind and gust, rain, pressure, solar. Metrics the station doesn't report (indoor, battery) say so instead of charting. |
| Trends, rain rate and pressure deltas are hard-coded `0` by the provider, not measured.                                                                                           | Listed in `mockFields` and not shown.                                                                                                                                                                                                                     |
| The home strip labels a tile "Sample data" only when the whole reading is mock.                                                                                                   | Each tile checks its own field in `mockFields`.                                                                                                                                                                                                           |
| Gusts are a spray input, but the spec gives no gust threshold.                                                                                                                    | `gustMarginalKmh: 20` in `CONFIG.spray`: gusts over 20 km/h make the verdict at least Marginal.                                                                                                                                                           |

## Global Constraints

- Work only in your own worktree under `.claude/worktrees/`. Never edit or switch branches in the main checkout (`/home/tom/gbros/farm-website`).
- Setup: run `npm ci` in the worktree. If it fails with `Tsconfig not found .../.svelte-kit/tsconfig.json`, run `npx svelte-kit sync` in the main checkout and retry. Run `npx playwright install chromium` if browser tests say Chromium is missing.
- Before your first commit, move off the `worktree-<name>` branch: `git fetch origin`, `git switch --no-track -c feat/readability-and-status origin/staging`, then `git branch -d <the worktree-… branch>`.
- Before changing anything, record the ESLint baseline: `npx eslint src 2>&1 | tail -3`. At the end, the error count must be less than or equal to it.
- Runes only in new or rewritten Svelte code: no `export let`, `$:`, `<slot>`, `on:`, `use:`, `createEventDispatcher` or `class:`.
- Internal links use `resolve()` from `$app/paths`.
- Smallest text is 12px (`text-xs`): no `text-[10px]`/`text-[11px]` in the files this plan owns. Links and buttons in them are at least 44px tall. No `→` appended to link text, no ALL-CAPS labels. No hover scaling.
- Status is never colour alone: every verdict shows a word ("Good", "Marginal", "Not suitable", "Can’t tell").
- Copy for mock data (verbatim from the spec): banner "Weather station offline. These are sample numbers — don’t use them for decisions."; chip "Sample data"; value tooltip "Sample value"; spray "Can’t tell — the station isn’t reporting …".
- In component tests, `$app/paths` is mocked: `vi.mock('$app/paths', () => ({ resolve: (path: string) => path }))`. Tests of components with icon-only buttons import `src/app.css`.
- Prettier: tabs, single quotes, no trailing commas, width 100. Run `npx prettier --write` on the files you touch.
- Files you may touch: `src/app.css`, `src/app-css.test.ts` (new), `src/lib/node-builtins.d.ts` (one declaration), `src/lib/weather.ts`, `src/lib/providers/backend.ts` and its new test, `src/lib/spray.ts` and its test, `src/lib/config.ts` (the `spray` section only), `src/routes/weather/**`, `src/lib/components/SampleDataChip.svelte`, `src/lib/components/SprayPanel.svelte` and its test, `src/routes/+page.svelte` and `src/routes/home-page.svelte.test.ts` (the weather tiles and Spraying tile only), `src/routes/manual/+page.svelte` (text sizes only). UX 2 owns the map, UX 3 soil tests.
- Before pushing: `npm run check`, `npm test`, `npx prettier --check .`, `npm run build`, `scripts/smoke-test.sh --local` must all pass.
- Push the branch and open a PR into `staging` (`--base staging`) that says `Closes #18`. Don't merge it.

## Review Focus

1. The backend is up but a reading lacks humidity (or temperature) → only the affected values are dimmed and chipped, dew point and VPD are marked as sample too, and the spray verdict says "Can’t tell — the station isn’t reporting humidity." rather than guessing (Task 2 and Task 3 tests).
2. A humidity reading of 0, or above 100 → Delta T is unknown and the verdict is "Can’t tell", not a confident "Not suitable" (Task 3 test).
3. No history rows for the last 24 hours (station offline, or `{"detail":"No data available"}` today) → the chart says "No readings in the last 24 hours." instead of drawing an empty frame or mock lines (Task 5 test).
4. `/weather/wind` → shows wind and gust in km/h with their own highs and lows, not temperature (Task 7 test).
5. Readings exactly on a threshold (wind 3, 15, 20 km/h; Delta T 2, 8, 10 °C) → classified by the spec's ranges, inclusive at the good end (Task 3 test).

---

### Task 1: Type scale, 16px body and old CSS

**Files:**

- Modify: `src/app.css`
- Create: `src/app-css.test.ts`
- Modify: `src/lib/node-builtins.d.ts` (declare `readFileSync`)
- Modify: `src/routes/manual/+page.svelte` (the one `text-[11px]`)

**Interfaces:**

- Produces: Tailwind `text-lg` = 20px, `text-xl` = 25px, `text-2xl` = 31px (the direction document's scale); body text 16px with line height 1.5.

- [ ] **Step 1: Write the failing test**

Create `src/app-css.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Read from disk: Vitest's CSS handling turns `?raw` imports of CSS into an empty string.
const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8');

describe('app.css', () => {
	it('sets 16px body text with a 1.5 line height', () => {
		expect(css).toMatch(/font:\s*16px\/1\.5/);
	});

	it('uses the direction document’s type scale', () => {
		expect(css).toContain('--text-lg: 1.25rem;');
		expect(css).toContain('--text-xl: 1.5625rem;');
		expect(css).toContain('--text-2xl: 1.9375rem;');
	});

	it('has no rules left from the static site', () => {
		for (const selector of ['#app', '#sidebar', '#main', '#map', '.legend', 'label.field']) {
			expect(css).not.toContain(selector);
		}
	});
});
```

The project has no `@types/node`; `src/lib/node-builtins.d.ts` declares the few Node functions tests use. Add this line inside its `declare module 'node:fs'` block:

```ts
export function readFileSync(path: string | URL, encoding: 'utf8'): string;
```

Run: `npx vitest run --project server src/app-css.test.ts`
Expected: FAIL (14px body, old selectors present).

- [ ] **Step 2: Check the old selectors really are unused**

Run each of these; every one must print nothing (the `#app` hit in `src/app.d.ts` is a comment, if present):

```bash
grep -rn 'id="app"\|id="sidebar"\|id="main"\|id="map"' src
grep -rn 'class="[^"]*\blegend\b' src --include=*.svelte
grep -rn 'class="[^"]*\bfield\b' src --include=*.svelte | grep "<label"
```

If any prints a match, keep that rule and tell your reviewer.

- [ ] **Step 3: Replace `src/app.css`**

```css
@import 'tailwindcss';

/* Tailwind colour utilities (text-muted, bg-panel, border-border…) read the :root vars below */
@theme {
	--color-bg: rgb(var(--bg));
	--color-panel: rgb(var(--panel));
	--color-text: rgb(var(--text));
	--color-muted: rgb(var(--muted));
	--color-accent: rgb(var(--accent));
	--color-border: rgb(var(--border));
	--color-status-low: rgb(var(--status-low));
	--color-status-high: rgb(var(--status-high));
	--color-warn: rgb(var(--warn));
	--color-danger: rgb(var(--danger));
	--font-sans: 'Atkinson Hyperlegible Next Variable', system-ui, sans-serif;

	/* Type scale from the UI direction document (ratio 1.25); xs, sm and base keep Tailwind's sizes. */
	--text-lg: 1.25rem;
	--text-lg--line-height: 1.4;
	--text-xl: 1.5625rem;
	--text-xl--line-height: 1.3;
	--text-2xl: 1.9375rem;
	--text-2xl--line-height: 1.25;
}

/* Keep Leaflet typography consistent with the page. */
.leaflet-container {
	font: inherit;
}

:root {
	--bg: 11 17 23; /* #0b1117 */
	--panel: 15 23 34; /* #0f1722 */
	--text: 230 237 243; /* #e6edf3 */
	--muted: 159 179 200; /* #9fb3c8 */
	--accent: 114 228 156; /* #72e49c */
	--border: 31 42 55; /* #1f2a37 */
	--status-low: 242 179 91; /* #f2b35b */
	--status-high: 120 189 240; /* #78bdf0 */
	--warn: 242 179 91; /* #f2b35b */
	--danger: 248 113 113; /* #f87171 */
	/* Space the app shell takes; full-height pages subtract these. */
	--shell-top: 0px;
	--shell-bottom: calc(4rem + env(safe-area-inset-bottom));
}

@media (min-width: 48rem) {
	:root {
		--shell-top: 3.5rem;
		--shell-bottom: 0px;
	}
}

* {
	box-sizing: border-box;
}

html,
body {
	height: 100%;
	margin: 0;
}

body {
	font:
		16px/1.5 'Atkinson Hyperlegible Next Variable',
		system-ui,
		-apple-system,
		Segoe UI,
		Roboto,
		sans-serif;
	color: rgb(var(--text));
	background: rgb(var(--bg));
}

/* In the base layer so Tailwind colour utilities on links (text-muted, text-text…) win. */
@layer base {
	a {
		color: rgb(var(--accent));
		text-decoration: none;
	}
}

select,
input[type='checkbox'] {
	accent-color: rgb(var(--accent));
}
```

- [ ] **Step 4: Fix the manual's small text**

In `src/routes/manual/+page.svelte`, change `text-[11px]` (on the CSV header example block) to `text-xs`.

Run: `grep -rn "text-\[1[01]px\]" src/routes/manual src/routes/weather src/routes/+page.svelte`
Expected: no output.

- [ ] **Step 5: Run the tests and look**

Run: `npx vitest run --project server src/app-css.test.ts && npm run check && npm test`
Expected: PASS.

Start `npm run dev` and run `node scripts/screenshot.mjs /tmp/shots-type / /weather /manual /paddocks`. Check at 390px that body text is visibly larger than before, nothing overflows sideways (no `HORIZONTAL SCROLL` in the output), and headings step up in size (h1 25px, section headings 20px). Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/app.css src/app-css.test.ts src/lib/node-builtins.d.ts src/routes/manual/+page.svelte
git commit -m "Set 16px body text and the direction type scale; drop static-site CSS"
```

---

### Task 2: Record which weather fields are sample data

**Files:**

- Modify: `src/lib/weather.ts`
- Modify: `src/lib/providers/backend.ts`
- Create: `src/lib/providers/backend.test.ts`
- Modify: `src/routes/weather/+page.ts`, `src/routes/weather/[metric]/+page.ts` (pass `mockFields` through; the dashboard also loads history)

**Interfaces:**

- Produces (`src/lib/weather.ts`):
  - `WEATHER_FIELDS` (readonly tuple of every dotted path in `Weather` except `updatedAt`, plus `'series'`) and `type WeatherField = (typeof WEATHER_FIELDS)[number]`
  - `ALWAYS_SAMPLE_FIELDS: readonly WeatherField[]`: fields the station never reports
  - `WeatherResult` gains `mockFields: WeatherField[]`
  - `dewPointC(tempC: number, rhPct: number): number` (Magnus formula, moved from the provider)
- Produces (`src/lib/providers/backend.ts`): `WeatherMeta` gains `mockFields: WeatherField[]`. A reachable backend lists `ALWAYS_SAMPLE_FIELDS` plus each field it had to fill; an unreachable one lists `WEATHER_FIELDS`.
- Produces: both weather loads return `mockFields`; the dashboard load also returns `history` and `range` like the detail load.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/providers/backend.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { ALWAYS_SAMPLE_FIELDS, WEATHER_FIELDS } from '$lib/weather';
import { fetchBackendWeatherMeta } from './backend';

const full = {
	timestamp_utc: '2026-09-26 01:00:00',
	temp_c: 14.2,
	humidity_pct: 70,
	pressure_hpa: 1012,
	wind_avg_ms: 3,
	wind_gust_ms: 5,
	wind_dir_deg: 200,
	rain_1h_mm: 0,
	rain_24h_mm: 1.2,
	solar_wm2: 300
};
const returning = (body: unknown, status = 200) =>
	vi.fn(async () => Response.json(body, { status })) as unknown as typeof fetch;
const sorted = (fields: readonly string[]) => [...fields].sort();

describe('fetchBackendWeatherMeta mockFields', () => {
	it('lists only the fields the station never reports when a reading is complete', async () => {
		const result = await fetchBackendWeatherMeta(returning(full));

		expect(result.source).toBe('ecowitt');
		expect(sorted(result.mockFields)).toEqual(sorted(ALWAYS_SAMPLE_FIELDS));
		expect(result.data.outdoor.temp).toBe(14.2);
	});

	it('adds humidity and everything derived from it when humidity is missing', async () => {
		const result = await fetchBackendWeatherMeta(returning({ ...full, humidity_pct: null }));

		expect(result.mockFields).toEqual(
			expect.arrayContaining(['outdoor.humidity', 'outdoor.dewPoint', 'outdoor.vpd'])
		);
		expect(result.mockFields).not.toContain('outdoor.temp');
	});

	it('lists every field when the backend is unreachable or fails', async () => {
		const failing = vi.fn(async () => {
			throw new Error('ECONNREFUSED');
		}) as unknown as typeof fetch;

		for (const fetchFn of [failing, returning({ detail: 'down' }, 502)]) {
			const result = await fetchBackendWeatherMeta(fetchFn);
			expect(result.source).toBe('mock');
			expect(sorted(result.mockFields)).toEqual(sorted(WEATHER_FIELDS));
		}
	});
});
```

Run: `npx vitest run --project server src/lib/providers/backend.test.ts`
Expected: FAIL (`ALWAYS_SAMPLE_FIELDS` isn't exported; `mockFields` is undefined).

- [ ] **Step 2: Add the field list and `dewPointC` to `src/lib/weather.ts`**

After the `Weather` type, add:

```ts
/** Every value on the weather pages, as a dotted path into `Weather`. */
export const WEATHER_FIELDS = [
	'outdoor.temp',
	'outdoor.trend',
	'outdoor.feelsLike',
	'outdoor.dewPoint',
	'outdoor.humidity',
	'outdoor.vpd',
	'indoor.temp',
	'indoor.trend',
	'indoor.humidity',
	'solar.solar',
	'solar.uvi',
	'solar.sunrise',
	'solar.sunset',
	'solar.moon',
	'rain.rate',
	'rain.daily',
	'rain.event',
	'rain.hourly',
	'rain.weekly',
	'rain.monthly',
	'rain.yearly',
	'wind.dir',
	'wind.speed',
	'wind.gust',
	'wind.timeSpeed',
	'wind.timeGust',
	'pressure.rel',
	'pressure.abs',
	'pressure.deltaRel',
	'pressure.deltaAbs',
	'battery.status',
	'battery.note',
	'series'
] as const;

export type WeatherField = (typeof WEATHER_FIELDS)[number];

/** Fields the station doesn't report: the provider fills them from getMockWeather() or with 0. */
export const ALWAYS_SAMPLE_FIELDS: readonly WeatherField[] = [
	'outdoor.trend',
	'indoor.temp',
	'indoor.trend',
	'indoor.humidity',
	'solar.uvi',
	'solar.sunrise',
	'solar.sunset',
	'solar.moon',
	'rain.rate',
	'rain.event',
	'rain.weekly',
	'rain.monthly',
	'rain.yearly',
	'wind.timeSpeed',
	'wind.timeGust',
	'pressure.deltaRel',
	'pressure.deltaAbs',
	'battery.status',
	'battery.note',
	'series'
];

/** Dew point in °C (Magnus formula). */
export function dewPointC(tempC: number, rhPct: number): number {
	const a = 17.27;
	const b = 237.7;
	const alpha = (a * tempC) / (b + tempC) + Math.log(rhPct / 100);
	return (b * alpha) / (a - alpha);
}
```

Change `WeatherResult` and `fetchWeather` to:

```ts
export type WeatherResult = {
	weather: Weather;
	connected: boolean;
	source: 'ecowitt' | 'mock';
	/** Values that are sample data rather than readings; every field when `source` is `'mock'`. */
	mockFields: WeatherField[];
};
```

```ts
export async function fetchWeather(fetchFn: typeof fetch = fetch): Promise<WeatherResult> {
	const { data, connected, source, mockFields } = await fetchBackendWeatherMeta(fetchFn);
	return { weather: data, connected, source, mockFields };
}
```

- [ ] **Step 3: Record filled fields in `src/lib/providers/backend.ts`**

Replace the import line with:

```ts
import {
	ALWAYS_SAMPLE_FIELDS,
	WEATHER_FIELDS,
	dewPointC,
	getMockWeather,
	type Weather,
	type WeatherField
} from '$lib/weather';
```

Change `WeatherMeta` to:

```ts
export type WeatherMeta = {
	data: Weather;
	connected: boolean;
	source: 'ecowitt' | 'mock';
	mockFields: WeatherField[];
};
```

Replace `mapReadingToWeather` with:

```ts
function mapReadingToWeather(r: WeatherReading): { weather: Weather; mockFields: WeatherField[] } {
	const mock = getMockWeather();
	const mocked = new Set<WeatherField>(ALWAYS_SAMPLE_FIELDS);
	// Use the reading when present; otherwise fall back and record every field that fallback feeds.
	const pick = <T>(value: T | null | undefined, fallback: T, ...fields: WeatherField[]): T => {
		if (value !== null && value !== undefined) return value;
		for (const field of fields) mocked.add(field);
		return fallback;
	};

	const tempC = r.temp_c ?? null;
	const rh = r.humidity_pct ?? null;
	const both = tempC !== null && rh !== null;

	const weather: Weather = {
		updatedAt: coerceUtcIsoString(r.timestamp_utc),
		outdoor: {
			temp: pick(tempC, mock.outdoor.temp, 'outdoor.temp'),
			trend: 0,
			feelsLike: pick(tempC, mock.outdoor.feelsLike, 'outdoor.feelsLike'),
			dewPoint: both ? dewPointC(tempC, rh) : pick(null, mock.outdoor.dewPoint, 'outdoor.dewPoint'),
			humidity: pick(rh, mock.outdoor.humidity, 'outdoor.humidity'),
			vpd: both ? computeVPD_c_kPa(tempC, rh) : pick(null, mock.outdoor.vpd, 'outdoor.vpd')
		},
		indoor: { temp: mock.indoor.temp, trend: 0, humidity: mock.indoor.humidity },
		solar: {
			solar: pick(r.solar_wm2, mock.solar.solar, 'solar.solar'),
			uvi: mock.solar.uvi,
			sunrise: mock.solar.sunrise,
			sunset: mock.solar.sunset,
			moon: mock.solar.moon
		},
		rain: {
			rate: 0,
			daily: pick(r.rain_24h_mm, mock.rain.daily, 'rain.daily'),
			event: mock.rain.event,
			hourly: pick(r.rain_1h_mm, mock.rain.hourly, 'rain.hourly'),
			weekly: mock.rain.weekly,
			monthly: mock.rain.monthly,
			yearly: mock.rain.yearly
		},
		wind: {
			dir: pick(r.wind_dir_deg, mock.wind.dir, 'wind.dir'),
			speed: pick(r.wind_avg_ms, mock.wind.speed, 'wind.speed'),
			gust: pick(r.wind_gust_ms, mock.wind.gust, 'wind.gust'),
			timeSpeed: mock.wind.timeSpeed,
			timeGust: mock.wind.timeGust
		},
		pressure: {
			rel: pick(r.pressure_hpa, mock.pressure.rel, 'pressure.rel'),
			abs: pick(r.pressure_hpa, mock.pressure.abs, 'pressure.abs'),
			deltaRel: 0,
			deltaAbs: 0
		},
		battery: { status: mock.battery.status, note: mock.battery.note },
		series: mock.series
	};

	return { weather, mockFields: [...mocked] };
}
```

and `fetchBackendWeatherMeta`'s body with:

```ts
try {
	const res = await fetchFn(CONFIG.backend.currentWeather);
	if (!res.ok) throw new Error(`backend /weather/current failed: ${res.status}`);
	const reading = (await res.json()) as WeatherReading;
	const { weather, mockFields } = mapReadingToWeather(reading);
	return { data: weather, connected: true, source: 'ecowitt', mockFields };
} catch {
	console.warn('[backend] Fetch failed; serving mock data');
	return {
		data: getMockWeather(),
		connected: false,
		source: 'mock',
		mockFields: [...WEATHER_FIELDS]
	};
}
```

- [ ] **Step 4: Pass `mockFields` through the loads**

`src/routes/weather/+page.ts` becomes:

```ts
import type { PageLoad } from './$types';
import { fetchWeather, fetchWeatherHistory, type WeatherHistoryRow } from '$lib/weather';

export const load: PageLoad = async ({ fetch }) => {
	const now = Math.floor(Date.now() / 1000);
	const from = now - 24 * 60 * 60;
	const [res, history] = await Promise.all([
		fetchWeather(fetch),
		fetchWeatherHistory(from, now, fetch).catch((): WeatherHistoryRow[] => [])
	]);
	return {
		w: res.weather,
		connected: res.connected,
		source: res.source,
		mockFields: res.mockFields,
		history,
		range: { from, to: now }
	};
};
```

`src/routes/weather/[metric]/+page.ts` becomes the same shape (this also clears its two existing ESLint errors):

```ts
import type { PageLoad } from './$types';
import { fetchWeather, fetchWeatherHistory, type WeatherHistoryRow } from '$lib/weather';

export const load: PageLoad = async ({ params, fetch }) => {
	const now = Math.floor(Date.now() / 1000);
	const from = now - 24 * 60 * 60;
	const [res, history] = await Promise.all([
		fetchWeather(fetch),
		fetchWeatherHistory(from, now, fetch).catch((): WeatherHistoryRow[] => [])
	]);
	return {
		metric: params.metric,
		w: res.weather,
		connected: res.connected,
		source: res.source,
		mockFields: res.mockFields,
		history,
		range: { from, to: now }
	};
};
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run --project server src/lib/providers/backend.test.ts src/routes/weather/load.test.ts src/routes/home-load.test.ts && npm run check`
Expected: PASS. `npm run check` may report errors in the weather pages and the home page test fixture (they don't pass `mockFields` yet); Tasks 6–8 fix those. Note which in the commit body.

- [ ] **Step 6: Commit**

```bash
git add src/lib/weather.ts src/lib/providers/backend.ts src/lib/providers/backend.test.ts src/routes/weather/+page.ts "src/routes/weather/[metric]/+page.ts"
git commit -m "Report which weather values are sample data"
```

---

### Task 3: Spray conditions

**Files:**

- Create: `src/lib/spray.ts`
- Create: `src/lib/spray.test.ts`
- Modify: `src/lib/config.ts` (add a `spray` section after `map`)

**Interfaces:**

- Consumes: `Weather`, `WeatherField` (Task 2).
- Produces (`src/lib/spray.ts`):
  - `type SprayThresholds = { windMinKmh; windGoodMaxKmh; windMarginalMaxKmh; gustMarginalKmh; deltaTGoodMin; deltaTGoodMax; deltaTMarginalMax }` (all `number`)
  - `type SprayVerdict = 'good' | 'marginal' | 'not-suitable' | 'unknown'`
  - `type SprayResult = { verdict: SprayVerdict; reasons: string[]; summary: string }` (`summary` is the reason behind the verdict, for the home tile)
  - `SPRAY_LABELS: Record<SprayVerdict, string>`, `SPRAY_TONES: Record<SprayVerdict, string>` (Tailwind text colour classes)
  - `deltaT(tempC: number, rhPct: number): number | null` (Stull 2011 wet bulb; `null` for humidity ≤ 0 or > 100)
  - `windCheck(kmh: number, t: SprayThresholds)`, `deltaTCheck(dt: number, t: SprayThresholds)`: `{ level: 'good' | 'marginal' | 'not-suitable'; reason: string }`
  - `sprayConditions(weather: Weather, mockFields: readonly WeatherField[], thresholds: SprayThresholds): SprayResult`
- Produces (`CONFIG.spray`): `{ windMinKmh: 3, windGoodMaxKmh: 15, windMarginalMaxKmh: 20, gustMarginalKmh: 20, deltaTGoodMin: 2, deltaTGoodMax: 8, deltaTMarginalMax: 10 }`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/spray.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import CONFIG from '$lib/config';
import { deltaT, deltaTCheck, sprayConditions, windCheck } from './spray';
import { getMockWeather, type Weather } from './weather';

const t = CONFIG.spray;

function weatherWith(
	outdoor: Partial<Weather['outdoor']>,
	wind: Partial<Weather['wind']>,
	hourlyRain = 0
) {
	const base = getMockWeather();
	return {
		...base,
		outdoor: { ...base.outdoor, ...outdoor },
		wind: { ...base.wind, ...wind },
		rain: { ...base.rain, hourly: hourlyRain }
	};
}

// 20 °C and 60 % humidity give Delta T 4.99; 2.5 m/s is 9 km/h, 4 m/s is 14.4 km/h.
const calm = weatherWith({ temp: 20, humidity: 60 }, { speed: 2.5, gust: 4 });

describe('deltaT', () => {
	it('matches published reference values', () => {
		expect(deltaT(25, 50)).toBeCloseTo(7.0, 1);
		expect(deltaT(20, 90)).toBeCloseTo(1.23, 1);
		expect(deltaT(30, 20)).toBeCloseTo(14.1, 1);
	});

	it('is unknown for humidity of 0 or out of range', () => {
		expect(deltaT(20, 0)).toBeNull();
		expect(deltaT(20, 101)).toBeNull();
		expect(deltaT(Number.NaN, 50)).toBeNull();
	});
});

describe('windCheck', () => {
	it.each([
		[2.9, 'not-suitable'],
		[3, 'good'],
		[15, 'good'],
		[15.1, 'marginal'],
		[20, 'marginal'],
		[20.1, 'not-suitable']
	] as const)('%s km/h is %s', (kmh, level) => {
		expect(windCheck(kmh, t).level).toBe(level);
	});

	it('explains still air as an inversion risk', () => {
		expect(windCheck(1, t).reason).toBe('Wind 1 km/h: too still, spray may drift in an inversion');
	});
});

describe('deltaTCheck', () => {
	it.each([
		[1.9, 'not-suitable'],
		[2, 'good'],
		[8, 'good'],
		[8.1, 'marginal'],
		[10, 'marginal'],
		[10.1, 'not-suitable']
	] as const)('Delta T %s is %s', (dt, level) => {
		expect(deltaTCheck(dt, t).level).toBe(level);
	});
});

describe('sprayConditions', () => {
	it('is good with a reason per input on a calm, dry day', () => {
		expect(sprayConditions(calm, [], t)).toEqual({
			verdict: 'good',
			reasons: ['Wind 9 km/h', 'Gusts 14 km/h', 'No rain in the last hour', 'Delta T 5.0 °C'],
			summary: 'Wind 9 km/h'
		});
	});

	it('makes strong gusts marginal', () => {
		const result = sprayConditions(
			weatherWith({ temp: 20, humidity: 60 }, { speed: 2.5, gust: 6 }),
			[],
			t
		);
		expect(result.verdict).toBe('marginal');
		expect(result.summary).toBe('Gusting 22 km/h');
	});

	it('takes the worst check: any rain in the last hour is not suitable', () => {
		const result = sprayConditions(
			weatherWith({ temp: 20, humidity: 60 }, { speed: 2.5, gust: 6 }, 0.4),
			[],
			t
		);
		expect(result.verdict).toBe('not-suitable');
		expect(result.summary).toBe('Rain in the last hour (0.4 mm)');
	});

	it('can’t tell when an input is sample data, and names it', () => {
		expect(sprayConditions(calm, ['wind.speed'], t)).toEqual({
			verdict: 'unknown',
			reasons: ['Can’t tell — the station isn’t reporting wind speed.'],
			summary: 'Can’t tell — the station isn’t reporting wind speed.'
		});
		expect(sprayConditions(calm, ['outdoor.temp', 'outdoor.humidity'], t).reasons).toEqual([
			'Can’t tell — the station isn’t reporting temperature or humidity.'
		]);
	});

	it('can’t tell when humidity is out of range', () => {
		const result = sprayConditions(
			weatherWith({ temp: 20, humidity: 0 }, { speed: 2.5, gust: 4 }),
			[],
			t
		);
		expect(result.verdict).toBe('unknown');
		expect(result.reasons).toEqual(['Can’t tell — the humidity reading is out of range.']);
	});
});
```

Run: `npx vitest run --project server src/lib/spray.test.ts`
Expected: FAIL (`CONFIG.spray` is undefined, `./spray` doesn't exist).

- [ ] **Step 2: Add the thresholds to `src/lib/config.ts`**

After the `map: { … },` block, add:

```ts
	/** Spraying thresholds from common Australian label guidance. Speeds in km/h, Delta T in °C. */
	spray: {
		windMinKmh: 3,
		windGoodMaxKmh: 15,
		windMarginalMaxKmh: 20,
		gustMarginalKmh: 20,
		deltaTGoodMin: 2,
		deltaTGoodMax: 8,
		deltaTMarginalMax: 10
	},
```

- [ ] **Step 3: Create `src/lib/spray.ts`**

```ts
import type { Weather, WeatherField } from './weather';

export type SprayThresholds = {
	windMinKmh: number;
	windGoodMaxKmh: number;
	windMarginalMaxKmh: number;
	gustMarginalKmh: number;
	deltaTGoodMin: number;
	deltaTGoodMax: number;
	deltaTMarginalMax: number;
};
export type SprayVerdict = 'good' | 'marginal' | 'not-suitable' | 'unknown';
export type SprayResult = { verdict: SprayVerdict; reasons: string[]; summary: string };
type Level = Exclude<SprayVerdict, 'unknown'>;
type Check = { level: Level; reason: string };

export const SPRAY_LABELS: Record<SprayVerdict, string> = {
	good: 'Good',
	marginal: 'Marginal',
	'not-suitable': 'Not suitable',
	unknown: 'Can’t tell'
};

export const SPRAY_TONES: Record<SprayVerdict, string> = {
	good: 'text-accent',
	marginal: 'text-warn',
	'not-suitable': 'text-danger',
	unknown: 'text-muted'
};

const RANK: Record<Level, number> = { good: 0, marginal: 1, 'not-suitable': 2 };

/** Dry bulb minus wet bulb, with the wet bulb from Stull (2011). */
export function deltaT(tempC: number, rhPct: number): number | null {
	if (!Number.isFinite(tempC) || !Number.isFinite(rhPct) || rhPct <= 0 || rhPct > 100) return null;
	const wetBulb =
		tempC * Math.atan(0.151977 * Math.sqrt(rhPct + 8.313659)) +
		Math.atan(tempC + rhPct) -
		Math.atan(rhPct - 1.676331) +
		0.00391838 * rhPct ** 1.5 * Math.atan(0.023101 * rhPct) -
		4.686035;
	return tempC - wetBulb;
}

export function windCheck(kmh: number, t: SprayThresholds): Check {
	const text = `Wind ${Math.round(kmh)} km/h`;
	if (kmh < t.windMinKmh) {
		return { level: 'not-suitable', reason: `${text}: too still, spray may drift in an inversion` };
	}
	if (kmh <= t.windGoodMaxKmh) return { level: 'good', reason: text };
	if (kmh <= t.windMarginalMaxKmh)
		return { level: 'marginal', reason: `${text}: on the strong side` };
	return { level: 'not-suitable', reason: `${text}: too strong` };
}

export function deltaTCheck(dt: number, t: SprayThresholds): Check {
	const text = `Delta T ${dt.toFixed(1)} °C`;
	if (dt < t.deltaTGoodMin) {
		return { level: 'not-suitable', reason: `${text}: too humid, droplets may not dry` };
	}
	if (dt <= t.deltaTGoodMax) return { level: 'good', reason: text };
	if (dt <= t.deltaTMarginalMax)
		return { level: 'marginal', reason: `${text}: droplets drying fast` };
	return { level: 'not-suitable', reason: `${text}: too dry, droplets evaporate` };
}

const INPUTS: [WeatherField, string][] = [
	['wind.speed', 'wind speed'],
	['wind.gust', 'gusts'],
	['rain.hourly', 'rain'],
	['outdoor.temp', 'temperature'],
	['outdoor.humidity', 'humidity']
];

function orList(words: string[]): string {
	return words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} or ${words.at(-1)}`;
}

function unknown(reason: string): SprayResult {
	return { verdict: 'unknown', reasons: [reason], summary: reason };
}

/** The worst of the wind, gust, rain and Delta T checks. Speeds arrive in m/s. */
export function sprayConditions(
	weather: Weather,
	mockFields: readonly WeatherField[],
	thresholds: SprayThresholds
): SprayResult {
	const missing = INPUTS.filter(([field]) => mockFields.includes(field)).map(([, label]) => label);
	if (missing.length > 0) {
		return unknown(`Can’t tell — the station isn’t reporting ${orList(missing)}.`);
	}
	const dt = deltaT(weather.outdoor.temp, weather.outdoor.humidity);
	if (dt === null) return unknown('Can’t tell — the humidity reading is out of range.');

	const gustKmh = weather.wind.gust * 3.6;
	const rain = weather.rain.hourly;
	const checks: Check[] = [
		windCheck(weather.wind.speed * 3.6, thresholds),
		gustKmh > thresholds.gustMarginalKmh
			? { level: 'marginal', reason: `Gusting ${Math.round(gustKmh)} km/h` }
			: { level: 'good', reason: `Gusts ${Math.round(gustKmh)} km/h` },
		rain > 0
			? { level: 'not-suitable', reason: `Rain in the last hour (${rain.toFixed(1)} mm)` }
			: { level: 'good', reason: 'No rain in the last hour' },
		deltaTCheck(dt, thresholds)
	];

	const worst = checks.reduce((a, b) => (RANK[b.level] > RANK[a.level] ? b : a));
	return {
		verdict: worst.level,
		reasons: checks.map((check) => check.reason),
		summary: worst.reason
	};
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run --project server src/lib/spray.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/spray.ts src/lib/spray.test.ts src/lib/config.ts
git commit -m "Work out spraying conditions from wind, gusts, rain and Delta T"
```

---

### Task 4: Sample data chip, spray panel and offline banner

**Files:**

- Create: `src/lib/components/SampleDataChip.svelte`
- Create: `src/lib/components/SprayPanel.svelte`
- Create: `src/lib/components/SprayPanel.svelte.test.ts`
- Create: `src/routes/weather/components/OfflineBanner.svelte`
- Create: `src/routes/weather/components/OfflineBanner.svelte.test.ts`

**Interfaces:**

- Consumes: `SprayResult`, `SPRAY_LABELS`, `SPRAY_TONES` (Task 3); `Panel`.
- Produces:
  - `SampleDataChip` (no props): the "Sample data" pill.
  - `SprayPanel` props `{ result: SprayResult }`: a `Panel` titled "Spraying now" with the verdict word and one line per reason.
  - `OfflineBanner` props `{ source: 'ecowitt' | 'mock' }`: renders only for `'mock'`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/components/SprayPanel.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import SprayPanel from './SprayPanel.svelte';

describe('SprayPanel.svelte', () => {
	it.each([
		['good', 'Good'],
		['marginal', 'Marginal'],
		['not-suitable', 'Not suitable']
	] as const)('shows %s as a word with its reasons', async (verdict, label) => {
		render(SprayPanel, {
			result: {
				verdict,
				reasons: ['Wind 9 km/h', 'No rain in the last hour'],
				summary: 'Wind 9 km/h'
			}
		});

		await expect.element(page.getByRole('heading', { name: 'Spraying now' })).toBeVisible();
		await expect.element(page.getByText(label, { exact: true })).toBeVisible();
		await expect.element(page.getByText('No rain in the last hour')).toBeVisible();
	});

	it('explains why it can’t tell', async () => {
		const reason = 'Can’t tell — the station isn’t reporting wind speed.';
		render(SprayPanel, { result: { verdict: 'unknown', reasons: [reason], summary: reason } });

		await expect.element(page.getByText('Can’t tell', { exact: true })).toBeVisible();
		await expect.element(page.getByText(reason)).toBeVisible();
	});
});
```

Create `src/routes/weather/components/OfflineBanner.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import OfflineBanner from './OfflineBanner.svelte';

describe('OfflineBanner.svelte', () => {
	it('warns when the numbers are sample data', async () => {
		render(OfflineBanner, { source: 'mock' });

		await expect.element(page.getByText('Weather station offline.')).toBeVisible();
		await expect
			.element(page.getByText('These are sample numbers — don’t use them for decisions.'))
			.toBeVisible();
	});

	it('stays hidden for live readings', async () => {
		render(OfflineBanner, { source: 'ecowitt' });

		expect(page.getByText('Weather station offline.').elements()).toHaveLength(0);
	});
});
```

Run: `npx vitest run --project client src/lib/components/SprayPanel.svelte.test.ts src/routes/weather/components/OfflineBanner.svelte.test.ts`
Expected: FAIL (the components don't exist).

- [ ] **Step 2: Create `src/lib/components/SampleDataChip.svelte`**

```svelte
<span
	class="inline-flex items-center gap-1.5 rounded-full bg-warn/15 px-2 py-0.5 text-xs font-semibold text-warn"
>
	<span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
	Sample data
</span>
```

- [ ] **Step 3: Create `src/lib/components/SprayPanel.svelte`**

```svelte
<script lang="ts">
	import { SPRAY_LABELS, SPRAY_TONES, type SprayResult } from '$lib/spray';
	import Panel from './Panel.svelte';

	type Props = { result: SprayResult };

	let { result }: Props = $props();
</script>

<Panel title="Spraying now">
	<p class={['flex items-center gap-2 text-2xl font-semibold', SPRAY_TONES[result.verdict]]}>
		<span class="size-3 shrink-0 rounded-full bg-current" aria-hidden="true"></span>
		{SPRAY_LABELS[result.verdict]}
	</p>
	<ul class="mt-3 space-y-1">
		{#each result.reasons as reason (reason)}
			<li>{reason}</li>
		{/each}
	</ul>
</Panel>
```

- [ ] **Step 4: Create `src/routes/weather/components/OfflineBanner.svelte`**

```svelte
<script lang="ts">
	type Props = { source: 'ecowitt' | 'mock' };

	let { source }: Props = $props();
</script>

{#if source === 'mock'}
	<div role="status" class="rounded-xl border border-warn/60 bg-warn/10 px-4 py-3">
		<p class="font-semibold text-warn">Weather station offline.</p>
		<p>These are sample numbers — don’t use them for decisions.</p>
	</div>
{/if}
```

Run the autofixer on all three components, then the tests. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/SampleDataChip.svelte src/lib/components/SprayPanel.svelte src/lib/components/SprayPanel.svelte.test.ts src/routes/weather/components/OfflineBanner.svelte src/routes/weather/components/OfflineBanner.svelte.test.ts
git commit -m "Add the sample data chip, spray panel and offline banner"
```

---

### Task 5: Charts from real history

**Files:**

- Create: `src/routes/weather/chart.ts`
- Create: `src/routes/weather/chart.test.ts`
- Create: `src/routes/weather/components/WeatherChart.svelte`
- Create: `src/routes/weather/components/WeatherChart.svelte.test.ts`

**Interfaces:**

- Consumes: `WeatherHistoryRow`, `dewPointC` from `$lib/weather`.
- Produces (`chart.ts`):
  - `type ChartPoint = { t: number; v: number }` (`t` in ms), `type ChartSeries = { label: string; colour: string; points: ChartPoint[] }`
  - `type ChartSpec = { unit: string; series: { label: string; colour: string; value: (row: WeatherHistoryRow) => number | null | undefined }[] }`
  - `CHARTS: Partial<Record<string, ChartSpec>>` keyed by metric (`outdoor`, `wind`, `rain`, `pressure`, `solar`)
  - `parseUtcMs(value: string): number | null`
  - `buildSeries(history: readonly WeatherHistoryRow[], spec: ChartSpec): ChartSeries[]` (sorted by time; skips missing values and bad timestamps)
  - `hourTicks(from: number, to: number, every?: number): number[]` (local hours divisible by `every`, default 6)
  - `hourlyRows(series: ChartSeries[]): { t: number; values: (number | null)[] }[]` (last value per local hour, for the screen-reader table)
  - `extremes(points: ChartPoint[]): { high: number; low: number } | null`
- Produces: `WeatherChart` props `{ title: string; series: ChartSeries[]; unit: string; from: number; to: number }` (`from`/`to` in ms).

- [ ] **Step 1: Write the failing tests**

Create `src/routes/weather/chart.test.ts` (runs with `TZ=Australia/Melbourne`):

```ts
import { describe, expect, it } from 'vitest';

import { CHARTS, buildSeries, extremes, hourTicks, hourlyRows, parseUtcMs } from './chart';

const rows = [
	{
		timestamp_utc: '2026-09-26 02:00:00',
		temp_c: 12,
		humidity_pct: 80,
		wind_avg_ms: 5,
		wind_gust_ms: 8
	},
	{
		timestamp_utc: '2026-09-26 01:00:00',
		temp_c: 10,
		humidity_pct: 90,
		wind_avg_ms: null,
		wind_gust_ms: 6
	},
	{ timestamp_utc: 'not a time', temp_c: 99 }
];

describe('parseUtcMs', () => {
	it('reads backend timestamps as UTC', () => {
		expect(parseUtcMs('2026-09-26 01:00:00')).toBe(Date.UTC(2026, 8, 26, 1));
		expect(parseUtcMs('2026-09-26T01:00:00+10:00')).toBe(Date.UTC(2026, 8, 25, 15));
		expect(parseUtcMs('nonsense')).toBeNull();
	});
});

describe('buildSeries', () => {
	it('charts temperature and dew point for outdoor, oldest first, skipping bad rows', () => {
		const [temp, dew] = buildSeries(rows, CHARTS.outdoor!);
		expect(temp.label).toBe('Temperature');
		expect(temp.points.map((p) => p.v)).toEqual([10, 12]);
		expect(dew.label).toBe('Dew point');
		expect(dew.points[0].v).toBeCloseTo(8.4, 1);
	});

	it('charts wind in km/h and leaves out missing readings', () => {
		const [average, gust] = buildSeries(rows, CHARTS.wind!);
		expect(CHARTS.wind!.unit).toBe('km/h');
		expect(average.points.map((p) => p.v)).toEqual([18]);
		expect(gust.points.map((p) => Math.round(p.v))).toEqual([22, 29]);
	});
});

describe('hourTicks', () => {
	it('marks every 6 hours on the local clock', () => {
		const from = new Date(2026, 8, 26, 1, 30).getTime();
		const ticks = hourTicks(from, from + 24 * 3600_000);
		expect(ticks.map((t) => new Date(t).getHours())).toEqual([6, 12, 18, 0]);
	});
});

describe('hourlyRows', () => {
	it('keeps the last value per hour for each series', () => {
		const hour = new Date(2026, 8, 26, 9).getTime();
		const series = [
			{
				label: 'A',
				colour: '',
				points: [
					{ t: hour + 60_000, v: 1 },
					{ t: hour + 120_000, v: 2 }
				]
			},
			{ label: 'B', colour: '', points: [{ t: hour + 3600_000, v: 5 }] }
		];
		expect(hourlyRows(series)).toEqual([
			{ t: hour, values: [2, null] },
			{ t: hour + 3600_000, values: [null, 5] }
		]);
	});
});

describe('extremes', () => {
	it('finds the high and low, or null without points', () => {
		expect(
			extremes([
				{ t: 0, v: 3 },
				{ t: 1, v: -1 },
				{ t: 2, v: 7 }
			])
		).toEqual({ high: 7, low: -1 });
		expect(extremes([])).toBeNull();
	});
});
```

Create `src/routes/weather/components/WeatherChart.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import WeatherChart from './WeatherChart.svelte';

const from = new Date(2026, 8, 26, 0).getTime();
const to = from + 24 * 3600_000;
const series = [
	{
		label: 'Temperature',
		colour: '#facc15',
		points: [
			{ t: from + 3600_000, v: 10 },
			{ t: from + 7200_000, v: 12 }
		]
	}
];

describe('WeatherChart.svelte', () => {
	it('has a legend and an hourly table for screen readers', async () => {
		render(WeatherChart, { title: 'Outdoor, last 24 hours', series, unit: '°C', from, to });

		await expect.element(page.getByRole('img', { name: 'Outdoor, last 24 hours' })).toBeVisible();
		await expect.element(page.getByText('Temperature', { exact: true }).first()).toBeVisible();
		expect(page.getByRole('row').elements()).toHaveLength(3);
	});

	it('says so when there are no readings', async () => {
		render(WeatherChart, {
			title: 'Outdoor',
			series: [{ ...series[0], points: [] }],
			unit: '°C',
			from,
			to
		});

		await expect.element(page.getByText('No readings in the last 24 hours.')).toBeVisible();
		expect(page.getByRole('img').elements()).toHaveLength(0);
	});
});
```

Run: `npx vitest run --project server src/routes/weather/chart.test.ts && npx vitest run --project client src/routes/weather/components/WeatherChart.svelte.test.ts`
Expected: FAIL (the modules don't exist).

- [ ] **Step 2: Create `src/routes/weather/chart.ts`**

```ts
import { dewPointC, type WeatherHistoryRow } from '$lib/weather';

export type ChartPoint = { t: number; v: number };
export type ChartSeries = { label: string; colour: string; points: ChartPoint[] };
export type ChartSpec = {
	unit: string;
	series: {
		label: string;
		colour: string;
		value: (row: WeatherHistoryRow) => number | null | undefined;
	}[];
};

const HOUR = 3600_000;
const kmh = (ms: number | null | undefined) => (ms === null || ms === undefined ? null : ms * 3.6);

/** Series to chart for each weather detail page; metrics missing here have no history to chart. */
export const CHARTS: Partial<Record<string, ChartSpec>> = {
	outdoor: {
		unit: '°C',
		series: [
			{ label: 'Temperature', colour: '#facc15', value: (row) => row.temp_c },
			{
				label: 'Dew point',
				colour: 'rgb(var(--status-high))',
				value: (row) =>
					row.temp_c != null && row.humidity_pct != null && row.humidity_pct > 0
						? dewPointC(row.temp_c, row.humidity_pct)
						: null
			}
		]
	},
	wind: {
		unit: 'km/h',
		series: [
			{ label: 'Average', colour: 'rgb(var(--accent))', value: (row) => kmh(row.wind_avg_ms) },
			{ label: 'Gust', colour: 'rgb(var(--warn))', value: (row) => kmh(row.wind_gust_ms) }
		]
	},
	rain: {
		unit: 'mm',
		series: [
			{
				label: 'Rain in the past hour',
				colour: 'rgb(var(--status-high))',
				value: (row) => row.rain_1h_mm
			}
		]
	},
	pressure: {
		unit: 'hPa',
		series: [{ label: 'Pressure', colour: '#c4b5fd', value: (row) => row.pressure_hpa }]
	},
	solar: {
		unit: 'W/m²',
		series: [{ label: 'Solar', colour: '#facc15', value: (row) => row.solar_wm2 }]
	}
};

/** Backend timestamps are UTC, often without a zone ("2026-09-26 01:00:00"). */
export function parseUtcMs(value: string): number | null {
	const trimmed = value.trim();
	const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
	const iso = trimmed.replace(' ', 'T');
	const ms = new Date(hasZone ? iso : `${iso}Z`).getTime();
	return Number.isNaN(ms) ? null : ms;
}

export function buildSeries(history: readonly WeatherHistoryRow[], spec: ChartSpec): ChartSeries[] {
	const timed = history
		.map((row) => ({ row, t: parseUtcMs(String(row.timestamp_utc ?? '')) }))
		.filter((entry): entry is { row: WeatherHistoryRow; t: number } => entry.t !== null)
		.sort((a, b) => a.t - b.t);

	return spec.series.map(({ label, colour, value }) => ({
		label,
		colour,
		points: timed.flatMap(({ row, t }) => {
			const v = value(row);
			return typeof v === 'number' && Number.isFinite(v) ? [{ t, v }] : [];
		})
	}));
}

export function hourTicks(from: number, to: number, every = 6): number[] {
	const tick = new Date(from);
	tick.setMinutes(0, 0, 0);
	if (tick.getTime() < from) tick.setHours(tick.getHours() + 1);
	while (tick.getHours() % every !== 0) tick.setHours(tick.getHours() + 1);

	const ticks: number[] = [];
	while (tick.getTime() <= to) {
		ticks.push(tick.getTime());
		tick.setHours(tick.getHours() + every);
	}
	return ticks;
}

export function hourlyRows(series: ChartSeries[]): { t: number; values: (number | null)[] }[] {
	const rows = new Map<number, (number | null)[]>();
	series.forEach((line, index) => {
		for (const point of line.points) {
			const hour = new Date(point.t);
			hour.setMinutes(0, 0, 0);
			const key = hour.getTime();
			const values = rows.get(key) ?? series.map(() => null);
			values[index] = point.v;
			rows.set(key, values);
		}
	});
	return [...rows.entries()].sort(([a], [b]) => a - b).map(([t, values]) => ({ t, values }));
}

export function extremes(points: ChartPoint[]): { high: number; low: number } | null {
	if (points.length === 0) return null;
	const values = points.map((point) => point.v);
	return { high: Math.max(...values), low: Math.min(...values) };
}

export { HOUR };
```

- [ ] **Step 3: Create `src/routes/weather/components/WeatherChart.svelte`**

A taller viewBox below `md` so lines and labels stay readable at 390px; axis labels are 12px at phone width.

```svelte
<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';

	import { hourTicks, hourlyRows, type ChartSeries } from '../chart';

	type Props = { title: string; series: ChartSeries[]; unit: string; from: number; to: number };

	let { title, series, unit, from, to }: Props = $props();

	const wide = new MediaQuery('min-width: 48rem');
	const width = $derived(wide.current ? 800 : 360);
	const height = $derived(wide.current ? 260 : 300);
	const pad = { left: 40, right: 12, top: 12, bottom: 28 };

	const values = $derived(series.flatMap((line) => line.points.map((point) => point.v)));
	const min = $derived(values.length ? Math.floor(Math.min(...values)) : 0);
	const max = $derived(values.length ? Math.ceil(Math.max(...values)) : 1);
	const span = $derived(max - min || 1);
	const ticks = $derived(hourTicks(from, to));
	const rows = $derived(hourlyRows(series));
	const timeFormat = new Intl.DateTimeFormat('en-AU', { hour: 'numeric' });
	const rowFormat = new Intl.DateTimeFormat('en-AU', { weekday: 'short', hour: 'numeric' });

	const x = (t: number) => pad.left + ((t - from) / (to - from)) * (width - pad.left - pad.right);
	const y = (v: number) =>
		height - pad.bottom - ((v - min) / span) * (height - pad.top - pad.bottom);
</script>

{#if values.length === 0}
	<p class="text-muted">No readings in the last 24 hours.</p>
{:else}
	<ul class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
		{#each series as line (line.label)}
			<li class="flex items-center gap-2">
				<span class="h-1 w-5 rounded-full" style:background={line.colour} aria-hidden="true"></span>
				{line.label}
			</li>
		{/each}
	</ul>
	<svg viewBox="0 0 {width} {height}" class="w-full" role="img" aria-label={title}>
		{#each [min, (min + max) / 2, max] as value (value)}
			<line
				x1={pad.left}
				x2={width - pad.right}
				y1={y(value)}
				y2={y(value)}
				stroke="rgb(var(--border))"
			/>
			<text
				x={pad.left - 6}
				y={y(value) + 4}
				text-anchor="end"
				font-size="12"
				fill="rgb(var(--muted))"
			>
				{Math.round(value)}
			</text>
		{/each}
		{#each ticks as tick (tick)}
			<text x={x(tick)} y={height - 8} text-anchor="middle" font-size="12" fill="rgb(var(--muted))">
				{timeFormat.format(tick)}
			</text>
		{/each}
		{#each series as line (line.label)}
			<polyline
				fill="none"
				stroke={line.colour}
				stroke-width="2"
				stroke-linejoin="round"
				points={line.points.map((point) => `${x(point.t)},${y(point.v)}`).join(' ')}
			/>
		{/each}
	</svg>
	<table class="sr-only">
		<caption>{title}, hourly, in {unit}</caption>
		<thead>
			<tr>
				<th scope="col">Time</th>
				{#each series as line (line.label)}
					<th scope="col">{line.label}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.t)}
				<tr>
					<th scope="row">{rowFormat.format(row.t)}</th>
					{#each row.values as value, index (index)}
						<td>{value === null ? '-' : value.toFixed(1)}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
```

Run the autofixer, then both test files. Expected: PASS. (The unused `HOUR` re-export at the end of `chart.ts` can go if nothing imports it by the end of Task 7.)

- [ ] **Step 4: Commit**

```bash
git add src/routes/weather/chart.ts src/routes/weather/chart.test.ts src/routes/weather/components/WeatherChart.svelte src/routes/weather/components/WeatherChart.svelte.test.ts
git commit -m "Chart weather from the station's real 24-hour history"
```

---

### Task 6: Weather dashboard on runes

**Files:**

- Modify: `src/routes/weather/+page.svelte` (rewrite)
- Create: `src/routes/weather/weather-page.svelte.test.ts`

**Interfaces:**

- Consumes: Tasks 2–5; `Panel`; `fetchWeather`; `compassPoint` from `$lib/home-items`.

- [ ] **Step 1: Write the failing test**

Create `src/routes/weather/weather-page.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import {
	ALWAYS_SAMPLE_FIELDS,
	WEATHER_FIELDS,
	getMockWeather,
	type WeatherField
} from '$lib/weather';
import WeatherPage from './+page.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

const to = Math.floor(Date.now() / 1000);
const range = { from: to - 86400, to };

function renderWith(source: 'ecowitt' | 'mock', mockFields: WeatherField[]) {
	const data = {
		w: getMockWeather(),
		connected: source === 'ecowitt',
		source,
		mockFields,
		history: [],
		range
	};
	render(WeatherPage, { data, params: {} } as never);
}

const panel = (title: string) =>
	page.getByRole('link').filter({ has: page.getByRole('heading', { name: title }) });

describe('weather page', () => {
	it('chips only the panels that contain sample values', async () => {
		renderWith('ecowitt', [...ALWAYS_SAMPLE_FIELDS, 'outdoor.humidity']);

		await expect.element(panel('Outdoor').getByText('Sample data')).toBeVisible();
		expect(panel('Pressure').getByText('Sample data').elements()).toHaveLength(0);
		await expect.element(panel('Outdoor').getByTitle('Sample value').first()).toBeVisible();
		expect(page.getByText('Weather station offline.').elements()).toHaveLength(0);
	});

	it('shows the offline banner and can’t judge spraying on sample data', async () => {
		renderWith('mock', [...WEATHER_FIELDS]);

		await expect.element(page.getByText('Weather station offline.')).toBeVisible();
		await expect.element(page.getByText('Can’t tell', { exact: true })).toBeVisible();
	});

	it('leads with the spraying verdict', async () => {
		renderWith('ecowitt', [...ALWAYS_SAMPLE_FIELDS]);

		const headings = page.getByRole('heading', { level: 3 }).elements();
		expect(headings[0].textContent).toBe('Spraying now');
		// Mock wind is 8.6 m/s = 31 km/h.
		await expect.element(page.getByText('Not suitable', { exact: true })).toBeVisible();
	});

	it('says there are no readings to chart instead of drawing sample lines', async () => {
		renderWith('ecowitt', [...ALWAYS_SAMPLE_FIELDS]);

		await expect.element(page.getByText('No readings in the last 24 hours.')).toBeVisible();
	});
});
```

Run: `npx vitest run --project client src/routes/weather/weather-page.svelte.test.ts`
Expected: FAIL.

- [ ] **Step 2: Rewrite `src/routes/weather/+page.svelte`**

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';

	import Panel from '$lib/components/Panel.svelte';
	import SampleDataChip from '$lib/components/SampleDataChip.svelte';
	import SprayPanel from '$lib/components/SprayPanel.svelte';
	import CONFIG from '$lib/config';
	import { compassPoint } from '$lib/home-items';
	import { sprayConditions } from '$lib/spray';
	import { fetchWeather, type WeatherField, type WeatherResult } from '$lib/weather';
	import { CHARTS, buildSeries } from './chart';
	import OfflineBanner from './components/OfflineBanner.svelte';
	import WeatherChart from './components/WeatherChart.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The load's reading until the first 15-second refresh replaces it.
	let fresh = $state.raw<WeatherResult | null>(null);
	let now = $state(Date.now());

	const current = $derived(
		fresh ?? {
			weather: data.w,
			connected: data.connected,
			source: data.source,
			mockFields: data.mockFields
		}
	);
	const w = $derived(current.weather);
	const spray = $derived(sprayConditions(w, current.mockFields, CONFIG.spray));
	const outdoorSeries = $derived(buildSeries(data.history, CHARTS.outdoor!));
	const ageSeconds = $derived(
		Math.max(0, Math.round((now - new Date(w.updatedAt).getTime()) / 1000))
	);

	const isSample = (field: WeatherField) => current.mockFields.includes(field);
	const anySample = (fields: WeatherField[]) => fields.some(isSample);
	const fmt = (value: number, digits = 1) => value.toFixed(digits);

	function age(seconds: number) {
		if (seconds < 60) return `${seconds} s ago`;
		const minutes = Math.round(seconds / 60);
		return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
	}

	onMount(() => {
		const tick = setInterval(() => (now = Date.now()), 1000);
		const poll = setInterval(async () => {
			fresh = await fetchWeather();
		}, 15_000);
		return () => {
			clearInterval(tick);
			clearInterval(poll);
		};
	});
</script>

<svelte:head>
	<title>Weather</title>
</svelte:head>

{#snippet value(field: WeatherField, text: string, unit: string)}
	<span
		class={isSample(field) ? 'underline decoration-dotted underline-offset-4 opacity-60' : ''}
		title={isSample(field) ? 'Sample value' : undefined}
	>
		{text}<span class="text-base font-normal"> {unit}</span>
	</span>
{/snippet}

{#snippet chip(fields: WeatherField[])}
	{#if anySample(fields)}<SampleDataChip />{/if}
{/snippet}

{#snippet reading(label: string, field: WeatherField, text: string, unit: string)}
	<div>
		<p class="text-sm text-muted">{label}</p>
		<p class="text-2xl font-semibold tabular-nums">{@render value(field, text, unit)}</p>
	</div>
{/snippet}

<div class="mx-auto max-w-6xl space-y-5 px-4 pb-8">
	<div class="flex flex-wrap items-center justify-between gap-3 pt-6">
		<h1 class="text-xl font-semibold">Weather</h1>
		<div class="flex items-center gap-3 text-sm">
			<span class="text-muted">Updated {age(ageSeconds)}</span>
			<span
				class={[
					'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold',
					current.connected ? 'border-accent/50 text-accent' : 'border-warn/60 text-warn'
				]}
			>
				<span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
				{current.connected ? 'Live' : 'Offline'}
			</span>
		</div>
	</div>

	<OfflineBanner source={current.source} />

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		<SprayPanel result={spray} />

		<a href={resolve('/weather/outdoor')} class="block text-text">
			<Panel title="Outdoor" class="h-full hover:border-accent">
				{#snippet actions()}{@render chip([
						'outdoor.temp',
						'outdoor.humidity',
						'outdoor.feelsLike',
						'outdoor.dewPoint',
						'outdoor.vpd'
					])}{/snippet}
				<div class="grid grid-cols-2 gap-4">
					{@render reading('Temperature', 'outdoor.temp', fmt(w.outdoor.temp), '°C')}
					{@render reading('Humidity', 'outdoor.humidity', fmt(w.outdoor.humidity, 0), '%')}
					{@render reading('Feels like', 'outdoor.feelsLike', fmt(w.outdoor.feelsLike), '°C')}
					{@render reading('Dew point', 'outdoor.dewPoint', fmt(w.outdoor.dewPoint), '°C')}
				</div>
				<p class="mt-3 text-sm text-muted">
					VPD {@render value('outdoor.vpd', fmt(w.outdoor.vpd, 2), 'kPa')}
				</p>
			</Panel>
		</a>

		<a href={resolve('/weather/wind')} class="block text-text">
			<Panel title="Wind" class="h-full hover:border-accent">
				{#snippet actions()}{@render chip(['wind.speed', 'wind.gust', 'wind.dir'])}{/snippet}
				<div class="grid grid-cols-2 gap-4">
					{@render reading('Average', 'wind.speed', String(Math.round(w.wind.speed * 3.6)), 'km/h')}
					{@render reading('Gust', 'wind.gust', String(Math.round(w.wind.gust * 3.6)), 'km/h')}
				</div>
				<p class="mt-3 text-sm text-muted">
					From the {@render value(
						'wind.dir',
						compassPoint(w.wind.dir),
						`(${Math.round(w.wind.dir)}°)`
					)}
				</p>
			</Panel>
		</a>

		<a href={resolve('/weather/rain')} class="block text-text">
			<Panel title="Rainfall" class="h-full hover:border-accent">
				{#snippet actions()}{@render chip([
						'rain.daily',
						'rain.hourly',
						'rain.weekly',
						'rain.monthly',
						'rain.yearly'
					])}{/snippet}
				<div class="grid grid-cols-2 gap-4">
					{@render reading('Today', 'rain.daily', fmt(w.rain.daily), 'mm')}
					{@render reading('Past hour', 'rain.hourly', fmt(w.rain.hourly), 'mm')}
				</div>
				<p class="mt-3 text-sm text-muted">
					Week {@render value('rain.weekly', fmt(w.rain.weekly), 'mm')}, month
					{@render value('rain.monthly', fmt(w.rain.monthly), 'mm')}, year
					{@render value('rain.yearly', fmt(w.rain.yearly), 'mm')}
				</p>
			</Panel>
		</a>

		<a href={resolve('/weather/pressure')} class="block text-text">
			<Panel title="Pressure" class="h-full hover:border-accent">
				{#snippet actions()}{@render chip(['pressure.rel', 'pressure.abs'])}{/snippet}
				<div class="grid grid-cols-2 gap-4">
					{@render reading('Relative', 'pressure.rel', fmt(w.pressure.rel), 'hPa')}
					{@render reading('Absolute', 'pressure.abs', fmt(w.pressure.abs), 'hPa')}
				</div>
			</Panel>
		</a>

		<a href={resolve('/weather/solar')} class="block text-text">
			<Panel title="Solar and UVI" class="h-full hover:border-accent">
				{#snippet actions()}{@render chip([
						'solar.solar',
						'solar.uvi',
						'solar.sunrise',
						'solar.sunset'
					])}{/snippet}
				<div class="grid grid-cols-2 gap-4">
					{@render reading('Solar', 'solar.solar', fmt(w.solar.solar, 0), 'W/m²')}
					{@render reading('UV index', 'solar.uvi', String(w.solar.uvi), '')}
				</div>
				<p class="mt-3 text-sm text-muted">
					Sunrise {@render value('solar.sunrise', w.solar.sunrise, '')}, sunset
					{@render value('solar.sunset', w.solar.sunset, '')}
				</p>
			</Panel>
		</a>

		<a href={resolve('/weather/indoor')} class="block text-text">
			<Panel title="Indoor" class="h-full hover:border-accent">
				{#snippet actions()}{@render chip(['indoor.temp', 'indoor.humidity'])}{/snippet}
				<div class="grid grid-cols-2 gap-4">
					{@render reading('Temperature', 'indoor.temp', fmt(w.indoor.temp), '°C')}
					{@render reading('Humidity', 'indoor.humidity', fmt(w.indoor.humidity, 0), '%')}
				</div>
			</Panel>
		</a>

		<a href={resolve('/weather/battery')} class="block text-text">
			<Panel title="Battery" class="h-full hover:border-accent">
				{#snippet actions()}{@render chip(['battery.status', 'battery.note'])}{/snippet}
				<p class="font-semibold">{@render value('battery.status', w.battery.status, '')}</p>
				<p class="text-sm text-muted">{w.battery.note}</p>
			</Panel>
		</a>
	</div>

	<Panel title="Outdoor, last 24 hours">
		<WeatherChart
			title="Outdoor temperature and dew point, last 24 hours"
			series={outdoorSeries}
			unit="°C"
			from={data.range.from * 1000}
			to={data.range.to * 1000}
		/>
	</Panel>
</div>
```

Notes:

- `Panel` accepts `class`; `hover:border-accent` gives the direction document's "border, not scale" hover.
- If `svelte-check` can't see `data.mockFields`/`data.history` types, run `npx svelte-kit sync`; they come from Task 2's load.

Run the autofixer until clean, then the test. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/routes/weather/+page.svelte src/routes/weather/weather-page.svelte.test.ts
git commit -m "Rebuild the weather dashboard on runes with sample-data marks and spraying first"
```

---

### Task 7: Weather detail page on runes

**Files:**

- Modify: `src/routes/weather/[metric]/+page.svelte` (rewrite)
- Create: `src/routes/weather/[metric]/metric-page.svelte.test.ts`

**Interfaces:**

- Consumes: `CHARTS`, `buildSeries`, `extremes`, `parseUtcMs` (Task 5); `WeatherChart`, `OfflineBanner`.

- [ ] **Step 1: Write the failing test**

Create `src/routes/weather/[metric]/metric-page.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import {
	ALWAYS_SAMPLE_FIELDS,
	WEATHER_FIELDS,
	getMockWeather,
	type WeatherField
} from '$lib/weather';
import MetricPage from './+page.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

const to = Math.floor(Date.UTC(2026, 8, 26, 12) / 1000);
const range = { from: to - 86400, to };
const history = [
	{ timestamp_utc: '2026-09-26 02:00:00', temp_c: 12, wind_avg_ms: 5, wind_gust_ms: 8 },
	{ timestamp_utc: '2026-09-26 03:00:00', temp_c: 14, wind_avg_ms: 2, wind_gust_ms: 4 }
];

function open(metric: string, source: 'ecowitt' | 'mock' = 'ecowitt') {
	const mockFields: WeatherField[] =
		source === 'mock' ? [...WEATHER_FIELDS] : [...ALWAYS_SAMPLE_FIELDS];
	const data = {
		metric,
		w: getMockWeather(),
		connected: source === 'ecowitt',
		source,
		mockFields,
		history,
		range
	};
	render(MetricPage, { data, params: { metric } } as never);
}

describe('weather detail page', () => {
	it('shows wind highs and lows in km/h, not temperature', async () => {
		open('wind');

		await expect.element(page.getByRole('heading', { level: 1, name: 'Wind' })).toBeVisible();
		await expect.element(page.getByText('Average: highest 18 km/h, lowest 7 km/h')).toBeVisible();
		expect(page.getByText(/°C/).elements()).toHaveLength(0);
	});

	it('says when the station doesn’t report a metric instead of charting sample data', async () => {
		open('indoor');

		await expect
			.element(
				page.getByText('The station doesn’t report indoor readings, so there’s nothing to chart.')
			)
			.toBeVisible();
		expect(page.getByRole('img').elements()).toHaveLength(0);
	});

	it('shows the offline banner on sample data', async () => {
		open('outdoor', 'mock');

		await expect.element(page.getByText('Weather station offline.')).toBeVisible();
	});

	it('lists the recent readings', async () => {
		open('outdoor');

		await expect.element(page.getByRole('heading', { name: 'Recent readings' })).toBeVisible();
		expect(
			page.getByRole('table', { name: 'Recent readings' }).getByRole('row').elements()
		).toHaveLength(3);
	});
});
```

Run: `npx vitest run --project client "src/routes/weather/[metric]/metric-page.svelte.test.ts"`
Expected: FAIL.

- [ ] **Step 2: Rewrite `src/routes/weather/[metric]/+page.svelte`**

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { WeatherHistoryRow } from '$lib/weather';
	import { CHARTS, buildSeries, extremes, parseUtcMs } from '../chart';
	import OfflineBanner from '../components/OfflineBanner.svelte';
	import WeatherChart from '../components/WeatherChart.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const TITLES: Record<string, string> = {
		outdoor: 'Outdoor',
		indoor: 'Indoor',
		solar: 'Solar and UVI',
		rain: 'Rainfall',
		wind: 'Wind',
		pressure: 'Pressure',
		battery: 'Battery'
	};
	const FIELDS: Record<string, (keyof WeatherHistoryRow)[]> = {
		outdoor: ['temp_c', 'humidity_pct'],
		solar: ['solar_wm2'],
		rain: ['rain_1h_mm', 'rain_24h_mm'],
		wind: ['wind_avg_ms', 'wind_gust_ms', 'wind_dir_deg'],
		pressure: ['pressure_hpa']
	};
	const HEADINGS: Partial<Record<keyof WeatherHistoryRow, string>> = {
		timestamp_utc: 'Time',
		temp_c: 'Temperature (°C)',
		humidity_pct: 'Humidity (%)',
		solar_wm2: 'Solar (W/m²)',
		rain_1h_mm: 'Rain, past hour (mm)',
		rain_24h_mm: 'Rain, past day (mm)',
		wind_avg_ms: 'Wind (m/s)',
		wind_gust_ms: 'Gust (m/s)',
		wind_dir_deg: 'Direction (°)',
		pressure_hpa: 'Pressure (hPa)'
	};

	const title = $derived(TITLES[data.metric] ?? data.metric);
	const spec = $derived(CHARTS[data.metric]);
	const series = $derived(spec ? buildSeries(data.history, spec) : []);
	const summaries = $derived(
		series.flatMap((line) => {
			const range = extremes(line.points);
			return range ? [{ label: line.label, ...range }] : [];
		})
	);
	const columns = $derived<(keyof WeatherHistoryRow)[]>([
		'timestamp_utc',
		...(FIELDS[data.metric] ?? [])
	]);
	const rows = $derived(
		[...data.history].sort(
			(a, b) => (parseUtcMs(b.timestamp_utc) ?? 0) - (parseUtcMs(a.timestamp_utc) ?? 0)
		)
	);
	const hours = $derived(Math.max(1, Math.round((data.range.to - data.range.from) / 3600)));
	const timeFormat = new Intl.DateTimeFormat('en-AU', {
		weekday: 'short',
		hour: 'numeric',
		minute: '2-digit'
	});

	function cell(row: WeatherHistoryRow, key: keyof WeatherHistoryRow) {
		const raw = row[key];
		if (raw === null || raw === undefined) return '-';
		if (key === 'timestamp_utc') {
			const ms = parseUtcMs(String(raw));
			return ms === null ? String(raw) : timeFormat.format(ms);
		}
		return typeof raw === 'number'
			? Number.isInteger(raw)
				? String(raw)
				: raw.toFixed(1)
			: String(raw);
	}
</script>

<svelte:head>
	<title>{title} weather</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-5 px-4 pb-8">
	<a
		href={resolve('/weather')}
		class="inline-flex min-h-11 items-center gap-2 pt-4 text-sm text-muted hover:text-text"
	>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="size-5" aria-hidden="true">
			<path
				d="M10.5 6 4.5 12l6 6M4.5 12h15"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		All weather
	</a>

	<h1 class="text-xl font-semibold">{title}</h1>

	<OfflineBanner source={data.source} />

	{#if spec}
		<section class="space-y-2">
			{#each summaries as summary (summary.label)}
				<p class="text-lg">
					{summary.label}: highest {Math.round(summary.high)}
					{spec.unit}, lowest {Math.round(summary.low)}
					{spec.unit}
				</p>
			{/each}
			<WeatherChart
				title="{title}, last {hours} hours"
				{series}
				unit={spec.unit}
				from={data.range.from * 1000}
				to={data.range.to * 1000}
			/>
		</section>
	{:else}
		<p class="text-muted">
			The station doesn’t report {title.toLowerCase()} readings, so there’s nothing to chart.
		</p>
	{/if}

	<section class="space-y-2">
		<h2 class="text-lg font-semibold">Recent readings</h2>
		<p class="text-sm text-muted">The last {hours} hours, newest first.</p>
		{#if rows.length}
			<div class="max-h-[60vh] overflow-auto rounded-xl border border-border">
				<table class="min-w-full text-left text-sm" aria-label="Recent readings">
					<thead class="sticky top-0 bg-panel">
						<tr>
							{#each columns as column (column)}
								<th class="px-3 py-2 font-semibold">{HEADINGS[column] ?? column}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each rows as row (row.timestamp_utc)}
							<tr class="border-t border-border/60">
								{#each columns as column (column)}
									<td class="px-3 py-2 tabular-nums">{cell(row, column)}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-muted">No readings in the last {hours} hours.</p>
		{/if}
	</section>
</div>
```

Run the autofixer until clean, then the test. Expected: PASS. (The test's "no °C" check passes because the wind page's table headings are in m/s and the summaries in km/h.)

- [ ] **Step 3: Commit**

```bash
git add "src/routes/weather/[metric]/+page.svelte" "src/routes/weather/[metric]/metric-page.svelte.test.ts"
git commit -m "Rebuild the weather detail page with per-metric charts from real history"
```

---

### Task 8: Spraying on the home page

**Files:**

- Modify: `src/routes/+page.svelte` (the weather tiles, the grid, and a new Spraying tile)
- Modify: `src/routes/home-page.svelte.test.ts`

**Interfaces:**

- Consumes: `sprayConditions`, `SPRAY_LABELS`, `SPRAY_TONES` (Task 3); `SampleDataChip` (Task 4); `CONFIG.spray`.

- [ ] **Step 1: Update the failing tests**

In `src/routes/home-page.svelte.test.ts`:

1. Change the imports and fixture to:

```ts
import { ALWAYS_SAMPLE_FIELDS, WEATHER_FIELDS, getMockWeather } from '$lib/weather';
```

```ts
const live = {
	weather: getMockWeather(),
	connected: true,
	source: 'ecowitt' as const,
	mockFields: [...ALWAYS_SAMPLE_FIELDS]
};
const offline = {
	...live,
	connected: false,
	source: 'mock' as const,
	mockFields: [...WEATHER_FIELDS]
};
```

2. In "labels every weather tile when the station is offline", render `{ weather: offline, soil }`.
3. Add:

```ts
it('says whether it’s a good time to spray, with the reason', async () => {
	renderHome({ weather: live, soil });

	const tile = page.getByRole('link').filter({ hasText: 'Spraying now' });
	// Mock wind is 8.6 m/s = 31 km/h.
	await expect.element(tile.getByText('Not suitable')).toBeVisible();
	await expect.element(tile.getByText('Wind 31 km/h: too strong')).toBeVisible();
});

it('can’t judge spraying from sample data', async () => {
	renderHome({ weather: offline, soil });

	await expect
		.element(
			page
				.getByRole('link')
				.filter({ hasText: 'Spraying now' })
				.getByText('Can’t tell', { exact: true })
		)
		.toBeVisible();
});

it('labels only the tile whose reading is sample data', async () => {
	renderHome({ weather: { ...live, mockFields: [...ALWAYS_SAMPLE_FIELDS, 'rain.daily'] }, soil });

	expect(page.getByText('Sample data').elements()).toHaveLength(1);
	await expect
		.element(page.getByRole('link').filter({ hasText: 'Rain today' }).getByText('Sample data'))
		.toBeVisible();
});
```

Run: `npx vitest run --project client src/routes/home-page.svelte.test.ts`
Expected: FAIL (no Spraying tile; chips follow `source`).

- [ ] **Step 2: Update `src/routes/+page.svelte`**

1. Add imports:

```ts
import SampleDataChip from '$lib/components/SampleDataChip.svelte';
import CONFIG from '$lib/config';
import { SPRAY_LABELS, SPRAY_TONES, sprayConditions } from '$lib/spray';
import type { WeatherField } from '$lib/weather';
```

2. Replace `const isSample = $derived(weather?.source === 'mock');` with:

```ts
const isSample = (field: WeatherField) => weather?.mockFields.includes(field) ?? false;
const spray = $derived(
	weather ? sprayConditions(weather.weather, weather.mockFields, CONFIG.spray) : null
);
```

3. Replace the `sampleChip` snippet with:

```svelte
{#snippet sampleChip()}
	<span class="mt-2 self-start"><SampleDataChip /></span>
{/snippet}
```

4. Change the three tile conditions: `{#if isSample}` becomes `{#if isSample('outdoor.temp')}` on the temperature tile, `{#if isSample('wind.speed')}` on the wind tile and `{#if isSample('rain.daily')}` on the rain tile.
5. Change the grid to `class="grid grid-cols-2 gap-3 lg:grid-cols-5"`, the unavailable message's `lg:col-span-3` to `lg:col-span-4`, and keep the soil tile's `col-span-2 … lg:col-span-1`.
6. After the rain tile's closing `</a>` and before `{:else}`, add the Spraying tile:

```svelte
{#if spray}
	<a
		href={resolve('/weather')}
		class="flex min-h-28 flex-col rounded-xl border border-border bg-panel p-4 text-text"
	>
		<span class="text-sm text-muted">Spraying now</span>
		<span class={['mt-1 text-2xl leading-tight font-semibold', SPRAY_TONES[spray.verdict]]}>
			{SPRAY_LABELS[spray.verdict]}
		</span>
		<span class="mt-2 text-sm text-muted">{spray.summary}</span>
	</a>
{/if}
```

Run the autofixer, then: `npx vitest run --project client src/routes/home-page.svelte.test.ts && npm run check`
Expected: PASS, no type errors anywhere now.

- [ ] **Step 3: Commit**

```bash
git add src/routes/+page.svelte src/routes/home-page.svelte.test.ts
git commit -m "Add a Spraying tile to the home strip and mark sample readings per tile"
```

---

### Task 9: Full verification and PR

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

- [ ] **Step 2: Design review in the browser**

Load `frontend-design:frontend-design` and re-read `docs/superpowers/specs/2026-09-27-ui-direction.md`. With `npm run dev`:

1. Backend down (stop `../gbros-api` or point the dev proxy at a closed port): `node scripts/screenshot.mjs /tmp/shots-offline / /weather /weather/wind`. Expect the amber banner on both weather pages, "Can’t tell" for spraying on `/weather` and the home tile, and every home weather tile chipped.
2. Backend up: `node scripts/screenshot.mjs /tmp/shots-live / /weather /weather/outdoor /weather/indoor /manual`. Expect chips only on panels with sample values (Indoor and Battery always; Solar for UVI and sun times; Rainfall for week/month/year), the chart drawn from real readings and readable at 390px without zooming, and body text visibly 16px.

Check against the direction document: 12px minimum, 44px targets, verdicts in words, no hover scaling, no `→` in link text. Fix and re-run Step 1.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/readability-and-status
gh pr create --base staging --title "Readability and plain-language status (UX 4)" --body "$(cat <<'EOF'
Implements docs/superpowers/plans/2026-09-27-readability-and-status.md.

- 16px body text and the direction document's type scale; static-site CSS removed
- The weather provider reports which values are sample data; the weather pages and home strip mark them, and an offline banner appears when everything is sample data
- "Spraying now" (Good / Marginal / Not suitable / Can't tell) from wind, gusts, rain and Delta T, first on /weather and as a home tile; thresholds in `CONFIG.spray`
- Weather pages move to runes; charts use the station's real 24-hour history (per metric), and the hard-coded highs, lows and BoM benchmark are gone

Closes #18

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Leave the worktree in place until the PR merges.
