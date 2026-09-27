# App shell and home page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Before creating or editing any `.svelte` file or `.svelte.ts` module, load the `svelte:svelte-code-writer` skill and use its documentation lookup and autofixer; every `.svelte` file you change must come back clean from the autofixer (a `bind:this` suggestion is acceptable where this plan explains why). Before building or changing visible UI, load `frontend-design:frontend-design` and read `docs/superpowers/specs/2026-09-27-ui-direction.md`; the direction document wins where they disagree.

**Goal:** A shared app shell (bottom tab bar on phones, top bar on desktop) on every page, and a home page that opens with a "Right now" strip of live readings, with the placeholder pages and panels removed.

**Architecture:** `+layout.svelte` wraps every page in `AppShell`, which reads nav items from a tested data module (`src/lib/nav.ts`) and exposes the space it takes as the CSS variables `--shell-top`/`--shell-bottom`. The home page gets a universal `load` that fetches weather and the latest soil tests in parallel and summarises them with pure, tested functions. A new shared `src/lib/soil-status.ts` classifies metric values against their optimal range for this and the later map and soil-test projects.

**Tech Stack:** Svelte 5.57 (runes, snippets, `$app/state`, `$app/paths` `resolve`), SvelteKit 2.70, Tailwind 4 (`@theme` tokens in `src/app.css`), Vitest 5 (`server` project for `*.test.ts` in node; `client` project for `*.svelte.test.ts` in headless Chromium with `vitest-browser-svelte`), `@fontsource-variable/atkinson-hyperlegible-next`.

**Spec:** `docs/superpowers/specs/2026-09-27-app-shell-and-home-design.md` and `docs/superpowers/specs/2026-09-27-ui-direction.md`. Read both before starting.

## Global Constraints

- Work only in your own worktree under `.claude/worktrees/`. Never edit or switch branches in the main checkout (`/home/tom/gbros/farm-website`).
- Setup: run `npm ci` in the worktree. If it fails with `Tsconfig not found .../.svelte-kit/tsconfig.json`, run `npx svelte-kit sync` in the main checkout and retry. Run `npx playwright install chromium` if browser tests say Chromium is missing.
- Before your first commit, move off the `worktree-<name>` branch: `git fetch origin`, `git switch --no-track -c feat/app-shell-and-home origin/staging`, then `git branch -d <the worktree-… branch>`.
- Before changing anything, record the ESLint baseline: `npx eslint src 2>&1 | tail -3`. At the end, the error count must be less than or equal to it.
- Runes only in new or rewritten Svelte code: no `export let`, `$:`, `<slot>`, `on:`, `createEventDispatcher` or `class:`. Pages you only trim (paddocks, soiltests, weather, manual, map) may stay in legacy mode; don't migrate them.
- Internal links use `resolve()` from `$app/paths`. External links use `target="_blank" rel="noopener noreferrer"` and a visually hidden "(opens in a new tab)".
- The shell renders the app's only `<main id="content">`. Pages use `<div>` for their outer wrapper.
- Smallest text is 12px (`text-xs`); interactive elements are at least 44px tall (`min-h-11`). No `→` appended to link text, no ALL-CAPS labels.
- In component tests, images use `data:` URIs, and `$app/paths` is mocked: `vi.mock('$app/paths', () => ({ resolve: (path: string) => path }))`.
- Prettier: tabs, single quotes, no trailing commas, width 100. Run `npx prettier --write` on the files you touch.
- Don't touch files outside this plan's **Files** lists. Projects 2–4 own the rest (map controls, soil tests, weather content).
- Before pushing: `npm run check`, `npm test`, `npx prettier --check .`, `npm run build`, `scripts/smoke-test.sh --local` must all pass.
- Push the branch and open a PR into `staging` (`--base staging`) that says `Closes #<issue>` for the "UX 1: App shell and home" issue. Don't merge it.

## Review Focus

