# Weather SSR fetch and tooltip escaping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Before editing any `.svelte` file, load the `svelte:svelte-code-writer` skill and run its autofixer on every `.svelte` file you change.

**Goal:** The weather pages show live backend data on first load instead of mock data, and backend strings can't inject HTML into map tooltips.

**Architecture:** The weather `load` functions call `fetchWeather()`, which uses the global `fetch` with a relative `/api/...` URL. On the server that throws, so SSR always falls back to mock data. We thread SvelteKit's `fetch` (which `hooks.server.ts` `handleFetch` rewrites to the backend) through `fetchWeather` → `fetchBackendWeatherMeta`, defaulting to the global `fetch` so the dashboard's client-side polling keeps working. For tooltips, a small `escapeHtml` helper is applied wherever Leaflet tooltip HTML is built. The map page's inline tooltip builder moves into a tested pure helper.

**Tech Stack:** SvelteKit 2, Svelte 5, TypeScript ~6.0, Vitest 5 (`server` project, node, `TZ=Australia/Melbourne`), Leaflet 1.9.

**Spec:** Item 1 of the 2026-09-26 repository review ("Bugs worth fixing first"): weather SSR mock fallback, unescaped tooltip HTML. The home-page relative image path from that item moved to the dead-code/assets plan so no two parallel branches touch the same file.

## Global Constraints

- Work only in your own worktree under `.claude/worktrees/`. Never edit or switch branches in the main checkout.
- After `npm ci`, and before changing anything, record the ESLint baseline for the paths listed in the final task: `npx eslint <paths> 2>&1 | tail -3`. Later checks compare against it.
- Run `npm ci` first in the worktree. If it fails with `Tsconfig not found .../.svelte-kit/tsconfig.json`, run `npx svelte-kit sync` in the main checkout (`/Users/tomgreenhill/Projects/farm-website/farm-website`), then retry.
- Before your first commit, move off the `worktree-<name>` branch you started on: `git fetch origin`, `git switch --no-track -c fix/weather-ssr-and-tooltips origin/staging`, then `git branch -d <the worktree-… branch>`. The branch is based on `staging`, not `main`.
- First commit: copy this plan to `docs/superpowers/plans/2026-09-26-weather-ssr-and-tooltips.md` and run `npx prettier --write` on it (CI checks Markdown formatting).
- Every backend URL comes from `CONFIG.backend` in `src/lib/config.ts`. Don't hard-code `/api/...` in source (tests may use literal paths).
- Prettier: tabs, single quotes, no trailing commas, width 100. Run `npx prettier --write` on the files you touch.
- Don't add ESLint errors: `npx eslint <touched files>` must not report more errors than it does on `origin/staging` for those files.
- Don't touch files outside this plan's **Files** lists. Parallel branches own the rest.
- Before pushing, all of these must pass: `npm run check`, `npm test`, `npx prettier --check .`, `npm run build`, `scripts/smoke-test.sh --local`.
- Push the branch and open a PR into `staging` (`--base staging`). Don't merge it. Leave the worktree in place: it gets deleted after the PR merges.

## Review Focus

1. Backend down or returning 5xx during SSR → the page still renders, with mock data and `connected: false, source: 'mock'` (test in Task 1).
2. Client-side polling on `/weather` calls `fetchWeather()` with no argument → it must still use the browser's global `fetch` (default parameter; Task 1 checks the signature by type, and the dashboard page is unchanged).
3. Paddock/title properties that are `null`, `undefined` or numbers → `escapeHtml` renders `''` or the number as text and never throws (tests in Task 2).
4. Owner names or addresses containing `&`, `<` or quotes → they show as literal text in the tooltip (tests in Task 2).
5. Metric `none` selected → paddock tooltip shows only the name and ID, with no metric or sample line (test in Task 3).

---

### Task 1: Use SvelteKit's `fetch` for weather loads

**Files:**

