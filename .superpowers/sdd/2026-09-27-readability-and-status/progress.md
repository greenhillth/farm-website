# SDD ledger — plan: docs/superpowers/plans/2026-09-27-readability-and-status.md

Branch feat/readability-and-status from origin/staging 5eeccd1. ESLint baseline: 81 errors.
Spec: docs/superpowers/specs/2026-09-27-readability-and-status-design.md + 2026-09-27-ui-direction.md (both present).

## Pre-flight scan

| Pair / task | Produces vs consumes | Finding |
|---|---|---|
| T1 self | test asserts 16px/1.5, scale vars, no old selectors; CSS provides all | consistent; grep: none of #app/#sidebar/#main/#map/.legend/label.field used in src (after PR #23 map rewrite too) |
| T2 self | backend.test expects ALWAYS_SAMPLE_FIELDS/WEATHER_FIELDS/mockFields; code provides | consistent |
| T2 ↔ existing load.test.ts | loads now also call /api/weather?; stub returns {data:[]}, 502 path → catch → [] | ok |
| T2 ↔ T6/T7/T8 | mockFields/history/range from loads consumed by pages; home fixture lacks mockFields until T8 | plan accepts `npm run check` errors between T2 and T8 → Ruling 1 |
| T3 ↔ T2 | consumes Weather, WeatherField | ok |
| T3 self | tests vs spray.ts thresholds and message strings | consistent by reading; numeric Delta T refs verified by test run |
| T4 ↔ T3 | SPRAY_LABELS/TONES/SprayResult | ok |
| T4 ↔ Panel | Panel props title/class/children/actions (h3) | ok |
| T5 ↔ T2 | dewPointC, WeatherHistoryRow | ok |
| T5 self | HOUR re-export unused | plan says remove if unused by T7 → Ruling 2 |
| T6 ↔ T2–T5 | uses load fields, chart, SprayPanel (h3 first), OfflineBanner, compassPoint (exists in home-items.ts:119) | ok |
| T7 ↔ T5 | CHARTS/buildSeries/extremes/parseUtcMs; sr-only chart table has different name from "Recent readings" table | ok |
| T8 ↔ T3/T4 | sprayConditions, SampleDataChip; grid 5 cols = temp,wind,rain,spray,soil | ok |
| Plan header | requires frontend-design:frontend-design skill | not in this session's skill list → Ruling 3 |

Ruling 1: Intermediate commits T2–T7 may fail `npm run check` on the pages/home fixture; only the final branch state must be clean — the plan says so explicitly — cost if wrong: none for the PR (CI runs on the head only).
Ruling 2: Drop the unused `HOUR` export from chart.ts in Task 7 if nothing imports it — the plan allows it; unused exports add noise — cost if wrong: trivial re-add.
Ruling 3: Where frontend-design:frontend-design is unavailable, subagents read docs/superpowers/specs/2026-09-27-ui-direction.md instead (the plan says the direction doc wins anyway) — cost if wrong: small design-polish gaps caught in final browser review.

