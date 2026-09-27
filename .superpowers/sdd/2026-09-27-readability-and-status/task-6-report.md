# Task 6 report: Weather dashboard on runes

## Status

DONE (no deviations from the brief; verbatim code and test used).

## What I implemented

- Rewrote `src/routes/weather/+page.svelte` from the old Svelte 4 version (`export let`, `$:`, hard-coded highs/lows, no sample-data marking) to the brief's Svelte 5 runes version verbatim:
  - Leads with `SprayPanel` (spraying verdict first, per controller notes review focus item).
  - Each metric panel (`Outdoor`, `Wind`, `Rainfall`, `Pressure`, `Solar and UVI`, `Indoor`, `Battery`) is wrapped in `<a href={resolve(...)}>` linking to its detail page, chips `SampleDataChip` in the panel's `actions` snippet only when at least one of its fields is in `mockFields`, and dims+underlines individual sample values with a `title="Sample value"` tooltip via a shared `value` snippet.
  - `OfflineBanner` shown based on `current.source`.
  - Live/Offline badge and "Updated Ns ago" age readout, refreshed every second; weather refetched via `fetchWeather()` every 15s with `fresh` state overriding the load's initial `data`.
  - Outdoor 24h chart via `WeatherChart` + `buildSeries(data.history, CHARTS.outdoor!)`.
  - All hard-coded highs/lows and the old SVG hand-rolled dial/chart are gone.
- Created `src/routes/weather/weather-page.svelte.test.ts` verbatim from the brief.

## TDD evidence

**RED** — `npx vitest run --project client src/routes/weather/weather-page.svelte.test.ts` against the old Svelte-4 page:
```
Test Files  1 failed (1)
     Tests  4 failed (4)
```
(Failure was `Matcher did not succeed in time` — old page had no sample chips, no offline-banner-suppression logic tied to `mockFields`, no spraying panel, and drew SVG lines instead of "No readings in the last 24 hours.".)

**GREEN** — after rewriting `+page.svelte`, same command:
```
Test Files  1 passed (1)
     Tests  4 passed (4)
```

## Autofixer

`mcp__plugin_svelte_svelte__svelte-autofixer` run against the new `+page.svelte` (desired_svelte_version 5): `{"issues":[],"suggestions":[],"require_another_tool_call_after_fixing":false}` — clean on first pass (the brief's code needed no changes).

## Check and test results

- `npm run check`: `COMPLETED 322 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`
- `npm test`: `33 passed (33)`, `188 passed | 2 expected fail (190)` — the 2 expected fails are pre-existing `it.fails` pins unrelated to this task.
- `npx prettier --write` on both touched files: unchanged (already formatted). `npx prettier --check .`: all files pass.
- `npx eslint src`: baseline before this task's changes was 78 errors (recorded at start of this session); after the rewrite it is **67 errors** — down, because the old page contributed several `svelte/require-each-key` and similar errors that are now gone. No new errors were introduced.
- `npm run build`: succeeds.
- `scripts/smoke-test.sh --local`: `smoke test passed`, including `GET /weather -> 200` and `GET /weather/outdoor -> 200`.

## Screenshot observations

Ran `npm run dev` in the background, waited for `http://localhost:4001/weather` to return 200, then `node scripts/screenshot.mjs /home/tom/.claude/jobs/c1ce1627/tmp/shots-t6 /weather` (390×844 and 1280×800). Backend is down in this environment, so the page rendered in mock/offline mode as expected:

- Orange "Weather station offline. These are sample numbers — don't use them for decisions." banner shown at the top (below the header, above the panel grid).
- "Spraying now" panel leads the grid, verdict "Can't tell" (grey dot + word, not colour alone), reason "Can't tell — the station isn't reporting wind speed, gusts, rain, temperature or humidity."
- Every metric panel carries an orange "Sample data" pill in its header, and every sample value (temperature, humidity, wind, rain, pressure, solar, indoor, battery) is dotted-underlined and dimmed.
- "Outdoor, last 24 hours" panel shows "No readings in the last 24 hours." instead of drawing mock/sample lines.
- Header shows "Updated 1 s ago" and an "Offline" pill (orange, bordered, with the word — not colour alone).
- At 390px: no horizontal scrollbar, content reflows to a single column, the bottom tab bar overlaps the panel stack as expected (it's a fixed nav, not part of this page's content), and all visible text (labels, units, pill text, panel titles) is 12px or larger — smallest text observed is the `text-xs` unit/label text and the "Sample data" pill, both 12px per the design tokens; nothing smaller was used.
- Stopped the dev server afterward (`pkill -f "vite dev"`); confirmed no leftover listener on 4001.

## Files changed

- `/home/tom/gbros/farm-website/.claude/worktrees/readability-and-status/src/routes/weather/+page.svelte` (rewritten)
- `/home/tom/gbros/farm-website/.claude/worktrees/readability-and-status/src/routes/weather/weather-page.svelte.test.ts` (new)

## Self-review

`git diff --stat` on the commit: `2 files changed, 229 insertions(+), 228 deletions(-)`. Reviewed the full diff:

- No `export let`, `$:`, `<slot>`, `on:`, `use:`, `createEventDispatcher`, or `class:` — runes only (`$props`, `$state`, `$state.raw`, `$derived`, snippets).
- All internal links use `resolve()` from `$app/paths`.
- No text below 12px, no `→` appended to link text, no ALL-CAPS labels, no hover scaling (`hover:border-accent` only).
- Status words present for both the Live/Offline badge and the spray verdict (via `SPRAY_LABELS`/`SPRAY_TONES` from Task 3).
- Copy matches the spec verbatim ("Weather station offline. These are sample numbers — don't use them for decisions.", "Sample data", "Sample value", "Can't tell — the station isn't reporting …") — these come from already-built components (`OfflineBanner`, `SampleDataChip`, `SprayPanel`/`spray.ts`), not retyped here, so no risk of transcription drift.
- The page consumes exactly the interfaces listed in the brief (`Panel`, `fetchWeather`, `compassPoint` from `$lib/home-items`, `CHARTS`/`buildSeries`, `SprayPanel`, `SampleDataChip`, `OfflineBanner`, `WeatherChart`) with no new files or hard-coded values.

## Concerns

None. The brief's code and its test agreed; no changes were needed to either. No files outside the plan's allowed list (`src/routes/weather/**`) were touched.
