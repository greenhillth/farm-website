# Task 4 report: Sample data chip, spray panel and offline banner

## What was implemented

Created exactly the five files the brief specifies, with code copied verbatim from Steps 2–4:

- `src/lib/components/SampleDataChip.svelte` — the "Sample data" pill (no props).
- `src/lib/components/SprayPanel.svelte` — `Panel` titled "Spraying now", showing the verdict word (via `SPRAY_LABELS`/`SPRAY_TONES` from Task 3's `src/lib/spray.ts`) and one `<li>` per reason.
- `src/lib/components/SprayPanel.svelte.test.ts` — component test (verbatim from brief).
- `src/routes/weather/components/OfflineBanner.svelte` — renders the offline warning only when `source === 'mock'`.
- `src/routes/weather/components/OfflineBanner.svelte.test.ts` — component test (verbatim from brief).

`src/routes/weather/components/` did not exist yet; created it as part of writing the first file there.

None of the three components are wired into any page yet — the brief's interface section only asks for the components and their tests, not integration into `src/routes/weather/+page.svelte` or the home page. That wiring is presumably a later task (controller notes mention `mockFields` wiring landing after Task 2).

## TDD evidence

**RED** — wrote both test files first, then ran:

```
npx vitest run --project client src/lib/components/SprayPanel.svelte.test.ts src/routes/weather/components/OfflineBanner.svelte.test.ts
```

Result: both suites failed to import (`Failed to resolve import "./SprayPanel.svelte"` / `"./OfflineBanner.svelte"` — Does the file exist?), 0 tests collected. Confirmed failure was "component doesn't exist yet," not a typo in the test.

**GREEN** — after creating the three components verbatim from the brief, re-ran the same command:

```
Test Files  2 passed (2)
     Tests  6 passed (6)
```

## Autofixer results

Ran `mcp__plugin_svelte_svelte__svelte-autofixer` (desired_svelte_version: 5) on all three components.

- `SampleDataChip.svelte`: clean on first pass (`issues: [], suggestions: []`).
- `SprayPanel.svelte` and `OfflineBanner.svelte`: my first autofixer call used HTML entities (`&lt;`/`&gt;`) for angle brackets by mistake, which the tool correctly flagged as a parse error (`Expected token }`). Re-ran with literal markup — both came back clean (`issues: [], suggestions: []`, `require_another_tool_call_after_fixing: false`).

The svelte MCP server was available throughout; no fallback was needed.

## Check / test / lint results

- `npx eslint src 2>&1 | tail -5` before any edit: **78 errors** (baseline). After the change, identical: **78 errors, 0 warnings** — no new ESLint errors added.
- `npx prettier --write` on the five touched files: all reported "(unchanged)" — already correctly formatted (tabs, single quotes, width 100).
- `npm run check`: `COMPLETED 317 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS`.
- `npm test` (full suite, once): `30 passed (30)` test files, `175 passed | 2 expected fail (177)` tests. The 2 expected fails are pre-existing `it.fails` pins unrelated to this task.

## Files changed

- `src/lib/components/SampleDataChip.svelte` (new, 6 lines)
- `src/lib/components/SprayPanel.svelte` (new, 20 lines)
- `src/lib/components/SprayPanel.svelte.test.ts` (new, 33 lines)
- `src/routes/weather/components/OfflineBanner.svelte` (new, 12 lines)
- `src/routes/weather/components/OfflineBanner.svelte.test.ts` (new, 22 lines)

Commit: `d608c32` — "Add the sample data chip, spray panel and offline banner" (+ `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), 5 files changed, 93 insertions, no other files touched.

## Self-review

- Diff matches the brief's Steps 2–4 code byte-for-byte (checked with `git show HEAD`).
- Only the five intended files are staged/committed; `git status` is clean afterward.
- Runes-only: no `export let`, `$:`, `<slot>`, `on:`, `use:`, `createEventDispatcher` or `class:` in any of the three components.
- Copy matches the global constraints verbatim, including the curly apostrophe/em dash: "Weather station offline.", "These are sample numbers — don’t use them for decisions.", "Sample data", "Can’t tell — the station isn’t reporting …" (from Task 3's `spray.ts`, consumed not re-typed).
- Status is never colour alone: `SPRAY_LABELS` provides a word for every verdict including `unknown` ("Can’t tell"), and `SprayPanel` renders that word next to a coloured dot.
- Text sizes stay at or above the 12px floor (`text-xs` is the smallest used, on the chip). No `→`, no ALL-CAPS labels, no hover scaling introduced.
- `SprayPanel` correctly imports `SprayResult`/`SPRAY_LABELS`/`SPRAY_TONES` from `$lib/spray` (Task 3) and composes `Panel` (existing) rather than duplicating panel chrome.
- `OfflineBanner` uses `role="status"` on the visible banner, which is reasonable for an ARIA live-region-style offline notice, and renders nothing (not even an empty node) when `source === 'ecowitt'`, per the second test.

## Concerns

- None blocking. The three components are unwired (no consumer yet) — expected, since the brief's Task 4 scope stops at "create the components and their tests," and integration into `+page.svelte` / the home page's Spraying tile is called out elsewhere in the plan (global-constraints' allowed-files list includes `src/routes/+page.svelte` and `src/routes/weather/**` for that later work).
- `SampleDataChip.svelte` has no test file (the brief doesn't ask for one — it's a static, prop-less pill) and is likewise not yet consumed anywhere. Same expectation as above: wiring is out of scope here.
