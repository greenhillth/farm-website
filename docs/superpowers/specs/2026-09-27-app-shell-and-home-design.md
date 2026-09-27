# App shell and home page — farm-website

Date: 2026-09-27 · Status: draft design, awaiting Tom's review · UX project 1 of 4 (B)

## Goal

Anyone, including less technical family members on a phone in a paddock, can reach the weather, the map or soil tests in one tap from anywhere in the app, and the home page answers "what's happening on the farm right now" without scrolling.

## Context

- Users: family and staff on phones in the paddock, office users at a desk, and less technical family members. The main jobs are the map/paddocks, entering soil tests and checking the weather. Timesheets, paddock notes and tasks aren't used.
- Each page builds its own header ("← Back to home"), the map has a floating Home button plus a quick-links list, and `weather/[metric]` has a third style. There is no shared navigation.
- At 390px wide the home page is a single column of nine tall cards, about 3,400px long. Weather is the 7th card, below two SharePoint links and the placeholder Timesheets card.
- Placeholders ship as if real: `/timesheet` is hard-coded sample data, `/paddocks` shows hard-coded "Recent Notes" and "Upcoming Tasks", paddock crop is always `null`. The "Soil Organic Matter" card is just `/map?metric=OM`, and three cards carry stale "New" badges.

## Related projects

| #   | Project                               | Spec                                          | Depends on |
| --- | ------------------------------------- | --------------------------------------------- | ---------- |
| 1   | App shell and home (this)             | `2026-09-27-app-shell-and-home-design.md`     | —          |
| 2   | Map on phones                         | `2026-09-27-mobile-map-design.md`             | 1          |
| 3   | Soil tests                            | `2026-09-27-soil-tests-ux-design.md`          | 1          |
| 4   | Readability and plain-language status | `2026-09-27-readability-and-status-design.md` | 1          |