## Tasks
Task 1: minor (deferred): reviewer suggested commit trailer should say Sonnet 5 — Ruling: no change; session attribution is Opus 5.5, reviewer misread its own context — cost if wrong: none
Task 1: complete (commits 5eeccd1..945c81c, review clean)
Task 2: minor (deferred): backend.test.ts has no "temperature missing, humidity present" case (only humidity-missing, as the plan specifies)
Task 2: complete (commits 945c81c..8b9e6aa, review clean; ESLint now 78)
Task 3: Ruling: user-visible copy uses the curly apostrophe (’) exactly as the plan's Global Constraints and tests write it ("Can’t tell", "isn’t", "don’t"); Task 3 used straight ' (spec text has straight) — the plan's verbatim copy and later tasks' exact-match tests (T4/T6/T8) use ’, and home-items.ts already uses ’ — cost if wrong: a find-and-replace of ~6 strings
Task 3: minor (deferred): deltaT null for non-finite temp reports "humidity reading is out of range"
Task 3: minor (deferred): reason text rounds km/h, so 14.6 (good) and 15.4 (marginal) both read "Wind 15 km/h" (qualifier differs)
Task 3: minor (deferred): orList 3+ item join untested
Task 3: fix round 1/5 (1 addressed, 0 open — curly apostrophes; commits 302841a..ab08441)
Task 3: complete (commits 8b9e6aa..ab08441, review clean)
Task 4: minor (deferred): SprayPanel keys reasons by string (plan-mandated; reasons are distinct today)
Task 4: minor (deferred): OfflineBanner uses role="status" not role="alert" (plan-mandated)
Task 4: complete (commits ab08441..d608c32, review clean)
Task 5: Ruling: gridline {#each [min,mid,max] as value (value)} duplicates keys on a flat series (plan-mandated) — fix: ensure max > min (flat series gets a 1-unit span) and key gridlines by index; add a flat-series component test — Svelte 5 throws each_key_duplicate — cost if wrong: none
Task 5: Ruling: SVG axis labels at font-size 12 in a fixed 360/800 viewBox render ~10.5–11px in real containers (plan-mandated; violates the binding 12px minimum) — fix: measure the chart's rendered width with bind:clientWidth and use it as the viewBox width (fallback 360 until measured), keeping heights 300 below md / 260 at md+, so 1 unit = 1px — cost if wrong: small; chart geometry code changes slightly from the plan
Task 5: minor (deferred): x() has no guard for from === to (y() guards span)
Task 5: minor (deferred): hourTicks with non-default `every` could duplicate a tick on DST fall-back day (unused)
Task 5: fix round 1/5 (2 addressed, 0 open — unique gridline keys, 1:1 viewBox for 12px text; commits a7de6e9..72f28fe)
Task 5: minor (deferred): `span = max - min || 1` fallback now dead code
Task 5: complete (commits d608c32..72f28fe, review clean)
Task 6: minor (deferred): dashboard panel links have long accessible names (whole panel text); consider aria-label
Task 6: complete (commits 72f28fe..945a1e2, review clean; ESLint now 67)
Task 7: Ruling: /weather/constructor (Object.prototype keys) crashes the detail page because TITLES/FIELDS/CHARTS are indexed by the raw route param (plan-mandated, pre-existing pattern) — fix now: own-property lookups (Object.hasOwn) for every param-keyed table, plus a test — any URL typed by a user reaches it — cost if wrong: none
Task 7: minor (deferred): readings table keyed by timestamp_utc; duplicate timestamps from the backend would throw each_key_duplicate
Task 7: fix round 1/5 (1 addressed, 0 open — own-property metric lookups; commits 23e1d3e..2e6a7b1)
Task 7: complete (commits 945a1e2..2e6a7b1, review clean; ESLint now 64; HOUR removed per Ruling 2)
Task 8: complete (commits 2e6a7b1..d83b700, review clean)

## Final review (5eeccd1..d83b700): With fixes — 2 Critical, 3 Important, 5 Minor
Final: Ruling: C1 spray verdict ignores reading age (backend /current returns the newest row however old) — fix: CONFIG.spray.maxReadingAgeMinutes = 20 (ingest polls every 60 s); older reading → "Can’t tell — the last reading is N min/h old."; /weather pill shows "Stale" (warn) instead of "Live" past the same age — a confidently wrong "Good" is the worst outcome — cost if wrong: threshold value is a product choice for Tom (easy to change in config)
Final: Ruling: C2 fetchWeatherHistory calls /api/weather?from=&to= which the backend doesn't define (only /api/weather/history); default limit 1000 < 1440 rows/day — fix: CONFIG.backend.weatherHistory = /api/weather/history, request limit=2000; touches config.ts backend section (outside the plan's "spray section only") because CLAUDE.md requires endpoints live there — cost if wrong: none; charts are dead without it
Final: Ruling: I3 poll — fix all three (no "Updated Ns ago" on sample data, skip a tick while a poll is in flight, reset the poll result when load data changes) — cost if wrong: none
Final: Ruling: I4 home tile chips check every field the tile shows (wind: speed/gust/dir; rain: daily/hourly; temp: temp + what it shows) — consistency with the dashboard — cost if wrong: none
Final: Ruling: I5 wind/gust in the detail table shown in km/h to match summaries and chart — cost if wrong: none
Final: Ruling: Minors 6–10 (detail banner wording/404 for unknown metric, "Can’t tell" repeated, long offline wording, chart gap bridging, circular import) are follow-ups; all ledgered minors are follow-ups per reviewer triage — none affects a verdict's correctness — cost if wrong: small UX polish PRs
Final: Ruling: gust threshold only ever makes the verdict Marginal (never Not suitable) — plan-chosen, spec silent — surfaced to Tom as a product decision, unchanged — cost if wrong: strong gusts show Marginal not Not suitable
