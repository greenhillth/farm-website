# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Farm management frontend (soil-test map, soil-test upload/management, weather dashboard) built with **SvelteKit 2 + Svelte 5 + Tailwind 4 + Leaflet**, using `@sveltejs/adapter-node`. It is a frontend only. All data comes from the separate FastAPI backend (`../gbros-api`), reached through `/api`.

`main` is the production branch and the only long-lived branch. Work goes on short-lived branches and into `main` by PR, and releases are `vX.Y.Z` tags on `main` (see Git workflow and Deployment). The old static-HTML version of the site is kept only as the tag `archive/static-site`. Don't port files or instructions from it.

## Commands

```sh
npm ci                 # install from the committed lockfile (Node 24, see .nvmrc)
npm run dev            # vite dev server on port 4001 (strictPort, host: true)
npm run build          # adapter-node output into build/
npm run preview        # preview build on port 4002
npm start              # node build (PORT env, adapter-node default 3000); start:400 sets PORT=400
npm run check          # svelte-kit sync + svelte-check (type checking)
npm run lint           # prettier --check + eslint
npm run format         # prettier --write
npm test               # vitest: every test project, once
npm run test:watch     # vitest in watch mode
npm run test:coverage  # tests plus v8 coverage into coverage/ (html, lcov)
```