- Modify: `src/lib/providers/backend.ts` (`fetchBackendWeatherMeta`, near line 125)
- Modify: `src/lib/weather.ts` (`fetchWeather`, near line 64)
- Modify: `src/routes/weather/+page.ts`
- Modify: `src/routes/weather/[metric]/+page.ts`
- Test: `src/routes/weather/load.test.ts` (create)

**Interfaces:**

- Produces: `fetchBackendWeatherMeta(fetchFn?: typeof fetch): Promise<WeatherMeta>` and `fetchWeather(fetchFn?: typeof fetch): Promise<WeatherResult>`, both defaulting to the global `fetch`.

- [ ] **Step 1: Write the failing test**

Create `src/routes/weather/load.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import type { Weather } from '$lib/weather';
import { load as dashboardLoad } from './+page';
import { load as metricLoad } from './[metric]/+page';

// A backend reading whose temperature differs from getMockWeather()'s 12.2 °C.
const reading = { timestamp_utc: '2026-09-26 01:00:00', temp_c: 14.2, humidity_pct: 70 };

function backendFetch() {
	return vi.fn(async (input: RequestInfo | URL) => {
		const url = String(input);
		if (url.startsWith('/api/weather/current')) return Response.json(reading);
		if (url.startsWith('/api/weather?')) return Response.json({ data: [] });
		return new Response('not found', { status: 404 });
	});
}

type DashboardEvent = Parameters<typeof dashboardLoad>[0];
type MetricEvent = Parameters<typeof metricLoad>[0];
// PageLoad results are typed `void | Record<string, any>`; these loads always return data.
type LoadResult = { w: Weather; connected: boolean; source: string; metric?: string };

describe('weather load functions', () => {
	it('dashboard load reads current weather through the fetch it is given', async () => {
		const fetch = backendFetch();
		const result = (await dashboardLoad({ fetch } as unknown as DashboardEvent)) as LoadResult;

		expect(fetch).toHaveBeenCalledWith('/api/weather/current');
		expect(result).toMatchObject({ connected: true, source: 'ecowitt' });
		expect(result.w.outdoor.temp).toBe(14.2);
	});

	it('metric load reads current weather through the fetch it is given', async () => {
		const fetch = backendFetch();
		const result = (await metricLoad({
			fetch,
			params: { metric: 'outdoor' }
		} as unknown as MetricEvent)) as LoadResult;

		expect(fetch).toHaveBeenCalledWith('/api/weather/current');
		expect(result).toMatchObject({ connected: true, source: 'ecowitt', metric: 'outdoor' });
		expect(result.w.outdoor.temp).toBe(14.2);
	});

	it('falls back to mock data when the backend fails', async () => {
		const fetch = vi.fn(async () => new Response('Backend unavailable', { status: 502 }));
		const result = (await dashboardLoad({ fetch } as unknown as DashboardEvent)) as LoadResult;

		expect(result).toMatchObject({ connected: false, source: 'mock' });
		expect(result.w.outdoor.temp).toBe(12.2);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run --project server src/routes/weather/load.test.ts`
Expected: the first two tests FAIL (`fetch` not called, `connected: false`) because the loads ignore the event's `fetch`. The third passes.

- [ ] **Step 3: Thread `fetch` through**

In `src/lib/providers/backend.ts`, replace the start of `fetchBackendWeatherMeta`:

```ts
export async function fetchBackendWeatherMeta(
	fetchFn: typeof fetch = fetch
): Promise<WeatherMeta> {
	try {
		const res = await fetchFn(CONFIG.backend.currentWeather);
```

(The rest of the function is unchanged. `CONFIG.backend.currentWeather` replaces the redundant template literal.)

In `src/lib/weather.ts`, replace `fetchWeather`:

```ts
/** Pass SvelteKit's `fetch` from a load function; relative `/api` URLs fail on the server otherwise. */
export async function fetchWeather(fetchFn: typeof fetch = fetch): Promise<WeatherResult> {
	const { data, connected, source } = await fetchBackendWeatherMeta(fetchFn);
	return { weather: data, connected, source };
}
```

