# Task 5 report: Charts from real history

## What I implemented

Four new files, exactly as specified in the brief (code used verbatim):

- `src/routes/weather/chart.ts` — pure chart-data helpers:
  - `CHARTS`: `Partial<Record<string, ChartSpec>>` for `outdoor`, `wind`, `rain`, `pressure`, `solar`.
  - `parseUtcMs(value)`: parses backend timestamps as UTC even without a zone suffix.
  - `buildSeries(history, spec)`: sorts by time ascending, skips rows with unparseable timestamps or missing/non-finite values per series.
  - `hourTicks(from, to, every = 6)`: local-clock hour ticks divisible by `every`.
  - `hourlyRows(series)`: last value per local hour per series, for the screen-reader table.
  - `extremes(points)`: high/low or `null` for an empty array.
  - `HOUR` constant kept and re-exported per the brief's note (Task 7 may remove it if unused).
- `src/routes/weather/chart.test.ts` — the six tests from the brief, verbatim.
- `src/routes/weather/components/WeatherChart.svelte` — SVG line chart with a colour legend, gridlines/axis labels, and a `sr-only` hourly `<table>` for screen readers; shows "No readings in the last 24 hours." when there are no points across any series. Runes-only (`$props`, `$derived`, `MediaQuery`).
- `src/routes/weather/components/WeatherChart.svelte.test.ts` — the two tests from the brief, verbatim.

No other files were touched. This task only creates the chart building blocks; wiring `WeatherChart` into the weather detail pages is a later task per the brief (not listed as a file for Task 5).

## TDD evidence

**RED** — before `chart.ts` existed:

```
$ npx vitest run --project server src/routes/weather/chart.test.ts
FAIL  server  src/routes/weather/chart.test.ts [ src/routes/weather/chart.test.ts ]
Error: Cannot find module './chart' imported from .../src/routes/weather/chart.test.ts
Test Files  1 failed (1)
     Tests  no tests
```

**RED** — before `WeatherChart.svelte` existed:

```
$ npx vitest run --project client src/routes/weather/components/WeatherChart.svelte.test.ts
FAIL  client (chromium)  src/routes/weather/components/WeatherChart.svelte.test.ts
Error: Failed to import test file .../WeatherChart.svelte.test.ts
Caused by: TypeError: Failed to fetch dynamically imported module: .../WeatherChart.svelte.test.ts?import
Test Files  1 failed (1)
     Tests  no tests
```

**GREEN** — after implementing `chart.ts`:

```
$ npx vitest run --project server src/routes/weather/chart.test.ts
Test Files  1 passed (1)
     Tests  6 passed (6)
```

**GREEN** — after implementing `WeatherChart.svelte`:

```
$ npx vitest run --project client src/routes/weather/components/WeatherChart.svelte.test.ts
Test Files  1 passed (1)
     Tests  2 passed (2)
```

## Autofixer

Ran `mcp__plugin_svelte_svelte__svelte-autofixer` on `WeatherChart.svelte` (Svelte version 5):

```
{"issues":[],"suggestions":[],"require_another_tool_call_after_fixing":false}
```

Clean on the first pass; no changes needed.

## check / test / lint

```
$ npm run check
svelte-kit sync && svelte-check --tsconfig ./tsconfig.json
COMPLETED 321 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
```

(Controller notes said type errors in the weather pages / home fixture are accepted between Task 2 and Task 8; there were none at all here.)

```
$ npm test
Test Files  32 passed (32)
     Tests  183 passed | 2 expected fail (185)
```

(The 2 `expected fail` are pre-existing `it.fails` markers from earlier tasks, unrelated to this change.)

```
$ npx eslint src 2>&1 | tail -3
✖ 78 problems (78 errors, 0 warnings)
```

78 before my changes (recorded fresh at the start of this task) and 78 after — no new ESLint errors added. (Controller notes recorded an earlier baseline of 81; the actual count in this worktree at the start of my work was already 78, presumably reduced by a task done since that note was written. I used the live baseline of 78 measured before touching any files, and stayed at 78.)

```
$ npx prettier --write <the 4 touched files>
... (unchanged) x4
```

All four files were already Prettier-clean (tabs, single quotes, no trailing commas, width 100) as written from the brief.

## Files changed

- `src/routes/weather/chart.ts` (new)
- `src/routes/weather/chart.test.ts` (new)
- `src/routes/weather/components/WeatherChart.svelte` (new)
- `src/routes/weather/components/WeatherChart.svelte.test.ts` (new)

## Self-review

- Diff is purely additive: `git status --short` before commit showed only the four new files (`??`), nothing else touched.
- `buildSeries` correctly skips the `{ timestamp_utc: 'not a time', temp_c: 99 }` row (bad timestamp) and the `wind_avg_ms: null` row for the `average` series, matching the brief's assertions.
- `hourTicks`/`hourlyRows` rely on the local system clock (`Date`/`setHours` etc.), so they are TZ-sensitive by design; I ran them through `npx vitest run --project server ...` (which sets `TZ=Australia/Melbourne`), not via a bare `node`/other runner, as instructed.
- `WeatherChart.svelte` uses only runes (`$props`, `$derived`), no `export let`/`$:`/`on:`/`class:`/slots — compliant with the global constraint on runes-only new Svelte code.
- Colour tokens used (`rgb(var(--status-high))`, `rgb(var(--accent))`, `rgb(var(--warn))`, `rgb(var(--border))`, `rgb(var(--muted))`) all exist in `src/app.css`, confirmed by grep before writing the file.
- Text sizes in the SVG (`font-size="12"`) meet the "smallest text is 12px" global constraint; no `text-[10px]`/`text-[11px]` used.
- No colour-alone status here (this component draws lines/axes, not verdicts), so the "status is never colour alone" rule doesn't apply to this file.
- `HOUR` is kept per the brief's explicit instruction, not because I judged it necessary — flagged in case a reviewer expects it gone already.

