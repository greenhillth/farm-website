# Readability and plain-language status — farm-website

Date: 2026-09-27 · Status: draft design, awaiting Tom's review · UX project 4 of 4 (D) · Depends on project 1 (app shell)

## Goal

Text is readable outdoors on a phone, nobody mistakes sample weather data for a real reading, and the weather page answers "can we spray right now?" in words.

## Context

- Body text is 14px (`src/app.css`), and many labels use `text-[10px]`/`text-[11px]`.
- `src/app.css` still carries rules from the old static site (`#app` grid, `#sidebar`, `#map`, `.legend`, `label.field`) that no current page uses.
- The weather provider (`src/lib/providers/backend.ts`) fills every field the station doesn't report from `getMockWeather()`. Indoor readings, weekly/monthly/yearly rain, battery, moon and sunrise/sunset are always mock today. Only a small "Mock" chip in the header shows it, and only when the whole reading is mock.
- The "Outdoor — Daily" chart on `/weather` is a hand-drawn SVG whose axis labels are unreadable at 390px.
- The weather pages are in Svelte 4 legacy mode (`export let`, `$:`).

## Decisions

| Decision              | Choice                                                                                                                                                                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base text size        | 16px body (was 14px). Line height 1.5.                                                                                                                                                                                                                                  |
| Smallest text         | 12px. Arbitrary sizes below `text-xs` are removed in files this project owns; projects 2 and 3 apply the same rule to theirs.                                                                                                                                           |
| Tap targets           | At least 44×44px for links and buttons in files this project owns.                                                                                                                                                                                                      |
| Old CSS               | Delete the unused static-site rules from `src/app.css` (checked with a grep for each selector before deleting).                                                                                                                                                         |
| Mock data, whole page | When `source === 'mock'` (backend unreachable or no reading), an amber banner at the top of `/weather` and `/weather/[metric]`: "Weather station offline. These are sample numbers — don't use them for decisions."                                                     |
| Mock data, per field  | The provider reports which fields came from mock data. Each panel containing any mocked value shows a "Sample data" chip, and each mocked value is dimmed with a dotted underline and a "Sample value" title.                                                           |
| Spray conditions      | A new first panel on `/weather`, "Spraying now": **Good**, **Marginal** or **Not suitable**, with one line per reason. Also shown as a tile in the home "At a glance" strip.                                                                                            |
| Spray inputs          | Wind speed (km/h), gust (km/h), rain in the last hour (mm), and Delta T (°C) computed from temperature and humidity. If any input is mock, the panel says "Can't tell — the station isn't reporting …" instead of a verdict.                                            |
| Thresholds            | In `CONFIG.spray`, defaults from common Australian label guidance: wind 3–15 km/h good, 15–20 marginal, above 20 or below 3 not suitable (below 3 = inversion risk); Delta T 2–8 good, 8–10 marginal, otherwise not suitable; any rain in the last hour = not suitable. |
| Daily chart           | Redrawn with a viewBox that suits phones (taller aspect below `md`), 12px axis labels, hourly ticks every 6h, a legend with coloured swatches, and values in a visually hidden table for screen readers.                                                                |
| Runes                 | `/weather` and `/weather/[metric]` move to runes as part of this work.                                                                                                                                                                                                  |

## Architecture

- `src/lib/weather.ts`: `WeatherResult` gains `mockFields: WeatherField[]`, where `WeatherField` is a dotted path union (`'outdoor.temp'`, `'rain.weekly'`, `'wind.speed'`…). When `source === 'mock'` every field is listed.
- `src/lib/providers/backend.ts`: `mapReadingToWeather` records each field it fills from `getMockWeather()`.
- `src/lib/spray.ts` (new, pure):
  - `deltaT(tempC, rhPct)`: dry bulb minus wet bulb, wet bulb by the Stull (2011) formula.
  - `sprayConditions(weather, mockFields, thresholds) → { verdict: 'good' | 'marginal' | 'not-suitable' | 'unknown'; reasons: string[] }`. The verdict is the worst of the individual checks. Speeds convert from m/s.
- `src/lib/components/SampleDataChip.svelte` and `src/lib/components/SprayPanel.svelte` (new).
- `src/lib/config.ts`: add `spray` thresholds.
- Home strip (project 1's `+page.svelte`) gets a Spraying tile using `sprayConditions`.

## Error handling

- Temperature or humidity mocked → Delta T unknown → verdict `unknown` with the missing inputs named.
- Humidity 0 or out of range → treated as unknown.

## Testing

- `spray.test.ts`: `deltaT` against published reference values (e.g. 25°C / 50% ≈ 7.0), each threshold edge (3, 15, 20 km/h; Delta T 2, 8, 10), gusts, rain, worst-of combination, mock inputs → `unknown`.
- `src/lib/providers/backend.test.ts` (new): a reading missing humidity lists `outdoor.humidity` and `outdoor.dewPoint` and `outdoor.vpd` in `mockFields`; a full reading lists only the always-mock fields; unreachable backend lists everything.
- Component tests: banner shows for `source: 'mock'` only; chip appears on a panel with one mocked field; `SprayPanel` renders each verdict and the `unknown` message.
- Browser check at 390×844 with backend down (banner), with backend up (chips only on mocked panels), and the chart readable without zooming.

## Files owned

`src/app.css`, `src/lib/weather.ts`, `src/lib/providers/backend.ts`, `src/lib/spray.ts` (new), `src/lib/config.ts` (`spray` section only), `src/routes/weather/**`, `src/lib/components/SampleDataChip.svelte`, `src/lib/components/SprayPanel.svelte`, the Spraying tile in `src/routes/+page.svelte`, `src/routes/manual/+page.svelte` (text sizes only).

## Out of scope

Weather forecasts, alerts or notifications, light theme, changing thresholds from the UI.
