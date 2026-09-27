## Global Constraints

- Work only in your own worktree under `.claude/worktrees/`. Never edit or switch branches in the main checkout (`/home/tom/gbros/farm-website`).
- Setup: run `npm ci` in the worktree. If it fails with `Tsconfig not found .../.svelte-kit/tsconfig.json`, run `npx svelte-kit sync` in the main checkout and retry. Run `npx playwright install chromium` if browser tests say Chromium is missing.
- Before your first commit, move off the `worktree-<name>` branch: `git fetch origin`, `git switch --no-track -c feat/soil-tests-ux origin/staging`, then `git branch -d <the worktree-… branch>`.
- Before changing anything, record the ESLint baseline: `npx eslint src 2>&1 | tail -3`. At the end, the error count must be less than or equal to it.
- Runes only in new or rewritten Svelte code: no `export let`, `$:`, `<slot>`, `on:`, `use:`, `createEventDispatcher`, `class:` or `$app/stores`.
- Behaviour of listing, manual entry, bulk delete and job polling is preserved (same endpoints, payloads and messages unless this plan changes them).
- Internal links use `resolve()`; static files use `asset()` (both from `$app/paths`).
- The shell renders the app's only `<main>`. The page has exactly one `<h1>`.
- Smallest text is 12px (`text-xs`); no `text-[10px]`/`text-[11px]`. Controls are at least 44px tall (`min-h-11`). No `→` appended to link text, no ALL-CAPS labels. Status is shown with a word or icon as well as colour.
- Copy: buttons are verbs and an action keeps its name through the flow ("Import tests" → "Importing…" → "Imported 48 tests"). Errors say what happened and what to do.
- In component tests, `$app/paths` is mocked: `vi.mock('$app/paths', () => ({ resolve: (path: string) => path, asset: (path: string) => path }))`. Tests of components with icon-only buttons import `src/app.css` (relative path), or clicks miss unsized SVGs.
- Prettier: tabs, single quotes, no trailing commas, width 100. Run `npx prettier --write` on the files you touch.
- Files you may touch: `src/routes/soiltests/**` and `src/lib/soil-tests/**`. UX 2 owns the map, UX 4 owns `src/app.css`, `src/lib/config.ts`, weather and the home page. Don't touch them.
- Before pushing: `npm run check`, `npm test`, `npx prettier --check .`, `npm run build`, `scripts/smoke-test.sh --local` must all pass.
- Push the branch and open a PR into `staging` (`--base staging`) that says `Closes #17`. Don't merge it.

## Review Focus

1. The lab's file uses Excel date numbers (`45888`), as `static/samples/soil-tests.csv` does → accepted as dates, not blocked (Task 2 test).
2. A CSV saved by Excel with a UTF-8 BOM and CRLF line endings, or with a quoted field containing a comma or a newline → headers and cells come through intact (Task 1 tests).
3. Metric cells that are blank, `NA`, `n/a`, `null` or `1,234` → not errors, because the backend accepts them (Task 2 test).
4. The import job disappears while polling (404/410) or the upload is refused with a FastAPI `{"detail": "…"}` body → the Importing step shows that message with "Back to check", and polling stops (Task 4 tests).
5. `/soiltests?page=99` or a filter that matches nothing → the page number clamps to the last page, or "No tests match these filters." with a Clear filters button, never an empty table (Task 3 and Task 8 tests).
