# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Farm management frontend (soil-test map, soil-test upload/management, weather dashboard) built with **SvelteKit 2 + Svelte 5 + Tailwind 4 + Leaflet**, using `@sveltejs/adapter-node`. It is a frontend only. All data comes from the separate FastAPI backend (`../gbros-api`), reached through `/api`.

`development` is the branch that matches production. `main` is out of date and contains an older, unrelated static-HTML version of the site. Don't port files or instructions from `main`.

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
```

There's no unit test suite. `scripts/smoke-test.sh --local` (after `npm run build`) starts the built app against a stub backend (`scripts/stub-backend.mjs`) and checks the pages, `/api` proxying, CSRF and the upload size limit. `--image <ref>` does the same for a Docker image. Check UI changes in a browser as well.

`npm run lint` has a backlog of ESLint errors (mostly `no-explicit-any`, missing `{#each}` keys, and `href`s not wrapped in `resolve()`). Don't let new code add to it.

## Backend / API wiring

Every backend call goes through a relative `/api/...` path. The full list of endpoints is in `src/lib/config.ts` (`CONFIG.backend`). Always add new endpoints there rather than hard-coding URLs. `VITE_API_BASE` (build-time) can override the `/api` prefix.

Three layers forward `/api` to the backend, and which one applies depends on how the app is running:

1. **Dev**: `vite.config.ts` `server.proxy` sends `/api` to `http://localhost:8000` before SvelteKit sees the request.
2. **Production (node build), browser requests**: `src/routes/api/[...path]/+server.ts` is a catch-all proxy for all methods. It forwards `/api/<path>?<query>` unchanged to `BACKEND_ORIGIN` (default `http://localhost:${BACKEND_PORT ?? 8000}`), so `BACKEND_ORIGIN` is a bare origin with no `/api` suffix. It returns 502 if the backend is unreachable. Request bodies are capped by adapter-node's `BODY_SIZE_LIMIT` (the default 512K is too small for CSV imports, so production sets 25M).
3. **Server-side `fetch` in load functions**: `src/hooks.server.ts` `handleFetch` rewrites same-origin `/api/*` to `BACKEND_ORIGIN` (default `http://127.0.0.1:8000`), keeping the full path, and adds `x-forwarded-*` headers.

`BACKEND_ORIGIN` and `BACKEND_PORT` are runtime env vars read through `$env/dynamic/private`.

Backend API contracts that the frontend expects are written up in the root markdown files: `endpoints.md` (manual/import upload), `backend-csv-import.md` and `progression-bar-req.md` (async CSV import job + progress polling), and `soil-edit.md` (bulk delete). `deployment_plan.md` is a proposal, not a record of the current deployment.

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

## Dependencies

- TypeScript is pinned to `~6.0`. SvelteKit, svelte-check and typescript-eslint don't support TS 7 yet, so don't bump it until their peer ranges allow it.
- `overrides.cookie` in `package.json` patches a low-severity advisory in SvelteKit's `cookie` dependency. **Never run `npm audit fix --force`.** It "fixes" that advisory by downgrading `@sveltejs/kit` to 0.0.x.
- Vite 8 uses Rolldown, not esbuild/Rollup. `optimizeDeps` / `ssr.noExternal` for Leaflet are still needed.
- `build/` and `.svelte-kit/` are gitignored build output and aren't tracked. `package-lock.json` is committed: change dependencies with `npm install <pkg>` and commit the lockfile.
