# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Docker

A multi-stage `Dockerfile` is included for running the production build behind Cloudflared.

Build the image:

```sh
docker build -t website-frontend .
```

Run the container and expose port 4000 to the host:

```sh
docker run --rm -p 4000:4000 website-frontend
```

The image runs `npm run build` during the build stage and starts the compiled Node server (`node build`) with `HOST=0.0.0.0` and `PORT=4000`.

If you need different ports, override `PORT` at runtime, e.g. `docker run -e PORT=8080 -p 8080:8080 website-frontend`.


## Ports

Local scripts remain on port 400 for backwards compatibility:

- Dev: `npm run dev:400` (equivalent to `vite dev --host --port 400 --strictPort`)
- Preview: `npm run preview:400`
- Production Node run: `npm run start:400` (sets `PORT=400` for the Node server)

The Docker container publishes port 4000 by default and sets `HOST=0.0.0.0`. When running it locally, map the port with `-p 4000:4000`.

Note: Ports 400 and 4000 are unprivileged on Unix, so they typically do not require elevated permissions.

## Cloudflared (Argo Tunnel)

The frontend is ready to work with Cloudflared. Cloudflared should forward traffic to `http://localhost:4000` so that requests land on the Docker container.

Options:

- Quick Tunnel (no config):
  - `cloudflared tunnel --url http://localhost:4000`

- Named Tunnel (config file):
  - A template is provided at `cloudflared-config/config.yml`.
  - Set your `tunnel` ID and `credentials-file`, and change the `hostname`.
  - Run with: `cloudflared --config cloudflared-config/config.yml tunnel run`

If you prefer to store the config in the standard location, move the file to `cloudflared/config.yml` and ensure Cloudflared has access. Note that the existing `cloudflared/` directory in this repo may be owned by root on your system; adjust ownership or point Cloudflared to `cloudflared-config/config.yml` directly.

## Weather station and MQSS mock service

The weather dashboard now consumes data from a small mock MQSS service. The
service lives inside the SvelteKit app and exposes two endpoints:

- `/svc/weather` – returns the full payload of the latest weather sample (UI shape).
- `/svc/weather/[metric]` – returns a single metric block (e.g. `outdoor`, `wind`).

These routes currently serve generated demo data from
`src/lib/mockWeather.ts`. In production they should be replaced with calls to
the real MQSS backend that receives weather station updates.

Each metric panel on the `/weather` page expands on hover and links to a
dedicated detail view showing 24‑hour graphs, highs and lows, and a placeholder
benchmark from the Bureau of Meteorology. The detail view includes a back button
styled the same as the home button on the maps page for a consistent UI.
