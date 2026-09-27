# Final-review fix wave (branch 5eeccd1..d83b700)

Five findings to fix, all ruled by the controller (see progress.md, lines starting "Final: Ruling:"). Copy uses the curly apostrophe ’.

## C1 (Critical): the spray verdict ignores how old the reading is
The backend's `/api/weather/current` returns the newest row in the DB, however old it is (`../gbros-api/farmapp/routers/weather.py`). If ingest stops, the provider still reports `source: 'ecowitt'`, `connected: true` and no extra mockFields, so /weather shows "Live", no banner, and "Spraying now: Good" based on yesterday's data. The home tile does the same.

Fix:
- `src/lib/config.ts`: add `maxReadingAgeMinutes: 20` to `CONFIG.spray`. Add it to `SprayThresholds` in `src/lib/spray.ts`.
- `sprayConditions(weather, mockFields, thresholds, now = Date.now())`: after the mockFields check and before the Delta T check, if `now - Date.parse(weather.updatedAt)` is more than `maxReadingAgeMinutes`, return `unknown(...)`. Use `Can’t tell — the last reading is ${age} old.`, where age is "25 min" under an hour and "3 h" otherwise (round to whole units). If `updatedAt` doesn't parse, treat the reading as too old: `Can’t tell — the reading has no time.`
- Tests in `src/lib/spray.test.ts`: a reading exactly 20 min old still gets a verdict; 21 min old is "unknown" with the "21 min old" text; 3 h old reads "3 h old". Existing tests must pass a `now` that makes their fixture fresh (for example `Date.parse(calm.updatedAt)`), or set `updatedAt` on the fixture.
- `src/routes/weather/+page.svelte`: the status pill shows "Live" (accent) only when connected and the reading is no older than the limit. A connected but too-old reading shows "Stale" (warn). Disconnected still shows "Offline". Add a test to `weather-page.svelte.test.ts`: a live source with `updatedAt` 2 h ago shows "Stale" and "Can’t tell".
- `src/routes/+page.svelte` (home): the spray tile gets this behaviour through `sprayConditions`. Pass `Date.now()` (or leave the default). Check that the existing home tests still pass; their fixture `getMockWeather()` sets `updatedAt` to now.
- Check every caller of `sprayConditions`.

## C2 (Critical): the history endpoint is wrong, and it's truncated
`fetchWeatherHistory` (`src/lib/weather.ts`) calls `${CONFIG.backend.weather}?from=&to=`, which is `/api/weather?...`. The backend only has `/api/weather/history` (plus `/current`, `/stats`, `/healthz`), so in production every chart and every detail table says "No readings". The history endpoint also defaults to `limit=1000` in ascending order, while ingest polls every 60 s, which is 1,440 rows a day.

Fix:
- `src/lib/config.ts` `CONFIG.backend`: add `weatherHistory: \`${apiBase}/weather/history\`` (follow the file's existing pattern). Grep for other users of `CONFIG.backend.weather`. If nothing else uses it, remove it; otherwise keep it.
- `fetchWeatherHistory`: request `${CONFIG.backend.weatherHistory}?from=${from}&to=${to}&limit=2000&_ts=...`.
- Update every test stub that matches `/api/weather?`: `src/routes/weather/load.test.ts`, and grep the rest of `src` for `'/api/weather?'`. Add or adjust one assertion so the load test proves the history URL starts with `/api/weather/history?` and includes `limit=2000`.
- Check whether `scripts/stub-backend.mjs` needs anything for the smoke test. It probably echoes paths; leave it alone unless the smoke test fails.

## I3 (Important): the /weather poll (`src/routes/weather/+page.svelte`)
- When `current.source === 'mock'`, don't show "Updated N s ago", because the mock `updatedAt` is always now. Show nothing there; the Offline pill and banner already explain.
- Skip a poll tick while a previous `fetchWeather()` is still in flight, using an `inFlight` flag, so slow responses can't overlap or resolve out of order.
- Reset the poll result when the load data changes. The idiomatic Svelte 5 way is an overridable derived: `let fresh = $derived<WeatherResult | null>((data, null));` and then assign `fresh = …` in the poll. Check with the Svelte docs or autofixer that this form is supported in the installed Svelte version, and fall back to an `$effect.pre` reset if it isn't.

## I4 (Important): home tile chips cover fewer fields than the tiles show (`src/routes/+page.svelte`)
Each tile's chip must check every field that tile displays. Read the tile markup and list them. For example, wind covers `wind.speed`, `wind.gust` and `wind.dir` if shown; rain covers `rain.daily` and `rain.hourly` if shown; temperature covers `outdoor.temp` plus any other field the tile displays. Use a small `anySample(fields)` helper like the dashboard's. Keep the existing test "labels only the tile whose reading is sample data" passing. Add one test: live data with only `rain.hourly` mocked chips the rain tile, if the rain tile shows the hourly value.

## I5 (Important): the wind units on /weather/wind (`src/routes/weather/[metric]/+page.svelte`)
The summaries and chart use km/h, but the "Recent readings" table shows `Wind (m/s)` and `Gust (m/s)`. Show both columns in km/h (value × 3.6, one decimal), with headings `Wind (km/h)` and `Gust (km/h)`. Add or adjust an assertion in `metric-page.svelte.test.ts` that the wind table's first data row shows the km/h value. The history fixture has 5 m/s, which is 18.0 km/h.

## Out of scope (don't do)
Minors 6–10 from the final review, the gust threshold, and the deferred minors in progress.md.