1. The backend returns something other than an array for `/api/soil-tests?latest=true` (the smoke test's stub echoes an object) → the home page still renders with the soil tile saying "Unavailable" (Task 5 test and the smoke test in Task 8).
2. The last element of a long page on a phone → is not hidden under the tab bar, because `<main>` has bottom padding equal to the bar (Task 3 test).
3. Following a link in the More sheet → closes the sheet. The layout persists across navigations, so an open `<dialog>` would otherwise stay open over the next page (Task 3 test).
4. The weather station is offline (`source: 'mock'`) → every weather tile on the home page says "Sample data" (Task 6 test).
5. `/weather/wind` marks Weather active, and `/mapping` doesn't mark Map active (Task 3 tests).

---

### Task 1: Design foundation

Tokens, the typeface, and a screenshot script that later tasks and projects use for design review.

**Files:**

- Modify: `package.json`, `package-lock.json` (via `npm install`)
- Modify: `src/app.css`
- Modify: `src/routes/+layout.svelte`
- Modify: `src/lib/components/Card.svelte`
- Create: `scripts/screenshot.mjs`

**Interfaces:**

- Produces: Tailwind colours `status-low`, `status-high`, `warn`, `danger` (so `text-status-low`, `bg-warn/15`, `text-danger` work); `font-sans` is Atkinson Hyperlegible Next; CSS variables `--shell-top` and `--shell-bottom` on `:root`; `node scripts/screenshot.mjs <out-dir> <path>...` writes `<name>-390.png` and `<name>-1280.png` per path.

- [ ] **Step 1: Install the typeface**

Run: `npm install @fontsource-variable/atkinson-hyperlegible-next`
Expected: `package.json` `dependencies` gains `"@fontsource-variable/atkinson-hyperlegible-next"`, lockfile updated.

- [ ] **Step 2: Add tokens and shell variables to `src/app.css`**

In the `@theme` block, after `--color-border`, add:

```css
--color-status-low: rgb(var(--status-low));
--color-status-high: rgb(var(--status-high));
--color-warn: rgb(var(--warn));
--color-danger: rgb(var(--danger));
--font-sans: 'Atkinson Hyperlegible Next Variable', system-ui, sans-serif;
```

In the `:root` block, after `--border`, add:

```css
--status-low: 242 179 91; /* #f2b35b */
--status-high: 120 189 240; /* #78bdf0 */
--warn: 242 179 91; /* #f2b35b */
--danger: 248 113 113; /* #f87171 */
/* Space the app shell takes; full-height pages subtract these. */
--shell-top: 0px;
--shell-bottom: calc(4rem + env(safe-area-inset-bottom));
```

After the `:root` block, add:

```css
@media (min-width: 48rem) {
	:root {
		--shell-top: 3.5rem;
		--shell-bottom: 0px;
	}
}
```

In the `body` rule, replace the `font:` declaration's family list so the size stays 14px (project 4 changes the size):

```css
font:
	14px/1.4 'Atkinson Hyperlegible Next Variable',
	system-ui,
	-apple-system,
	Segoe UI,
	Roboto,
	sans-serif;
```

- [ ] **Step 3: Load the typeface in `src/routes/+layout.svelte`**

Add after `import '../app.css';`:

```ts
import '@fontsource-variable/atkinson-hyperlegible-next';
```

- [ ] **Step 4: Remove hover scaling from `Card.svelte`**

The direction document removes hover animation on cards. In `src/lib/components/Card.svelte`, change the `<article>` class to:

```
relative overflow-hidden rounded-xl border border-border bg-panel shadow-sm transition-colors group-hover:border-accent group-focus-visible:border-accent
```

and the `<img>` class to:

```
h-full w-full object-cover select-none
```

Run the autofixer on `Card.svelte`.

- [ ] **Step 5: Create `scripts/screenshot.mjs`**

```js
#!/usr/bin/env node
// Screenshots pages of a running dev server at phone and desktop widths, for design review.
// Usage: node scripts/screenshot.mjs <out-dir> <path>... (BASE_URL defaults to http://localhost:4001)
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const [outDir, ...paths] = process.argv.slice(2);
if (!outDir || paths.length === 0) {
	console.error('Usage: node scripts/screenshot.mjs <out-dir> <path>...');
	process.exit(1);
}
const base = process.env.BASE_URL ?? 'http://localhost:4001';
const viewports = [
	{ width: 390, height: 844, isMobile: true, hasTouch: true },
	{ width: 1280, height: 800, isMobile: false, hasTouch: false }
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const { width, height, isMobile, hasTouch } of viewports) {
	const page = await browser.newPage({ viewport: { width, height }, isMobile, hasTouch });
	for (const path of paths) {
		await page.goto(base + path, { waitUntil: 'networkidle' });
		// Lazy images and map tiles need a moment after network idle.
		await page.waitForTimeout(1000);
		const name = path === '/' ? 'home' : path.replace(/^\//, '').replace(/[/?=&]/g, '_');
		await page.screenshot({
			path: `${outDir}/${name}-${width}.png`,
			fullPage: !path.startsWith('/map')
		});
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth
		);
		console.log(`${name}-${width}${overflow ? '  HORIZONTAL SCROLL' : ''}`);
	}
	await page.close();
}
await browser.close();
```

Run: `chmod +x scripts/screenshot.mjs`

- [ ] **Step 6: Verify**

Run: `npm run check && npm test`
Expected: both pass (no behaviour changed).

Run `npm run dev` in the background, then `node scripts/screenshot.mjs /tmp/shots-t1 / /weather`. Open the PNGs and confirm the text is Atkinson Hyperlegible rather than the system font (its `1` has a long flag and a foot, and `0` is a narrow oval). In DevTools, the computed `font-family` of `body` starts with `Atkinson Hyperlegible Next Variable`. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/app.css src/routes/+layout.svelte src/lib/components/Card.svelte scripts/screenshot.mjs
git commit -m "Add status tokens, shell spacing, Atkinson Hyperlegible and a screenshot script"
```

---

### Task 2: Soil status module and `StatusBadge`

Move the soil-row readers the map uses into `$lib` and add `metricStatus`, which projects 2 and 3 also use.

**Files:**

- Create: `src/lib/soil-status.ts`
- Create: `src/lib/soil-status.test.ts`
- Modify: `src/routes/map/helpers.ts` (move code out, re-export it)
- Create: `src/lib/components/StatusBadge.svelte`
- Create: `src/lib/components/StatusBadge.svelte.test.ts`

**Interfaces:**

- Produces (`src/lib/soil-status.ts`):
  - `type SoilTestRecord = Record<string, unknown>`
  - `toNumber(value: unknown): number | null`
  - `normaliseFieldId(value: unknown): number | null`
  - `extractFieldId(record: SoilTestRecord): number | null`
  - `pickMetricValue(record: SoilTestRecord, metricId: MetricId): number | null`
  - `parseDateMs(value: unknown): number | null`
  - `type MetricStatus = 'low' | 'optimal' | 'high' | 'no-data' | 'no-range'`
  - `metricStatus(value: number | null | undefined, metric: Pick<MetricOption, 'range_optimal'>): MetricStatus`
  - `STATUS_LABELS: Record<MetricStatus, string>`
- Produces: `StatusBadge` props `{ status: MetricStatus; label?: string }`.
- `src/routes/map/helpers.ts` keeps exporting `SoilTestRecord`, `toNumber`, `normaliseFieldId`, `extractFieldId`, `pickMetricValue`, `parseDateMs` (re-exported), so the map and its tests don't change.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/soil-status.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import CONFIG from '$lib/config';
import type { MetricOption } from '$lib/config';
import { STATUS_LABELS, extractFieldId, metricStatus, pickMetricValue } from './soil-status';

const pH = CONFIG.soilMetrics.find((m) => m.id === 'pH') as MetricOption; // optimal 6–7
const none = CONFIG.soilMetrics.find((m) => m.id === 'none') as MetricOption;

describe('metricStatus', () => {
	it.each([
		[5.9, 'low'],
		[6, 'optimal'],
		[6.5, 'optimal'],
		[7, 'optimal'],
		[7.1, 'high']
	] as const)('pH %s is %s (both ends of the range are optimal)', (value, expected) => {
		expect(metricStatus(value, pH)).toBe(expected);
	});

	it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])('%s is no-data', (value) => {
		expect(metricStatus(value, pH)).toBe('no-data');
	});

	it('a metric without an optimal range is no-range', () => {
		expect(metricStatus(5, none)).toBe('no-range');
	});

	it('has a label for every status', () => {
		expect(STATUS_LABELS).toEqual({
			low: 'Low',
			optimal: 'Optimal',
			high: 'High',
			'no-data': 'No data',
			'no-range': 'No target'
		});
	});
});

describe('moved readers', () => {
	it('pickMetricValue reads the backend pH column', () => {
		expect(pickMetricValue({ ph_water: 5.89 }, 'pH')).toBe(5.89);
	});

	it('extractFieldId reads a string fieldID', () => {
		expect(extractFieldId({ fieldID: '4251583' })).toBe(4251583);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project server src/lib/soil-status.test.ts`
Expected: FAIL, "Failed to resolve import './soil-status'".

- [ ] **Step 3: Create `src/lib/soil-status.ts`**

Move `METRIC_VALUE_KEYS`, `FIELD_ID_KEYS`, `SoilTestRecord`, `normaliseFieldId`, `extractFieldId`, `toNumber`, `pickMetricValue` and `parseDateMs` out of `src/routes/map/helpers.ts` into this file unchanged, then add the status code:

```ts
import type { MetricId, MetricOption } from '$lib/config';

export type SoilTestRecord = Record<string, unknown>;

const METRIC_VALUE_KEYS: Record<MetricId, string[]> = {
	none: [],
	OM: ['OM', 'om', 'OrganicMatter', 'organic_matter', 'total_C', 'Total_C'],
	P: ['P', 'p', 'Phosphorus'],
	K: ['K', 'k', 'Potassium'],
	M: ['Mg', 'mg', 'Magnesium', 'magnesium'],
	Ca: ['Ca', 'ca', 'Calcium', 'calcium'],
	pH: ['ph_water', 'pH', 'ph', 'ph_H2O', 'ph_h2o']
};

const FIELD_ID_KEYS = [
	'fieldID',
	'fieldId',
	'FIELDID',
	'FIELD_ID',
	'ADSFLDID',
	'adsfldid',
	'field_id',
	'id_field',
	'paddockId',
	'paddock_id'
];

export function normaliseFieldId(value: unknown): number | null {
	if (value === null || value === undefined) return null;
	const text = String(value).trim();
	if (text === '') return null;
	const num = Number(text);
	return Number.isInteger(num) ? num : null;
}

export function extractFieldId(record: SoilTestRecord): number | null {
	for (const key of FIELD_ID_KEYS) {
		if (key in record) {
			const candidate = normaliseFieldId(record[key]);
			if (candidate !== null) return candidate;
		}
	}
	return null;
}

export function toNumber(value: unknown): number | null {
	if (value === null || value === undefined) return null;
	const candidate = typeof value === 'string' ? value.trim() : value;
	if (candidate === '') return null;
	const num = Number(candidate);
	return Number.isFinite(num) ? num : null;
}

export function pickMetricValue(record: SoilTestRecord, metricId: MetricId): number | null {
	const keys = METRIC_VALUE_KEYS[metricId] ?? [];
	for (const key of keys) {
		if (!(key in record)) continue;
		const candidate = toNumber(record[key]);
		if (candidate !== null) return candidate;
	}
	return null;
}

export function parseDateMs(value: unknown): number | null {
	if (!value) return null;
	const timestamp = Date.parse(String(value));
	return Number.isNaN(timestamp) ? null : timestamp;
}

export type MetricStatus = 'low' | 'optimal' | 'high' | 'no-data' | 'no-range';

export const STATUS_LABELS: Record<MetricStatus, string> = {
	low: 'Low',
	optimal: 'Optimal',
	high: 'High',
	'no-data': 'No data',
	'no-range': 'No target'
};

/** Classifies a value against the metric's optimal range; both ends of the range count as optimal. */
export function metricStatus(
	value: number | null | undefined,
	metric: Pick<MetricOption, 'range_optimal'>
): MetricStatus {
	if (typeof value !== 'number' || !Number.isFinite(value)) return 'no-data';
	const [low, high] = metric.range_optimal;
	if (typeof low !== 'number' || typeof high !== 'number') return 'no-range';
	if (value < low) return 'low';
	if (value > high) return 'high';
	return 'optimal';
}
```

In `src/routes/map/helpers.ts`, delete the moved declarations and add near the top:

```ts
import { toNumber } from '$lib/soil-status';

export {
	extractFieldId,
	normaliseFieldId,
	parseDateMs,
	pickMetricValue,
	toNumber,
	type SoilTestRecord
} from '$lib/soil-status';
```

(Keep the `toNumber` import only if something left in `helpers.ts` still calls it; `npm run check` will tell you. Same for importing `SoilTestRecord`/`normaliseFieldId`/`extractFieldId` for local use: add `import { … } from '$lib/soil-status'` for whatever the remaining helpers reference, e.g. `derivePaddockIdentity` uses `extractFieldId` and `normaliseFieldId`.)

- [ ] **Step 4: Run the tests**

Run: `npx vitest run --project server src/lib/soil-status.test.ts src/routes/map/helpers.test.ts && npm run check`
Expected: PASS, and no type errors.

- [ ] **Step 5: Write the failing `StatusBadge` test**

Create `src/lib/components/StatusBadge.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import StatusBadge from './StatusBadge.svelte';

describe('StatusBadge.svelte', () => {
	it('shows the status in words, not only colour', async () => {
		render(StatusBadge, { status: 'low' });
		await expect.element(page.getByText('Low')).toBeVisible();
	});

	it('uses a custom label when given', async () => {
		render(StatusBadge, { status: 'optimal', label: 'In range' });
		await expect.element(page.getByText('In range')).toBeVisible();
	});
});
```

Run: `npx vitest run --project client src/lib/components/StatusBadge.svelte.test.ts`
Expected: FAIL, cannot resolve `./StatusBadge.svelte`.

- [ ] **Step 6: Create `src/lib/components/StatusBadge.svelte`**

```svelte
<script lang="ts">
	import { STATUS_LABELS, type MetricStatus } from '$lib/soil-status';

	type Props = { status: MetricStatus; label?: string };

	let { status, label }: Props = $props();

	const tone = $derived(
		status === 'low'
			? 'text-status-low'
			: status === 'optimal'
				? 'text-accent'
				: status === 'high'
					? 'text-status-high'
					: 'text-muted'
	);
</script>

<span class={['inline-flex items-center gap-1.5 text-xs font-semibold', tone]}>
	<span class="size-2 shrink-0 rounded-full bg-current" aria-hidden="true"></span>
	{label ?? STATUS_LABELS[status]}
</span>
```

Run the autofixer on it.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run --project client src/lib/components/StatusBadge.svelte.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/soil-status.ts src/lib/soil-status.test.ts src/routes/map/helpers.ts src/lib/components/StatusBadge.svelte src/lib/components/StatusBadge.svelte.test.ts
git commit -m "Add shared soil status classification and StatusBadge"
```

---

### Task 3: Navigation data and `AppShell`

**Files:**

- Create: `src/lib/nav.ts`
- Create: `src/lib/nav.test.ts`
- Create: `src/lib/components/NavIcon.svelte`
- Create: `src/lib/components/AppShell.svelte`
- Create: `src/lib/components/AppShell.svelte.test.ts`

**Interfaces:**

- Produces (`src/lib/nav.ts`):
  - `type NavIconName = 'home' | 'map' | 'weather' | 'soil' | 'paddocks' | 'help' | 'more' | 'external'`
  - `type NavItem = { href: Pathname; label: string; icon: NavIconName }` (`Pathname` from `$app/types`)
  - `type ExternalLink = { href: string; label: string }`
  - `primaryNav: NavItem[]` (Home, Map, Weather, Soil tests), `secondaryNav: NavItem[]` (Paddocks, Help), `externalLinks: ExternalLink[]`
  - `isActive(item: { href: string }, pathname: string): boolean`
- Produces: `NavIcon` props `{ name: NavIconName; size?: number }` (default 24).
- Produces: `AppShell` props `{ pathname: string; logoSrc?: string; children: Snippet }`. `logoSrc` defaults to `/img/logo.png`; tests pass a `data:` URI.

- [ ] **Step 1: Write the failing `nav` tests**

Create `src/lib/nav.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { externalLinks, isActive, primaryNav, secondaryNav } from './nav';

describe('isActive', () => {
	it('matches home only on /', () => {
		expect(isActive({ href: '/' }, '/')).toBe(true);
		expect(isActive({ href: '/' }, '/map')).toBe(false);
	});

	it('matches the section itself and pages below it', () => {
		expect(isActive({ href: '/weather' }, '/weather')).toBe(true);
		expect(isActive({ href: '/weather' }, '/weather/wind')).toBe(true);
	});

	it('does not match a path that only shares a prefix', () => {
		expect(isActive({ href: '/map' }, '/mapping')).toBe(false);
	});
});

describe('nav items', () => {
	it('puts the three main jobs in the primary nav after Home', () => {
		expect(primaryNav.map((item) => item.href)).toEqual(['/', '/map', '/weather', '/soiltests']);
	});

	it('has no timesheet entry anywhere', () => {
		const hrefs = [...primaryNav, ...secondaryNav, ...externalLinks].map((item) => item.href);
		expect(hrefs.some((href) => href.includes('timesheet'))).toBe(false);
	});

	it('only lists absolute https URLs as external links', () => {
		for (const link of externalLinks) expect(link.href).toMatch(/^https:\/\//);
	});
});
```

Run: `npx vitest run --project server src/lib/nav.test.ts`
Expected: FAIL, cannot resolve `./nav`.

- [ ] **Step 2: Create `src/lib/nav.ts`**

```ts
import type { Pathname } from '$app/types';

export type NavIconName =
	'home' | 'map' | 'weather' | 'soil' | 'paddocks' | 'help' | 'more' | 'external';

export type NavItem = { href: Pathname; label: string; icon: NavIconName };
export type ExternalLink = { href: string; label: string };

export const primaryNav: NavItem[] = [
	{ href: '/', label: 'Home', icon: 'home' },
	{ href: '/map', label: 'Map', icon: 'map' },
	{ href: '/weather', label: 'Weather', icon: 'weather' },
	{ href: '/soiltests', label: 'Soil tests', icon: 'soil' }
];

export const secondaryNav: NavItem[] = [
	{ href: '/paddocks', label: 'Paddocks', icon: 'paddocks' },
	{ href: '/manual', label: 'Help', icon: 'help' }
];

export const externalLinks: ExternalLink[] = [
	{
		href: 'https://greenhillbros.sharepoint.com/sites/Draft/SitePages/CollabHome.aspx',
		label: 'SharePoint home'
	},
	{
		href: 'https://greenhillbros.sharepoint.com/sites/Draft/Shared%20Documents/Forms/AllItems.aspx',
		label: 'SharePoint invoices'
	}
];

/** Home is active only on `/`; any other item is active on its path and the pages below it. */
export function isActive(item: { href: string }, pathname: string): boolean {
	if (item.href === '/') return pathname === '/';
	return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
```

Run: `npx vitest run --project server src/lib/nav.test.ts`
Expected: PASS.

- [ ] **Step 3: Create `src/lib/components/NavIcon.svelte`**

```svelte
<script lang="ts">
	import type { NavIconName } from '$lib/nav';

	type Props = { name: NavIconName; size?: number };

	let { name, size = 24 }: Props = $props();

	// Heroicons v2 outline paths (MIT), 24×24 viewBox.
	const paths: Record<NavIconName, string> = {
		home: 'm2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
		map: 'M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z',
		weather:
			'M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z',
		soil: 'M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5',
		paddocks:
			'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
		help: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z',
		more: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
		external:
			'M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25'
	};
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.5"
	width={size}
	height={size}
	aria-hidden="true"
	class="shrink-0"
>
	<path stroke-linecap="round" stroke-linejoin="round" d={paths[name]} />
</svg>
```

Run the autofixer on it.

- [ ] **Step 4: Write the failing `AppShell` tests**

Create `src/lib/components/AppShell.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';

import AppShell from './AppShell.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

const logoSrc = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const children = createRawSnippet(() => ({ render: () => '<p>Page body</p>' }));

// Links in these tests must not navigate the test runner's page.
function stopNavigation(event: MouseEvent) {
	if ((event.target as Element).closest('a')) event.preventDefault();
}

describe('AppShell.svelte on a phone', () => {
	beforeEach(async () => {
		await page.viewport(390, 844);
		document.addEventListener('click', stopNavigation);
	});
	afterEach(() => document.removeEventListener('click', stopNavigation));

	it('marks the current section in the tab bar', async () => {
		render(AppShell, { pathname: '/weather/wind', logoSrc, children });

		const nav = page.getByRole('navigation', { name: 'Main' });
		await expect
			.element(nav.getByRole('link', { name: 'Weather' }))
			.toHaveAttribute('aria-current', 'page');
		await expect
			.element(nav.getByRole('link', { name: 'Map' }))
			.not.toHaveAttribute('aria-current');
	});

	it('pads the page so the tab bar never covers the end of it', async () => {
		render(AppShell, { pathname: '/', logoSrc, children });

		const main = page.getByRole('main').element() as HTMLElement;
		expect(parseFloat(getComputedStyle(main).paddingBottom)).toBeGreaterThanOrEqual(64);
	});

	it('opens More as a dialog with the secondary and external links', async () => {
		render(AppShell, { pathname: '/', logoSrc, children });

		await page.getByRole('button', { name: 'More' }).click();
		const dialog = page.getByRole('dialog', { name: 'More' });
		await expect.element(dialog).toBeVisible();
		await expect.element(dialog.getByRole('link', { name: 'Paddocks' })).toBeVisible();
		await expect
			.element(dialog.getByRole('link', { name: 'SharePoint home (opens in a new tab)' }))
			.toHaveAttribute('target', '_blank');
	});

	it('closes More on Escape and returns focus to the More button', async () => {
		render(AppShell, { pathname: '/', logoSrc, children });

		const more = page.getByRole('button', { name: 'More' });
		await more.click();
		await expect.element(page.getByRole('dialog', { name: 'More' })).toBeVisible();
		await page.keyboard.press('Escape');

		await expect.element(page.getByRole('dialog', { name: 'More' })).not.toBeInTheDocument();
		await expect.element(more).toHaveFocus();
	});

	it('closes More when a link in it is followed', async () => {
		render(AppShell, { pathname: '/', logoSrc, children });

		await page.getByRole('button', { name: 'More' }).click();
		await page.getByRole('dialog', { name: 'More' }).getByRole('link', { name: 'Help' }).click();

		await expect.element(page.getByRole('dialog', { name: 'More' })).not.toBeInTheDocument();
	});

	it('marks More active on a secondary page', async () => {
		render(AppShell, { pathname: '/paddocks', logoSrc, children });

		await expect.element(page.getByRole('button', { name: 'More' })).toBeVisible();
		expect(page.getByRole('button', { name: 'More' }).element().className).toContain('text-accent');
	});
});

describe('AppShell.svelte on a desktop', () => {
	beforeEach(async () => {
		await page.viewport(1280, 800);
	});

	it('shows the top bar with the current page marked and no tab bar', async () => {
		render(AppShell, { pathname: '/soiltests', logoSrc, children });

		const nav = page.getByRole('navigation', { name: 'Main' });
		await expect
			.element(nav.getByRole('link', { name: 'Soil tests' }))
			.toHaveAttribute('aria-current', 'page');
		await expect.element(page.getByRole('button', { name: 'More' })).not.toBeInTheDocument();
	});
});
```

(A `<dialog>` that isn't open has no `dialog` role in the accessibility tree, so "not in the document" is how a closed dialog shows up; the `md:hidden` tab bar likewise disappears from the tree on desktop.)

Run: `npx vitest run --project client src/lib/components/AppShell.svelte.test.ts`
Expected: FAIL, cannot resolve `./AppShell.svelte`.

- [ ] **Step 5: Create `src/lib/components/AppShell.svelte`**

`bind:this` on the dialog is deliberate: the More button in a different part of the markup calls `showModal()` on it, which an attachment wouldn't make simpler. The native dialog gives Escape handling and focus return for free.

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { externalLinks, isActive, primaryNav, secondaryNav } from '$lib/nav';
	import NavIcon from './NavIcon.svelte';

	type Props = { pathname: string; logoSrc?: string; children: Snippet };

	let { pathname, logoSrc = '/img/logo.png', children }: Props = $props();

	let moreDialog: HTMLDialogElement | undefined = $state();

	const moreActive = $derived(secondaryNav.some((item) => isActive(item, pathname)));
	const desktopNav = $derived([...primaryNav.slice(1), ...secondaryNav]);

	function openMore() {
		moreDialog?.showModal();
	}

	function closeMore() {
		moreDialog?.close();
	}

	// A click on the dialog element itself (not its contents) is a click on the backdrop.
	function closeOnBackdrop(event: MouseEvent) {
		if (event.target === moreDialog) closeMore();
	}
</script>

<a
	href="#content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[2000] focus:rounded-lg focus:bg-panel focus:px-4 focus:py-3"
>
	Skip to content
</a>

<header class="fixed inset-x-0 top-0 z-[1500] hidden h-14 border-b border-border bg-panel md:block">
	<nav aria-label="Main" class="mx-auto flex h-full max-w-6xl items-center gap-6 px-4">
		<a href={resolve('/')} class="flex items-center gap-3 font-semibold text-text">
			<img src={logoSrc} alt="" class="size-8 rounded-md bg-white/10 p-0.5" />
			Greenhill Bros Farm
		</a>
		<ul class="flex items-center gap-1">
			{#each desktopNav as item (item.href)}
				{@const active = isActive(item, pathname)}
				<li>
					<a
						href={resolve(item.href)}
						aria-current={active ? 'page' : undefined}
						class={[
							'inline-flex min-h-11 items-center rounded-lg px-3 text-sm',
							active ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text'
						]}
					>
						{item.label}
					</a>
				</li>
			{/each}
		</ul>
		<details class="relative ml-auto">
			<summary
				class="inline-flex min-h-11 cursor-pointer list-none items-center rounded-lg px-3 text-sm text-muted hover:text-text"
			>
				Links
			</summary>
			<ul
				class="absolute top-full right-0 mt-1 w-64 rounded-xl border border-border bg-panel p-1 shadow-lg"
			>
				{#each externalLinks as link (link.href)}
					<li>
						<a
							href={link.href}
							target="_blank"
							rel="noopener noreferrer"
							class="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-sm text-text hover:bg-white/5"
						>
							{link.label}
							<NavIcon name="external" size={16} />
							<span class="sr-only">(opens in a new tab)</span>
						</a>
					</li>
				{/each}
			</ul>
		</details>
	</nav>
</header>

<main id="content" class="pt-(--shell-top) pb-(--shell-bottom)">
	{@render children()}
</main>

<nav
	aria-label="Main"
	class="fixed inset-x-0 bottom-0 z-[1500] border-t border-border bg-panel pb-[env(safe-area-inset-bottom)] md:hidden"
>
	<ul class="grid h-16 grid-cols-5">
		{#each primaryNav as item (item.href)}
			{@const active = isActive(item, pathname)}
			<li>
				<a
					href={resolve(item.href)}
					aria-current={active ? 'page' : undefined}
					class={[
						'flex h-full flex-col items-center justify-center gap-1 text-xs',
						active ? 'text-accent' : 'text-muted'
					]}
				>
					<NavIcon name={item.icon} />
					{item.label}
				</a>
			</li>
		{/each}
		<li>
			<button
				type="button"
				aria-haspopup="dialog"
				onclick={openMore}
				class={[
					'flex h-full w-full flex-col items-center justify-center gap-1 text-xs',
					moreActive ? 'text-accent' : 'text-muted'
				]}
			>
				<NavIcon name="more" />
				More
			</button>
		</li>
	</ul>
</nav>

<dialog
	bind:this={moreDialog}
	onclick={closeOnBackdrop}
	aria-labelledby="more-title"
	class="more-sheet"
>
	<div class="p-4">
		<h2 id="more-title" class="mb-2 text-lg font-semibold">More</h2>
		<ul>
			{#each secondaryNav as item (item.href)}
				<li>
					<a
						href={resolve(item.href)}
						onclick={closeMore}
						aria-current={isActive(item, pathname) ? 'page' : undefined}
						class="flex min-h-12 items-center gap-3 rounded-lg px-3 text-text hover:bg-white/5"
					>
						<NavIcon name={item.icon} />
						{item.label}
					</a>
				</li>
			{/each}
		</ul>
		<h3 class="mt-4 mb-1 px-3 text-sm text-muted">Links</h3>
		<ul>
			{#each externalLinks as link (link.href)}
				<li>
					<a
						href={link.href}
						target="_blank"
						rel="noopener noreferrer"
						onclick={closeMore}
						class="flex min-h-12 items-center gap-3 rounded-lg px-3 text-text hover:bg-white/5"
					>
						<NavIcon name="external" />
						{link.label}
						<span class="sr-only">(opens in a new tab)</span>
					</a>
				</li>
			{/each}
		</ul>
		<button
			type="button"
			onclick={closeMore}
			class="mt-4 min-h-11 w-full rounded-lg border border-border text-text"
		>
			Close
		</button>
	</div>
</dialog>

<style>
	.more-sheet {
		margin: auto 0 0;
		width: 100%;
		max-width: 100%;
		border: 1px solid rgb(var(--border));
		border-radius: 1rem 1rem 0 0;
		background: rgb(var(--panel));
		color: rgb(var(--text));
		padding: 0 0 env(safe-area-inset-bottom);
	}

	.more-sheet::backdrop {
		background: rgb(0 0 0 / 0.5);
	}

	@media (prefers-reduced-motion: no-preference) {
		.more-sheet[open] {
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

Run the autofixer; the only acceptable remaining suggestion is the `bind:this` one.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run --project client src/lib/components/AppShell.svelte.test.ts`
Expected: PASS. If the Escape/focus test fails because the browser didn't restore focus, add `onclose={() => moreButton?.focus()}` on the dialog with `let moreButton: HTMLButtonElement | undefined = $state()` bound to the More button, and re-run.

- [ ] **Step 7: Commit**

```bash
git add src/lib/nav.ts src/lib/nav.test.ts src/lib/components/NavIcon.svelte src/lib/components/AppShell.svelte src/lib/components/AppShell.svelte.test.ts
git commit -m "Add AppShell with a phone tab bar, desktop top bar and More sheet"
```

---

### Task 4: Put every page inside the shell

**Files:**

- Modify: `src/routes/+layout.svelte`
- Modify: `src/routes/paddocks/+page.svelte` (header block and `<main>` only)
- Modify: `src/routes/soiltests/+page.svelte` (header block and `<main>` only)
- Modify: `src/routes/weather/+page.svelte` (header block and `<main>` only)
- Modify: `src/routes/weather/[metric]/+page.svelte` (back link and `<h1>` only)
- Modify: `src/routes/manual/+page.svelte`
- Modify: `src/routes/map/+page.svelte` (height, Home link, quick links, Open controls position)
- Modify: `src/routes/map/helpers.ts` (delete `quickLinks`, `QuickLink`)
- Delete: `src/routes/timesheet/+page.svelte`
- Modify: `src/routes/alex/+page.svelte` (`<main>` to `<div>` only)
- Modify: `scripts/smoke-test.sh` (page list)

**Interfaces:**

- Consumes: `AppShell` from Task 3; `--shell-top`/`--shell-bottom` from Task 1.

- [ ] **Step 1: Wrap the layout**

`src/routes/+layout.svelte` becomes:

```svelte
<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/atkinson-hyperlegible-next';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import AppShell from '$lib/components/AppShell.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<AppShell pathname={page.url.pathname}>
	{@render children()}
</AppShell>
```

Run the autofixer on it.

- [ ] **Step 2: Replace the per-page headers with a page title**

In each file below, delete the whole `<header class="container mx-auto flex items-center justify-between gap-4 px-4 py-4">…</header>` block, change the page's `<main class="…">` to `<div class="…">` (keeping its classes, and the matching `</main>` to `</div>`), and add the `<h1>` as the first child of that `<div>`:

| File                                | `<h1>`                                                   |
| ----------------------------------- | -------------------------------------------------------- |
| `src/routes/paddocks/+page.svelte`  | `<h1 class="pt-6 text-xl font-semibold">Paddocks</h1>`   |
| `src/routes/soiltests/+page.svelte` | `<h1 class="pt-6 text-xl font-semibold">Soil tests</h1>` |
| `src/routes/manual/+page.svelte`    | `<h1 class="pt-6 text-xl font-semibold">Help</h1>`       |

For `src/routes/weather/+page.svelte`, keep the report age and connection chip: replace the header with this as the first child of the wrapper `<div>`:

```svelte
<div class="flex flex-wrap items-center justify-between gap-3 pt-6">
	<h1 class="text-xl font-semibold">Weather</h1>
	<div class="flex items-center gap-3 text-xs">
		<div class="text-muted">Reported {secondsAgo}s ago</div>
		<span
			class={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${offline ? 'border-red-400/40 bg-red-400/10 text-red-300' : 'border-green-400/40 bg-green-400/10 text-green-300'}`}
			title={offline ? 'Using mock data' : 'Connected to Ecowitt'}
		>
			<span class={`size-1.5 rounded-full ${offline ? 'bg-red-400' : 'bg-green-400'}`}></span>
			{offline ? 'Mock' : 'Live (Ecowitt)'}
		</span>
	</div>
</div>
```

(The chip's wording is project 4's to change; keep it as is.)

- [ ] **Step 3: Weather detail page**

In `src/routes/weather/[metric]/+page.svelte`, replace the absolutely positioned back link (the `<a href="/weather" aria-label="Back to weather" class="absolute …">…</a>`) and the centred `<h1>` with:

```svelte
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

<h1 class="mt-2 mb-6 text-xl font-semibold">{title}</h1>
```

and add `import { resolve } from '$app/paths';` to its script.

- [ ] **Step 4: Map page**

In `src/routes/map/+page.svelte`:

1. On the outer `<div class="map-shell relative flex h-dvh min-h-[540px] …">`, remove `h-dvh min-h-[540px]` and add this rule to the page's `<style>` block:

```css
.map-shell {
	height: calc(100dvh - var(--shell-top) - var(--shell-bottom));
	min-height: 420px;
}
```

2. Delete the `<a href="/" class={`map-home absolute top-4 right-4 …`}>…</a>` Home link.
3. Delete the `<nav aria-label="Quick links" …>…</nav>` block, the `quickLinks as helperQuickLinks,` import line and `const quickLinks = helperQuickLinks;`.
4. In `src/routes/map/helpers.ts`, delete `QuickLink` and `quickLinks`. If `helpers.test.ts` references them, delete those tests.

(Project 2 redesigns the rest of the map; don't change anything else here.)

- [ ] **Step 5: Delete Timesheets**

Run: `git rm src/routes/timesheet/+page.svelte`

`/alex` stays unlinked and otherwise untouched, but it now renders inside the shell's `<main>`. In `src/routes/alex/+page.svelte`, change `<main class="container">` to `<div class="container">` and its closing `</main>` to `</div>`. Change nothing else in that file.

- [ ] **Step 6: Update the manual's wording**

In `src/routes/manual/+page.svelte`:

- In `quickLinks`, delete the "Farm dashboard" entry and remove the trailing ` →` from each remaining `cta` ("Open map", "Manage samples", "View weather").
- Replace `navigationSteps` with:

```ts
const navigationSteps = [
	{
		title: 'Use the bar at the bottom of your phone',
		detail:
			'Home, Map, Weather and Soil tests are always one tap away. More holds Paddocks, this help page and the SharePoint links.'
	},
	{
		title: 'On a computer, use the bar along the top',
		detail:
			'The same pages are listed across the top. Links opens the SharePoint sites in a new tab.'
	},
	{
		title: 'Look for panels and actions',
		detail:
			'Information is grouped inside dark panels. Buttons for actions such as “Add soil test” sit in the panel header.'
	},
	{
		title: 'Search when lists feel long',
		detail: 'The paddock and soil test lists filter as you type in the search box.'
	}
] as const;
```

- In `features`, delete the entry whose `href` is `'/timesheet'`.
- In the "Need more help?" item that mentions "the paddock tasks panel", change its `description` to `'If something looks off, message Tom at the Coding Sweatshop directly so he can follow up.'`

Run: `grep -n "timesheet\|Back to home\|paddock tasks" src/routes/manual/+page.svelte`
Expected: no output.

- [ ] **Step 7: Smoke test covers the remaining pages**

In `scripts/smoke-test.sh`, change the page loop to:

```sh
for p in / /map /soiltests /weather /weather/outdoor /paddocks /manual; do expect_status "$p" 200; done
```

- [ ] **Step 8: Verify**

Run: `grep -rn "<main" src/routes`
Expected: no output (the shell's `<main>` is the only one).

Run: `grep -rn "Back to home\|/timesheet" src`
Expected: no output.

Run: `npm run check && npm test`
Expected: PASS.

Start `npm run dev` and run `node scripts/screenshot.mjs /tmp/shots-t4 / /map /weather /weather/wind /soiltests /paddocks /manual`. Check every `-390.png`: tab bar at the bottom, nothing hidden behind it at the end of the page, map fills the space above the tab bar, no `HORIZONTAL SCROLL` in the output. Check every `-1280.png`: top bar present, map fills below it. Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add -A src/routes scripts/smoke-test.sh
git commit -m "Render every page inside the app shell and remove per-page headers and Timesheets"
```

---

### Task 5: Home page data

**Files:**

- Modify: `src/lib/home-items.ts` (rewrite)
- Modify: `src/lib/home-items.test.ts` (rewrite)
- Create: `src/routes/+page.ts`
- Create: `src/routes/home-load.test.ts`

**Interfaces:**

- Consumes: `extractFieldId`, `parseDateMs`, `pickMetricValue`, `metricStatus`, `SoilTestRecord` from `$lib/soil-status` (Task 2); `fetchWeather`, `WeatherResult` from `$lib/weather`.
- Produces (`src/lib/home-items.ts`):
  - `type HomeItem = { href: Pathname; title: string; description: string; image?: string | null; imageAlt?: string }`
  - `mainTools: HomeItem[]` (Map, Weather, Soil tests), `moreTools: HomeItem[]` (Paddocks, Help)
  - `type SoilSummary = { paddocksTested: number; latestSampleDate: string | null; worst: { metricLabel: string; direction: 'low' | 'high'; count: number } | null }`
  - `summariseLatestSoilTests(rows: unknown, metrics: readonly MetricOption[]): SoilSummary | null`
  - `soilHeadline(summary: SoilSummary): string`
  - `compassPoint(degrees: number): string`
- Produces (`src/routes/+page.ts`): `load` returning `{ weather: WeatherResult | null; soil: SoilSummary | null }`.

- [ ] **Step 1: Write the failing tests**

Replace `src/lib/home-items.test.ts` with:

```ts
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import CONFIG from '$lib/config';
import {
	compassPoint,
	mainTools,
	moreTools,
	soilHeadline,
	summariseLatestSoilTests
} from './home-items';

const staticDir = fileURLToPath(new URL('../../static', import.meta.url));
const MAX_CARD_IMAGE_BYTES = 150_000;
const items = [...mainTools, ...moreTools];
const localImages = items
	.map((item) => item.image)
	.filter((image): image is string => typeof image === 'string');

describe('home tools', () => {
	it.each(localImages)('%s is a thumbnail under 150 KB in static/', (image) => {
		expect(existsSync(`${staticDir}${image}`)).toBe(true);
		expect(statSync(`${staticDir}${image}`).size).toBeLessThan(MAX_CARD_IMAGE_BYTES);
	});

	it('has unique titles, which the home page uses as keys', () => {
		const titles = items.map((item) => item.title);
		expect(new Set(titles).size).toBe(titles.length);
	});

	it('leads with the three main jobs', () => {
		expect(mainTools.map((item) => item.href)).toEqual(['/map', '/weather', '/soiltests']);
	});
});

describe('summariseLatestSoilTests', () => {
	const metrics = CONFIG.soilMetrics; // pH optimal 6–7, P optimal 40–90

	it('returns null for anything that is not an array', () => {
		expect(summariseLatestSoilTests({ method: 'GET' }, metrics)).toBeNull();
		expect(summariseLatestSoilTests(null, metrics)).toBeNull();
	});

	it('handles no rows', () => {
		expect(summariseLatestSoilTests([], metrics)).toEqual({
			paddocksTested: 0,
			latestSampleDate: null,
			worst: null
		});
	});

	it('counts each paddock once, using its newest sample', () => {
		const rows = [
			{ fieldID: '1', sample_date: '2020-01-01', ph_water: 5.0 },
			{ fieldID: '1', sample_date: '2024-05-01', ph_water: 6.5 },
			{ fieldID: '2', sample_date: '2023-03-01', ph_water: 5.5 }
		];
		expect(summariseLatestSoilTests(rows, metrics)).toEqual({
			paddocksTested: 2,
			latestSampleDate: '2024-05-01',
			worst: { metricLabel: 'Soil pH', direction: 'low', count: 1 }
		});
	});

	it('picks the metric with the most paddocks outside its range', () => {
		const rows = [
			{ fieldID: '1', sample_date: '2024-01-01', ph_water: 5.0, P: 100 },
			{ fieldID: '2', sample_date: '2024-01-01', ph_water: 6.5, P: 120 },
			{ fieldID: '3', sample_date: '2024-01-01', ph_water: 6.5, P: 150 }
		];
		expect(summariseLatestSoilTests(rows, metrics)?.worst).toEqual({
			metricLabel: 'Phosphorus',
			direction: 'high',
			count: 3
		});
	});

	it('ignores rows without a paddock id and dates that do not parse', () => {
		const rows = [
			{ sample_date: '2025-01-01', ph_water: 5 },
			{ fieldID: '7', sample_date: 'not a date', ph_water: 6.5 }
		];
		expect(summariseLatestSoilTests(rows, metrics)).toEqual({
			paddocksTested: 1,
			latestSampleDate: null,
			worst: null
		});
	});
});

describe('soilHeadline', () => {
	it('names the worst problem', () => {
		expect(
			soilHeadline({
				paddocksTested: 9,
				latestSampleDate: null,
				worst: { metricLabel: 'Soil pH', direction: 'low', count: 3 }
			})
		).toBe('Soil pH low in 3 paddocks');
	});

	it('uses the singular for one paddock', () => {
		expect(
			soilHeadline({
				paddocksTested: 9,
				latestSampleDate: null,
				worst: { metricLabel: 'Potassium', direction: 'high', count: 1 }
			})
		).toBe('Potassium high in 1 paddock');
	});

	it('says so when everything is in range, or nothing is tested', () => {
		expect(soilHeadline({ paddocksTested: 4, latestSampleDate: null, worst: null })).toBe(
			'All tested paddocks in range'
		);
		expect(soilHeadline({ paddocksTested: 0, latestSampleDate: null, worst: null })).toBe(
			'No soil tests yet'
		);
	});
});

describe('compassPoint', () => {
	it.each([
		[0, 'N'],
		[22, 'N'],
		[23, 'NE'],
		[221, 'SW'],
		[359, 'N'],
		[-45, 'NW'],
		[405, 'NE']
	])('%s° is %s', (degrees, expected) => {
		expect(compassPoint(degrees)).toBe(expected);
	});
});
```

Create `src/routes/home-load.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { load } from './+page';

type Event = Parameters<typeof load>[0];
type Result = { weather: { source: string } | null; soil: { paddocksTested: number } | null };

const reading = { timestamp_utc: '2026-09-26 01:00:00', temp_c: 14.2, humidity_pct: 70 };
const latest = [{ fieldID: '1', sample_date: '2024-01-01', ph_water: 6.5 }];

function fetchWith(routes: Record<string, () => Response>) {
	return vi.fn(async (input: RequestInfo | URL) => {
		const url = String(input);
		for (const [prefix, respond] of Object.entries(routes)) {
			if (url.startsWith(prefix)) return respond();
		}
		return new Response('not found', { status: 404 });
	});
}

describe('home load', () => {
	it('returns weather and a soil summary', async () => {
		const fetch = fetchWith({
			'/api/weather/current': () => Response.json(reading),
			'/api/soil-tests?latest=true': () => Response.json(latest)
		});
		const result = (await load({ fetch } as unknown as Event)) as Result;

		expect(result.weather?.source).toBe('ecowitt');
		expect(result.soil?.paddocksTested).toBe(1);
	});

	it('still returns the soil summary when the weather station is down', async () => {
		const fetch = fetchWith({
			'/api/weather/current': () => new Response('down', { status: 502 }),
			'/api/soil-tests?latest=true': () => Response.json(latest)
		});
		const result = (await load({ fetch } as unknown as Event)) as Result;

		expect(result.weather?.source).toBe('mock');
		expect(result.soil?.paddocksTested).toBe(1);
	});

	it('returns soil as null when the soil request fails or is not a list', async () => {
		for (const respond of [
			() => new Response('error', { status: 500 }),
			() => Response.json({ method: 'GET', path: '/api/soil-tests' })
		]) {
			const fetch = fetchWith({
				'/api/weather/current': () => Response.json(reading),
				'/api/soil-tests?latest=true': respond
			});
			const result = (await load({ fetch } as unknown as Event)) as Result;
			expect(result.soil).toBeNull();
			expect(result.weather?.source).toBe('ecowitt');
		}
	});
});
```

Run: `npx vitest run --project server src/lib/home-items.test.ts src/routes/home-load.test.ts`
Expected: FAIL (missing exports, missing `./+page`).

- [ ] **Step 2: Rewrite `src/lib/home-items.ts`**

```ts
import type { Pathname } from '$app/types';

import type { MetricOption } from '$lib/config';
import {
	extractFieldId,
	metricStatus,
	parseDateMs,
	pickMetricValue,
	type SoilTestRecord
} from '$lib/soil-status';

export type HomeItem = {
	href: Pathname;
	title: string;
	description: string;
	image?: string | null;
	imageAlt?: string;
};

export const mainTools: HomeItem[] = [
	{
		href: '/map',
		title: 'Farm map',
		description: 'Find a paddock and see how its soil is doing.',
		image: '/img/map-card.webp',
		imageAlt: 'Aerial view of the farm'
	},
	{
		href: '/weather',
		title: 'Weather',
		description: 'Conditions from the farm’s own weather station.',
		image: '/img/weather-station.webp',
		imageAlt: 'The farm weather station'
	},
	{
		href: '/soiltests',
		title: 'Soil tests',
		description: 'Look up lab results or add new ones.',
		image: '/img/soil-card.webp',
		imageAlt: 'A handful of soil'
	}
];

export const moreTools: HomeItem[] = [
	{
		href: '/paddocks',
		title: 'Paddocks',
		description: 'Every paddock with its size and location.'
	},
	{ href: '/manual', title: 'Help', description: 'How to use this site and upload soil tests.' }
];

export type SoilSummary = {
	paddocksTested: number;
	latestSampleDate: string | null;
	worst: { metricLabel: string; direction: 'low' | 'high'; count: number } | null;
};

/**
 * Summarises `/soil-tests?latest=true` rows for the home page: paddocks tested, the newest
 * sample date, and the metric with the most paddocks outside its optimal range (ties go to the
 * first metric in config order). Returns null when the response isn't a list.
 */
export function summariseLatestSoilTests(
	rows: unknown,
	metrics: readonly MetricOption[]
): SoilSummary | null {
	if (!Array.isArray(rows)) return null;

	const newestByField = new Map<number, { record: SoilTestRecord; ms: number }>();
	let latestMs = -Infinity;
	let latestSampleDate: string | null = null;

	for (const row of rows) {
		if (!row || typeof row !== 'object') continue;
		const record = row as SoilTestRecord;
		const fieldId = extractFieldId(record);
		if (fieldId === null) continue;

		const ms = parseDateMs(record.sample_date) ?? -Infinity;
		const existing = newestByField.get(fieldId);
		if (!existing || ms >= existing.ms) newestByField.set(fieldId, { record, ms });
		if (ms > latestMs) {
			latestMs = ms;
			latestSampleDate = String(record.sample_date);
		}
	}

	let worst: SoilSummary['worst'] = null;
	for (const metric of metrics) {
		if (metric.id === 'none') continue;
		const counts = { low: 0, high: 0 };
		for (const { record } of newestByField.values()) {
			const status = metricStatus(pickMetricValue(record, metric.id), metric);
			if (status === 'low' || status === 'high') counts[status] += 1;
		}
		for (const direction of ['low', 'high'] as const) {
			const count = counts[direction];
			if (count > 0 && (!worst || count > worst.count)) {
				worst = { metricLabel: metric.label, direction, count };
			}
		}
	}

	return { paddocksTested: newestByField.size, latestSampleDate, worst };
}

export function soilHeadline(summary: SoilSummary): string {
	if (summary.worst) {
		const { metricLabel, direction, count } = summary.worst;
		return `${metricLabel} ${direction} in ${count} paddock${count === 1 ? '' : 's'}`;
	}
	return summary.paddocksTested > 0 ? 'All tested paddocks in range' : 'No soil tests yet';
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** The nearest of the eight compass points to a bearing in degrees. */
export function compassPoint(degrees: number): string {
	const normalised = ((degrees % 360) + 360) % 360;
	return COMPASS_POINTS[Math.round(normalised / 45) % 8];
}
```

- [ ] **Step 3: Create `src/routes/+page.ts`**

```ts
import CONFIG from '$lib/config';
import { summariseLatestSoilTests } from '$lib/home-items';
import { fetchWeather } from '$lib/weather';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const [weather, soil] = await Promise.allSettled([
		fetchWeather(fetch),
		fetch(CONFIG.backend.latestTest).then(async (response) => {
			if (!response.ok) throw new Error(`Request failed (${response.status})`);
			return summariseLatestSoilTests(await response.json(), CONFIG.soilMetrics);
		})
	]);

	return {
		weather: weather.status === 'fulfilled' ? weather.value : null,
		soil: soil.status === 'fulfilled' ? soil.value : null
	};
};
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run --project server src/lib/home-items.test.ts src/routes/home-load.test.ts`
Expected: PASS. `npm run check` now reports exactly one error, in `src/routes/+page.svelte` (it imports the removed `homeItems`); Task 6 rewrites that page. Commit anyway, and say so in the commit body.

- [ ] **Step 5: Commit**

```bash
git add src/lib/home-items.ts src/lib/home-items.test.ts src/routes/+page.ts src/routes/home-load.test.ts
git commit -m "Load weather and a soil summary for the home page"
```

---

### Task 6: Home page

**Files:**

- Modify: `src/routes/+page.svelte` (rewrite)
- Create: `src/routes/home-page.svelte.test.ts`

**Interfaces:**

- Consumes: `mainTools`, `moreTools`, `soilHeadline`, `compassPoint`, `SoilSummary` (Task 5); `externalLinks` (Task 3); `NavIcon` (Task 3); `Card` (existing); `formatDate` from `$lib/soil-tests/utils`; `getMockWeather` for tests.

- [ ] **Step 1: Write the failing tests**

Create `src/routes/home-page.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { getMockWeather } from '$lib/weather';
import HomePage from './+page.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

const live = { weather: getMockWeather(), connected: true, source: 'ecowitt' as const };
const soil = {
	paddocksTested: 12,
	latestSampleDate: '2024-05-01',
	worst: { metricLabel: 'Soil pH', direction: 'low' as const, count: 3 }
};

function renderHome(data: { weather: unknown; soil: unknown }) {
	// `params` etc. aren't used by the page; the cast keeps the test focused on `data`.
	render(HomePage, { data, params: {} } as never);
}

describe('home page', () => {
	it('shows live readings and the soil headline', async () => {
		renderHome({ weather: live, soil });

		await expect.element(page.getByText('12.2°')).toBeVisible();
		await expect.element(page.getByText('Soil pH low in 3 paddocks')).toBeVisible();
		expect(page.getByText('Sample data').elements()).toHaveLength(0);
	});

	it('labels every weather tile when the station is offline', async () => {
		renderHome({ weather: { ...live, connected: false, source: 'mock' }, soil });

		expect(page.getByText('Sample data').elements()).toHaveLength(3);
	});

	it('explains when weather or soil data is unavailable', async () => {
		renderHome({ weather: null, soil: null });

		await expect.element(page.getByText(/Weather is unavailable/)).toBeVisible();
		await expect.element(page.getByText('Unavailable', { exact: true })).toBeVisible();
	});

	it('links the main tools and opens external links in a new tab', async () => {
		renderHome({ weather: live, soil });

		await expect
			.element(page.getByRole('link', { name: 'Farm map' }))
			.toHaveAttribute('href', '/map');
		await expect
			.element(page.getByRole('link', { name: 'SharePoint home (opens in a new tab)' }))
			.toHaveAttribute('target', '_blank');
	});
});
```

The card images in `mainTools` are real paths; if the test run logs the `cookie` CommonJS error from them, that's the known harmless dev-middleware noise described in `CLAUDE.md`, and the assertions still hold.

Run: `npx vitest run --project client src/routes/home-page.svelte.test.ts`
Expected: FAIL (the current page imports `homeItems`, which no longer exists).

- [ ] **Step 2: Rewrite `src/routes/+page.svelte`**

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';
	import Card from '$lib/components/Card.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { compassPoint, mainTools, moreTools, soilHeadline } from '$lib/home-items';
	import { externalLinks } from '$lib/nav';
	import { formatDate } from '$lib/soil-tests/utils';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const weather = $derived(data.weather);
	const isSample = $derived(weather?.source === 'mock');
	const soil = $derived(data.soil);
</script>

<svelte:head>
	<title>Greenhill Bros Farm</title>
</svelte:head>

{#snippet sampleChip()}
	<span class="bg-warn/15 text-warn mt-2 self-start rounded-full px-2 py-0.5 text-xs">
		Sample data
	</span>
{/snippet}

<div class="mx-auto max-w-6xl space-y-8 px-4 py-6">
	<h1 class="text-xl font-semibold md:sr-only">Greenhill Bros Farm</h1>

	<section aria-labelledby="now-title" class="space-y-3">
		<h2 id="now-title" class="text-lg font-semibold">Right now</h2>
		<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
			{#if weather}
				<a
					href={resolve('/weather')}
					class="flex min-h-28 flex-col rounded-xl border border-border bg-panel p-4"
				>
					<span class="text-sm text-muted">Temperature</span>
					<span class="mt-1 text-[2.4375rem] leading-none font-semibold tabular-nums">
						{weather.weather.outdoor.temp.toFixed(1)}°
					</span>
					<span class="mt-2 text-sm text-muted">
						Feels like {weather.weather.outdoor.feelsLike.toFixed(0)}°
					</span>
					{#if isSample}{@render sampleChip()}{/if}
				</a>
				<a
					href={resolve('/weather/wind')}
					class="flex min-h-28 flex-col rounded-xl border border-border bg-panel p-4"
				>
					<span class="text-sm text-muted">Wind</span>
					<span class="mt-1 text-[2.4375rem] leading-none font-semibold tabular-nums">
						{Math.round(weather.weather.wind.speed * 3.6)}
						<span class="text-lg font-normal">km/h</span>
					</span>
					<span class="mt-2 text-sm text-muted">
						From the {compassPoint(weather.weather.wind.dir)}, gusting
						{Math.round(weather.weather.wind.gust * 3.6)}
					</span>
					{#if isSample}{@render sampleChip()}{/if}
				</a>
				<a
					href={resolve('/weather/rain')}
					class="flex min-h-28 flex-col rounded-xl border border-border bg-panel p-4"
				>
					<span class="text-sm text-muted">Rain today</span>
					<span class="mt-1 text-[2.4375rem] leading-none font-semibold tabular-nums">
						{weather.weather.rain.daily.toFixed(1)}
						<span class="text-lg font-normal">mm</span>
					</span>
					<span class="mt-2 text-sm text-muted">
						{weather.weather.rain.hourly.toFixed(1)} mm in the last hour
					</span>
					{#if isSample}{@render sampleChip()}{/if}
				</a>
			{:else}
				<p class="col-span-2 rounded-xl border border-border bg-panel p-4 text-muted lg:col-span-3">
					Weather is unavailable. Open the weather page to try again.
				</p>
			{/if}
			<a
				href={resolve('/soiltests')}
				class="col-span-2 flex min-h-28 flex-col rounded-xl border border-border bg-panel p-4 lg:col-span-1"
			>
				<span class="text-sm text-muted">Soil</span>
				{#if soil}
					<span class="mt-1 text-xl leading-tight font-semibold">{soilHeadline(soil)}</span>
					<span class="mt-2 text-sm text-muted">
						{soil.paddocksTested} paddocks tested, latest sample {formatDate(soil.latestSampleDate)}
					</span>
				{:else}
					<span class="mt-1 text-xl leading-tight font-semibold">Unavailable</span>
					<span class="mt-2 text-sm text-muted">Open soil tests to try again.</span>
				{/if}
			</a>
		</div>
	</section>

	<section aria-labelledby="tools-title" class="space-y-3">
		<h2 id="tools-title" class="text-lg font-semibold">Tools</h2>
		<div class="grid gap-4 md:grid-cols-3">
			{#each mainTools as item (item.title)}
				<Card {...item} href={resolve(item.href)} />
			{/each}
		</div>
		<ul class="grid gap-3 sm:grid-cols-2">
			{#each moreTools as item (item.title)}
				<li>
					<a
						href={resolve(item.href)}
						class="flex min-h-14 flex-col justify-center rounded-xl border border-border bg-panel px-4 py-3"
					>
						<span class="font-semibold text-text">{item.title}</span>
						<span class="text-sm text-muted">{item.description}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="links-title" class="space-y-3">
		<h2 id="links-title" class="text-lg font-semibold">Links</h2>
		<ul class="divide-y divide-border rounded-xl border border-border bg-panel">
			{#each externalLinks as link (link.href)}
				<li>
					<a
						href={link.href}
						target="_blank"
						rel="noopener noreferrer"
						class="flex min-h-12 items-center justify-between gap-3 px-4 text-text"
					>
						{link.label}
						<NavIcon name="external" size={18} />
						<span class="sr-only">(opens in a new tab)</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
</div>
```

Run the autofixer on it.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run --project client src/routes/home-page.svelte.test.ts && npm run check`
Expected: PASS, no type errors.

- [ ] **Step 4: Design review**

Load `frontend-design:frontend-design` and re-read `docs/superpowers/specs/2026-09-27-ui-direction.md`. With the backend running (`../gbros-api`) and `npm run dev`, run `node scripts/screenshot.mjs /tmp/shots-home /`. Check against the direction document: the "Right now" readings are the only large, emphatic element; tiles are 2-up on a phone and 4-up on a desktop; no arrows, badges or ALL-CAPS; everything is readable at 390px without zooming. Stop the backend, reload, and check the "Sample data" chips and the "Unavailable" soil tile. Fix what doesn't match and re-run the tests.

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.svelte src/routes/home-page.svelte.test.ts
git commit -m "Rebuild the home page around a Right now strip and the three main tools"
```

---

### Task 7: Paddocks page clean-up

**Files:**

- Modify: `src/routes/paddocks/+page.svelte`

**Interfaces:**

- Produces: "View on map" links of the form `/map?paddock=<id>`, which project 2 makes the map act on.

- [ ] **Step 1: Remove the placeholders**

In `src/routes/paddocks/+page.svelte`:

1. Delete the whole `<div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">` block containing the "Recent Notes" and "Upcoming Tasks" panels.
2. Delete the Crop column: the `<th class="py-2 pr-4">Crop</th>` header cell and the `<td class="py-2 pr-4">{p.crop ?? '-'}</td>` body cell.
3. In the `Paddock` type, delete `crop?: string | null;`; in the mapping, delete `crop: null,`; in the search, change the haystack to `` `${p.name} ${p.id}` ``.
4. Delete the `<a href="/map" class="text-sm text-muted hover:text-white">Open map →</a>` beside the search box.
5. Change the "View on map" link to:

```svelte
<a
	class="text-xs text-muted underline hover:text-white"
	href={`${resolve('/map')}?paddock=${encodeURIComponent(p.id)}`}
>
	View on map
</a>
```

and add `import { resolve } from '$app/paths';` to the script.

- [ ] **Step 2: Verify**

Run: `grep -n "crop\|Notes\|Tasks\|#\${" src/routes/paddocks/+page.svelte`
Expected: no output.

Run: `npm run check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/routes/paddocks/+page.svelte
git commit -m "Remove placeholder notes, tasks and crop column from Paddocks"
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

Load `frontend-design:frontend-design`. With the backend and dev server running, run `node scripts/screenshot.mjs /tmp/shots-final / /map /weather /weather/wind /soiltests /paddocks /manual`. Review every image against `docs/superpowers/specs/2026-09-27-ui-direction.md`: one shell, one `<h1>` per page, left-aligned titles, no content under the tab bar, no horizontal scroll, the typeface applied everywhere. Keyboard check at 1280: Tab from the address bar reaches "Skip to content" first, then the top bar links, with a visible focus ring. Fix anything that fails and re-run Step 1.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/app-shell-and-home
gh pr create --base staging --title "App shell and home page (UX 1)" --body "$(cat <<'EOF'
Implements docs/superpowers/plans/2026-09-27-app-shell-and-home.md.

- Bottom tab bar on phones, top bar on desktop, More sheet; per-page headers removed
- Home page opens with a Right now strip (temperature, wind, rain, soil headline)
- Timesheets, placeholder paddock notes/tasks and the crop column removed
- Shared soil status module and StatusBadge for UX projects 2 and 3

Closes #<issue number for "UX 1: App shell and home">

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Attach the 390px home and map screenshots to the PR description (`gh pr comment --body` with the images uploaded via the web UI if needed). Leave the worktree in place until the PR merges.