Replace `src/routes/weather/+page.ts` with:

```ts
import type { PageLoad } from './$types';
import { fetchWeather } from '$lib/weather';

export const load: PageLoad = async ({ fetch }) => {
	const res = await fetchWeather(fetch);
	return { w: res.weather, connected: res.connected, source: res.source };
};
```

In `src/routes/weather/[metric]/+page.ts`, change `const res = await fetchWeather();` to `const res = await fetchWeather(fetch);`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest --run --project server src/routes/weather/load.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Type check and commit**

Run: `npm run check` (expect 0 errors), then:

```bash
npx prettier --write src/lib/providers/backend.ts src/lib/weather.ts src/routes/weather
git add src/lib/providers/backend.ts src/lib/weather.ts src/routes/weather
git commit -m "Load weather through SvelteKit's fetch so SSR shows live data"
```

---

### Task 2: `escapeHtml` and escaped layer tooltips

**Files:**

- Create: `src/lib/html.ts`
- Test: `src/lib/html.test.ts` (create)
- Modify: `src/lib/layers.ts` (`buildTitleTooltipHtml` near line 59, `buildBaseLayer` near line 225)
- Test: `src/lib/layers.test.ts` (create)

**Interfaces:**

- Produces: `escapeHtml(value: unknown): string` in `$lib/html`; exported `buildTitleTooltipHtml(props: TitleFeatureProperties): string` and new `buildBaseTooltipHtml(name: unknown, id: unknown): string` in `$lib/layers`. Task 3 uses `escapeHtml`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/html.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { escapeHtml } from './html';

describe('escapeHtml', () => {
	it('escapes the characters that matter in HTML text and attributes', () => {
		expect(escapeHtml(`<b class="x">Tom & Alex's</b>`)).toBe(
			'&lt;b class=&quot;x&quot;&gt;Tom &amp; Alex&#39;s&lt;/b&gt;'
		);
	});

	it('renders null and undefined as empty text and numbers as text', () => {
		expect(escapeHtml(null)).toBe('');
		expect(escapeHtml(undefined)).toBe('');
		expect(escapeHtml(42)).toBe('42');
	});
});
```

Create `src/lib/layers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { buildBaseTooltipHtml, buildTitleTooltipHtml, type TitleFeatureProperties } from './layers';

const title = (overrides: Partial<TitleFeatureProperties>): TitleFeatureProperties => ({
	objectID: 1,
	pid: 123,
	potPid: 0,
	volume: '1',
	folio: 2,
	titleRef: '1/2',
	address: '1 Farm Rd',
	ownershipPct: '100%',
	owners: ['Stuart', 'Greenhill'],
	...overrides
});

describe('buildTitleTooltipHtml', () => {
	it('escapes backend text', () => {
		const html = buildTitleTooltipHtml(
			title({ address: '<img src=x onerror=alert(1)>', owners: ['Tom', 'Smith & Co'] })
		);
		expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
		expect(html).toContain('Smith &amp; Co');
		expect(html).not.toContain('<img');
	});

	it('falls back when the address is missing', () => {
		expect(buildTitleTooltipHtml(title({ address: '' }))).toContain('Untitled property');
	});
});