## Concerns

None. The brief's test values and code did not disagree with each other anywhere I found — all six `chart.test.ts` assertions and both `WeatherChart.svelte.test.ts` assertions passed against the brief's own implementation code without any adjustment. The only note-worthy point is the ESLint baseline: the controller's recorded baseline (81) is stale relative to the current worktree state (78 at the start of my work); I preserved the live baseline (78 → 78), which is the stricter of the two and satisfies "less than or equal to" against either number.

## Fix round 1 (controller review)

Two Important findings, both controller rulings overriding the brief's original code.

### F1 — duplicate gridline keys when the series is flat

`{#each [min, (min + max) / 2, max] as value (value)}` produced three identical keys whenever `min === max` (all points share one rounded value, e.g. a single pressure reading, or two identical readings). Svelte 5 errors on duplicate keys.

Fix in `src/routes/weather/components/WeatherChart.svelte`:
- `max` is now `Math.max(min + 1, values.length ? Math.ceil(Math.max(...values)) : 1)`, guaranteeing `max > min`, so a flat series always gets a 1-unit span.
- The gridline `{#each}` is now keyed by index: `{#each [min, (min + max) / 2, max] as value, i (i)}`.
- Added a new test to `WeatherChart.svelte.test.ts`: `'renders a flat series without duplicate gridline keys'`, rendering a two-point series both at `v: 1012` and asserting the chart's `role="img"` is visible (i.e. it doesn't throw).

### F2 — SVG axis text under the 12px floor

The `viewBox` width was a fixed breakpoint value (360 / 800) while the SVG itself scaled to `w-full`, so `font-size="12"` (a viewBox unit) rendered below 12 actual px whenever the container was narrower than the viewBox (e.g. ~10.9px at 390px viewport, ~10.5px in an 800-wide viewBox squeezed into a ~700px panel).

Fix in `src/routes/weather/components/WeatherChart.svelte`:
- Wrapped the `<svg>` in `<div bind:clientWidth={measured}>`.
- `width` is now `$derived(measured || 360)` (the `360` fallback covers the first render before layout, before `clientWidth` is measured).
- `height` still comes from the `MediaQuery('min-width: 48rem')` (`wide`), now used for height only: 300 below md, 260 at md+.
- The `<svg>` now has both `viewBox="0 0 {width} {height}"` and an explicit `{height}` attribute, plus `class="block w-full"` (dropped `w-full` alone) so it doesn't stretch vertically. With `width === measured`, one viewBox unit is one CSS pixel, so `font-size="12"` renders at exactly 12px regardless of viewport.
- `role="img"` and `aria-label={title}` stay on the `<svg>`, unchanged.

## Fix round 1 — autofixer, tests, check

Ran `mcp__plugin_svelte_svelte__svelte-autofixer` on the updated `WeatherChart.svelte` (Svelte version 5):

```
{"issues":[],"suggestions":[],"require_another_tool_call_after_fixing":false}
```

Clean, no changes needed.

```
$ npx prettier --write src/routes/weather/components/WeatherChart.svelte src/routes/weather/components/WeatherChart.svelte.test.ts
src/routes/weather/components/WeatherChart.svelte 205ms
src/routes/weather/components/WeatherChart.svelte.test.ts 15ms
```

(Both files were reformatted — the `<div>`/`<svg>` indentation and a two-line `.toBeVisible()` call were collapsed onto one line — and left clean, matching the project's tab/single-quote/width-100 style.)

```
$ npx vitest run --project client src/routes/weather/components/WeatherChart.svelte.test.ts
Test Files  1 passed (1)
     Tests  3 passed (3)
```

(3 tests: the original 2 plus the new flat-series test from F1.)

```
$ npx vitest run --project server src/routes/weather/chart.test.ts
Test Files  1 passed (1)
     Tests  6 passed (6)
```

```
$ npm run check
svelte-kit sync && svelte-check --tsconfig ./tsconfig.json
COMPLETED 321 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
```

```
$ npm test
Test Files  32 passed (32)
     Tests  184 passed | 2 expected fail (186)
```

(184 passed, up from 183 in the original round — the one new test. The 2 `expected fail` are the same pre-existing, unrelated `it.fails` markers.)

```
$ npx eslint src 2>&1 | tail -5
✖ 78 problems (78 errors, 0 warnings)
```

Still 78/78 — no new ESLint errors from the fix.

## Fix round 1 — commit

`72f28fe` "Keep chart gridline keys unique and axis text at 12px"

```
2 files changed, 66 insertions(+), 36 deletions(-)
 src/routes/weather/components/WeatherChart.svelte
 src/routes/weather/components/WeatherChart.svelte.test.ts
```

## Fix round 1 — self-review

- One transient issue during verification: `npx vitest run --project client ...` first failed with `Error: Port 63315 is already in use` (no local vitest process was holding it — `ps aux | grep vitest` and `lsof -i :63315` both came back empty), almost certainly a momentary clash with another concurrent worktree/session on the shared default Vitest browser-mode port. Retried immediately and it passed clean; not a code issue, no action needed.
- Confirmed via `git status --short` before committing that only the two intended files (`WeatherChart.svelte`, `WeatherChart.svelte.test.ts`) were staged.
- `wide` (the `MediaQuery` instance) is still used, now solely for `height`; not removed, since F2 explicitly says to keep it for height only.
