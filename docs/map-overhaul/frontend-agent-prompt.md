# Prompt: frontend agent for the map overhaul

Copy everything below the line into a new Claude Code session opened in `farm-website`, once Tom has answered the open questions in `docs/map-overhaul/README.md` (or pass his answers in with it).

---

You are the frontend agent for the farm map overhaul in `farm-website` (SvelteKit 2, Svelte 5 runes, Tailwind 4, Leaflet 1.9). A backend agent is doing the matching work in `gbros-api`. Your job in this session is to **finish the research, agree the design with Tom, and write the spec and implementation plan**. Do not write application code in this session.

## What Tom asked for

Users can add, change and remove infrastructure on the farm map: utility poles, electricity meters, water meters, dams, pumps, gates, irrigators (centre pivot or linear), roads and more. Each type has its own details (a pole has a pole number, position and connections; a pump has the dam and main it's connected to; an irrigator is a centre pivot or a linear move). Some will show live monitoring later. The map is organised into **views** (Soil, Irrigation, Infrastructure, …) rather than a long list of selectable layers, because nobody needs soil pH and a pump's kWh at the same time.

## Read first

1. `CLAUDE.md` (git workflow, commands, conventions) and `docs/superpowers/specs/2026-09-27-ui-direction.md` (palette, type, copy and accessibility rules; it wins over generic design advice).
2. `docs/superpowers/specs/2026-09-27-mobile-map-design.md`: the current map architecture this builds on.
3. `docs/map-overhaul/README.md`: the research and recommendations. Treat them as a proposal, not a decision.
4. The samples in `docs/map-overhaul/samples/` (open `index.html` in a browser; `views.html` is interactive). `samples/shared/assets.js` shows the proposed shapes for views, the type registry, assets and links.
5. The backend research: `../gbros-api/docs/map-overhaul/README.md` (data model, API sketch, auth, live data). If the backend agent has already written a spec in `../gbros-api/docs/superpowers/specs/`, read that too; its API contract is the source of truth.
6. The current code: `src/routes/map/` (page, components, `helpers.ts`, `soil-status.ts`), `src/lib/layers.ts`, `src/lib/geo.ts`, `src/lib/config.ts`.

## Tom's decisions

Before designing anything, check which of the README's open questions Tom has answered (views, naming, icon option A or B, who may edit, live sources, paddocks and titles, data to import, offline). If any that change the design are unanswered, ask him, one question at a time, before going further.

## Further research to do

Keep notes brief and cite sources. Put findings that change a recommendation into the spec.

1. **Drawing and editing library.** Check `leaflet-geoman` (free edition) against Leaflet 1.9.4, Vite 8 (Rolldown) and SSR-off pages: bundle size, snapping between layers, circle editing, touch support, licence. Compare with writing crosshair placement and vertex editing ourselves. Build a throwaway spike outside `src/` if needed, and delete it.
2. **Marker performance.** How many `divIcon` markers and SVG paths stay smooth on a mid-range phone? Decide whether clustering (`Leaflet.markercluster`) or a canvas renderer is needed at the asset counts Tom expects.
3. **Icons.** Check Maki and Temaki (CC0) for glyphs worth adopting, and test the sample glyphs at 16px on the real satellite imagery in bright light (screenshot at 390×844). Settle the final set.
4. **Forms from the type registry.** Decide how much of the form comes from the backend's field metadata versus hand-written per type, and how validation errors from the API map onto fields.
5. **Live updates.** Polling versus `EventSource` through SvelteKit in dev (Vite proxy), in the node build (the `/api` catch-all proxy in `src/routes/api/[...path]/+server.ts` must stream, not buffer) and in production (nginx, cloudflared, Cloudflare Access session expiry). Confirm with the backend agent which one phase 4 starts with.
6. **Geolocation accuracy** for "use my location" on the phones the family uses, and what accuracy threshold to require before offering it.
7. **Deep links and history.** How `?view=`, `?asset=`, `?metric=` and `?paddock=` interact, and what Back does after switching views.

## Designing it

Once Tom confirms the design direction, use the **`/superpowers:brainstorming`** skill to work through the design with him and write the spec, then the implementation plan (the brainstorming skill hands over to the plan-writing step). Follow the repo's existing layout:

- Spec: `docs/superpowers/specs/<date>-map-views-and-assets-design.md`
- Plan: `docs/superpowers/plans/<date>-map-views-and-assets.md`

Split the work into the phases in the README (views with today's data; read-only assets; editing; live data), with a spec section and a separate plan per phase if that keeps each one reviewable. Phase 1 needs no backend changes and can be planned first.

The spec must cover: the view definitions and where they live; the type-to-view mapping, icons and styles; selection, highlighting and the detail card; search; URL state; phone and desktop layouts; editing flows (if in scope for the phase); how live data is fetched, shown and marked stale; error and empty states; the component and module breakdown; and the test plan (Vitest unit tests for pure helpers, browser component tests, and the 390×844 and 1280×800 screenshot checks the UI direction asks for).

Agree the API contract with the backend agent's spec rather than inventing endpoints: every new endpoint goes into `CONFIG.backend` in `src/lib/config.ts`, and requests go through relative `/api/...` paths.

## Rules

- Follow `CLAUDE.md`: work in a worktree under `.claude/worktrees/` on a `docs/` branch from `origin/staging` (`/branch-start docs/map-views-spec`), and open the PR with `--base staging`. Run `npx prettier --check .` before pushing.
- Svelte 5 runes for new code. Tailwind palette tokens from `src/app.css`, no new colours outside it without saying why. 44px tap targets, 12px minimum text, status never shown by colour alone.
- Don't add to the ESLint backlog.
- Don't change the backend repo. Put anything the backend needs in the spec's "Backend contract" section and tell Tom.
- The samples in `docs/map-overhaul/samples/` are throwaway. Don't import from them; port ideas, not code.
