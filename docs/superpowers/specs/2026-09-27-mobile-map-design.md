# Map on phones — farm-website

Date: 2026-09-27 · Status: draft design, awaiting Tom's review · UX project 2 of 4 (A) · Depends on project 1 (app shell)

## Goal

On a phone in a paddock, opening the map shows the map. From there one tap answers "which paddock am I in, and how is its soil?", and one more switches the soil metric. Desktop keeps its sidebar.

## Context

- At 390×844 the control sidebar (`w-80`, open by default) covers about 80% of the screen on load. The map is visible only after tapping a small `‹` button.
- Paddock details exist only as Leaflet hover tooltips, which don't work well on touch.
- There's no paddock search on the map, and `/paddocks`' "View on map" link uses a `#name` hash the map ignores.
- `src/routes/map/+page.svelte` is 1,100 lines in Svelte 4 legacy mode (`$:`, `on:`, `$page` store). Adding to it as-is would make it worse, so this project splits it and moves it to runes.
- Paddock geometry helpers (ring area, centroid) live inside `src/routes/paddocks/+page.svelte`.
- Soil metric definitions, units and optimal ranges are in `CONFIG.soilMetrics`.

## Decisions

| Decision              | Choice                                                                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone breakpoint      | Below `md` (768px) uses the phone layout, detected with `MediaQuery` from `svelte/reactivity`.                                                                                                                   |
| Controls on phones    | Sidebar never shows. A horizontally scrolling row of metric chips sits at the top of the map. A "Layers" button opens a bottom sheet with base map, display toggles, title boundaries and reset view.            |
| Controls on desktop   | Sidebar as today, open by default, same sections, minus Home/quick links (removed in project 1).                                                                                                                 |
| Legend on phones      | A compact bar at the bottom of the map (above the tab bar): gradient, min/max, optimal band, "N of M in optimal range". Tap expands it. Tooltips on the legend become tap-to-show.                               |
| Paddock details       | Tapping (or clicking) a paddock selects it: outline highlighted, `PaddockSheet` opens. Bottom sheet on phones, floating card at bottom-right on desktop. Hover tooltips stay on desktop only.                    |
| Sheet contents        | Name and ID, area (ha), latest sample date and sample name, then every metric with value, unit and a status (Low / Optimal / High / No data), and "See soil tests →" linking `/soiltests?paddock=<id>`.          |
| Locate me             | A round button above the zoom control. Uses `navigator.geolocation.watchPosition` (high accuracy). Shows a dot and accuracy circle, centres once, and selects the paddock containing the position.               |
| Outside every paddock | Toast: "You're not inside a mapped paddock." The dot stays.                                                                                                                                                      |
| Geolocation errors    | Denied: "Location is turned off for this site." Unavailable/timeout: "Couldn't find your location." Insecure context (plain `http` on the LAN): button hidden. Production is HTTPS via cloudflared.              |
| Search                | A search field at the top of the sidebar (desktop) and at the top of the Layers sheet plus a search icon beside the chips (phone). Matches name or ID, case-insensitive; picking one flies to it and selects it. |
| Deep links            | `?paddock=<fieldId>` selects that paddock on load and fits it into view. `?metric=` keeps working. Selecting a paddock updates `?paddock=` with `replaceState`.                                                  |
| Title boundaries      | The title detail card moves into the same sheet component (one sheet at a time; selecting a title closes a paddock and vice versa).                                                                              |

## Architecture

The page becomes an orchestrator holding state in runes and passing it to focused components. Leaflet stays imperative, created in an attachment on the map container.

- `src/lib/geo.ts` (new, pure): `ringArea`, `polygonArea`, `geometryArea`, `geometryCentroid` (moved from `/paddocks`), plus `pointInGeometry(lat, lon, geometry)` (ray casting, holes and MultiPolygon supported) and `findPaddockAt(lat, lon, features)`.
- `metricStatus` comes from `$lib/soil-status` (added by project 1). `src/routes/map/soil-status.ts` (new, pure) adds `paddockSoilSummary(sample, metrics)` producing the sheet rows.
- `src/routes/map/components/`:
  - `MapControls.svelte`: base map, display toggles, reset. Used in the sidebar and in the Layers sheet.
  - `MetricChips.svelte`: metric picker as chips (both layouts: chips row on phones, wrapped buttons in the sidebar).
  - `MetricLegend.svelte`: full legend (sidebar) and `compact` variant (phone).
  - `PaddockSearch.svelte`: combobox (`role="combobox"`, listbox of matches, arrow keys, Enter, Escape).
  - `DetailSheet.svelte`: responsive sheet/card shell with close button, Escape to close, focus moved into it on open.
  - `PaddockDetails.svelte` and `TitleDetails.svelte`: sheet contents.
  - `LocateButton.svelte`: owns the geolocation watch and reports `{ lat, lon, accuracy }` or an error through callback props.
- Existing pure helpers stay in `map/helpers.ts` and `src/lib/layers.ts`. Tooltip building remains for desktop hover.
- `/paddocks` imports area/centroid from `$lib/geo`.

Data flow: `+page.svelte` loads farm GeoJSON, titles and latest tests as today. It keeps `selectedPaddockId`, `activeMetric`, `userPosition` in `$state`, derives sheet contents with `$derived`, and applies styles to Leaflet layers in `$effect`s. Layer click handlers set `selectedPaddockId`; a derived highlight style is applied to that layer.

## Touch and readability rules for this page

Interactive controls are at least 44×44px. No text below 12px (`text-xs`); the legend's `text-[10px]`/`text-[11px]` go. Map overlays keep the existing dark translucent panels, with the streets-base contrast variants.

## Error handling

- Farm GeoJSON fails: the existing "We couldn't load the farm map" panel with Try again stays.
- Latest soil tests fail: sheet shows "Soil data unavailable" with Retry; chips still switch but paddocks show the no-data style.
- `?paddock=` unknown ID: ignored, no error shown.
- Geolocation: see Decisions. The watch is cleared when the page is left or locate is toggled off.

## Testing

- `src/lib/geo.test.ts`: area and centroid (moved tests plus a known square), `pointInGeometry` inside, outside, on a hole, MultiPolygon second part; `findPaddockAt` returns the first containing feature or `null`.
- `src/routes/map/soil-status.test.ts`: `paddockSoilSummary` row order follows `CONFIG.soilMetrics`, skips `none`, marks missing metrics `no-data`, handles no sample at all.
- Component tests (browser): `PaddockSearch` filters and selects with keyboard; `DetailSheet` closes on Escape and moves focus in; `MetricChips` marks the active chip with `aria-pressed`; `PaddockDetails` renders statuses from a fixture.
- `LocateButton`: stub `navigator.geolocation` to emit a position, a permission-denied error, and check the messages.
- Browser check at 390×844: map visible on load, chips scroll, Layers sheet opens and closes, tapping a paddock opens the sheet, `/map?paddock=<id>` selects it. Desktop 1280×800: sidebar unchanged in function.

## Files owned

`src/routes/map/**`, `src/lib/geo.ts` (new), `src/lib/layers.ts`, the geometry helpers and "View on map" link in `src/routes/paddocks/+page.svelte`.

## Out of scope

Offline map tiles, GPS tracking history, editing paddock boundaries, the soil tests page's reading of `?paddock=` (project 3).
