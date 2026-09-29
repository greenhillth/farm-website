# Map overhaul: views and infrastructure (research)

Date: 2026-09-29 · Status: research for discussion, not an agreed spec · Backend half: `gbros-api/docs/map-overhaul/README.md`

Tom wants people to add, change and remove infrastructure on the farm map (utility poles, electricity and water meters, dams, pumps, gates, irrigators, roads and so on), each type with its own details and connections, some with live monitoring later. He also wants the map organised into **views** (soil, irrigation, infrastructure) instead of a long list of layer toggles.

This document covers how other map tools handle this, what the frontend should do, and the questions that need answers before anyone writes an implementation plan. The static samples are in [`samples/`](samples/index.html). The prompt for the frontend agent that will turn this into a spec and plan is [`frontend-agent-prompt.md`](frontend-agent-prompt.md).

## Contents

- [Where the map is today](#where-the-map-is-today)
- [What other tools do](#what-other-tools-do)
- [Recommendations](#recommendations)
- [Suggested phases](#suggested-phases)
- [Open questions for Tom](#open-questions-for-tom)
- [Sources](#sources)

## Where the map is today

- `src/routes/map/+page.svelte` (about 740 lines, runes) builds one Leaflet map. It loads paddock GeoJSON (`/api/farm`), title boundaries (`/api/farm/titles`) and the latest soil tests, and colours paddocks by the chosen soil metric.
- The only "types" are paddocks and titles, both polygons, both read-only, both from their own endpoint with their own Leaflet builder in `src/lib/layers.ts`.
- Controls: metric chips, base map, and three toggles (boundaries, labels, titles) in `MapControls.svelte`. Phones get chips at the top and a Layers sheet (see `docs/superpowers/specs/2026-09-27-mobile-map-design.md`).
- Selection opens `DetailSheet.svelte` (card on desktop, bottom sheet on phones) with `PaddockDetails` or `TitleDetails`. `?paddock=` and `?metric=` deep-link.
- Nothing on the map can be edited. The backend's write endpoints have no authentication; Cloudflare Access in front of the site is the only gate.

The mobile-map work already set the pattern this overhaul should extend: one orchestrating page, focused components, pure helpers with tests, and a single responsive sheet for details.

## What other tools do

**farmOS** (open-source farm records) calls everything an **asset**: land, structure, equipment, water, sensor and so on. Fixed assets have "intrinsic geometry"; movable ones get their location from movement logs. Assets can have parents, and sensor assets link to data streams. Lesson: _asset_ is the established farm word for "a thing we own and look after", types are fixed in code with their own fields, and live data hangs off the asset rather than being a separate map layer.

**QGIS, QField and Mergin Maps** solve "too many layers" with **map themes**: a saved combination of visible layers _and their styles_, switched in one tap. Their docs also note that many themes over many layers get unwieldy. Lesson: a view should own both _what_ is shown and _how_ it's styled, and there should be a handful of them.

**ArcGIS Field Maps** builds task-focused maps with a form per layer, typed fields and GPS or crosshair placement for field staff on phones. Lesson: editing on a phone works best with a fixed crosshair (the map moves, not the pin) or "use my location", and forms come from the type's field list.

**Utility network GIS** (and OpenStreetMap's power tagging, `power=pole` with a `ref` on the nodes of a `power=line`) models networks as **nodes and edges**: poles, pumps and valves are points; lines run between them and share their vertices. Lesson: a pole's "connections" are the lines that pass through it, and a pump's are the dam it draws from and the mains it feeds. Snapping while drawing is what creates those connections.

**Pivot management apps** (the vendor apps for centre pivots) draw each pivot as a circle with the arm at its current angle, the area watered this pass shaded, and colour for running, stopped and fault. Lesson: irrigators need their own drawing, not a generic pin.

**Consumer maps** (Google, Apple) show one set of places at a time, tap a place to get a card (bottom sheet on phones), cluster or hide minor places when zoomed out, and search across everything. Lesson: selection → card, and search that finds a pole by number whichever view you're in.

**Live data standards.** OGC SensorThings API models live data as _Thing → Datastream → Observation_: each thing has streams, each stream measures one property in one unit. The backend doc proposes a cut-down version of this. For the browser, FastAPI supports Server-Sent Events, which suit one-way live updates better than WebSockets.

**Leaflet plugins.** `leaflet-geoman` (free edition) draws and edits markers, lines, polygons and circles, with snapping. `Leaflet.markercluster` clusters points. Both need checking against the Leaflet version in `package.json` (1.9.4) and Svelte 5 before being adopted.

## Recommendations

### 1. Call them "assets"

"Component" clashes with Svelte components. "Feature" is the GIS word (a GeoJSON Feature) but reads as "product feature" to everyone else. **Asset** is what farmOS and utilities use, and what an owner calls a pump or a pole. UI copy: "Add to the map" for the action, "asset" in headings and settings ("Asset types"). Paddocks and titles can stay as they are and be treated as assets later if that proves useful.

### 2. Views instead of layers

A **view** is a task. It decides which asset types are drawn, how paddocks look underneath, which legend or summary sits in the sidebar, and which reading the detail card leads with. One view at a time.

| View           | Draws                                                                         | Paddocks                         | Sidebar                                                        | Card leads with                |
| -------------- | ----------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| Soil           | Nothing extra                                                                 | Coloured by metric (today's map) | Metric chips and legend                                        | Soil results                   |
| Irrigation     | Pivots, linear moves, dams, pumps, mains, water meters, valves, weather       | Faint outlines, not tappable     | "Irrigation now": faults first, then running, stopped, offline | Flow, pressure, pivot position |
| Infrastructure | Poles, power lines, electricity meters, pumps (as loads), roads, gates, sheds | Faint outlines, not tappable     | "Power now" total and meters                                   | Kilowatts, run time            |
| Property       | Title boundaries                                                              | Outlined with names and areas    | Counts and areas                                               | Title and ownership            |

Rules that keep it from becoming layers again:

- At most four filter chips inside a view (Irrigation: Irrigators, Water supply). They narrow a view; they don't add other views' content.
- A type can appear in more than one view, with a different lead reading. A pump is water supply in Irrigation (litres per second) and a power load in Infrastructure (kilowatts). This answers "nobody needs pH and a pump's kWh at the same time" without hiding the pump.
- In the asset views, paddocks are context: faint and ignoring taps, so taps land on assets.
- Search covers every view. Picking a pole from the Soil view switches to Infrastructure and selects it.
- `?view=` joins `?metric=` and `?paddock=` in the URL, plus `?asset=<id>` for selection. Remember the last view per device.
- View definitions are presentation, so they live in the frontend (`CONFIG.mapViews` or `src/lib/map/views.ts`, beside `soilMetrics`). The backend owns asset types and their fields; the frontend maps types to views, icons and lead readings. Adding a type then needs a backend change (fields) and a frontend change (icon, views), which is fine because it needs an icon anyway.

See `samples/views.html`.

### 3. Icons and styling

- **Points** are round badges: a dark disc with a light glyph, 28px on the map inside a 44px tap target. The glyph carries the type. The ring carries live status: green running, amber warning, red fault, grey dashed offline, white when there is no live data. Faults and warnings also get a corner "!", and every status appears as a word in tooltips, lists and cards, following the "never colour alone" rule in the UI direction doc.
- **Lines and areas** carry their domain colour, with a dark casing so they hold up on pale paddocks: water mains blue, power lines yellow dashed, roads tan, fences thin white dotted. Each line gets an invisible 22px hit line for thumbs.
- **Irrigators** get their own drawing: pivot circle, arm at the live angle, this pass shaded; linear moves as a thick line with the strip watered so far.
- **Selection** enlarges the badge with a double white ring. Everything connected upstream and downstream through the view's medium (water in Irrigation, power in Infrastructure) gets a blue ring and the rest fades to 35%. Tapping a pivot shows where its water comes from.
- **Zoom rules**: from zoom 17 in, everything. At 15–16, major assets with value chips; poles, valves and gates hidden. At 14 and out, major assets only, with faults always shown. Clustering is only worth adding once a view has a few hundred points.
- Glyphs are custom inline SVG in the app's stroke style (see `samples/shared/icons.js`), not an icon font, so they can be used in Leaflet `divIcon`s, lists and the add-type picker alike. Maki and Temaki (CC0) are worth checking for glyphs to borrow.

The alternative, badges coloured by type with status as a small dot, is on `samples/icons.html` for comparison. It groups types at a glance but makes faults a 7px dot and puts green and amber in two meanings.

### 4. Selection and the detail card

Reuse `DetailSheet.svelte`. One card component per geometry family, driven by the type registry, with a few hand-written parts:

1. Header: badge, name, type, status pill.
2. Live readings for this view (two to four tiles), "Updated 12 s ago", and an alert line for faults or offline ("No reading for 3 hours").
3. Facts: the type's fields in registry order.
4. Connections, grouped by relation in the view's medium first: "Gets water from", "Supplies water to", "Powered from", "Part of", "Carries". Each row selects that asset.
5. Actions: Edit details, Move, Remove.

Pivots get a small dial showing the arm and this pass. Escape closes; the map pans so the asset isn't under the card.

### 5. Editing

See `samples/editing.html`.

- **A mode, not always-on tools.** "Add to the map" (sidebar button, or a floating Add button on phones) opens a type picker with the current view's types first. Edit, Move and Remove start from an asset's card.
- **Placing points**: a fixed crosshair with the map moving underneath, plus "Use my location, ±4 m" (only offered when the accuracy is good enough). Snap to nearby lines within a few metres and say so ("Snapped to Pump and pivot feeder").
- **Drawing lines and areas**: tap to add points, Undo point, Finish; live length or area. Line ends snap to point assets, which creates the connection. Dams and buildings are polygons; pivots are a centre plus radius (and arc for part circles), edited with handles.
- **Forms** come from the type's field list (label, kind, unit, options, required). A small renderer is enough; a full JSON Schema form library isn't needed. Pivot, linear move and anything with geometry-derived values get hand-written parts.
- **Saving**: every add or edit saves on its own and shows an Undo toast for ten seconds. No drafts to publish. Conflicts (someone else changed it) show both versions and ask.
- **Remove means archive.** The confirmation says what else changes ("Pump and pivot feeder: rejoined between poles 481204 and 481206"). Permanent delete is an admin action.
- **Who can edit** depends on the backend knowing who is asking (see the backend doc: validate the Cloudflare Access JWT). Until then, editing should stay off in production.
- Evaluate `leaflet-geoman` for drawing and vertex editing before writing our own. The crosshair placement and the pivot handles are simple enough to write by hand either way.

### 6. Live data on the map

- Start with polling a snapshot endpoint for the current view every 30 seconds, paused when the tab is hidden. Move to Server-Sent Events when there is a source that changes faster than that.
- The backend works out each asset's status (running, warning, fault, offline) so the frontend doesn't encode device rules.
- Never show a stale value as current: past the stream's expected interval the badge goes grey dashed and the card greys the values and says when they are from.
- Controlling equipment (starting a pivot or pump) is out of scope. Vendor apps stay the way to do that.

### 7. Code structure

The page is already about 740 lines. Before adding assets:

- `src/lib/map/views.ts`: view definitions (types per view, filter chips, lead readings, paddock treatment). Pure, tested.
- `src/lib/map/asset-types.ts` and `glyphs.ts`: per-type icon, line style, zoom rule.
- `src/lib/map/network.ts`: upstream/downstream walks over links for highlighting. Pure, tested.
- `src/lib/map/asset-layers.ts`: Leaflet builders for badges, lines, pivots, linear moves.
- Components: `ViewSwitcher`, `AssetDetails` (with `LiveReadings`, `AssetConnections`), `AddAssetSheet`, `AssetForm`, `PlaceCrosshair`.
- New endpoints go in `CONFIG.backend`.

## Suggested phases

Each phase ships on its own and is worth having without the next.

1. **Views with today's data.** Soil and Property views, the switcher on desktop and phone, `?view=`, search across paddocks. No backend change.
2. **Read-only assets.** Backend asset tables, types and `GET` endpoints with a sample GeoJSON for dev and tests (not seeded into production). Irrigation and Infrastructure views, icons, cards, connection highlighting. Real assets entered by the backend import or by hand in SQL at first.
3. **Editing.** After the backend can identify users. Add, move, edit, archive, undo, history.
4. **Live data.** Snapshot polling and status, then the first real source (whatever Tom has: a pivot controller account, a pump drive on the LAN, or a dam level sensor), then SSE if needed.

## Open questions for Tom

1. Are Soil, Irrigation, Infrastructure and Property the right views? Is there a stock or grazing view coming (troughs, fences, mobs)?
2. "Assets" as the name?
3. Icon option A (neutral badges, status ring) or B (coloured by type)?
4. Who may edit: everyone who can log in through Cloudflare Access, or a named list?
5. Which live sources exist today, and which matters most: pivot position, pump power and flow, dam level, or electricity use?
6. Should paddocks and titles eventually move into the asset model (editable paddock boundaries), or stay as they are?
7. Is there existing data to import: pole numbers from the network provider, a KML from Google Earth, a list of meters and NMIs?
8. Offline use in paddocks with no signal: needed, or out of scope as it is today?

## Sources

- farmOS asset model: https://farmos.org/model/type/asset/
- QField map themes: https://docs.qfield.org/how-to/qfield-interface/map-themes/
- Mergin Maps map themes: https://merginmaps.com/docs/gis/setup_themes/
- QGIS map views and themes: https://docs.qgis.org/3.44/en/docs/user_manual/map_views/index.html
- OpenStreetMap power poles: https://wiki.openstreetmap.org/wiki/Tag:power%3Dpole
- ArcGIS Field Maps, configure the map: https://doc.arcgis.com/en/field-maps/latest/prepare-maps/configure-the-map.htm
- OGC SensorThings API Part 1 (v1.1): https://docs.ogc.org/is/18-088/18-088.html
- FastAPI Server-Sent Events: https://fastapi.tiangolo.com/tutorial/server-sent-events/
- leaflet-geoman: https://github.com/geoman-io/leaflet-geoman
- Temaki icons (CC0): https://github.com/rapideditor/temaki