Projects 2, 3 and 4 can run in parallel once this one has merged into `staging`. Each owns different files (see each spec's **Files owned**).

## Decisions

| Decision              | Choice                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navigation on phones  | Fixed bottom tab bar below `md` (768px): Home, Map, Weather, Soil, More. "More" opens a sheet with Paddocks, Help (manual) and the external links.               |
| Navigation on desktop | Top bar from `md` up: logo + "Greenhill Bros Farm", then Map, Weather, Soil tests, Paddocks, Help. External links sit in a "Links" menu on the right.            |
| Where nav lives       | `src/routes/+layout.svelte` renders `AppShell` around every page. Nav items are data in a tested module, `src/lib/nav.ts`.                                       |
| Active tab            | Matches `page.url.pathname` by prefix (`/weather/wind` → Weather). `aria-current="page"` on the active link.                                                     |
| Per-page headers      | Removed. Each page starts with a plain `<h1>` page title. "Back to home" links are deleted everywhere, including the map's floating Home button and quick links. |
| Map page              | Keeps its full-height layout inside the shell: it fills the space between the top bar (desktop) or above the tab bar (phone). Project 2 redesigns its controls.  |
| Timesheets            | Deleted: route, home card and nav entry. It was hard-coded sample data. Git history keeps it if it's wanted later.                                               |
| Paddock placeholders  | "Recent Notes" and "Upcoming Tasks" panels deleted from `/paddocks`. The Crop column is deleted (always `null`).                                                 |
| OM card               | Deleted. The map's metric picker covers it.                                                                                                                      |
| Badges                | Removed from home tiles. External links show an "opens in new tab" icon instead.                                                                                 |
| External links        | SharePoint links open in a new tab (`target="_blank" rel="noopener noreferrer"`).                                                                                |
| `/alex`               | Untouched and still unlinked.                                                                                                                                    |

## 1. App shell

`src/lib/components/AppShell.svelte` wraps `{@render children()}`:

- **Top bar (`md` and up):** 56px tall, `bg-panel`, bottom border. Logo (`/img/logo.png`) and title link to `/`. Primary links from `primaryNav`, then a "Links" disclosure button listing `externalLinks`.
- **Bottom tab bar (below `md`):** fixed to the bottom, 64px tall plus `env(safe-area-inset-bottom)`. Five equal buttons, each with a 24px inline SVG icon over a 12px label, whole cell tappable (at least 44×44px). Main content gets matching bottom padding so nothing hides under the bar.
- **More sheet:** a bottom sheet (native `<dialog>` opened with `showModal()`) listing `secondaryNav` then `externalLinks`, 48px rows. Closes on Escape, backdrop tap, or following a link. Focus returns to the More button.
- **Skip link:** "Skip to content" as the first focusable element, targeting `<main id="content">`.

`src/lib/nav.ts`:

```ts
export type NavItem = { href: string; label: string; icon: NavIcon; external?: boolean };
export const primaryNav: NavItem[]; // Home, Map, Weather, Soil tests
export const secondaryNav: NavItem[]; // Paddocks, Help
export const externalLinks: NavItem[]; // SharePoint Home, SharePoint Invoices
export function isActive(item: NavItem, pathname: string): boolean;
```

`isActive` is exact for `/` and a segment prefix for everything else (`/map` is active on `/map` but not `/mapping`). Tab bar shows `primaryNav` plus More. More is active when a `secondaryNav` item is.

## 2. Home page

Top to bottom:

1. **At a glance** strip: a row of compact tiles (2 columns on phones, 4 on desktop):
   - Temperature now, with feels-like.
   - Wind speed (km/h) and direction as a compass word (e.g. "SW").
   - Rain today (mm).
   - Soil: date of the most recent sample, and the plainest problem in words, e.g. "pH low in 3 paddocks" (the metric with the most paddocks outside its optimal range; "All tested paddocks in range" when none are).
   - Each tile links to its page. Weather tiles show "Sample data" when `source === 'mock'`. The soil tile shows "Unavailable" if the request fails. A failure never breaks the page.
2. **Main tools**: three large tiles (Map, Weather, Soil tests) using the existing card images, 1 column on phones, 3 on desktop. Image, title, one-line description.
3. **More**: smaller tiles for Paddocks and Help.
4. **Links**: SharePoint Home and SharePoint Invoices as plain rows with the external icon.

Data comes from `src/routes/+page.ts` `load`, run in parallel with `Promise.allSettled`: `fetchWeather(fetch)` from `$lib/weather`, and `fetch(CONFIG.backend.latestTest)` summarised by a pure `summariseLatestSoilTests(rows, CONFIG.soilMetrics)` in `src/lib/home-items.ts` → `{ paddocksTested: number; latestSampleDate: string | null; worst: { metricLabel: string; direction: 'low' | 'high'; count: number } | null }`.

`src/lib/soil-status.ts` (new, pure, shared with projects 2 and 3): `metricStatus(value, metric) → 'low' | 'optimal' | 'high' | 'no-data' | 'no-range'`, using `metric.range_optimal` with both ends inclusive. It reads a row's metric through the same key mapping the map uses (`pickMetricValue` in `map/helpers.ts`), which moves into this module and is re-exported from `map/helpers.ts` so the map keeps working unchanged. The existing `homeItems` export is replaced by `mainTools`, `moreTools` (both `HomeItem[]`); external links come from `nav.ts`.

`Card.svelte` keeps its props. Tiles without a badge simply pass none.

## 3. Page clean-up

- Remove the header block from `/paddocks`, `/soiltests`, `/weather`, `/weather/[metric]` and `/manual`, replace with an `<h1>`. `/weather` keeps its "Reported Ns ago" and connection chip, moved beside its `<h1>`.
- `/weather/[metric]`: its back link becomes "← All weather" (it's a detail page; going up one level is still useful).
- `/map`: delete the floating Home link and the Quick links `<nav>`; delete `quickLinks` from `map/helpers.ts` and its tests.
- `/manual`: update "Getting around the webapp" to describe the tab bar and top bar, and drop Timesheets from "Available tools at a glance".
- Delete `src/routes/timesheet/`.
- `/paddocks`: delete the Notes and Tasks panels and the Crop column. Fix "View on map" to link `/map?paddock=<fieldId>`; project 2 makes the map act on it (until then the link just opens the map).

## Error handling

- Home `load` never throws: each settled promise that rejects becomes an "Unavailable" tile.
- Nav is static; nothing to fail.

## Testing

- `src/lib/nav.test.ts`: `isActive` for `/`, exact match, nested path, lookalike prefix (`/mapping`), and query/hash ignored.
- `src/lib/home-items.test.ts`: `summariseLatestSoilTests` with empty input, mixed dates, invalid dates, duplicate `fieldID`s, the worst-metric pick and the all-in-range case.
- `src/lib/soil-status.test.ts`: each status, both range ends inclusive, metric without a range, non-finite value.
- `AppShell.svelte.test.ts` (browser): tab bar marks the active item with `aria-current`, More opens a dialog listing secondary and external items, Escape closes it and focus returns to More.
- Home `+page.ts` load test (node, like `weather/load.test.ts`): weather rejects → page data still returns soil summary; soil fetch 500 → weather still returns.
- Manual check in a browser at 390×844 and 1280×800 on every page: nothing hidden under the tab bar, map fills the remaining height, no horizontal scroll.

## Files owned

`src/routes/+layout.svelte`, `src/routes/+page.svelte`, `src/routes/+page.ts` (new), `src/lib/nav.ts` (new), `src/lib/components/AppShell.svelte` (new), `src/lib/components/NavIcon.svelte` (new), `src/lib/home-items.ts`, `src/lib/soil-status.ts` (new), `pickMetricValue` in `src/routes/map/helpers.ts` (moved, re-exported), the header blocks of `paddocks`, `soiltests`, `weather`, `weather/[metric]`, `manual` pages, `src/routes/timesheet/` (deleted), the Home link and quick links in `src/routes/map/+page.svelte` and `map/helpers.ts`.

## Out of scope

Map controls (project 2), soil test list and upload (project 3), weather content and type scale (project 4), migrating whole pages to runes beyond the lines touched.
