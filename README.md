# Greenhill Bros Farm — frontend

SvelteKit app (adapter-node) for the farm map, soil tests and weather dashboard. Data comes from the `gbros-api` FastAPI backend via `/api`.

## Developing

```sh
npm install
npm run dev        # http://localhost:4001, proxies /api to http://localhost:8000
```

Run the backend alongside it for real data. Without it, the weather pages fall back to mock data and other API calls return 502.

## Checks

```sh
npm run check      # svelte-check / TypeScript
npm run lint       # prettier --check + eslint
npm run format     # prettier --write
```

## Building and running

```sh
npm run build
scripts/smoke-test.sh --local   # built app vs a stub backend
npm start                       # node build; PORT defaults to 3000
```

Production runs as a Docker image built by CI from `vX.Y.Z` tags. See [deploy/README.md](deploy/README.md) for releasing, deploying and rolling back.

## Weather

`/weather` shows the latest reading from the backend's `/weather/current`. `/weather/[metric]` shows 24-hour history from `/weather`. Fields the station doesn't report are filled with mock values (`src/lib/weather.ts`), and the page shows when it's using mock data.

## Subagent-Driven Development (SDD)

When executing multi-task plans with subagent coordination:

- **Implementation plan:** `docs/superpowers/plans/` (e.g., `2026-09-25-deployment-pipeline.md`)
- **Design spec:** `docs/superpowers/specs/` (e.g., `2026-09-25-deployment-pipeline-design.md`)
- **Tooling for reduced friction:** `.superpowers/sdd-tooling/` (dispatch context generator, skill reference)
- **Handoff docs:** `docs/superpowers/handoffs/` (task resumption instructions)
- **Ledger:** `.superpowers/sdd/` (per-plan progress tracking)

Use the tooling when dispatching subagent tasks to eliminate setup questions and standardize test execution. See [CLAUDE.md](CLAUDE.md#sdd-tooling) for details.
