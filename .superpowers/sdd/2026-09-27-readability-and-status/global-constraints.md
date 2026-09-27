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