describe('buildBaseTooltipHtml', () => {
	it('escapes the paddock name and id', () => {
		expect(buildBaseTooltipHtml('<b>North</b>', 7)).toBe(
			'<div><strong>&lt;b&gt;North&lt;/b&gt;</strong></div><div>ID: 7</div>'
		);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest --run --project server src/lib/html.test.ts src/lib/layers.test.ts`
Expected: FAIL (`./html` doesn't exist; `buildTitleTooltipHtml` and `buildBaseTooltipHtml` aren't exported).

- [ ] **Step 3: Implement**

Create `src/lib/html.ts`:

```ts
const HTML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

/** Escapes text for an HTML string, e.g. Leaflet tooltip content, which is parsed as HTML. */
export function escapeHtml(value: unknown): string {
	return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
```

In `src/lib/layers.ts`, add `import { escapeHtml } from './html';` next to the `./utils` import, then replace `buildTitleTooltipHtml`:

```ts
export function buildTitleTooltipHtml(props: TitleFeatureProperties): string {
	const ownerNames = formatOwners(props.owners);
	const parts: string[] = [
		`<div><strong>${escapeHtml(props.address || 'Untitled property')}</strong></div>`,
		`<div>Owners: ${escapeHtml(ownerNames)}</div>`,
		`<div>Ownership: ${escapeHtml(props.ownershipPct || '–')}</div>`,
		`<div class="text-[0.7rem] opacity-80">Title: ${escapeHtml(props.titleRef || '–')}</div>`
	];
	return parts.join('');
}
```

Add just above `buildBaseLayer`:

```ts
export function buildBaseTooltipHtml(name: unknown, id: unknown): string {
	return `<div><strong>${escapeHtml(name)}</strong></div><div>ID: ${escapeHtml(id)}</div>`;
}
```

In `buildBaseLayer`, replace
`const tooltip = \`<div><strong>${name}</strong></div><div>ID: ${id}</div>\`;`with`const tooltip = buildBaseTooltipHtml(name, id);`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest --run --project server src/lib/html.test.ts src/lib/layers.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/lib/html.ts src/lib/html.test.ts src/lib/layers.ts src/lib/layers.test.ts
git add src/lib/html.ts src/lib/html.test.ts src/lib/layers.ts src/lib/layers.test.ts
git commit -m "Escape backend text in title and paddock tooltips"
```

---

### Task 3: Escaped metric tooltip on the map page

**Files:**

- Modify: `src/routes/map/helpers.ts` (add `buildPaddockTooltipHtml` after `formatSampleDate`, near line 278; add an import)
- Test: `src/routes/map/helpers.test.ts` (append)
- Modify: `src/routes/map/+page.svelte` (script only: the import list at lines 15–43, and `applySoilMetricStyles` lines 392–405)

**Interfaces:**

- Consumes: `escapeHtml(value: unknown): string` from `$lib/html` (Task 2).
- Produces: `buildPaddockTooltipHtml(input: PaddockTooltipInput): string` and `type PaddockTooltipInput` in `src/routes/map/helpers.ts`.

- [ ] **Step 1: Write the failing tests**

Append to `src/routes/map/helpers.test.ts`, adding `buildPaddockTooltipHtml` to the existing `./helpers` import and `import CONFIG from '$lib/config';` at the top:

```ts
describe('buildPaddockTooltipHtml', () => {
	const phosphorus = CONFIG.soilMetrics.find((m) => m.id === 'P')!;
	const none = CONFIG.soilMetrics.find((m) => m.id === 'none')!;
	const base = {
		name: 'North',
		displayId: '7',
		metric: phosphorus,
		valueText: '55 mg/kg',
		sampleDate: '2026-03-01',
		colorable: true
	};

	it('escapes the paddock name, id and value', () => {
		const html = buildPaddockTooltipHtml({
			...base,
			name: '<script>x</script>',
			displayId: '"7"',
			valueText: '<1'
		});
		expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
		expect(html).toContain('ID: &quot;7&quot;');
		expect(html).toContain('Phosphorus: &lt;1');
		expect(html).not.toContain('<script>');
	});

	it('shows only the name and id when no metric is selected', () => {
		expect(buildPaddockTooltipHtml({ ...base, metric: none })).toBe(
			'<div><strong>North</strong></div><div>ID: 7</div>'
		);
	});

	it('shows the sample date, or says there is no recent sample', () => {
		expect(buildPaddockTooltipHtml(base)).toContain('Sample: ');
		const noSample = buildPaddockTooltipHtml({ ...base, sampleDate: null, valueText: null });
		expect(noSample).toContain('Phosphorus: No data');
		expect(noSample).toContain('No recent sample');
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest --run --project server src/routes/map/helpers.test.ts`
Expected: FAIL (`buildPaddockTooltipHtml` is not exported).

- [ ] **Step 3: Implement the helper**

In `src/routes/map/helpers.ts`, add `import { escapeHtml } from '$lib/html';` after the `$lib/layers` import, and add after `formatSampleDate`:

```ts
export type PaddockTooltipInput = {
	name: string;
	displayId: string;
	metric: MetricOption;
	valueText: string | null;
	sampleDate: string | null;
	colorable: boolean;
};

export function buildPaddockTooltipHtml({
	name,
	displayId,
	metric,
	valueText,
	sampleDate,
	colorable
}: PaddockTooltipInput): string {
	const parts = [
		`<div><strong>${escapeHtml(name)}</strong></div>`,
		`<div>ID: ${escapeHtml(displayId)}</div>`
	];
	if (metric.id !== 'none') {
		parts.push(`<div>${escapeHtml(metric.label)}: ${escapeHtml(valueText ?? 'No data')}</div>`);
		if (sampleDate) {
			parts.push(
				`<div class="text-[0.7rem] opacity-80">Sample: ${escapeHtml(formatSampleDate(sampleDate))}</div>`
			);
		} else if (colorable) {
			parts.push('<div class="text-[0.7rem] opacity-80">No recent sample</div>');
		}
	}
	return parts.join('');
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest --run --project server src/routes/map/helpers.test.ts`
Expected: all passed.

- [ ] **Step 5: Use it in the map page**

Load the `svelte:svelte-code-writer` skill first. In `src/routes/map/+page.svelte`, add `buildPaddockTooltipHtml,` to the `./helpers` import list and remove `formatSampleDate,` from it (no longer used in the page). Replace lines 392–405 (from `const parts = [` through `updatePaddockTooltip(layer, parts.join(''));`) with:

```ts
updatePaddockTooltip(
	layer,
	buildPaddockTooltipHtml({
		name,
		displayId,
		metric,
		valueText,
		sampleDate: sample?.sampleDate ?? null,
		colorable
	})
);
```

Change nothing else in this file. The Svelte 5 migration of the map page is a separate, later plan. Run the svelte autofixer on `src/routes/map/+page.svelte` and fix only issues on the lines you changed.

- [ ] **Step 6: Verify and commit**

Run: `npm run check` (0 errors) and `npm test` (all pass). Then:

```bash
npx prettier --write src/routes/map
git add src/routes/map
git commit -m "Build the paddock metric tooltip in a tested helper that escapes its input"
```

---

### Task 4: Full verification, check in the browser, and PR

- [ ] **Step 1: CI-equivalent checks**

Run each command, and don't continue while any of them fails:

```bash
npm run check
npm test
npx prettier --check .
npm run build
scripts/smoke-test.sh --local
npx eslint src/lib/html.ts src/lib/layers.ts src/lib/weather.ts src/lib/providers/backend.ts src/routes/weather src/routes/map
```

Compare the ESLint error count with the baseline you recorded before Task 1. It must not be higher. Never use `git stash`: the stash is shared with other worktrees.

- [ ] **Step 2: Check in the browser**

With `npm run build` done, start the stub backend and the app the way `scripts/smoke-test.sh --local` does (read that script for the ports and env vars). Open `/weather` with JavaScript disabled, or run `curl -s <app>/weather | grep -o 'Live (Ecowitt)\|Mock'`. The server-rendered HTML must say `Live (Ecowitt)`, not `Mock`. Leaflet tooltips can't be exercised without map data. The unit tests cover them.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin fix/weather-ssr-and-tooltips
gh pr create --base staging --title "Fix weather SSR mock fallback and escape map tooltips" --body "<summary of the two fixes, the tests added, and the verification run; end with the attribution lines from the session>"
```

Don't merge.