Unit and component tests use Vitest (`npm test`), configured in `vite.config.ts` as two projects. `server` runs `src/**/*.test.ts` in node with `TZ=Australia/Melbourne` (the farm's time zone; CI runners use UTC, which hides local-time date bugs). `client` runs `src/**/*.svelte.test.ts` in headless Chromium (Vitest browser mode, rendered with `vitest-browser-svelte`); run `npx playwright install chromium` once before the first run. In component tests, give images and other assets `data:` URIs: a request for a real path falls through to SvelteKit's dev middleware and logs a `cookie` CommonJS error. Tests marked `it.fails` pin known bugs: when you fix one, remove `.fails`. `scripts/smoke-test.sh --local` (after `npm run build`) starts the built app against a stub backend (`scripts/stub-backend.mjs`) and checks the pages, `/api` proxying, CSRF and the upload size limit. `--image <ref>` does the same for a Docker image. `deploy/test/run-tests.sh` tests `deploy/deploy.sh` against a throwaway local registry (needs Docker, about a minute), and `scripts/test/check-release.test.sh` tests the release-tag check. CI runs all of these. Check UI changes in a browser as well.

`npm run lint` has a backlog of ESLint errors (mostly `no-explicit-any`, missing `{#each}` keys, and `href`s not wrapped in `resolve()`). Don't let new code add to it.

## Backend / API wiring

Every backend call goes through a relative `/api/...` path. The full list of endpoints is in `src/lib/config.ts` (`CONFIG.backend`). Always add new endpoints there rather than hard-coding URLs. `VITE_API_BASE` (build-time) can override the `/api` prefix.

Three layers forward `/api` to the backend, and which one applies depends on how the app is running:

1. **Dev**: `vite.config.ts` `server.proxy` sends `/api` to `http://localhost:8000` before SvelteKit sees the request.
2. **Production (node build), browser requests**: `src/routes/api/[...path]/+server.ts` is a catch-all proxy for all methods. It forwards `/api/<path>?<query>` unchanged to `BACKEND_ORIGIN` (default `http://localhost:${BACKEND_PORT ?? 8000}`), so `BACKEND_ORIGIN` is a bare origin with no `/api` suffix. It returns 502 if the backend is unreachable. Request bodies are capped by adapter-node's `BODY_SIZE_LIMIT` (the default 512K is too small for CSV imports, so production sets 25M).
3. **Server-side `fetch` in load functions**: `src/hooks.server.ts` `handleFetch` rewrites same-origin `/api/*` to `BACKEND_ORIGIN` (default `http://127.0.0.1:8000`), keeping the full path, and adds `x-forwarded-*` headers.

`BACKEND_ORIGIN` and `BACKEND_PORT` are runtime env vars read through `$env/dynamic/private`.

Backend API contracts that the frontend expects are written up in the root markdown files: `endpoints.md` (manual/import upload), `backend-csv-import.md` and `progression-bar-req.md` (async CSV import job + progress polling), and `soil-edit.md` (bulk delete). `deployment_plan.md` is an early proposal that has been superseded. The real deployment is described in `deploy/README.md` and `docs/superpowers/specs/2026-09-25-deployment-pipeline-design.md`.

## Code layout

- `src/lib/config.ts`: API endpoints, map tile source, and `soilMetrics` (id, label, unit, optimal range, colour-scale min/max). The metric definitions drive the map legend and colouring.
- `src/routes/map/`: Leaflet map with SSR turned off (`+page.ts` sets `ssr = false`, and Leaflet also needs `ssr.noExternal`/`optimizeDeps` in `vite.config.ts`). It fetches farm GeoJSON, title boundaries and the latest soil tests, then colours paddocks on a viridis scale. Pure helpers live in `map/helpers.ts`, and layer builders and styles in `src/lib/layers.ts`.
- `src/routes/soiltests/`: large single page (about 2,100 lines) for listing, manual entry, CSV import with job-status polling, and bulk delete. Shared types, CSV header requirements and fetch helpers are in `src/lib/soil-tests/`. Import progress is broadcast as a `farm:csv-import-progress` DOM event (`progress.ts`).
- `src/routes/weather/`: dashboard and per-metric detail view (`[metric]`). `src/lib/weather.ts` → `src/lib/providers/backend.ts` maps the backend's `/weather/current` reading onto the UI `Weather` shape and fills any missing fields from `getMockWeather()`. If the backend is unreachable it returns `connected: false, source: 'mock'`. `providers/ecowitt.ts` (direct Ecowitt API) is currently unused.
- `src/lib/ui.ts` and `$` in `src/lib/utils.ts` are DOM-manipulation helpers left over from the pre-Svelte version.

## Conventions

- Prettier: tabs, single quotes, no trailing commas, width 100, with the Svelte and Tailwind class-sorting plugins.
- Svelte 5 runes (`$props`, `$state`) are used in newer components (`+layout.svelte`, `src/lib/components/`). Some pages, like `weather/`, still use Svelte 4 `export let`. Use runes for new code.
- Tailwind 4 runs through `@tailwindcss/vite` and has no JS config. The custom palette (`bg`, `panel`, `text`, `muted`, `border`, `accent`) is an `@theme` block in `src/app.css` that reads the `:root` RGB-triplet vars. Change colours there, in one place.

## Editor (VS Code)

`.vscode/` holds the shared editor setup: `settings.json`, `extensions.json` (recommendations), `launch.json` and `tasks.json`. Everything else in `.vscode/` is git-ignored, so personal settings belong in your user settings. The Vitest extension (recommended) doesn't activate yet, so the Testing view is empty; this is a TODO in `README.md`. Run the tests from the terminal. `launch.json` debugs the Vite dev server (it opens Chrome on `:4001` once Vite is ready) or the built app. `tasks.json` runs svelte-check (errors land in the Problems panel), ESLint, the smoke, deploy and release-check tests, and the Docker image build and smoke test.

## Git workflow

The human guide is `docs/git-workflow.md`. GitHub rulesets enforce the following, so work with them rather than around them:

- `main` accepts changes only through PRs. The checks `checks`, `container` and `deploy-tests` must pass, and merges must be merge commits. Nothing is pushed to `main` directly, and nothing force-pushes or deletes it.
- Pushed `v*` tags can't be moved or deleted. A wrong release is fixed with the next version, never a re-tag.
- There is no `development` branch. Don't recreate it.

Rules for agents:

- Do file-changing work in a worktree under `.claude/worktrees/`, never by switching branches in the main checkout. Tom's VS Code uses the main checkout and can switch its branch mid-task. Run `npm ci` in a new worktree first. If it fails with `Tsconfig not found .../.svelte-kit/tsconfig.json`, run `npx svelte-kit sync` in the main checkout. See `docs/branches-and-worktrees.md`.
- Start every change on a new branch from an up-to-date `origin/main`. Prefixes: `feat/`, `fix/`, `docs/`, `chore/`, `release/vX.Y.Z`. One topic per branch and PR. Rename Claude's default `worktree-<name>` branch (`git branch -m`) before pushing.
- Before pushing, run what CI runs for the files you touched: `npm run check`, `npm test`, `npx prettier --check .`, plus `npm run build` and `scripts/smoke-test.sh --local` for app changes. Don't push while any of them fails.
- Pushing your own branch and opening a PR is fine when Tom has asked for the change. Merging a PR, pushing a tag and anything on the server need Tom's explicit go-ahead in the current conversation.
- After a merge, clean up locally: switch to `main`, pull, `git branch -d <branch>`, `git fetch --prune`. GitHub deletes the merged remote branch.

## Deployment

A beginner walkthrough of CI, releases and deploying is in `docs/deploying.md`.

Production runs the Docker image `ghcr.io/greenhillth/farm-website:<tag>` on the on-site Ubuntu server behind cloudflared. The runbook is `deploy/README.md`.

- Releases are `vX.Y.Z` tags on `main` whose `package.json` `version` matches (`scripts/check-release.sh`). The `release` workflow pushes the image and creates a GitHub Release. Merging to `main` never deploys.
- Tom deploys on the server with `/opt/farm-website/deploy.sh vX.Y.Z`, which health-checks and rolls back automatically. `deploy/test/run-tests.sh` tests it locally (needs Docker).
- **Never** push tags, force-push, change branch protection or GHCR settings, or run anything on the server unless Tom explicitly asks for that step in the current conversation.
- Runtime config (`ORIGIN`, `BACKEND_ORIGIN`, `BODY_SIZE_LIMIT`) belongs in the server's `.env`, never in the image or the repo.
- Before pushing a release tag, create it locally and run `scripts/check-release.sh vX.Y.Z origin/main`. A pushed tag can't be undone.

## Dependencies

- TypeScript is pinned to `~6.0`. SvelteKit, svelte-check and typescript-eslint don't support TS 7 yet, so don't bump it until their peer ranges allow it.
- `overrides.cookie` in `package.json` patches a low-severity advisory in SvelteKit's `cookie` dependency. **Never run `npm audit fix --force`.** It "fixes" that advisory by downgrading `@sveltejs/kit` to 0.0.x.
- Vite 8 uses Rolldown, not esbuild/Rollup. `optimizeDeps` / `ssr.noExternal` for Leaflet are still needed.
- `build/` and `.svelte-kit/` are gitignored build output and aren't tracked. `package-lock.json` is committed: change dependencies with `npm install <pkg>` and commit the lockfile.
