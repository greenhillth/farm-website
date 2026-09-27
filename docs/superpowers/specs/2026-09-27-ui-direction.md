# UI direction — farm-website

Date: 2026-09-27 · Status: agreed with the four UX specs · Applies to UX projects 1–4

This is the one visual direction for the app shell, home, map, soil tests and weather work. It comes from a single `frontend-design` pass so that four parallel implementers don't produce four different looks. **When this document and the `frontend-design` skill disagree, this document wins.** Implementers still load `frontend-design:frontend-design` for its working discipline: screenshot, critique, remove one accessory, write plain copy.

## Brief

- **Subject:** a working tool for a family farm in north-west Tasmania: paddocks, soil tests and a weather station.
- **Audience:** family and staff on phones outdoors (bright light, one hand, maybe gloves), office users at a desk, and less technical family members.
- **Primary job:** answer "what's happening on the farm right now?" and "how is this paddock?" at a glance, then get out of the way.

## Decisions

### Colour: keep the existing palette

The dark palette and green accent (`src/app.css`) are the farm app's established look, which people already know. The brief pins it, so boldness is spent on type and legibility, not on a new palette. Only semantic tokens are added:

| Token                 | Value     | Use                                                              |
| --------------------- | --------- | ---------------------------------------------------------------- |
| `bg`                  | `#0b1117` | Page background (existing)                                       |
| `panel`               | `#0f1722` | Panels, bars, sheets (existing)                                  |
| `text`                | `#e6edf3` | Body text (existing)                                             |
| `muted`               | `#9fb3c8` | Secondary text (existing; 9:1 on `bg`)                           |
| `border`              | `#1f2a37` | Hairlines (existing)                                             |
| `accent`              | `#72e49c` | Links, active nav, **Optimal** and **Good** status (existing)    |
| `status-low` / `warn` | `#f2b35b` | **Low** soil values, **Marginal** spraying, sample-data warnings |
| `status-high`         | `#78bdf0` | **High** soil values                                             |
| `danger`              | `#f87171` | **Not suitable** spraying, errors, destructive actions           |

Status is never colour alone: every status shows a word ("Low", "Optimal", "High", "No data", "Good", "Marginal", "Not suitable") next to a dot.

### Type: Atkinson Hyperlegible Next, one family

Chosen for this subject: it was designed for legibility at low vision, and its distinct letterforms (`Il1`, `0O`) and open numerals hold up in glare on a phone. Self-hosted through `@fontsource-variable/atkinson-hyperlegible-next`; family name `'Atkinson Hyperlegible Next Variable'`, falling back to `system-ui`.

Scale (ratio 1.25), in Tailwind terms:

| Step   | Size | Use                                               |
| ------ | ---- | ------------------------------------------------- |
| xs     | 12px | The smallest text allowed: tab labels, captions   |
| sm     | 14px | Secondary lines, table cells                      |
| base   | 16px | Body (project 4 moves the body from 14px to 16px) |
| lg     | 20px | Panel and section headings                        |
| xl     | 25px | Page `<h1>`                                       |
| 2xl    | 31px | —                                                 |
| glance | 39px | The home "Right now" readings only                |

Weights: 400 body, 600 headings and readings, 700 not used. Readings use `tabular-nums`. Headings are sentence case.

### The one bold element

The **"Right now" strip** on the home page: the temperature, wind, rain and soil readings set large (39px, semibold, tabular) with a plain label above and one line of context below. Everything else stays quiet: plain panels, no decorative gradients, no hover animations on cards.

### Layout

