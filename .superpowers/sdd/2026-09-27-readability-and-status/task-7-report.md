# Task 7 report: Weather detail page on runes

## Status: DONE

## What I implemented

- Rewrote `src/routes/weather/[metric]/+page.svelte` from Svelte 4 (`export let data`, hard-coded "BoM Benchmark", a mock-only inline SVG chart) to Svelte 5 runes, verbatim per the brief:
  - `$props()` for `PageProps`, `$derived` for title/spec/series/summaries/columns/rows/hours.
  - Per-metric chart via `CHARTS`/`buildSeries`/`extremes` from `../chart`, rendered through `WeatherChart` (real 24h history, not `getMockWeather().series`).
  - `OfflineBanner` for the sample-data banner.
  - A metric with no `CHARTS` entry (e.g. `indoor`, `battery`) shows "The station doesn't report {metric} readings, so there's nothing to chart." instead of drawing anything.
  - "Recent readings" table scoped to the metric's own columns plus timestamp, newest first, in a `max-h-[60vh] overflow-auto` box with a sticky header — this is what keeps the table's own scrollbar rather than the page.
  - Back link uses `resolve('/weather')` and `min-h-11`.
- Created `src/routes/weather/[metric]/metric-page.svelte.test.ts`, verbatim from the brief (4 tests: wind highs/lows in km/h with no °C on the page, the "doesn't report" copy for indoor with no chart `img`, the offline banner on mock outdoor data, and a 3-row "Recent readings" table for outdoor).
- Removed the unused `HOUR` constant from `src/routes/weather/chart.ts` (see HOUR outcome below), included in the same commit.

## TDD evidence

RED — before rewriting `+page.svelte`, ran the new test against the old Svelte 4 page:

```
$ npx vitest run --project client "src/routes/weather/[metric]/metric-page.svelte.test.ts"
...
FAIL ... > weather detail page > shows wind highs and lows in km/h, not temperature
FAIL ... > weather detail page > says when the station doesn't report a metric instead of charting sample data
FAIL ... > weather detail page > shows the offline banner on sample data
  AssertionError: Matcher did not succeed in time.
FAIL ... > weather detail page > lists the recent readings
  AssertionError: expected [] to have a length of 3 but got +0
Test Files  1 failed (1)
     Tests  4 failed (4)
```

GREEN — after the rewrite:

```
$ npx vitest run --project client "src/routes/weather/[metric]/metric-page.svelte.test.ts" --api=63317
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

(Passed `--api=63317` because another concurrent Claude session's vitest browser server was holding the shared default port 63315 on this machine; unrelated to this task.)

## Autofixer

`mcp__plugin_svelte_svelte__svelte-autofixer` on the final `+page.svelte`, desired version 5: `{"issues":[],"suggestions":[],"require_another_tool_call_after_fixing":false}` — clean, no changes needed.

## Checks and full test run

```
$ npm run check
1790508011160 COMPLETED 323 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
```

No leftover type errors from earlier tasks' `mockFields`/`data.metric` typing — this task's `PageProps` typing resolves them, as controller-notes anticipated.

```
$ npm test
 Test Files  34 passed (34)
      Tests  192 passed | 2 expected fail (194)
```

`npx prettier --check .`: "All matched files use Prettier code style!"

## ESLint

Baseline before this task: 67 errors (`npx eslint src`). After: 64 errors (`npx eslint src`) — the rewrite removed 3 pre-existing errors from the old page (an unkeyed `{#each}` and similar) and added none. Well under the ceiling.

## HOUR outcome

Grepped `src` for `HOUR` before writing the page: only `src/routes/weather/chart.ts` itself referenced it (`const HOUR = 3600_000;` and `export { HOUR };`), and `chart.test.ts` doesn't import it. The new `+page.svelte` doesn't need it either (it derives `hours` directly from `data.range`). Per the controller ruling, deleted both the `export { HOUR };` line and the now-unused `const HOUR = 3600_000;` declaration. Included in the same commit as the page.

## Browser check (390px, dev server, backend down)

Ran `npm run dev` in the background, confirmed the dev log logged "Fetch failed; serving mock data" (backend unreachable, as expected), then `node scripts/screenshot.mjs .../shots-t7 /weather/wind /weather/indoor /weather/outdoor`.

Screenshots at 390×844 for all three routes show:
- Offline banner ("Weather station offline. These are sample numbers — don't use them for decisions.") since the backend is down.
- Because the backend is unreachable, `fetchWeatherHistory` returns `[]`, so every route showed "No readings in the last 24 hours." for both the chart section and the table — this is the same empty-history path Task 5 already covers, and is the same on all three routes, so it didn't distinguish wind/indoor/outdoor content, but it did let me check layout and text size.
- Indoor differs from wind/outdoor even with mock history absent: indoor has no `CHARTS` entry, so it always shows the "doesn't report" sentence regardless of history — confirmed in the screenshot.

I supplemented this with a Playwright script (390×844, mobile) against `/weather/wind`:
- `document.documentElement.scrollWidth > clientWidth` → `false`: no page-level horizontal scroll. The readings table sits in its own `overflow-auto` box, so with no rows in this run there was nothing to scroll, but the box's CSS (`max-h-[60vh] overflow-auto`) is what will scroll internally once rows are present (verified in the component test, which renders 3 rows without the assertion being about scroll — the CSS class is what guarantees it, and it's unchanged behaviour from the brief).
- Back link ("All weather") `getBoundingClientRect().height` → `44` (exactly `min-h-11`): meets the 44px minimum.
- Scanned every leaf element for `font-size < 12px`: empty list — nothing below 12px on the page.

