# Task 1 report: Type scale, 16px body and old CSS

## What I implemented

Exactly as specified in the brief:

1. Created `src/app-css.test.ts` (verbatim from the brief) asserting:
   - `body` font is `16px/1.5 ...`
   - `@theme` declares `--text-lg: 1.25rem`, `--text-xl: 1.5625rem`, `--text-2xl: 1.9375rem`
   - none of the old static-site selectors (`#app`, `#sidebar`, `#main`, `#map`, `.legend`, `label.field`) remain in `app.css`
2. Added `readFileSync(path: string | URL, encoding: 'utf8'): string` to the `declare module 'node:fs'` block in `src/lib/node-builtins.d.ts` (the project has no `@types/node`).
3. Replaced `src/app.css` verbatim with the brief's version: added the `--text-lg`/`--text-xl`/`--text-2xl` (+ line-height) tokens to `@theme`, changed `body`'s `font` shorthand from `14px/1.4` to `16px/1.5`, dropped `#app` from the `html, body, #app` selector (now just `html, body`), and removed every rule left over from the old static site (`label.field`, `.legend`/`.legend .ramp`/`.legend .ticks`, `#app`/`#sidebar`/`#sidebar .brand`/`#sidebar .brand img`/`#main`/`#map` and their `@media (max-width: 900px)` block, plus the old `/* === ... === */` / `:contentReference` comments).
4. Changed the one `text-[11px]` in `src/routes/manual/+page.svelte` (the CSV header example block, line 277) to `text-xs`.

## TDD evidence

**RED** — `npx vitest run --project server src/app-css.test.ts` (before touching `app.css`):

```
FAIL  server  src/app-css.test.ts > app.css > sets 16px body text with a 1.5 line height
FAIL  server  src/app-css.test.ts > app.css > uses the direction document's type scale
FAIL  server  src/app-css.test.ts > app.css > has no rules left from the static site
Test Files  1 failed (1)
     Tests  3 failed (3)
```
All three failed as expected: old CSS had `14px/1.4`, no `--text-lg`/`--text-xl`/`--text-2xl` tokens, and still had `#app`, `#sidebar`, `#main`, `#map`, `.legend`, `label.field`.

**GREEN** — same command after replacing `app.css`:

```
Test Files  1 passed (1)
     Tests  3 passed (3)
```

## Step 2: old-selector greps (re-run as instructed)

All three printed nothing, confirming the controller's earlier finding:

```
grep -rn 'id="app"\|id="sidebar"\|id="main"\|id="map"' src   → (no output)
grep -rn 'class="[^"]*\blegend\b' src --include=*.svelte      → (no output)
grep -rn 'class="[^"]*\bfield\b' src --include=*.svelte | grep "<label"  → (no output)
```

## Step 4 verification

`grep -rn "text-\[1[01]px\]" src/routes/manual src/routes/weather src/routes/+page.svelte` → no output (confirmed after the edit).

## Check / test results

- `npx vitest run --project server src/app-css.test.ts` → 3/3 pass.
- `npm run check` → `svelte-kit sync && svelte-check`: **309 FILES, 0 ERRORS, 0 WARNINGS**.
- `npm test` → **26 test files passed, 146 tests passed, 2 expected fail** (pre-existing `it.fails`, untouched by this task).
- ESLint baseline check: `npx eslint src` → **81 problems (81 errors, 0 warnings)** — matches the controller-recorded baseline of 81 exactly, no regression.
- `npx prettier --check` on the four touched files → all already correctly formatted (no changes needed after `--write`).

## Screenshots (Step 5)

Started `npm run dev` in the background (port 4001, backend down — expected/fine), ran:
`node scripts/screenshot.mjs /home/tom/.claude/jobs/c1ce1627/tmp/shots-type / /weather /manual /paddocks`

Output (no `HORIZONTAL SCROLL` on any page at either viewport):
```
home-390
weather-390
manual-390
paddocks-390
home-1280
weather-1280
manual-1280
paddocks-1280
```

Looked at `home-390.png`, `manual-390.png`, `weather-390.png`:
- Body text is visibly larger/more readable than the old 14px throughout.
- Headings step up clearly: page titles ("Greenhill Bros Farm", "Help", "Weather") render large and bold; section headings ("Right now", "Tools", "Outdoor", "Indoor", etc.) are a clear step down from the page title and a step up from body text — consistent with the new `text-2xl`/`text-xl`/`text-lg` scale.
- No sideways overflow or layout breakage; dark theme, cards, nav bar all intact.
- Stopped the dev server afterward (confirmed via `curl` connection-refused).

## Files changed

- `/home/tom/gbros/farm-website/.claude/worktrees/readability-and-status/src/app.css`
- `/home/tom/gbros/farm-website/.claude/worktrees/readability-and-status/src/app-css.test.ts` (new)
- `/home/tom/gbros/farm-website/.claude/worktrees/readability-and-status/src/lib/node-builtins.d.ts`
- `/home/tom/gbros/farm-website/.claude/worktrees/readability-and-status/src/routes/manual/+page.svelte`

Commit: `945c81c` — "Set 16px body text and the direction type scale; drop static-site CSS"

## Self-review

- Diffed the final commit against the brief's exact CSS/test text: matches verbatim (I copy-pasted the brief's code blocks rather than retyping).
- Confirmed only the four files listed in the brief's "Files" section were touched, all within the global-constraints "files you may touch" list.
- Confirmed `html, body, #app` → `html, body` (the `#app` removal was folded correctly into the existing selector rather than leaving a stray rule).
- Confirmed the manual page's `text-xs` (12px) satisfies the global constraint's 12px minimum text size.
- No other `text-[10px]`/`text-[11px]` instances existed outside the one in scope (grep on the broader `src/routes/manual src/routes/weather src/routes/+page.svelte` set came back empty both before and after).
- Branch was already `feat/readability-and-status` off `origin/staging` per the controller notes — no branch switch was needed.
- Did not push or open a PR (not requested for this single-task report; branch stays local per controller instructions about not pushing).

## Concerns

None. All target checks pass, no ESLint regression, no old static-site CSS remains, and the visual check confirms the new type scale renders correctly with no horizontal overflow.