- Phone-first, a single column with a 16px gutter. Desktop content is `max-w-6xl`, left-aligned. Page titles are left-aligned too, including the weather detail page, which is currently centred.
- The shell sets `--shell-top` (0 on phones, 3.5rem from `md`) and `--shell-bottom` (4rem plus the safe area on phones, 0 from `md`). Full-height pages such as the map size themselves with `calc(100dvh - var(--shell-top) - var(--shell-bottom))`.
- Radius follows hierarchy: sheets and dialogs 16px (`rounded-2xl`, top corners only for bottom sheets), panels and tiles 12px (`rounded-xl`), inputs and buttons 8px (`rounded-lg`), chips and status pills fully round.
- Tap targets are at least 44×44px (`min-h-11`). List rows in sheets are 48px.

```
Phone home                         Desktop home
┌──────────────────────────┐       ┌───────────────────────────────────────────────┐
│ Greenhill Bros Farm (h1) │       │ ▣ Greenhill Bros Farm  Map Weather Soil… Links│
│ Right now                │       ├───────────────────────────────────────────────┤
│ ┌──────────┐┌──────────┐ │       │ Right now                                     │
│ │Temp      ││Wind      │ │       │ ┌────────┐┌────────┐┌────────┐┌────────────┐  │
│ │12.2°     ││31 km/h   │ │       │ │12.2°   ││31 km/h ││0.0 mm  ││Soil pH low │  │
│ │Feels 11° ││from SW   │ │       │ └────────┘└────────┘└────────┘└────────────┘  │
│ └──────────┘└──────────┘ │       │ Tools                                         │
│ ┌──────────┐┌──────────┐ │       │ ┌─────────────┐┌─────────────┐┌─────────────┐ │
│ │Rain today││Spraying  │ │       │ │ map image   ││ weather img ││ soil image  │ │
│ └──────────┘└──────────┘ │       │ └─────────────┘└─────────────┘└─────────────┘ │
│ ┌──────────────────────┐ │       │ Paddocks · Help         Links: SharePoint…    │
│ │Soil pH low in 3 padd.│ │       └───────────────────────────────────────────────┘
│ └──────────────────────┘ │
│ Tools (image tiles)      │
├──────────────────────────┤
│ ⌂    ▦    ☁    ⚗    ≡    │  ← tab bar
└──────────────────────────┘
```

### Motion

Only in response to an action: bottom sheets slide up in 180ms (`ease-out`), and nothing animates under `prefers-reduced-motion: reduce`. No entrance animations, no hover scaling. `Card`'s hover scale is removed.

### Copy

- Say what the thing is or does, in the farm's words: "Rain today", "Spraying now", "See soil tests", "Import tests".
- Buttons are verbs, and an action keeps its name through a flow ("Import tests" → "Importing…" → "Imported 48 tests").
- Errors say what happened and what to do: "Couldn't load soil tests. Check the connection and try again."
- Avoid these template tells: ALL-CAPS tracked labels (the map sidebar's section headings become sentence case), a `→` appended to link text, middle-dot meta strings, `01 / 02` numbering except for a real sequence (the CSV import steps are one).

### Focus and accessibility

- Visible focus on everything: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`.
- Every page has one `<h1>`. The shell provides the only `<main id="content">`, and pages use `<div>` for their wrappers.
- Icons in buttons have an accessible name. Links that open a new tab say so to screen readers.

## Review against the generic defaults

- _Near-black background with a single acid-green accent_ matches the existing palette. It stays because the brief pins it, and the distinctive choices are made elsewhere: hyperlegible type and a status vocabulary built for glare.
- _The SaaS card kit_ (identical rounded cards and shadows everywhere) is avoided by following the radius hierarchy above, dropping hover scale, and making the home strip the only emphatic element.
- _Template chrome_: arrows, eyebrows, middle dots and monospace data labels are all removed by the copy rules above.

## For implementers

Before building or changing visible UI:

1. Load `frontend-design:frontend-design` and this document.
2. Build with the tokens and patterns above: `text-status-low`, `bg-warn/15`, `text-danger`, `font-sans` (set globally) and `tabular-nums`.
3. Screenshot at 390×844 and 1280×800 (`scripts/screenshot.mjs`, added by project 1) and critique against this document. Fix anything that breaks it before asking for review.
