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

## Weather station and MQSS mock service

The weather dashboard now consumes data from a small mock MQSS service. The
service lives inside the SvelteKit app and exposes two endpoints:

- `/api/mqss/weather` – returns the full payload of the latest weather sample.
- `/api/mqss/weather/[metric]` – returns a single metric block (e.g. `outdoor`,
  `wind`).

These routes currently serve generated demo data from
`src/lib/mockWeather.ts`. In production they should be replaced with calls to
the real MQSS backend that receives weather station updates.

Each metric panel on the `/weather` page expands on hover and links to a
dedicated detail view showing 24‑hour graphs, highs and lows, and a placeholder
benchmark from the Bureau of Meteorology. The detail view includes a back button
styled the same as the home button on the maps page for a consistent UI.
