# Soil tests: finding and importing — farm-website

Date: 2026-09-27 · Status: approved 2026-09-27 · UX project 3 of 4 (C) · Depends on project 1 (app shell)

## Goal

At a desk, finding one paddock's tests takes a filter, not a scroll, and a CSV from the lab imports correctly the first time because problems are shown row by row before anything is sent. On a phone, the list is readable.

## Context

- `src/routes/soiltests/+page.svelte` is 2,114 lines in Svelte 4 legacy mode: listing, sorting, search, manual entry, CSV import with job polling, bulk delete and toasts in one file.
- The list renders every test (251 today) in one table; at 390px wide the page is about 23,000px long.
- `GET /api/soil-tests` returns all rows; 251 rows is small enough to filter, sort and paginate in the browser. No backend change is needed.
- The backend import accepts `onDuplicate=skip|replace` (default `skip`), but the frontend never sends it.
- Required CSV headers are `CSV_REQUIRED_HEADERS` in `src/lib/soil-tests/schema.ts`; metric and optional columns are also defined there.

## Decisions

| Decision        | Choice                                                                                                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Structure       | Split into components and `.svelte.ts`/`.ts` modules under `src/routes/soiltests/` and `src/lib/soil-tests/`, all on runes. Behaviour of listing, manual entry, bulk delete and polling is preserved. |
| Filters         | Search (sample name, paddock name, ID), Paddock (select), Year (select from years present). Filters and page number live in the URL: `?q=`, `?paddock=`, `?year=`, `?page=`, `replaceState`.          |
| Pagination      | 25 per page, client-side. "Showing 26–50 of 251" plus Previous / Next and page numbers. Changing a filter resets to page 1.                                                                           |
| Sorting         | Unchanged options (date, sample, paddock, farm, client, any metric), applied before pagination.                                                                                                       |
| Phone layout    | Below `md`, each test is a card: paddock name, sample name, date, then pH, P, K and OM with status dots (Low/Optimal/High from `CONFIG.soilMetrics`). "All results" expands the rest.                 |
| Desktop layout  | The table, with a sticky header and the same status dots beside metric values.                                                                                                                        |
| Import flow     | A stepped dialog: 1 Choose file → 2 Check → 3 Duplicates → 4 Importing → 5 Done. Steps are shown as a numbered progress row.                                                                          |
| Check step      | The CSV is parsed in the browser. Shows row count, first 5 rows, and a list of problems; blocking problems disable Continue. Warnings don't block.                                                    |
| Duplicates step | Only shown when rows match existing tests by `id_sample`: "12 samples are already in the system" with Skip them (default) / Replace them. Sent as `onDuplicate`.                                      |
| Done step       | Inserted / skipped counts and Close. Closing clears the filters and sorts the list newest first so new tests are on page 1.                                                                           |
| Manual entry    | Kept as the other tab of the dialog, unchanged in fields; moved into its own component.                                                                                                               |

### Check-step rules (`validateCsv`)

Blocking:

- A required header is missing (names the header).
- File has no data rows.
- A row's `fieldID` or `id_sample` isn't a whole number, or `sample_date` isn't a parseable date (names row number and column).
- The same `id_sample` appears twice in the file.

Warnings:

- `fieldID` not in the known paddock list ("Row 14: paddock 999 isn't on the farm map").
- A metric cell isn't a number (the backend skips it).
- Unknown columns (listed once; ignored by the backend).

Row numbers count the header as row 1, matching what spreadsheet programs show.

## Architecture

- `src/lib/soil-tests/csv.ts` (new, pure): `parseCsv(text) → { headers: string[]; rows: string[][] }` handling quoted fields, escaped quotes, CRLF, a UTF-8 BOM and a trailing newline.
- `src/lib/soil-tests/validate.ts` (new, pure): `validateCsv(parsed, { knownPaddockIds, existingSampleIds }) → { rowCount; preview; errors: Issue[]; warnings: Issue[]; duplicateSampleIds: string[] }` where `Issue = { row: number | null; column: string | null; message: string }`.
- `src/lib/soil-tests/filters.ts` (new, pure): `filterTests(tests, { q, paddock, year })`, `paginate(list, page, pageSize)`, `yearsIn(tests)`, `parseFilters(url)`/`filtersToSearch(filters)`.
- Status dots use `metricStatus` from `$lib/soil-status` (added by project 1).
- `src/routes/soiltests/components/`: `SoilTestsToolbar`, `SoilTestsTable`, `SoilTestCard`, `Pagination`, `BulkDeleteBar`, `UploadDialog` (tabs), `ManualEntryForm`, `CsvImportWizard`, `ImportSteps`, `Toasts`.
- `src/routes/soiltests/import-job.svelte.ts`: the existing upload + polling state machine as a class with `$state` fields, wrapping `CONFIG.backend.upload.test.import` (now with `?onDuplicate=`), `.status(jobId)` and `.cancel(jobId)`.

`+page.svelte` loads tests, holds filters derived from `page.url`, and composes the components.

## Touch and readability rules for this page

Controls at least 44px tall; no text below 12px; status shown with a word or icon as well as colour.

## Error handling

- List fetch fails: message with Retry in place of the list (as today).
- CSV can't be read as text or parses to nothing: blocking error on the Check step.
- Upload fails or job ends in `error`: the Importing step shows the backend's `detail`/`message` and a "Back to check" button. Polling stops on 404/410 as today.
- Closing the dialog mid-import asks to confirm, then calls the cancel endpoint.

## Testing

- `csv.test.ts`: quoted commas, escaped quotes, CRLF, BOM, blank trailing line, ragged rows.
- `validate.test.ts`: each blocking rule and warning, row numbering, duplicate detection against existing IDs.
- `filters.test.ts`: search across fields, paddock and year filters combined, pagination bounds (page past the end clamps), URL round-trip.
- Component tests: `CsvImportWizard` with a file containing one blocking error disables Continue and lists the row; a file with duplicates shows the Duplicates step and sends `onDuplicate=replace` when chosen (mock `fetch`). `Pagination` announces the range and disables Previous on page 1.
- Existing behaviour: manual entry submit, bulk delete confirm, job polling to completion (mock `fetch`).
- Browser check at 390×844 (cards, filters, paginated length) and 1280×800 (table), plus a real import of `static/samples/soil-tests.csv` against the local backend.

## Files owned

`src/routes/soiltests/**`, `src/lib/soil-tests/**`.

## Out of scope

Editing existing tests in place, server-side pagination, exporting to CSV, charts of a paddock's history.
