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
npm start          # node build; PORT defaults to 3000 (npm run start:400 uses 400)
npm run preview    # vite preview on port 4002
```

In production the `/api/*` route proxies to `BACKEND_ORIGIN` (default `http://localhost:${BACKEND_PORT:-8000}`). The site is exposed publicly through Cloudflare Tunnel (`farm.greenhill.net.au`).

## Weather

`/weather` shows the latest reading from the backend's `/weather/current`. `/weather/[metric]` shows 24-hour history from `/weather`. Fields the station doesn't report are filled with mock values (`src/lib/weather.ts`), and the page shows when it's using mock data.