Stopped the dev server afterwards (`pkill -f "vite dev"`); confirmed no leftover process for this worktree.

## Files changed

- `src/routes/weather/[metric]/+page.svelte` (rewritten)
- `src/routes/weather/[metric]/metric-page.svelte.test.ts` (new)
- `src/routes/weather/chart.ts` (removed unused `HOUR`)

## Self-review

- Diffed `chart.ts`: only the two `HOUR`-related lines removed, nothing else touched.
- Diffed `+page.svelte` against the brief's Step 2 code: identical.
- Confirmed no Svelte 4 patterns (`export let`, `$:`, `<slot>`, `on:`, `use:`, `createEventDispatcher`, `class:`) remain in the file (`grep` returned nothing).
- Confirmed curly apostrophes in the "doesn't"/"there's" copy (matches the test's exact string).
- Confirmed internal link uses `resolve()`.
- No new files outside what the brief specified; no scope creep into other routes.

## Concerns

None. The brief's test and code agreed with each other and with the Global Constraints; no DONE_WITH_CONCERNS deviations were needed. The only friction was environmental (a concurrent worktree session holding the shared vitest browser port), resolved with `--api=<port>` for that one ad hoc run only — `npm test` itself ran cleanly without needing the override.

## Fix round 1 (review finding F1)

**Finding:** `data.metric` is a route param and indexes plain object literals `TITLES`, `FIELDS` (in the page) and `CHARTS` (in `chart.ts`) with `table[data.metric]`. For a param like `/weather/constructor`, `CHARTS['constructor']` resolves to the inherited `Object` function via the prototype chain rather than `undefined`. That value is truthy, so the page treats it as a real chart spec: `spec` is set, `buildSeries(data.history, spec)` runs, and `spec.series.map` throws because `Object` has no `series` property — the page crashes instead of falling back to the "doesn't report" message. `TITLES` and `FIELDS` have the same flaw (though their fallout is milder — a function value would render oddly rather than throw immediately).

**Fix:** added a small own-property-only lookup helper in `src/routes/weather/[metric]/+page.svelte`:

```ts
const own = <T,>(table: Partial<Record<string, T>>, key: string): T | undefined =>
	Object.hasOwn(table, key) ? table[key] : undefined;
```

and used it for the three param-keyed tables:
- `const title = $derived(own(TITLES, data.metric) ?? data.metric);`
- `const spec = $derived(own(CHARTS, data.metric));`
- `...(own(FIELDS, data.metric) ?? [])` inside `columns`.

`HEADINGS` was left untouched, as instructed — it's keyed by `WeatherHistoryRow` column names from a fixed internal set, not by the route param, so it isn't reachable with attacker-controlled keys. `chart.ts`'s `CHARTS` shape/export was not changed; only how the page reads from it.

For `metric = 'constructor'`: `own(TITLES, 'constructor')` → `undefined` → `title` falls back to `data.metric` (`'constructor'`); `own(CHARTS, 'constructor')` → `undefined` → `spec` is `undefined`, so the page takes the `{:else}` branch and renders "The station doesn't report constructor readings, so there's nothing to chart." with no chart/`img`. Matches the fix instructions' expected text.

**Test added** to `metric-page.svelte.test.ts`:

```ts
it('ignores inherited object properties for an unknown metric param', async () => {
	expect(() => open('constructor')).not.toThrow();

	await expect
		.element(
			page.getByText(
				'The station doesn’t report constructor readings, so there’s nothing to chart.'
			)
		)
		.toBeVisible();
	expect(page.getByRole('img').elements()).toHaveLength(0);
});
```

**Commands and output:**

Autofixer on the updated `+page.svelte` (desired version 5): `{"issues":[],"suggestions":[],"require_another_tool_call_after_fixing":false}` — clean.

```
$ npx vitest run --project client "src/routes/weather/[metric]/metric-page.svelte.test.ts"
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

(No port conflict this run — the port used in the original round is not needed now.)

```
$ npm run check
1790508404474 COMPLETED 323 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
```

`npx prettier --write` on the two touched files: both reformatted cleanly (prettier wrapped the new test's long `getByText` string onto its own line, and added the trailing comma in `<T,>` that TS needs to disambiguate a generic from JSX inside a `.svelte` `<script lang="ts">` block — both are prettier's own formatting, not manual edits).

```
$ npx eslint src
✖ 64 problems (64 errors, 0 warnings)
```

Unchanged from before the fix (baseline 67; still well under it).

```
$ npm test
 Test Files  34 passed (34)
      Tests  193 passed | 2 expected fail (195)
```

One more test passing than the pre-fix run (192 → 193), confirming the new test is collected and green.

**Files changed in this round:**
- `src/routes/weather/[metric]/+page.svelte` (added `own` helper, used it for `TITLES`, `CHARTS`, `FIELDS` lookups)
- `src/routes/weather/[metric]/metric-page.svelte.test.ts` (added the `constructor` regression test)

**Commit:** `2e6a7b1` "Ignore inherited keys when looking up a weather metric"

**Self-review:** diffed both files — only the `own` helper and its three call sites changed in the `.svelte` file (13 lines added, 3 removed net), and only the new test block added to the test file. No unrelated changes. `chart.ts` and `CHARTS`'s shape/export are untouched, as instructed. No new concerns.
