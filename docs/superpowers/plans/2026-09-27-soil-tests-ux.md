# Soil tests: finding and importing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Before creating or editing any `.svelte` file or `.svelte.ts` module, load the `svelte:svelte-code-writer` skill and use its documentation lookup and autofixer; every `.svelte` file you change must come back clean from the autofixer. Before building or changing visible UI, load `frontend-design:frontend-design` and read `docs/superpowers/specs/2026-09-27-ui-direction.md`; the direction document wins where they disagree.

**Goal:** Finding one paddock's soil tests takes a filter, not a scroll; a lab CSV is checked row by row in the browser before anything is sent, so it imports correctly the first time; on a phone the list is readable cards.

**Architecture:** The 2,110-line legacy `src/routes/soiltests/+page.svelte` becomes a runes page that composes small components. Pure logic lives in tested modules under `src/lib/soil-tests/` (`csv.ts`, `validate.ts`, `filters.ts`, `sort.ts`, `status.ts`). The upload-and-poll state machine becomes an `ImportJob` class with `$state` fields, and toasts a `Toaster` class. Filters and the page number live in the URL.

**Tech Stack:** Svelte 5.57 (runes, snippets, attachments, `.svelte.ts` classes, `svelte/reactivity` `MediaQuery`, `$app/state`, `$app/navigation` `replaceState`, `$app/paths` `asset`), SvelteKit 2.70, Tailwind 4, Vitest 5 (`server` project for `*.test.ts`, `client` project for `*.svelte.test.ts` in headless Chromium).

**Spec:** `docs/superpowers/specs/2026-09-27-soil-tests-ux-design.md` and `docs/superpowers/specs/2026-09-27-ui-direction.md`. Read both before starting. UX 1 (app shell, `$lib/soil-status`, `StatusBadge`, `scripts/screenshot.mjs`) is on `staging`.

**Where this plan departs from the spec, and why.** The spec's check rules were written before reading the backend (`gbros-api/farmapp/utils.py` `normalise_csv_row`, `store.py` `insert_many_soil_tests`). The backend rejects the _whole import_ on the first bad row, so the check step must block on everything the backend rejects:

| Spec says                                                     | Backend does                                                                                                                   | This plan                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Unknown `fieldID` is a warning                                | `unknown fieldID` fails the import                                                                                             | Blocking, same message ("paddock 999 isn't on the farm map") |
| Non-numeric metric cell is a warning ("the backend skips it") | `P must be a number` fails the import; blank, `NA`, `n/a`, `null` are empty; commas are stripped; a leading number is accepted | Blocking, using the backend's rules                          |
| Duplicates match on `id_sample`                               | Matches on `fieldID` + `id_sample`                                                                                             | Match on the pair                                            |
| `sample_date` must parse                                      | All digits = Excel serial date; otherwise ISO `YYYY-MM-DD` (optionally with a time)                                            | Same rules; the lab's own sample file uses serials           |
| —                                                             | `name_sample` is required per row                                                                                              | Blocking                                                     |
| —                                                             | A row with no metric values is skipped                                                                                         | Warning: "Row 7 has no test results and will be skipped."    |

## Global Constraints

- Work only in your own worktree under `.claude/worktrees/`. Never edit or switch branches in the main checkout (`/home/tom/gbros/farm-website`).
- Setup: run `npm ci` in the worktree. If it fails with `Tsconfig not found .../.svelte-kit/tsconfig.json`, run `npx svelte-kit sync` in the main checkout and retry. Run `npx playwright install chromium` if browser tests say Chromium is missing.
- Before your first commit, move off the `worktree-<name>` branch: `git fetch origin`, `git switch --no-track -c feat/soil-tests-ux origin/staging`, then `git branch -d <the worktree-… branch>`.
- Before changing anything, record the ESLint baseline: `npx eslint src 2>&1 | tail -3`. At the end, the error count must be less than or equal to it.
- Runes only in new or rewritten Svelte code: no `export let`, `$:`, `<slot>`, `on:`, `use:`, `createEventDispatcher`, `class:` or `$app/stores`.
- Behaviour of listing, manual entry, bulk delete and job polling is preserved (same endpoints, payloads and messages unless this plan changes them).
- Internal links use `resolve()`; static files use `asset()` (both from `$app/paths`).
- The shell renders the app's only `<main>`. The page has exactly one `<h1>`.
- Smallest text is 12px (`text-xs`); no `text-[10px]`/`text-[11px]`. Controls are at least 44px tall (`min-h-11`). No `→` appended to link text, no ALL-CAPS labels. Status is shown with a word or icon as well as colour.
- Copy: buttons are verbs and an action keeps its name through the flow ("Import tests" → "Importing…" → "Imported 48 tests"). Errors say what happened and what to do.
- In component tests, `$app/paths` is mocked: `vi.mock('$app/paths', () => ({ resolve: (path: string) => path, asset: (path: string) => path }))`. Tests of components with icon-only buttons import `src/app.css` (relative path), or clicks miss unsized SVGs.
- Prettier: tabs, single quotes, no trailing commas, width 100. Run `npx prettier --write` on the files you touch.
- Files you may touch: `src/routes/soiltests/**` and `src/lib/soil-tests/**`. UX 2 owns the map, UX 4 owns `src/app.css`, `src/lib/config.ts`, weather and the home page. Don't touch them.
- Before pushing: `npm run check`, `npm test`, `npx prettier --check .`, `npm run build`, `scripts/smoke-test.sh --local` must all pass.
- Push the branch and open a PR into `staging` (`--base staging`) that says `Closes #17`. Don't merge it.

## Review Focus

1. The lab's file uses Excel date numbers (`45888`), as `static/samples/soil-tests.csv` does → accepted as dates, not blocked (Task 2 test).
2. A CSV saved by Excel with a UTF-8 BOM and CRLF line endings, or with a quoted field containing a comma or a newline → headers and cells come through intact (Task 1 tests).
3. Metric cells that are blank, `NA`, `n/a`, `null` or `1,234` → not errors, because the backend accepts them (Task 2 test).
4. The import job disappears while polling (404/410) or the upload is refused with a FastAPI `{"detail": "…"}` body → the Importing step shows that message with "Back to check", and polling stops (Task 4 tests).
5. `/soiltests?page=99` or a filter that matches nothing → the page number clamps to the last page, or "No tests match these filters." with a Clear filters button, never an empty table (Task 3 and Task 8 tests).

---

### Task 1: CSV parser

**Files:**

- Create: `src/lib/soil-tests/csv.ts`
- Create: `src/lib/soil-tests/csv.test.ts`

**Interfaces:**

- Produces: `type ParsedCsv = { headers: string[]; rows: string[][] }` and `parseCsv(text: string): ParsedCsv`. Headers are trimmed. Blank lines are dropped (the backend's `csv.DictReader` skips them too, so row numbers match its messages). Rows keep their own length (ragged rows aren't padded).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/soil-tests/csv.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { parseCsv } from './csv';

describe('parseCsv', () => {
	it('reads headers and rows', () => {
		expect(parseCsv('a,b\n1,2\n3,4')).toEqual({
			headers: ['a', 'b'],
			rows: [
				['1', '2'],
				['3', '4']
			]
		});
	});

	it('keeps commas, escaped quotes and newlines inside quoted fields', () => {
		expect(parseCsv('name,note\n"Smith, J","said ""hi""\nthen left"').rows).toEqual([
			['Smith, J', 'said "hi"\nthen left']
		]);
	});

	it('handles CRLF line endings and a UTF-8 BOM', () => {
		expect(parseCsv('﻿fieldID,id_sample\r\n42,1001\r\n')).toEqual({
			headers: ['fieldID', 'id_sample'],
			rows: [['42', '1001']]
		});
	});

	it('ignores a trailing newline and blank lines', () => {
		expect(parseCsv('a\n1\n\n2\n\n').rows).toEqual([['1'], ['2']]);
	});

	it('keeps ragged rows as they are', () => {
		expect(parseCsv('a,b,c\n1\n1,2,3,4').rows).toEqual([['1'], ['1', '2', '3', '4']]);
	});

	it('trims headers but not cells', () => {
		expect(parseCsv(' a , b \n 1 ,2')).toEqual({ headers: ['a', 'b'], rows: [[' 1 ', '2']] });
	});

	it('returns nothing for empty text', () => {
		expect(parseCsv('')).toEqual({ headers: [], rows: [] });
	});
});
```

Run: `npx vitest run --project server src/lib/soil-tests/csv.test.ts`
Expected: FAIL, "Failed to resolve import './csv'".

- [ ] **Step 2: Create `src/lib/soil-tests/csv.ts`**

```ts
export type ParsedCsv = { headers: string[]; rows: string[][] };

/**
 * RFC 4180-style parsing: quoted fields (with commas, newlines and "" escapes), CRLF or LF line
 * endings, and an optional UTF-8 BOM. Blank lines are dropped, as the backend's csv reader does.
 */
export function parseCsv(text: string): ParsedCsv {
	const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
	const records: string[][] = [];
	let record: string[] = [];
	let field = '';
	let quoted = false;

	for (let i = 0; i < input.length; i += 1) {
		const char = input[i];
		if (quoted) {
			if (char === '"' && input[i + 1] === '"') {
				field += '"';
				i += 1;
			} else if (char === '"') {
				quoted = false;
			} else {
				field += char;
			}
		} else if (char === '"' && field === '') {
			quoted = true;
		} else if (char === ',') {
			record.push(field);
			field = '';
		} else if (char === '\r' || char === '\n') {
			record.push(field);
			records.push(record);
			record = [];
			field = '';
			if (char === '\r' && input[i + 1] === '\n') i += 1;
		} else {
			field += char;
		}
	}
	if (field !== '' || record.length > 0) {
		record.push(field);
		records.push(record);
	}

	const lines = records.filter((cells) => !(cells.length === 1 && cells[0].trim() === ''));
	const [headerRow = [], ...rows] = lines;
	return { headers: headerRow.map((header) => header.trim()), rows };
}
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run --project server src/lib/soil-tests/csv.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/soil-tests/csv.ts src/lib/soil-tests/csv.test.ts
git commit -m "Add a CSV parser for checking soil test files in the browser"
```

---

### Task 2: CSV check rules

**Files:**

- Create: `src/lib/soil-tests/validate.ts`
- Create: `src/lib/soil-tests/validate.test.ts`

**Interfaces:**

- Consumes: `ParsedCsv` (Task 1); `CSV_REQUIRED_HEADERS`, `metricColumns`, `optionalColumns` from `./schema`.
- Produces (`src/lib/soil-tests/validate.ts`):
  - `type Issue = { row: number | null; column: string | null; message: string }`
  - `type CsvCheck = { rowCount: number; preview: ParsedCsv; errors: Issue[]; warnings: Issue[]; duplicateSampleIds: string[] }`
  - `type CheckContext = { knownPaddockIds: ReadonlySet<number>; existingSamples: ReadonlySet<string> }`
  - `sampleKey(fieldId: number | string, sampleId: number | string): string` (`"42:1001"`; the pair the backend treats as the same test)
  - `isImportableDate(text: string): boolean`
  - `validateCsv(parsed: ParsedCsv, context: CheckContext): CsvCheck`
- Rules: see the table at the top of this plan. Row numbers count the header as row 1. When `knownPaddockIds` is empty (the paddock list failed to load), the paddock check is skipped rather than blocking every row.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/soil-tests/validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { parseCsv } from './csv';
import { isImportableDate, sampleKey, validateCsv } from './validate';

const header = 'id_sample,fieldID,sample_date,name_sample,P,ph_water';
const context = { knownPaddockIds: new Set([42, 7]), existingSamples: new Set<string>() };
const check = (text: string, ctx = context) => validateCsv(parseCsv(text), ctx);
const messages = (issues: { message: string }[]) => issues.map((issue) => issue.message);

describe('isImportableDate', () => {
	it.each(['2024-05-01', '2024-05-01T09:30:00', '2024-05-01 09:30', '45888'])(
		'accepts %s',
		(value) => {
			expect(isImportableDate(value)).toBe(true);
		}
	);

	it.each(['', '01/05/2024', '2024-02-30', '2024-13-01', 'May 2024'])('rejects "%s"', (value) => {
		expect(isImportableDate(value)).toBe(false);
	});
});

describe('validateCsv', () => {
	it('passes a clean file and previews the first five rows', () => {
		const rows = Array.from({ length: 7 }, (_, i) => `${1000 + i},42,2024-05-01,S${i},50,6.1`);
		const result = check([header, ...rows].join('\n'));

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
		expect(result.rowCount).toBe(7);
		expect(result.preview.rows).toHaveLength(5);
		expect(result.preview.headers).toEqual(header.split(','));
	});

	it('accepts the lab sample file, which uses Excel date numbers', () => {
		const lab =
			'id_sample,fieldID,sample_date,client,grower,crop,name_sample,P,olsen_P,K\n' +
			'250814116,42,45888,E E MUIR,GREENHILL BROS,SOIL (Potato),ES22,82.64,,398.88';
		expect(check(lab).errors).toEqual([]);
	});

	it('names each missing required header and stops there', () => {
		const result = check('fieldID,P\n42,50');
		expect(messages(result.errors)).toEqual([
			'The file has no “id_sample” column.',
			'The file has no “name_sample” column.',
			'The file has no “sample_date” column.'
		]);
	});

	it('blocks a file with no data rows', () => {
		expect(messages(check(header).errors)).toEqual(['The file has no data rows.']);
	});

	it('reports bad cells by row number, counting the header as row 1', () => {
		const result = check(
			[
				header,
				'1001,42,2024-05-01,A,50,6.1',
				'x1,4.5,01/05/2024,,50,6.1',
				'1003,999,2024-05-01,C,abc,6.1'
			].join('\n')
		);

		expect(result.errors).toEqual([
			{ row: 3, column: 'fieldID', message: 'Row 3: fieldID “4.5” isn’t a whole number.' },
			{ row: 3, column: 'id_sample', message: 'Row 3: id_sample “x1” isn’t a whole number.' },
			{ row: 3, column: 'name_sample', message: 'Row 3: name_sample is empty.' },
			{
				row: 3,
				column: 'sample_date',
				message: 'Row 3: sample_date “01/05/2024” isn’t a date. Use YYYY-MM-DD.'
			},
			{ row: 4, column: 'fieldID', message: 'Row 4: paddock 999 isn’t on the farm map.' },
			{ row: 4, column: 'P', message: 'Row 4: P “abc” isn’t a number.' }
		]);
	});

	it('treats blank, NA, n/a, null and thousands separators as the backend does', () => {
		const result = check(
			[header, '1001,42,2024-05-01,A,,NA', '1002,42,2024-05-01,B,1,234,n/a'].join('\n')
		);
		// Row 3 is ragged after the comma in "1,234"; only real errors count.
		expect(messages(result.errors)).toEqual([]);
		expect(check([header, '1002,42,2024-05-01,B,"1,234",null'].join('\n')).errors).toEqual([]);
	});

	it('warns about a row without any results, which the backend skips', () => {
		const result = check([header, '1001,42,2024-05-01,A,,'].join('\n'));
		expect(result.errors).toEqual([]);
		expect(messages(result.warnings)).toEqual(['Row 2 has no test results and will be skipped.']);
	});

	it('warns once about columns the backend ignores', () => {
		const result = check(
			[
				'id_sample,fieldID,sample_date,name_sample,P,colour,notes',
				'1001,42,2024-05-01,A,5,red,x'
			].join('\n')
		);
		expect(messages(result.warnings)).toEqual(['These columns will be ignored: colour, notes.']);
	});

	it('blocks the same sample twice in one file', () => {
		const result = check(
			[
				header,
				'1001,42,2024-05-01,A,5,6',
				'1001,42,2024-06-01,B,5,6',
				'1001,7,2024-05-01,C,5,6'
			].join('\n')
		);
		expect(messages(result.errors)).toEqual([
			'Row 3: sample 1001 for paddock 42 is already on row 2.'
		]);
	});

	it('lists samples that are already in the system, matched on paddock and sample', () => {
		const result = check(
			[
				header,
				'1001,42,2024-05-01,A,5,6',
				'1002,42,2024-05-01,B,5,6',
				'1001,7,2024-05-01,C,5,6'
			].join('\n'),
			{ ...context, existingSamples: new Set([sampleKey(42, 1001), sampleKey(42, 1002)]) }
		);
		expect(result.errors).toEqual([]);
		expect(result.duplicateSampleIds).toEqual(['1001', '1002']);
	});

	it('skips the paddock check when the paddock list is unavailable', () => {
		const result = check([header, '1001,999,2024-05-01,A,5,6'].join('\n'), {
			knownPaddockIds: new Set(),
			existingSamples: new Set()
		});
		expect(result.errors).toEqual([]);
	});
});
```

Run: `npx vitest run --project server src/lib/soil-tests/validate.test.ts`
Expected: FAIL, "Failed to resolve import './validate'".

- [ ] **Step 2: Create `src/lib/soil-tests/validate.ts`**

```ts
import type { ParsedCsv } from './csv';
import { CSV_REQUIRED_HEADERS, metricColumns, optionalColumns } from './schema';

export type Issue = { row: number | null; column: string | null; message: string };
export type CsvCheck = {
	rowCount: number;
	preview: ParsedCsv;
	errors: Issue[];
	warnings: Issue[];
	duplicateSampleIds: string[];
};
export type CheckContext = {
	knownPaddockIds: ReadonlySet<number>;
	existingSamples: ReadonlySet<string>;
};

// These rules mirror gbros-api's normalise_csv_row, which rejects the whole import on a bad row.
const METRIC_HEADERS = new Set<string>([
	...metricColumns.map((column) => column.key),
	...optionalColumns.map((column) => column.key),
	'pH'
]);
const KNOWN_HEADERS = new Set<string>([
	...CSV_REQUIRED_HEADERS,
	'client',
	'grower',
	'crop',
	...METRIC_HEADERS
]);
const WHOLE_NUMBER = /^[+-]?\d+$/;
const NUMBER_PREFIX = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
const EMPTY_METRIC = new Set(['', 'na', 'n/a', 'null']);
const ISO_DATE =
	/^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** The pair the backend treats as the same soil test. */
export function sampleKey(fieldId: number | string, sampleId: number | string): string {
	return `${Number(fieldId)}:${Number(sampleId)}`;
}

/** All digits (an Excel date number) or an ISO date, optionally with a time. */
export function isImportableDate(text: string): boolean {
	const value = text.trim();
	if (/^\d+$/.test(value)) return true;
	const match = ISO_DATE.exec(value);
	if (!match) return false;
	const [year, month, day] = match.slice(1, 4).map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
}

export function validateCsv(parsed: ParsedCsv, context: CheckContext): CsvCheck {
	const { headers, rows } = parsed;
	const errors: Issue[] = [];
	const warnings: Issue[] = [];
	const duplicates = new Set<string>();
	const result = () => ({
		rowCount: rows.length,
		preview: { headers, rows: rows.slice(0, 5) },
		errors,
		warnings,
		duplicateSampleIds: [...duplicates]
	});

	const missing = CSV_REQUIRED_HEADERS.filter((name) => !headers.includes(name));
	for (const name of missing) {
		errors.push({ row: null, column: name, message: `The file has no “${name}” column.` });
	}
	if (missing.length > 0) return result();
	if (rows.length === 0) {
		errors.push({ row: null, column: null, message: 'The file has no data rows.' });
		return result();
	}

	const unknown = headers.filter((name) => name !== '' && !KNOWN_HEADERS.has(name));
	if (unknown.length > 0) {
		warnings.push({
			row: null,
			column: null,
			message: `These columns will be ignored: ${unknown.join(', ')}.`
		});
	}

	const column = (name: string) => headers.indexOf(name);
	const metricIndexes = headers
		.map((name, index) => ({ name, index }))
		.filter(({ name }) => METRIC_HEADERS.has(name));
	const firstRowOf = new Map<string, number>();

	rows.forEach((cells, index) => {
		const row = index + 2;
		const cell = (name: string) => (cells[column(name)] ?? '').trim();
		const fail = (name: string, message: string) =>
			errors.push({ row, column: name, message: `Row ${row}: ${message}` });

		const fieldText = cell('fieldID');
		const sampleText = cell('id_sample');
		const fieldOk = WHOLE_NUMBER.test(fieldText);
		const sampleOk = WHOLE_NUMBER.test(sampleText);

		if (!fieldOk) {
			fail(
				'fieldID',
				fieldText ? `fieldID “${fieldText}” isn’t a whole number.` : 'fieldID is empty.'
			);
		} else if (
			context.knownPaddockIds.size > 0 &&
			!context.knownPaddockIds.has(Number(fieldText))
		) {
			fail('fieldID', `paddock ${Number(fieldText)} isn’t on the farm map.`);
		}
		if (!sampleOk) {
			fail(
				'id_sample',
				sampleText ? `id_sample “${sampleText}” isn’t a whole number.` : 'id_sample is empty.'
			);
		}
		if (cell('name_sample') === '') fail('name_sample', 'name_sample is empty.');

		const date = cell('sample_date');
		if (!isImportableDate(date)) {
			fail(
				'sample_date',
				date ? `sample_date “${date}” isn’t a date. Use YYYY-MM-DD.` : 'sample_date is empty.'
			);
		}

		let hasResult = false;
		for (const { name, index: cellIndex } of metricIndexes) {
			const raw = (cells[cellIndex] ?? '').trim();
			if (EMPTY_METRIC.has(raw.toLowerCase())) continue;
			if (NUMBER_PREFIX.test(raw.replaceAll(',', ''))) hasResult = true;
			else fail(name, `${name} “${raw}” isn’t a number.`);
		}
		if (!hasResult) {
			warnings.push({
				row,
				column: null,
				message: `Row ${row} has no test results and will be skipped.`
			});
		}

		if (fieldOk && sampleOk) {
			const key = sampleKey(fieldText, sampleText);
			const earlier = firstRowOf.get(key);
			if (earlier !== undefined) {
				fail(
					'id_sample',
					`sample ${Number(sampleText)} for paddock ${Number(fieldText)} is already on row ${earlier}.`
				);
			} else {
				firstRowOf.set(key, row);
				if (context.existingSamples.has(key)) duplicates.add(String(Number(sampleText)));
			}
		}
	});

	return result();
}
```

Note on the thousands-separator test: an unquoted `1,234` splits into two cells, just as it does for the backend's reader, so the file is ragged but not an error; the quoted form is the real case.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run --project server src/lib/soil-tests/validate.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/soil-tests/validate.ts src/lib/soil-tests/validate.test.ts
git commit -m "Check soil test CSVs row by row with the backend's own rules"
```

---

### Task 3: Filtering, pagination, sorting and status

**Files:**

- Create: `src/lib/soil-tests/filters.ts`
- Create: `src/lib/soil-tests/filters.test.ts`
- Create: `src/lib/soil-tests/sort.ts`
- Create: `src/lib/soil-tests/sort.test.ts`
- Create: `src/lib/soil-tests/status.ts`
- Create: `src/lib/soil-tests/status.test.ts`
- Modify: `src/lib/soil-tests/schema.ts` (add `organicMatter?: number` to `SoilTest`)
- Modify: `src/lib/soil-tests/utils.ts` (fill `organicMatter`)

**Interfaces:**

- Consumes: `SoilTest`, `MetricKey`, `metricColumns` from `./schema`; `metricStatus`, `MetricStatus`, `pickMetricValue` from `$lib/soil-status`; `CONFIG.soilMetrics`.
- Produces (`filters.ts`):
  - `type Filters = { q: string; paddock: number | null; year: number | null; page: number }`, `EMPTY_FILTERS`, `PAGE_SIZE = 25`
  - `yearOf(test: Pick<SoilTest, 'sampleDate'>): number | null`
  - `filterTests(tests: readonly SoilTest[], filters: Pick<Filters, 'q' | 'paddock' | 'year'>): SoilTest[]`
  - `type PageSlice<T> = { items: T[]; page: number; pageCount: number; total: number; start: number; end: number }` (`start`/`end` are 1-based and inclusive; both 0 when empty)
  - `paginate<T>(list: readonly T[], page: number, pageSize?: number): PageSlice<T>` (clamps the page)
  - `pageList(page: number, pageCount: number): (number | null)[]` (`null` is a gap)
  - `yearsIn(tests: readonly SoilTest[]): number[]` (newest first)
  - `parseFilters(url: URL): Filters`, `filtersToSearch(filters: Filters): string` (`''` or `?…`)
- Produces (`sort.ts`): `PrimarySortColumn`, `SortState`, `DEFAULT_SORT`, `sortTests(list, state): SoilTest[]` (missing values always last), `nextSort(state, column: PrimarySortColumn | MetricKey): SortState`, `describeSort(state): string`, `SORT_PRESETS: { label: string; state: SortState }[]`, `sortId(state): string`.
- Produces (`status.ts`): `testMetricStatus(key: MetricKey | 'OM', value: number | null | undefined): MetricStatus` (`'no-range'` for metrics without a configured optimal range: S and Na).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/soil-tests/filters.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
	EMPTY_FILTERS,
	filterTests,
	filtersToSearch,
	pageList,
	paginate,
	parseFilters,
	yearsIn
} from './filters';
import type { SoilTest } from './schema';

const test = (overrides: Partial<SoilTest>): SoilTest => ({
	id: 1,
	fieldId: 42,
	paddockName: 'North flat',
	sampleId: 1001,
	sampleName: 'NF-1',
	sampleDate: '2024-05-01',
	farm: 'Home',
	metrics: {},
	...overrides
});

const tests = [
	test({ id: 1 }),
	test({ id: 2, fieldId: 7, paddockName: 'Creek', sampleName: 'CR-9', sampleDate: '2023-03-01' }),
	test({ id: 3, fieldId: 7, paddockName: 'Creek', sampleId: 555, sampleDate: '2024-01-10' }),
	test({ id: 4, sampleDate: null })
];
const ids = (list: SoilTest[]) => list.map((item) => item.id);

describe('filterTests', () => {
	it('searches paddock name, sample name, sample ID, field ID and farm', () => {
		expect(ids(filterTests(tests, { q: 'creek', paddock: null, year: null }))).toEqual([2, 3]);
		expect(ids(filterTests(tests, { q: 'cr-9', paddock: null, year: null }))).toEqual([2]);
		expect(ids(filterTests(tests, { q: '555', paddock: null, year: null }))).toEqual([3]);
		expect(ids(filterTests(tests, { q: ' 42 ', paddock: null, year: null }))).toEqual([1, 4]);
	});

	it('combines the paddock and year filters', () => {
		expect(ids(filterTests(tests, { q: '', paddock: 7, year: 2024 }))).toEqual([3]);
		expect(ids(filterTests(tests, { q: '', paddock: 42, year: 2023 }))).toEqual([]);
	});
});

describe('paginate', () => {
	const list = Array.from({ length: 30 }, (_, i) => i + 1);

	it('slices a page and reports the range', () => {
		expect(paginate(list, 2)).toMatchObject({
			page: 2,
			pageCount: 2,
			total: 30,
			start: 26,
			end: 30
		});
		expect(paginate(list, 2).items).toEqual([26, 27, 28, 29, 30]);
	});

	it('clamps a page past the end, or below 1', () => {
		expect(paginate(list, 99).page).toBe(2);
		expect(paginate(list, 0).page).toBe(1);
		expect(paginate(list, Number.NaN).page).toBe(1);
	});

	it('reports an empty list as one empty page', () => {
		expect(paginate([], 3)).toEqual({
			items: [],
			page: 1,
			pageCount: 1,
			total: 0,
			start: 0,
			end: 0
		});
	});
});

describe('pageList', () => {
	it('shows the first, last and neighbouring pages with gaps', () => {
		expect(pageList(1, 1)).toEqual([1]);
		expect(pageList(1, 3)).toEqual([1, 2, 3]);
		expect(pageList(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
		expect(pageList(10, 10)).toEqual([1, null, 9, 10]);
	});
});

describe('yearsIn', () => {
	it('lists each year once, newest first', () => {
		expect(yearsIn(tests)).toEqual([2024, 2023]);
	});
});

describe('URL round trip', () => {
	it('reads and writes filters', () => {
		const filters = { q: 'north flat', paddock: 42, year: 2024, page: 3 };
		const url = new URL(`http://localhost/soiltests${filtersToSearch(filters)}`);
		expect(parseFilters(url)).toEqual(filters);
	});

	it('leaves defaults out of the URL and ignores junk', () => {
		expect(filtersToSearch(EMPTY_FILTERS)).toBe('');
		expect(parseFilters(new URL('http://localhost/soiltests?paddock=abc&year=&page=-2'))).toEqual(
			EMPTY_FILTERS
		);
	});
});
```

Create `src/lib/soil-tests/sort.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { SoilTest } from './schema';
import { DEFAULT_SORT, describeSort, nextSort, sortTests } from './sort';

const test = (id: number, sampleDate: string | null, P?: number): SoilTest => ({
	id,
	fieldId: 1,
	paddockName: `P${id}`,
	sampleId: id,
	sampleDate,
	metrics: P === undefined ? {} : { P }
});
const ids = (list: SoilTest[]) => list.map((item) => item.id);
const list = [test(1, '2023-01-01', 30), test(2, null, 90), test(3, '2024-01-01')];

describe('sortTests', () => {
	it('sorts newest first by default, with undated tests last', () => {
		expect(ids(sortTests(list, DEFAULT_SORT))).toEqual([3, 1, 2]);
		expect(ids(sortTests(list, { type: 'date', direction: 'asc' }))).toEqual([1, 3, 2]);
	});

	it('sorts by a metric with missing values last in both directions', () => {
		expect(ids(sortTests(list, { type: 'metric', key: 'P', direction: 'desc' }))).toEqual([
			2, 1, 3
		]);
		expect(ids(sortTests(list, { type: 'metric', key: 'P', direction: 'asc' }))).toEqual([1, 2, 3]);
	});
});

describe('nextSort', () => {
	it('flips a primary column, and starts dates newest first and text A to Z', () => {
		expect(nextSort(DEFAULT_SORT, 'date')).toEqual({ type: 'date', direction: 'asc' });
		expect(nextSort(DEFAULT_SORT, 'paddock')).toEqual({ type: 'paddock', direction: 'asc' });
	});

	it('cycles a metric: highest first, lowest first, then back to the default', () => {
		const first = nextSort(DEFAULT_SORT, 'P');
		expect(first).toEqual({ type: 'metric', key: 'P', direction: 'desc' });
		const second = nextSort(first, 'P');
		expect(second).toEqual({ type: 'metric', key: 'P', direction: 'asc' });
		expect(nextSort(second, 'P')).toEqual(DEFAULT_SORT);
	});
});

describe('describeSort', () => {
	it('says how the list is ordered in words', () => {
		expect(describeSort(DEFAULT_SORT)).toBe('Newest first');
		expect(describeSort({ type: 'metric', key: 'ph_water', direction: 'asc' })).toBe(
			'pH (H2O), lowest first'
		);
	});
});
```

Create `src/lib/soil-tests/status.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { testMetricStatus } from './status';

describe('testMetricStatus', () => {
	it('uses the optimal ranges from the map config', () => {
		expect(testMetricStatus('ph_water', 5.5)).toBe('low');
		expect(testMetricStatus('Mg', 300)).toBe('optimal');
		expect(testMetricStatus('P', 120)).toBe('high');
		expect(testMetricStatus('OM', 4)).toBe('optimal');
	});

	it('has no status for metrics without a range, and no data for missing values', () => {
		expect(testMetricStatus('S', 10)).toBe('no-range');
		expect(testMetricStatus('P', undefined)).toBe('no-data');
	});
});
```

Run: `npx vitest run --project server src/lib/soil-tests/filters.test.ts src/lib/soil-tests/sort.test.ts src/lib/soil-tests/status.test.ts`
Expected: FAIL, the three modules don't exist.

- [ ] **Step 2: Create `src/lib/soil-tests/filters.ts`**

```ts
import type { SoilTest } from './schema';

export type Filters = { q: string; paddock: number | null; year: number | null; page: number };
export type PageSlice<T> = {
	items: T[];
	page: number;
	pageCount: number;
	total: number;
	start: number;
	end: number;
};

export const PAGE_SIZE = 25;
export const EMPTY_FILTERS: Filters = { q: '', paddock: null, year: null, page: 1 };

export function yearOf(test: Pick<SoilTest, 'sampleDate'>): number | null {
	const match = /^(\d{4})-/.exec(test.sampleDate ?? '');
	return match ? Number(match[1]) : null;
}

export function filterTests(
	tests: readonly SoilTest[],
	{ q, paddock, year }: Pick<Filters, 'q' | 'paddock' | 'year'>
): SoilTest[] {
	const term = q.trim().toLowerCase();
	return tests.filter((test) => {
		if (paddock !== null && test.fieldId !== paddock) return false;
		if (year !== null && yearOf(test) !== year) return false;
		if (term === '') return true;
		const haystack =
			`${test.paddockName} ${test.fieldId} ${test.sampleName ?? ''} ${test.sampleId} ${test.farm ?? ''}`.toLowerCase();
		return haystack.includes(term);
	});
}

export function paginate<T>(list: readonly T[], page: number, pageSize = PAGE_SIZE): PageSlice<T> {
	const total = list.length;
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
	const startIndex = (current - 1) * pageSize;
	const items = list.slice(startIndex, startIndex + pageSize);
	return {
		items,
		page: current,
		pageCount,
		total,
		start: total === 0 ? 0 : startIndex + 1,
		end: startIndex + items.length
	};
}

/** Page numbers to show: first, last, and the current page's neighbours; null marks a gap. */
export function pageList(page: number, pageCount: number): (number | null)[] {
	const wanted = [...new Set([1, page - 1, page, page + 1, pageCount])]
		.filter((n) => n >= 1 && n <= pageCount)
		.sort((a, b) => a - b);
	const out: (number | null)[] = [];
	wanted.forEach((n, index) => {
		if (index > 0 && n - wanted[index - 1] > 1) out.push(null);
		out.push(n);
	});
	return out;
}

export function yearsIn(tests: readonly SoilTest[]): number[] {
	const years = new Set<number>();
	for (const test of tests) {
		const year = yearOf(test);
		if (year !== null) years.add(year);
	}
	return [...years].sort((a, b) => b - a);
}

const positiveInt = (value: string | null) =>
	value !== null && /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : null;

export function parseFilters(url: URL): Filters {
	const params = url.searchParams;
	return {
		q: params.get('q') ?? '',
		paddock: positiveInt(params.get('paddock')),
		year: positiveInt(params.get('year')),
		page: positiveInt(params.get('page')) ?? 1
	};
}

export function filtersToSearch(filters: Filters): string {
	const params = new URLSearchParams();
	if (filters.q.trim() !== '') params.set('q', filters.q);
	if (filters.paddock !== null) params.set('paddock', String(filters.paddock));
	if (filters.year !== null) params.set('year', String(filters.year));
	if (filters.page > 1) params.set('page', String(filters.page));
	const search = params.toString();
	return search ? `?${search}` : '';
}
```

- [ ] **Step 3: Create `src/lib/soil-tests/sort.ts`**

The sort logic from the old page (its `sortTests`, `togglePrimarySort`, `toggleMetricSort` and `currentSortDescription`), with one change: tests missing the sorted value now go last in both directions.

```ts
import { metricColumns, type MetricKey, type SoilTest } from './schema';

export type PrimarySortColumn = 'date' | 'sample' | 'paddock' | 'farm' | 'client';
export type SortState =
	| { type: PrimarySortColumn; direction: 'asc' | 'desc' }
	| { type: 'metric'; key: MetricKey; direction: 'asc' | 'desc' };

export const DEFAULT_SORT: SortState = { type: 'date', direction: 'desc' };

const PRIMARY: readonly string[] = ['date', 'sample', 'paddock', 'farm', 'client'];
const TEXT_KEYS: Record<Exclude<PrimarySortColumn, 'date'>, (test: SoilTest) => string> = {
	sample: (test) => test.sampleName ?? '',
	paddock: (test) => test.paddockName,
	farm: (test) => test.farm ?? '',
	client: (test) => test.client ?? ''
};

/** Missing values sort last whichever way the list is ordered. */
function byNumber(a: number | undefined, b: number | undefined, sign: number) {
	const aMissing = a === undefined || Number.isNaN(a);
	const bMissing = b === undefined || Number.isNaN(b);
	if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
	return sign * (a - b);
}

const dateMs = (test: SoilTest) =>
	test.sampleDate ? new Date(test.sampleDate).getTime() : undefined;

export function sortTests(list: readonly SoilTest[], state: SortState): SoilTest[] {
	const sign = state.direction === 'desc' ? -1 : 1;
	const copy = [...list];
	if (state.type === 'metric') {
		return copy.sort((a, b) => byNumber(a.metrics[state.key], b.metrics[state.key], sign));
	}
	if (state.type === 'date') {
		return copy.sort((a, b) => byNumber(dateMs(a), dateMs(b), sign));
	}
	const key = TEXT_KEYS[state.type];
	return copy.sort(
		(a, b) => sign * key(a).localeCompare(key(b), undefined, { numeric: true, sensitivity: 'base' })
	);
}

export function nextSort(state: SortState, column: PrimarySortColumn | MetricKey): SortState {
	if (PRIMARY.includes(column)) {
		const primary = column as PrimarySortColumn;
		if (state.type === primary) {
			return { type: primary, direction: state.direction === 'desc' ? 'asc' : 'desc' };
		}
		return { type: primary, direction: primary === 'date' ? 'desc' : 'asc' };
	}
	const key = column as MetricKey;
	if (state.type === 'metric' && state.key === key) {
		return state.direction === 'desc' ? { type: 'metric', key, direction: 'asc' } : DEFAULT_SORT;
	}
	return { type: 'metric', key, direction: 'desc' };
}

const PRIMARY_LABELS: Record<Exclude<PrimarySortColumn, 'date'>, string> = {
	sample: 'Sample name',
	paddock: 'Paddock',
	farm: 'Farm',
	client: 'Client'
};

export function describeSort(state: SortState): string {
	if (state.type === 'date') return state.direction === 'desc' ? 'Newest first' : 'Oldest first';
	if (state.type === 'metric') {
		const label = metricColumns.find((column) => column.key === state.key)?.label ?? state.key;
		return `${label}, ${state.direction === 'desc' ? 'highest' : 'lowest'} first`;
	}
	return `${PRIMARY_LABELS[state.type]}, ${state.direction === 'asc' ? 'A to Z' : 'Z to A'}`;
}

export function sortId(state: SortState): string {
	return state.type === 'metric'
		? `metric:${state.key}:${state.direction}`
		: `${state.type}:${state.direction}`;
}

/** The orders offered on phones, where there are no column headers to tap. */
export const SORT_PRESETS: { label: string; state: SortState }[] = [
	{ label: 'Newest first', state: DEFAULT_SORT },
	{ label: 'Oldest first', state: { type: 'date', direction: 'asc' } },
	{ label: 'Paddock, A to Z', state: { type: 'paddock', direction: 'asc' } },
	{ label: 'Sample name, A to Z', state: { type: 'sample', direction: 'asc' } }
];
```

- [ ] **Step 4: Create `src/lib/soil-tests/status.ts`**

```ts
import CONFIG from '$lib/config';
import { metricStatus, type MetricStatus } from '$lib/soil-status';
import type { MetricKey } from './schema';

// Soil test columns → the map's metric ids, which carry the optimal ranges.
const CONFIG_ID_BY_KEY: Partial<Record<MetricKey | 'OM', string>> = {
	P: 'P',
	K: 'K',
	Ca: 'Ca',
	Mg: 'M',
	ph_water: 'pH',
	OM: 'OM'
};

export function testMetricStatus(
	key: MetricKey | 'OM',
	value: number | null | undefined
): MetricStatus {
	const metric = CONFIG.soilMetrics.find((option) => option.id === CONFIG_ID_BY_KEY[key]);
	return metric ? metricStatus(value, metric) : 'no-range';
}
```

- [ ] **Step 5: Add organic matter to `SoilTest`**

In `src/lib/soil-tests/schema.ts`, add to the `SoilTest` type after `metrics`:

```ts
	/** Organic matter from OM or total carbon columns, for the phone card. */
	organicMatter?: number;
```

In `src/lib/soil-tests/utils.ts`, add `import { pickMetricValue } from '$lib/soil-status';` and, in the object returned for each row in `fetchSoilTests`, change the last property `metrics` to `metrics,` and add after it:

```ts
				organicMatter: pickMetricValue(row, 'OM') ?? undefined,
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run --project server src/lib/soil-tests && npm run check`
Expected: PASS (including the existing `utils.test.ts`), no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/soil-tests
git commit -m "Add tested filtering, pagination, sorting and status for soil tests"
```

---

### Task 4: Import job and toasts as classes

**Files:**

- Create: `src/routes/soiltests/import-job.svelte.ts`
- Create: `src/routes/soiltests/import-job.svelte.test.ts`
- Create: `src/routes/soiltests/toasts.svelte.ts`

**Interfaces:**

- Consumes: `CONFIG.backend.upload.test.import`, `.status(jobId)`, `.cancel(jobId)`; `csvStageDefaults`, `CsvProgressUpdate` from `$lib/soil-tests/progress`.
- Produces (`import-job.svelte.ts`):
  - `type OnDuplicate = 'skip' | 'replace'`
  - `class ImportJob` with `$state` fields `stage: string`, `percent: number`, `message: string`, `detail: string | null`, `inserted: number`, `skipped: number`, `error: string | null`, `jobId: string | null`; getter `running: boolean` (uploading, queued, parsing or importing); methods `start(file: File, onDuplicate?: OnDuplicate): Promise<void>`, `apply(update: StatusPayload | null): void`, `cancel(): Promise<void>`, `stop(): void`, `reset(): void`. Constructor options `{ fetch?: typeof fetch; minDelayMs?: number; defaultDelayMs?: number }` (tests pass 0 delays).
- Produces (`toasts.svelte.ts`): `type ToastVariant = 'success' | 'error' | 'warning'`, `type Toast = { id: number; message: string; variant: ToastVariant }`, `class Toaster` with `items: Toast[]` (`$state`), `show(message, variant?)`, `dismiss(id)`, `destroy()`.

- [ ] **Step 1: Write the failing tests**

Create `src/routes/soiltests/import-job.svelte.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { ImportJob } from './import-job.svelte';

const file = new File(['id_sample\n1'], 'tests.csv', { type: 'text/csv' });

function stubFetch(responses: Record<string, (() => Response)[]>) {
	return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		const key = `${init?.method ?? 'GET'} ${url.split('?')[0]}`;
		const next = responses[key]?.shift();
		if (!next) throw new Error(`Unexpected request: ${key}`);
		return next();
	});
}

const newJob = (fetch: typeof globalThis.fetch) =>
	new ImportJob({ fetch, minDelayMs: 0, defaultDelayMs: 0 });

describe('ImportJob', () => {
	it('uploads with the duplicate choice and polls until complete', async () => {
		const fetch = stubFetch({
			'POST /api/soil-tests/import': [
				() => Response.json({ jobId: 'j1', stage: 'queued' }, { status: 202 })
			],
			'GET /api/soil-tests/import/j1/status': [
				() => Response.json({ jobId: 'j1', stage: 'parsing', percent: 50 }),
				() => Response.json({ jobId: 'j1', stage: 'complete', inserted: 46, skipped: 2 })
			]
		});
		const job = newJob(fetch);

		await job.start(file, 'replace');
		await vi.waitFor(() => expect(job.stage).toBe('complete'));

		expect(String(fetch.mock.calls[0][0])).toBe('/api/soil-tests/import?onDuplicate=replace');
		expect(job.inserted).toBe(46);
		expect(job.skipped).toBe(2);
		expect(job.running).toBe(false);
	});

	it('shows the backend’s reason when the upload is refused', async () => {
		const job = newJob(
			stubFetch({
				'POST /api/soil-tests/import': [
					() => Response.json({ detail: "CSV missing 'fieldID' column" }, { status: 400 })
				]
			})
		);

		await job.start(file);
		expect(job.stage).toBe('error');
		expect(job.error).toBe("CSV missing 'fieldID' column");
	});

	it('stops polling and explains when the job disappears', async () => {
		const fetch = stubFetch({
			'POST /api/soil-tests/import': [() => Response.json({ jobId: 'j2', stage: 'queued' })],
			'GET /api/soil-tests/import/j2/status': [() => new Response('gone', { status: 404 })]
		});
		const job = newJob(fetch);

		await job.start(file);
		await vi.waitFor(() => expect(job.stage).toBe('error'));
		expect(job.error).toBe('The import job was not found. It may have expired.');
		await new Promise((done) => setTimeout(done, 20));
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it('reports a job that ends in error with its message', async () => {
		const job = newJob(
			stubFetch({
				'POST /api/soil-tests/import': [() => Response.json({ jobId: 'j3', stage: 'queued' })],
				'GET /api/soil-tests/import/j3/status': [
					() =>
						Response.json({
							jobId: 'j3',
							stage: 'error',
							detail: 'Row 5: unknown fieldID',
							error: { code: 'invalid', message: 'Row 5: unknown fieldID' }
						})
				]
			})
		);

		await job.start(file);
		await vi.waitFor(() => expect(job.error).toBe('Row 5: unknown fieldID'));
	});

	it('cancels a running job on the server', async () => {
		const fetch = stubFetch({
			'POST /api/soil-tests/import': [() => Response.json({ jobId: 'j4', stage: 'queued' })],
			'GET /api/soil-tests/import/j4/status': Array.from(
				{ length: 50 },
				() => () => Response.json({ jobId: 'j4', stage: 'importing' })
			),
			'DELETE /api/soil-tests/import/j4': [
				() => Response.json({ cancelled: true }, { status: 202 })
			]
		});
		const job = newJob(fetch);

		await job.start(file);
		expect(job.running).toBe(true);
		await job.cancel();

		expect(fetch.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true);
		expect(job.stage).toBe('idle');
	});
});
```

Run: `npx vitest run --project client src/routes/soiltests/import-job.svelte.test.ts`
Expected: FAIL, cannot resolve `./import-job.svelte`.

- [ ] **Step 2: Create `src/routes/soiltests/import-job.svelte.ts`**

This is the old page's `handleCsvSubmit`, `pollImportJob`, `startProgressPolling`, `stopProgressPolling` and `handleCsvProgressUpdate` gathered into one class. It now sends `?onDuplicate=` and keeps the job's `inserted`/`skipped` counts.

```ts
import CONFIG from '$lib/config';
import {
	csvStageDefaults,
	type CsvProgressStage,
	type CsvProgressUpdate
} from '$lib/soil-tests/progress';

export type OnDuplicate = 'skip' | 'replace';

type StatusPayload = Partial<CsvProgressUpdate> & {
	stage?: string;
	pollAfterMs?: number;
	inserted?: number;
	skipped?: number;
	error?: { code?: string | null; message?: string | null } | null;
};

type Options = { fetch?: typeof fetch; minDelayMs?: number; defaultDelayMs?: number };

const RUNNING = new Set(['uploading', 'queued', 'parsing', 'importing']);

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
	try {
		const body = await response.json();
		return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

/** FastAPI puts its reason in `detail`; older endpoints use `message`. */
function reason(body: Record<string, unknown> | null): string | null {
	const value = body?.detail ?? body?.message;
	return typeof value === 'string' && value.trim() ? value : null;
}

export class ImportJob {
	stage = $state('idle');
	percent = $state(0);
	message = $state(csvStageDefaults.idle.label);
	detail = $state<string | null>(null);
	inserted = $state(0);
	skipped = $state(0);
	error = $state<string | null>(null);
	jobId = $state<string | null>(null);

	#fetch: typeof fetch;
	#minDelay: number;
	#defaultDelay: number;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#abort: AbortController | null = null;

	constructor({
		fetch: fetchFn = (...args) => fetch(...args),
		minDelayMs = 500,
		defaultDelayMs = 2000
	}: Options = {}) {
		this.#fetch = fetchFn;
		this.#minDelay = minDelayMs;
		this.#defaultDelay = defaultDelayMs;
	}

	get running(): boolean {
		return RUNNING.has(this.stage);
	}

	async start(file: File, onDuplicate: OnDuplicate = 'skip') {
		this.stop();
		this.reset();
		this.apply({ stage: 'uploading', message: `Uploading ${file.name}…` });
		const controller = new AbortController();
		this.#abort = controller;
		const body = new FormData();
		body.append('file', file);

		try {
			const response = await this.#fetch(
				`${CONFIG.backend.upload.test.import}?onDuplicate=${onDuplicate}`,
				{ method: 'POST', body, signal: controller.signal }
			);
			const payload = await readJson(response);
			if (!response.ok) throw new Error(reason(payload) ?? `Upload failed (${response.status}).`);
			this.jobId = typeof payload?.jobId === 'string' ? payload.jobId : null;
			if (!this.jobId) throw new Error('The server didn’t start an import job.');
			this.apply(payload as StatusPayload);
			if (this.running) this.#schedule(payload?.pollAfterMs);
		} catch (err) {
			if (!controller.signal.aborted) this.#fail(err);
		}
	}

	/** Applies a status update; the page's `farm:csv-import-progress` listener calls this too. */
	apply(update: StatusPayload | null) {
		if (!update) return;
		if (update.jobId && this.jobId && update.jobId !== this.jobId) return;
		const stage = update.stage ?? 'queued';
		const defaults = csvStageDefaults[stage as CsvProgressStage] ?? csvStageDefaults.queued;
		this.stage = stage;
		this.percent = Math.min(100, Math.max(0, update.percent ?? defaults.percent));
		this.message = update.message ?? defaults.label;
		this.detail = update.detail ?? null;
		if (typeof update.inserted === 'number') this.inserted = update.inserted;
		if (typeof update.skipped === 'number') this.skipped = update.skipped;
		if (stage === 'error') {
			this.error = update.error?.message ?? update.detail ?? update.message ?? 'The import failed.';
		}
		if (!this.running) this.#clearTimer();
	}

	async cancel() {
		const id = this.jobId;
		this.stop();
		if (id) {
			try {
				await this.#fetch(CONFIG.backend.upload.test.cancel(id), { method: 'DELETE' });
			} catch {
				// The job may already be finished or gone; there's nothing more to do.
			}
		}
		this.reset();
	}

	stop() {
		this.#clearTimer();
		this.#abort?.abort();
		this.#abort = null;
	}

	reset() {
		this.stop();
		this.stage = 'idle';
		this.percent = 0;
		this.message = csvStageDefaults.idle.label;
		this.detail = null;
		this.inserted = 0;
		this.skipped = 0;
		this.error = null;
		this.jobId = null;
	}

	async #poll() {
		const id = this.jobId;
		const controller = this.#abort;
		if (!id || !controller) return;
		try {
			const response = await this.#fetch(CONFIG.backend.upload.test.status(id), {
				signal: controller.signal
			});
			const payload = await readJson(response);
			if (!response.ok) {
				if (response.status === 404 || response.status === 410) {
					throw new Error('The import job was not found. It may have expired.');
				}
				throw new Error(reason(payload) ?? `Progress request failed (${response.status}).`);
			}
			this.apply(payload as StatusPayload);
			if (this.running) this.#schedule(payload?.pollAfterMs);
		} catch (err) {
			if (!controller.signal.aborted) this.#fail(err);
		}
	}

	#schedule(pollAfterMs: unknown) {
		this.#clearTimer();
		const delay =
			typeof pollAfterMs === 'number' ? Math.max(this.#minDelay, pollAfterMs) : this.#defaultDelay;
		this.#timer = setTimeout(() => void this.#poll(), delay);
	}

	#clearTimer() {
		clearTimeout(this.#timer);
		this.#timer = undefined;
	}

	#fail(err: unknown) {
		const message = err instanceof Error ? err.message : 'The import failed.';
		this.stop();
		this.apply({ stage: 'error', message, detail: message });
		this.error = message;
	}
}
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run --project client src/routes/soiltests/import-job.svelte.test.ts`
Expected: PASS.

- [ ] **Step 4: Create `src/routes/soiltests/toasts.svelte.ts`**

The old page's `showToast`/`dismissToast` as a class.

```ts
export type ToastVariant = 'success' | 'error' | 'warning';
export type Toast = { id: number; message: string; variant: ToastVariant };

export class Toaster {
	items = $state<Toast[]>([]);

	#next = 0;
	#timers: Record<number, ReturnType<typeof setTimeout>> = {};

	show(message: string, variant: ToastVariant = 'success') {
		const id = ++this.#next;
		this.items.push({ id, message, variant });
		this.#timers[id] = setTimeout(() => this.dismiss(id), 5000);
	}

	dismiss(id: number) {
		clearTimeout(this.#timers[id]);
		delete this.#timers[id];
		this.items = this.items.filter((toast) => toast.id !== id);
	}

	destroy() {
		for (const timer of Object.values(this.#timers)) clearTimeout(timer);
		this.#timers = {};
	}
}
```

Run `npm run check`. Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/soiltests/import-job.svelte.ts src/routes/soiltests/import-job.svelte.test.ts src/routes/soiltests/toasts.svelte.ts
git commit -m "Move CSV import polling and toasts into rune classes"
```

---

### Task 5: List components

**Files:**

- Create: `src/routes/soiltests/components/Pagination.svelte`
- Create: `src/routes/soiltests/components/Pagination.svelte.test.ts`
- Create: `src/routes/soiltests/components/StatusMark.svelte`
- Create: `src/routes/soiltests/components/SoilTestsToolbar.svelte`
- Create: `src/routes/soiltests/components/SoilTestsTable.svelte`
- Create: `src/routes/soiltests/components/SoilTestCard.svelte`
- Create: `src/routes/soiltests/components/BulkDeleteBar.svelte`
- Create: `src/routes/soiltests/components/Toasts.svelte`

**Interfaces:**

- Consumes: Task 3 modules; `Toaster` (Task 4); `StatusBadge` from `$lib/components/StatusBadge.svelte`; `formatDate`, `formatNumber` from `$lib/soil-tests/utils`; `metricColumns`, `PaddockSummary`, `SoilTest` from `$lib/soil-tests/schema`.
- Produces:
  - `Pagination` props `{ slice: PageSlice<unknown>; onchange: (page: number) => void }`. Renders nothing when `slice.total === 0`.
  - `StatusMark` props `{ status: MetricStatus }`: a compact mark for table cells (`↓` Low, `✓` Optimal, `↑` High, with the word for screen readers and as a tooltip); nothing for `no-data`/`no-range`.
  - `SoilTestsToolbar` props `{ filters: Filters; paddocks: readonly PaddockSummary[]; years: number[]; sort: SortState; showSort: boolean; onchange: (change: Partial<Filters>) => void; onsort: (sort: SortState) => void }`.
  - `SoilTestsTable` props `{ tests: SoilTest[]; sort: SortState; onsort: (sort: SortState) => void; editing: boolean; selected: ReadonlySet<number>; ontoggle: (id: number, checked: boolean) => void }`.
  - `SoilTestCard` props `{ test: SoilTest; editing: boolean; selected: boolean; ontoggle: (id: number, checked: boolean) => void }`.
  - `BulkDeleteBar` props `{ count: number; ondelete: () => void; ondone: () => void }`.
  - `Toasts` props `{ toaster: Toaster }`.

- [ ] **Step 1: Write the failing `Pagination` test**

Create `src/routes/soiltests/components/Pagination.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { paginate } from '$lib/soil-tests/filters';
import Pagination from './Pagination.svelte';

const list = Array.from({ length: 251 }, (_, i) => i);

describe('Pagination.svelte', () => {
	it('announces the range and disables Previous on page 1', async () => {
		render(Pagination, { slice: paginate(list, 1), onchange: () => {} });

		await expect.element(page.getByText('Showing 1–25 of 251')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
		await expect
			.element(page.getByRole('button', { name: 'Page 1', exact: true }))
			.toHaveAttribute('aria-current', 'page');
	});

	it('moves to the next page and to a numbered page', async () => {
		const onchange = vi.fn();
		render(Pagination, { slice: paginate(list, 2), onchange });

		await expect.element(page.getByText('Showing 26–50 of 251')).toBeVisible();
		await page.getByRole('button', { name: 'Next' }).click();
		expect(onchange).toHaveBeenLastCalledWith(3);
		await page.getByRole('button', { name: 'Page 11' }).click();
		expect(onchange).toHaveBeenLastCalledWith(11);
	});

	it('disables Next on the last page', async () => {
		render(Pagination, { slice: paginate(list, 11), onchange: () => {} });

		await expect.element(page.getByText('Showing 251–251 of 251')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Next' })).toBeDisabled();
	});
});
```

Run: `npx vitest run --project client src/routes/soiltests/components/Pagination.svelte.test.ts`
Expected: FAIL, cannot resolve `./Pagination.svelte`.

- [ ] **Step 2: Create `src/routes/soiltests/components/Pagination.svelte`**

```svelte
<script lang="ts">
	import { pageList, type PageSlice } from '$lib/soil-tests/filters';

	type Props = { slice: PageSlice<unknown>; onchange: (page: number) => void };

	let { slice, onchange }: Props = $props();

	const pages = $derived(pageList(slice.page, slice.pageCount));
	const button =
		'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border px-3 text-sm disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
</script>

{#if slice.total > 0}
	<nav aria-label="Pages" class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-muted" aria-live="polite">
			Showing {slice.start}–{slice.end} of {slice.total}
		</p>
		<div class="flex flex-wrap items-center gap-1">
			<button
				type="button"
				class={[button, 'text-text hover:bg-white/5']}
				disabled={slice.page <= 1}
				onclick={() => onchange(slice.page - 1)}
			>
				Previous
			</button>
			{#each pages as number, index (index)}
				{#if number === null}
					<span class="px-1 text-muted" aria-hidden="true">…</span>
				{:else}
					<button
						type="button"
						aria-label="Page {number}"
						aria-current={number === slice.page ? 'page' : undefined}
						class={[
							button,
							number === slice.page
								? 'border-accent bg-accent/15 text-text'
								: 'text-muted hover:bg-white/5'
						]}
						onclick={() => onchange(number)}
					>
						{number}
					</button>
				{/if}
			{/each}
			<button
				type="button"
				class={[button, 'text-text hover:bg-white/5']}
				disabled={slice.page >= slice.pageCount}
				onclick={() => onchange(slice.page + 1)}
			>
				Next
			</button>
		</div>
	</nav>
{/if}
```

Run the autofixer, then the test. Expected: PASS.

- [ ] **Step 3: Create `src/routes/soiltests/components/StatusMark.svelte`**

```svelte
<script lang="ts">
	import { STATUS_LABELS, type MetricStatus } from '$lib/soil-status';

	type Props = { status: MetricStatus };

	let { status }: Props = $props();

	const marks: Partial<Record<MetricStatus, { symbol: string; tone: string }>> = {
		low: { symbol: '↓', tone: 'text-status-low' },
		optimal: { symbol: '✓', tone: 'text-accent' },
		high: { symbol: '↑', tone: 'text-status-high' }
	};
	const mark = $derived(marks[status]);
</script>

{#if mark}
	<span
		class={['ml-1 inline-block w-3 text-center font-semibold', mark.tone]}
		title={STATUS_LABELS[status]}
	>
		<span aria-hidden="true">{mark.symbol}</span>
		<span class="sr-only">{STATUS_LABELS[status]}</span>
	</span>
{/if}
```

- [ ] **Step 4: Create `src/routes/soiltests/components/SoilTestsToolbar.svelte`**

```svelte
<script lang="ts">
	import type { Filters } from '$lib/soil-tests/filters';
	import type { PaddockSummary } from '$lib/soil-tests/schema';
	import { SORT_PRESETS, sortId, type SortState } from '$lib/soil-tests/sort';

	type Props = {
		filters: Filters;
		paddocks: readonly PaddockSummary[];
		years: number[];
		sort: SortState;
		showSort: boolean;
		onchange: (change: Partial<Filters>) => void;
		onsort: (sort: SortState) => void;
	};

	let { filters, paddocks, years, sort, showSort, onchange, onsort }: Props = $props();

	const uid = $props.id();
	const byName = $derived([...paddocks].sort((a, b) => a.name.localeCompare(b.name)));
	const currentSort = $derived(sortId(sort));
	const control =
		'min-h-11 w-full rounded-lg border border-border bg-white/5 px-3 text-base text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
</script>

<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]">
	<div>
		<label for="{uid}-q" class="mb-1 block text-sm text-muted">Search</label>
		<input
			id="{uid}-q"
			type="search"
			placeholder="Paddock, sample or ID"
			value={filters.q}
			oninput={(event) => onchange({ q: event.currentTarget.value })}
			class={control}
		/>
	</div>
	<div>
		<label for="{uid}-paddock" class="mb-1 block text-sm text-muted">Paddock</label>
		<select
			id="{uid}-paddock"
			value={filters.paddock === null ? '' : String(filters.paddock)}
			onchange={(event) => {
				const value = event.currentTarget.value;
				onchange({ paddock: value === '' ? null : Number(value) });
			}}
			class={control}
		>
			<option value="">All paddocks</option>
			{#each byName as paddock (paddock.id)}
				<option value={String(paddock.id)}>{paddock.name} ({paddock.id})</option>
			{/each}
		</select>
	</div>
	<div>
		<label for="{uid}-year" class="mb-1 block text-sm text-muted">Year</label>
		<select
			id="{uid}-year"
			value={filters.year === null ? '' : String(filters.year)}
			onchange={(event) => {
				const value = event.currentTarget.value;
				onchange({ year: value === '' ? null : Number(value) });
			}}
			class={control}
		>
			<option value="">All years</option>
			{#each years as year (year)}
				<option value={String(year)}>{year}</option>
			{/each}
		</select>
	</div>
	{#if showSort}
		<div>
			<label for="{uid}-sort" class="mb-1 block text-sm text-muted">Order</label>
			<select
				id="{uid}-sort"
				value={currentSort}
				onchange={(event) => {
					const preset = SORT_PRESETS.find(
						(option) => sortId(option.state) === event.currentTarget.value
					);
					if (preset) onsort(preset.state);
				}}
				class={control}
			>
				{#if !SORT_PRESETS.some((option) => sortId(option.state) === currentSort)}
					<option value={currentSort}>Custom order</option>
				{/if}
				{#each SORT_PRESETS as option (sortId(option.state))}
					<option value={sortId(option.state)}>{option.label}</option>
				{/each}
			</select>
		</div>
	{/if}
</div>
```

- [ ] **Step 5: Create `src/routes/soiltests/components/SoilTestsTable.svelte`**

The old table (its lines 1084–1209) on runes, with a sticky header inside its own scroll area, `aria-sort` on the headers and a `StatusMark` beside each metric that has an optimal range.

```svelte
<script lang="ts">
	import { metricColumns, type MetricKey, type SoilTest } from '$lib/soil-tests/schema';
	import { nextSort, type PrimarySortColumn, type SortState } from '$lib/soil-tests/sort';
	import { testMetricStatus } from '$lib/soil-tests/status';
	import { formatDate, formatNumber } from '$lib/soil-tests/utils';
	import StatusMark from './StatusMark.svelte';

	type Props = {
		tests: SoilTest[];
		sort: SortState;
		onsort: (sort: SortState) => void;
		editing: boolean;
		selected: ReadonlySet<number>;
		ontoggle: (id: number, checked: boolean) => void;
	};

	let { tests, sort, onsort, editing, selected, ontoggle }: Props = $props();

	const primary: { column: PrimarySortColumn; label: string }[] = [
		{ column: 'sample', label: 'Sample' },
		{ column: 'paddock', label: 'Paddock' },
		{ column: 'farm', label: 'Farm' },
		{ column: 'date', label: 'Sample date' },
		{ column: 'client', label: 'Client' }
	];

	function ariaSort(column: PrimarySortColumn | MetricKey) {
		const active = sort.type === 'metric' ? sort.key === column : sort.type === column;
		if (!active) return 'none';
		return sort.direction === 'asc' ? 'ascending' : 'descending';
	}

	const sortButton =
		'inline-flex min-h-11 items-center gap-1 font-semibold hover:text-text focus-visible:outline-2 focus-visible:outline-accent';
</script>

<div class="max-h-[calc(100dvh-16rem)] overflow-auto rounded-xl border border-border">
	<table class="w-full text-sm">
		<thead
			class="sticky top-0 z-10 bg-panel text-left text-muted shadow-[0_1px_0_rgb(var(--border))]"
		>
			<tr>
				{#if editing}
					<th class="w-12 px-3"><span class="sr-only">Select</span></th>
				{/if}
				{#each primary as { column, label } (column)}
					<th class="px-3" aria-sort={ariaSort(column)}>
						<button type="button" class={sortButton} onclick={() => onsort(nextSort(sort, column))}>
							{label}
							<span aria-hidden="true" class="w-3 text-xs">
								{ariaSort(column) === 'ascending'
									? '▲'
									: ariaSort(column) === 'descending'
										? '▼'
										: ''}
							</span>
						</button>
					</th>
				{/each}
				{#each metricColumns as column (column.key)}
					<th class="px-3 text-right" aria-sort={ariaSort(column.key)}>
						<button
							type="button"
							class={[sortButton, 'justify-end']}
							onclick={() => onsort(nextSort(sort, column.key))}
						>
							{column.label}
							<span aria-hidden="true" class="w-3 text-xs">
								{ariaSort(column.key) === 'ascending'
									? '▲'
									: ariaSort(column.key) === 'descending'
										? '▼'
										: ''}
							</span>
						</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each tests as test (test.id)}
				<tr
					class={[
						'border-t border-border/60',
						selected.has(test.id) ? 'bg-danger/10' : 'hover:bg-white/5'
					]}
				>
					{#if editing}
						<td class="px-3">
							<input
								type="checkbox"
								class="size-5 accent-danger"
								checked={selected.has(test.id)}
								onchange={(event) => ontoggle(test.id, event.currentTarget.checked)}
								aria-label="Select {test.sampleName ?? 'test'} from {formatDate(test.sampleDate)}"
							/>
						</td>
					{/if}
					<td class="px-3 py-2">
						<span class="block font-medium text-text">{test.sampleName ?? 'Unnamed sample'}</span>
						<span class="text-xs text-muted">Sample ID {test.sampleId}</span>
					</td>
					<td class="px-3 py-2">
						<span class="block">{test.paddockName}</span>
						<span class="text-xs text-muted">Field ID {test.fieldId}</span>
					</td>
					<td class="px-3 py-2">{test.farm ?? '-'}</td>
					<td class="px-3 py-2 whitespace-nowrap">{formatDate(test.sampleDate)}</td>
					<td class="px-3 py-2">{test.client ?? '-'}</td>
					{#each metricColumns as column (column.key)}
						<td class="px-3 py-2 text-right whitespace-nowrap tabular-nums">
							{formatNumber(test.metrics[column.key])}<StatusMark
								status={testMetricStatus(column.key, test.metrics[column.key])}
							/>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
```

- [ ] **Step 6: Create `src/routes/soiltests/components/SoilTestCard.svelte`**

```svelte
<script lang="ts">
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import type { MetricKey, SoilTest } from '$lib/soil-tests/schema';
	import { testMetricStatus } from '$lib/soil-tests/status';
	import { formatDate, formatNumber } from '$lib/soil-tests/utils';

	type Props = {
		test: SoilTest;
		editing: boolean;
		selected: boolean;
		ontoggle: (id: number, checked: boolean) => void;
	};

	let { test, editing, selected, ontoggle }: Props = $props();

	const headline = $derived(
		(
			[
				{ key: 'ph_water', label: 'pH', value: test.metrics.ph_water },
				{ key: 'P', label: 'Phosphorus', value: test.metrics.P },
				{ key: 'K', label: 'Potassium', value: test.metrics.K },
				{ key: 'OM', label: 'Organic matter', value: test.organicMatter }
			] as { key: MetricKey | 'OM'; label: string; value: number | undefined }[]
		).map((metric) => ({ ...metric, status: testMetricStatus(metric.key, metric.value) }))
	);
	const rest = $derived(
		(
			[
				{ key: 'Ca', label: 'Calcium' },
				{ key: 'Mg', label: 'Magnesium' },
				{ key: 'S', label: 'Sulphur' },
				{ key: 'Na', label: 'Sodium' }
			] as { key: MetricKey; label: string }[]
		).map((metric) => ({
			...metric,
			value: test.metrics[metric.key],
			status: testMetricStatus(metric.key, test.metrics[metric.key])
		}))
	);
	const showsStatus = (status: string) =>
		status === 'low' || status === 'optimal' || status === 'high';
</script>

<article
	class={[
		'rounded-xl border bg-panel p-4',
		selected ? 'border-danger/60 bg-danger/10' : 'border-border'
	]}
>
	<header class="flex items-start gap-3">
		{#if editing}
			<input
				type="checkbox"
				class="mt-1 size-5 accent-danger"
				checked={selected}
				onchange={(event) => ontoggle(test.id, event.currentTarget.checked)}
				aria-label="Select {test.sampleName ?? 'test'} from {formatDate(test.sampleDate)}"
			/>
		{/if}
		<div class="min-w-0 flex-1">
			<h2 class="text-lg font-semibold">{test.paddockName}</h2>
			<p class="text-sm text-muted">
				{test.sampleName ?? 'Unnamed sample'}, {formatDate(test.sampleDate)}
			</p>
		</div>
	</header>

	<dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
		{#each headline as metric (metric.key)}
			<div>
				<dt class="text-xs text-muted">{metric.label}</dt>
				<dd class="flex flex-wrap items-center gap-x-2">
					<span class="text-base tabular-nums">{formatNumber(metric.value)}</span>
					{#if showsStatus(metric.status)}<StatusBadge status={metric.status} />{/if}
				</dd>
			</div>
		{/each}
	</dl>

	<details class="mt-3">
		<summary class="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-accent">
			All results
		</summary>
		<dl class="grid grid-cols-2 gap-x-4 gap-y-3 pt-2">
			{#each rest as metric (metric.key)}
				<div>
					<dt class="text-xs text-muted">{metric.label}</dt>
					<dd class="flex flex-wrap items-center gap-x-2">
						<span class="tabular-nums">{formatNumber(metric.value)}</span>
						{#if showsStatus(metric.status)}<StatusBadge status={metric.status} />{/if}
					</dd>
				</div>
			{/each}
			<div>
				<dt class="text-xs text-muted">Field ID</dt>
				<dd>{test.fieldId}</dd>
			</div>
			<div>
				<dt class="text-xs text-muted">Sample ID</dt>
				<dd>{test.sampleId}</dd>
			</div>
			<div>
				<dt class="text-xs text-muted">Farm</dt>
				<dd>{test.farm ?? '-'}</dd>
			</div>
			<div>
				<dt class="text-xs text-muted">Client</dt>
				<dd>{test.client ?? '-'}</dd>
			</div>
		</dl>
	</details>
</article>
```

(`showsStatus` receives a `MetricStatus`; if `svelte-check` wants the narrower type, type its parameter as `MetricStatus` imported from `$lib/soil-status`.)

- [ ] **Step 7: Create `BulkDeleteBar.svelte` and `Toasts.svelte`**

`src/routes/soiltests/components/BulkDeleteBar.svelte`:

```svelte
<script lang="ts">
	type Props = { count: number; ondelete: () => void; ondone: () => void };

	let { count, ondelete, ondone }: Props = $props();
</script>

<div
	class="flex flex-wrap items-center gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-2"
	role="region"
	aria-label="Delete tests"
>
	<p class="flex-1 text-sm" aria-live="polite">
		{count === 0
			? 'Select the tests to delete.'
			: `${count} test${count === 1 ? '' : 's'} selected`}
	</p>
	<button
		type="button"
		onclick={ondone}
		class="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm text-text hover:bg-white/5"
	>
		Done
	</button>
	<button
		type="button"
		onclick={ondelete}
		disabled={count === 0}
		class="inline-flex min-h-11 items-center rounded-lg border border-danger/60 bg-danger/20 px-4 text-sm font-semibold text-text hover:bg-danger/30 disabled:opacity-40"
	>
		Delete {count > 0 ? count : ''}
	</button>
</div>
```

`src/routes/soiltests/components/Toasts.svelte`:

```svelte
<script lang="ts">
	import type { Toaster } from '../toasts.svelte';

	type Props = { toaster: Toaster };

	let { toaster }: Props = $props();

	const tone = {
		success: 'border-accent/50 bg-panel text-text',
		warning: 'border-warn/60 bg-panel text-text',
		error: 'border-danger/60 bg-panel text-text'
	};
</script>

<div
	class="pointer-events-none fixed inset-x-4 top-4 z-[2100] flex flex-col items-end gap-2 md:top-[calc(var(--shell-top)+1rem)]"
	aria-live="polite"
>
	{#each toaster.items as toast (toast.id)}
		<div
			role={toast.variant === 'error' ? 'alert' : 'status'}
			class={[
				'pointer-events-auto flex max-w-sm items-center gap-2 rounded-lg border py-1 pr-1 pl-4 text-sm shadow-lg',
				tone[toast.variant]
			]}
		>
			<span class="flex-1">{toast.message}</span>
			<button
				type="button"
				onclick={() => toaster.dismiss(toast.id)}
				aria-label="Dismiss"
				class="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:text-text"
			>
				<svg
					viewBox="0 0 24 24"
					class="size-4"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" />
				</svg>
			</button>
		</div>
	{/each}
</div>
```

Run the autofixer on every new component, then `npm run check`. Expected: clean. (The table and card are exercised by the page test in Task 8.)

- [ ] **Step 8: Commit**

```bash
git add src/routes/soiltests/components
git commit -m "Add soil test list components: toolbar, table, cards, pagination and toasts"
```

---

### Task 6: Upload dialog and manual entry

**Files:**

- Create: `src/routes/soiltests/components/UploadDialog.svelte`
- Create: `src/routes/soiltests/components/UploadDialog.svelte.test.ts`
- Create: `src/routes/soiltests/components/ManualEntryForm.svelte`
- Create: `src/routes/soiltests/components/ManualEntryForm.svelte.test.ts`

**Interfaces:**

- Consumes: `sampleKey` (Task 2); `metricColumns`, `metricPlaceholders`, `MetricKey`, `PaddockSummary`; `uploadEndpoint` from `$lib/utils`.
- Produces:
  - `UploadDialog` props `{ mode: 'manual' | 'csv'; onmodechange: (mode: 'manual' | 'csv') => void; running: boolean; onclose: () => void; manual: Snippet; csv: Snippet }`. A native modal `<dialog>` opened on mount. Escape or Close while `running` asks "Stop the import?" inside the dialog instead of closing.
  - `ManualEntryForm` props `{ paddocks: readonly PaddockSummary[]; existingSamples: ReadonlySet<string>; onsaved: () => void; oncancel: () => void }`. Same fields, checks and `POST` payload as the old manual form.

- [ ] **Step 1: Write the failing tests**

Create `src/routes/soiltests/components/UploadDialog.svelte.test.ts`:

```ts
import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';

import '../../../app.css';
import UploadDialog from './UploadDialog.svelte';

const manual = createRawSnippet(() => ({ render: () => '<p>Manual form</p>' }));
const csv = createRawSnippet(() => ({ render: () => '<p>CSV wizard</p>' }));

describe('UploadDialog.svelte', () => {
	it('is a modal dialog showing the chosen mode', async () => {
		render(UploadDialog, {
			mode: 'csv',
			onmodechange: () => {},
			running: false,
			onclose: () => {},
			manual,
			csv
		});

		await expect.element(page.getByRole('dialog', { name: 'Add soil tests' })).toBeVisible();
		await expect.element(page.getByText('CSV wizard')).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: 'Import a CSV' }))
			.toHaveAttribute('aria-pressed', 'true');
	});

	it('closes on Escape when nothing is running', async () => {
		const onclose = vi.fn();
		render(UploadDialog, {
			mode: 'manual',
			onmodechange: () => {},
			running: false,
			onclose,
			manual,
			csv
		});

		await userEvent.keyboard('{Escape}');
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('asks before stopping a running import', async () => {
		const onclose = vi.fn();
		render(UploadDialog, {
			mode: 'csv',
			onmodechange: () => {},
			running: true,
			onclose,
			manual,
			csv
		});

		await page.getByRole('button', { name: 'Close' }).click();
		expect(onclose).not.toHaveBeenCalled();
		await expect.element(page.getByText('Stop the import?')).toBeVisible();

		await page.getByRole('button', { name: 'Keep importing' }).click();
		await expect.element(page.getByText('Stop the import?')).not.toBeInTheDocument();

		await userEvent.keyboard('{Escape}');
		await page.getByRole('button', { name: 'Stop import' }).click();
		expect(onclose).toHaveBeenCalledOnce();
	});
});
```

Create `src/routes/soiltests/components/ManualEntryForm.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import ManualEntryForm from './ManualEntryForm.svelte';

const paddocks = [{ id: 42, name: 'North flat' }];

async function fillRequired(fieldId = '42', sampleId = '1001') {
	await page.getByLabelText('Field ID').fill(fieldId);
	await page.getByLabelText('Sample name').fill('NF-1');
	await page.getByLabelText('Sample ID').fill(sampleId);
	await page.getByLabelText('Sample date').fill('2024-05-01');
}

afterEach(() => vi.unstubAllGlobals());

describe('ManualEntryForm.svelte', () => {
	it('posts the same payload as before and reports success', async () => {
		const fetch = vi.fn(async () => Response.json({ id: 1 }, { status: 201 }));
		vi.stubGlobal('fetch', fetch);
		const onsaved = vi.fn();
		render(ManualEntryForm, {
			paddocks,
			existingSamples: new Set<string>(),
			onsaved,
			oncancel: () => {}
		});

		await fillRequired();
		await page.getByLabelText('pH (H2O)').fill('6.2');
		await page.getByRole('button', { name: 'Save test' }).click();

		await vi.waitFor(() => expect(onsaved).toHaveBeenCalledOnce());
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/api/soil-tests/manual');
		expect(JSON.parse(String(init.body))).toEqual({
			fieldId: 42,
			sampleName: 'NF-1',
			sampleId: 1001,
			sampleDate: '2024-05-01',
			metrics: { ph_water: 6.2 }
		});
	});

	it('refuses a test that already exists', async () => {
		vi.stubGlobal('fetch', vi.fn());
		render(ManualEntryForm, {
			paddocks,
			existingSamples: new Set(['42:1001']),
			onsaved: () => {},
			oncancel: () => {}
		});

		await fillRequired();
		await page.getByLabelText('P', { exact: true }).fill('50');
		await page.getByRole('button', { name: 'Save test' }).click();

		await expect
			.element(page.getByText('A soil test with this field ID and sample ID already exists.'))
			.toBeVisible();
	});

	it('keeps Save disabled until there is a result', async () => {
		render(ManualEntryForm, {
			paddocks,
			existingSamples: new Set<string>(),
			onsaved: () => {},
			oncancel: () => {}
		});

		await fillRequired();
		await expect.element(page.getByRole('button', { name: 'Save test' })).toBeDisabled();
	});
});
```

Run: `npx vitest run --project client src/routes/soiltests/components/UploadDialog.svelte.test.ts src/routes/soiltests/components/ManualEntryForm.svelte.test.ts`
Expected: FAIL, the components don't exist.

- [ ] **Step 2: Create `src/routes/soiltests/components/UploadDialog.svelte`**

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';

	type Mode = 'manual' | 'csv';
	type Props = {
		mode: Mode;
		onmodechange: (mode: Mode) => void;
		running: boolean;
		onclose: () => void;
		manual: Snippet;
		csv: Snippet;
	};

	let { mode, onmodechange, running, onclose, manual, csv }: Props = $props();

	const titleId = $props.id();
	const modes: { value: Mode; label: string }[] = [
		{ value: 'csv', label: 'Import a CSV' },
		{ value: 'manual', label: 'Enter one test' }
	];
	let confirmingClose = $state(false);

	// The dialog exists only while open; showModal gives focus trapping and Escape for free.
	const openModal: Attachment<HTMLDialogElement> = (node) => {
		node.showModal();
		return () => node.close();
	};

	function requestClose() {
		if (running) confirmingClose = true;
		else onclose();
	}
</script>

<dialog
	{@attach openModal}
	aria-labelledby={titleId}
	oncancel={(event) => {
		event.preventDefault();
		requestClose();
	}}
	class="upload-dialog m-auto flex max-h-[min(92dvh,60rem)] w-[min(100%-2rem,48rem)] flex-col rounded-2xl border border-border bg-panel p-0 text-text shadow-2xl"
>
	<header class="flex items-center gap-3 border-b border-border py-2 pr-2 pl-5">
		<h2 id={titleId} class="flex-1 text-lg font-semibold">Add soil tests</h2>
		<button
			type="button"
			aria-label="Close"
			onclick={requestClose}
			class="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-white/10 hover:text-text"
		>
			<svg
				viewBox="0 0 24 24"
				class="size-5"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" />
			</svg>
		</button>
	</header>

	<div class="flex gap-2 px-5 pt-4" role="group" aria-label="How to add tests">
		{#each modes as option (option.value)}
			<button
				type="button"
				aria-pressed={mode === option.value}
				disabled={running}
				onclick={() => onmodechange(option.value)}
				class={[
					'inline-flex min-h-11 flex-1 items-center justify-center rounded-full border px-4 text-sm disabled:opacity-50',
					mode === option.value
						? 'border-accent bg-accent/15 text-text'
						: 'border-border text-muted hover:text-text'
				]}
			>
				{option.label}
			</button>
		{/each}
	</div>

	{#if confirmingClose}
		<div role="alert" class="mx-5 mt-4 rounded-lg border border-warn/50 bg-warn/10 p-4">
			<p class="font-semibold">Stop the import?</p>
			<p class="text-sm text-muted">Tests the server has already saved will stay saved.</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<button
					type="button"
					onclick={() => (confirmingClose = false)}
					class="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm"
				>
					Keep importing
				</button>
				<button
					type="button"
					onclick={() => {
						confirmingClose = false;
						onclose();
					}}
					class="inline-flex min-h-11 items-center rounded-lg border border-danger/60 bg-danger/20 px-4 text-sm font-semibold"
				>
					Stop import
				</button>
			</div>
		</div>
	{/if}

	<div class="overflow-y-auto px-5 py-4">
		{#if mode === 'csv'}
			{@render csv()}
		{:else}
			{@render manual()}
		{/if}
	</div>
</dialog>

<style>
	.upload-dialog::backdrop {
		background: rgb(0 0 0 / 0.6);
	}
</style>
```

- [ ] **Step 3: Create `src/routes/soiltests/components/ManualEntryForm.svelte`**

The old manual form (its lines 794–911 and 1237–1334) on runes, with the checks unchanged and plainer messages.

```svelte
<script lang="ts">
	import {
		metricColumns,
		metricPlaceholders,
		type MetricKey,
		type PaddockSummary
	} from '$lib/soil-tests/schema';
	import { sampleKey } from '$lib/soil-tests/validate';
	import { uploadEndpoint } from '$lib/utils';

	type Props = {
		paddocks: readonly PaddockSummary[];
		existingSamples: ReadonlySet<string>;
		onsaved: () => void;
		oncancel: () => void;
	};

	let { paddocks, existingSamples, onsaved, oncancel }: Props = $props();

	const uid = $props.id();
	let fieldId = $state('');
	let sampleName = $state('');
	let sampleId = $state('');
	let sampleDate = $state('');
	let client = $state('');
	let results = $state(
		Object.fromEntries(metricColumns.map((column) => [column.key, ''])) as Record<MetricKey, string>
	);
	let error = $state<string | null>(null);
	let submitting = $state(false);

	const resultCount = $derived(
		metricColumns.filter((column) => results[column.key].trim() !== '').length
	);
	const input =
		'min-h-11 w-full rounded-lg border border-border bg-white/5 px-3 text-base text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

	function fail(message: string) {
		error = message;
		submitting = false;
	}

	async function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		submitting = true;

		const parsedFieldId = Number(fieldId.trim());
		if (!fieldId.trim() || !Number.isInteger(parsedFieldId))
			return fail('Field ID must be a whole number.');
		const parsedSampleId = Number(sampleId.trim());
		if (!sampleId.trim() || !Number.isInteger(parsedSampleId)) {
			return fail('Sample ID must be a whole number.');
		}
		if (existingSamples.has(sampleKey(parsedFieldId, parsedSampleId))) {
			return fail('A soil test with this field ID and sample ID already exists.');
		}

		const metrics: Partial<Record<MetricKey, number>> = {};
		for (const { key, label } of metricColumns) {
			const raw = results[key].trim();
			if (!raw) continue;
			const value = Number(raw);
			if (!Number.isFinite(value)) return fail(`${label} must be a number.`);
			metrics[key] = value;
		}
		if (Object.keys(metrics).length === 0) return fail('Enter at least one result.');

		try {
			const response = await fetch(uploadEndpoint('manual'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fieldId: parsedFieldId,
					sampleName: sampleName.trim(),
					sampleId: parsedSampleId,
					sampleDate,
					client: client.trim() || undefined,
					metrics
				})
			});
			if (!response.ok) {
				let message = `Couldn’t save the test (${response.status}).`;
				try {
					const problem = (await response.json()) as { message?: unknown; detail?: unknown };
					const reason = problem.message ?? problem.detail;
					if (typeof reason === 'string') message = reason;
				} catch {
					// Keep the fallback message.
				}
				return fail(message);
			}
			submitting = false;
			onsaved();
		} catch {
			fail('Couldn’t save the test. Check the connection and try again.');
		}
	}
</script>

<form {onsubmit} class="space-y-5">
	<div class="grid gap-4 md:grid-cols-2">
		<div>
			<label for="{uid}-field" class="mb-1 block text-sm">Field ID</label>
			<input
				id="{uid}-field"
				type="text"
				inputmode="numeric"
				required
				list="{uid}-paddocks"
				placeholder="e.g. 4251583"
				bind:value={fieldId}
				class={input}
			/>
			<datalist id="{uid}-paddocks">
				{#each paddocks as paddock (paddock.id)}
					<option value={String(paddock.id)}>{paddock.name}</option>
				{/each}
			</datalist>
		</div>
		<div>
			<label for="{uid}-name" class="mb-1 block text-sm">Sample name</label>
			<input
				id="{uid}-name"
				type="text"
				required
				placeholder="e.g. ES30"
				bind:value={sampleName}
				class={input}
			/>
		</div>
		<div>
			<label for="{uid}-sample" class="mb-1 block text-sm">Sample ID</label>
			<input
				id="{uid}-sample"
				type="text"
				inputmode="numeric"
				required
				placeholder="e.g. 100021"
				bind:value={sampleId}
				class={input}
			/>
		</div>
		<div>
			<label for="{uid}-date" class="mb-1 block text-sm">Sample date</label>
			<input id="{uid}-date" type="date" required bind:value={sampleDate} class={input} />
		</div>
		<div class="md:col-span-2">
			<label for="{uid}-client" class="mb-1 block text-sm"
				>Client <span class="text-muted">(optional)</span></label
			>
			<input
				id="{uid}-client"
				type="text"
				placeholder="e.g. Botanical Resources"
				bind:value={client}
				class={input}
			/>
		</div>
	</div>

	<fieldset class="rounded-xl border border-border p-4">
		<legend class="px-1 font-semibold">Results</legend>
		<p class="mb-3 text-sm text-muted">Enter at least one. Leave the rest blank.</p>
		<div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
			{#each metricColumns as column (column.key)}
				<div>
					<label for="{uid}-{column.key}" class="mb-1 block text-sm">{column.label}</label>
					<input
						id="{uid}-{column.key}"
						type="text"
						inputmode="decimal"
						placeholder={metricPlaceholders[column.key]}
						bind:value={results[column.key]}
						class={input}
					/>
				</div>
			{/each}
		</div>
	</fieldset>

	{#if error}
		<p role="alert" class="rounded-lg border border-danger/50 bg-danger/10 px-4 py-3 text-sm">
			{error}
		</p>
	{/if}

	<div class="flex flex-wrap justify-end gap-2">
		<button
			type="button"
			onclick={oncancel}
			class="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm"
		>
			Cancel
		</button>
		<button
			type="submit"
			disabled={submitting || resultCount === 0}
			class="inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-bg disabled:opacity-50"
		>
			{submitting ? 'Saving…' : 'Save test'}
		</button>
	</div>
</form>
```

Run the autofixer on both components, then the tests. Expected: PASS. If `getByLabelText('P', { exact: true })` also matches "pH (H2O)" in your Playwright version, use `page.getByRole('textbox', { name: 'P', exact: true })`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/soiltests/components/UploadDialog.svelte src/routes/soiltests/components/UploadDialog.svelte.test.ts src/routes/soiltests/components/ManualEntryForm.svelte src/routes/soiltests/components/ManualEntryForm.svelte.test.ts
git commit -m "Add the upload dialog and move manual entry into its own component"
```

---

### Task 7: CSV import wizard

**Files:**

- Create: `src/routes/soiltests/components/ImportSteps.svelte`
- Create: `src/routes/soiltests/components/CsvImportWizard.svelte`
- Create: `src/routes/soiltests/components/CsvImportWizard.svelte.test.ts`

**Interfaces:**

- Consumes: `parseCsv` (Task 1); `validateCsv`, `CsvCheck` (Task 2); `ImportJob`, `OnDuplicate` (Task 4); `CSV_REQUIRED_HEADERS`; `asset` from `$app/paths`.
- Produces:
  - `ImportSteps` props `{ current: 1 | 2 | 3 | 4 | 5 }`: a numbered progress row (Choose file, Check, Duplicates, Importing, Done) with `aria-current="step"`.
  - `CsvImportWizard` props `{ job: ImportJob; knownPaddockIds: ReadonlySet<number>; existingSamples: ReadonlySet<string>; ondone: (result: { inserted: number; skipped: number }) => void }`.

- [ ] **Step 1: Write the failing test**

Create `src/routes/soiltests/components/CsvImportWizard.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { ImportJob } from '../import-job.svelte';
import CsvImportWizard from './CsvImportWizard.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path, asset: (path: string) => path }));

const header = 'id_sample,fieldID,sample_date,name_sample,P,ph_water';
const csv = (...rows: string[]) =>
	new File([[header, ...rows].join('\n')], 'tests.csv', { type: 'text/csv' });

function setup(fetch = vi.fn()) {
	const job = new ImportJob({ fetch, minDelayMs: 0, defaultDelayMs: 0 });
	const ondone = vi.fn();
	render(CsvImportWizard, {
		job,
		knownPaddockIds: new Set([42]),
		existingSamples: new Set(['42:1001']),
		ondone
	});
	return { ondone };
}

describe('CsvImportWizard.svelte', () => {
	it('lists a blocking problem by row and disables Continue', async () => {
		setup();

		await page
			.getByLabelText('Choose CSV file')
			.upload(csv('1002,42,2024-05-01,A,50,6.1', '1003,abc,2024-05-01,B,50,6.1'));

		await expect
			.element(page.getByText('Row 3: fieldID “abc” isn’t a whole number.'))
			.toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
		await expect
			.element(page.getByRole('listitem').filter({ hasText: 'Check' }))
			.toHaveAttribute('aria-current', 'step');
	});

	it('asks about duplicates and sends onDuplicate=replace when chosen', async () => {
		const fetch = vi.fn(async (input: RequestInfo | URL) => {
			if (String(input).startsWith('/api/soil-tests/import?')) {
				return Response.json({ jobId: 'j1', stage: 'queued' }, { status: 202 });
			}
			return Response.json({ jobId: 'j1', stage: 'complete', inserted: 2, skipped: 0 });
		});
		const { ondone } = setup(fetch);

		await page
			.getByLabelText('Choose CSV file')
			.upload(csv('1001,42,2024-05-01,A,50,6.1', '1002,42,2024-05-01,B,50,6.1'));
		await expect.element(page.getByText('No problems found.')).toBeVisible();
		await page.getByRole('button', { name: 'Continue' }).click();

		await expect.element(page.getByText('1 sample is already in the system')).toBeVisible();
		await page.getByRole('radio', { name: /Replace them/ }).click();
		await page.getByRole('button', { name: 'Import tests' }).click();

		await expect.element(page.getByText('Imported 2 tests')).toBeVisible();
		expect(String(fetch.mock.calls[0][0])).toBe('/api/soil-tests/import?onDuplicate=replace');

		await page.getByRole('button', { name: 'Close' }).click();
		expect(ondone).toHaveBeenCalledWith({ inserted: 2, skipped: 0 });
	});

	it('goes straight to importing when there are no duplicates, and offers Back to check on failure', async () => {
		const fetch = vi.fn(async () =>
			Response.json({ detail: 'Row 2: unknown fieldID' }, { status: 400 })
		);
		setup(fetch);

		await page.getByLabelText('Choose CSV file').upload(csv('1002,42,2024-05-01,A,50,6.1'));
		await page.getByRole('button', { name: 'Continue' }).click();

		await expect.element(page.getByText('Row 2: unknown fieldID')).toBeVisible();
		await page.getByRole('button', { name: 'Back to check' }).click();
		await expect.element(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
	});
});
```

Run: `npx vitest run --project client src/routes/soiltests/components/CsvImportWizard.svelte.test.ts`
Expected: FAIL, cannot resolve `./CsvImportWizard.svelte`.

- [ ] **Step 2: Create `src/routes/soiltests/components/ImportSteps.svelte`**

```svelte
<script lang="ts">
	type Props = { current: 1 | 2 | 3 | 4 | 5 };

	let { current }: Props = $props();

	const steps = ['Choose file', 'Check', 'Duplicates', 'Importing', 'Done'];
</script>

<ol aria-label="Import steps" class="flex flex-wrap gap-x-4 gap-y-2 text-sm">
	{#each steps as label, index (label)}
		{@const number = index + 1}
		<li
			aria-current={number === current ? 'step' : undefined}
			class={[
				'flex items-center gap-2',
				number === current
					? 'font-semibold text-text'
					: number < current
						? 'text-accent'
						: 'text-muted'
			]}
		>
			<span
				class={[
					'inline-flex size-6 items-center justify-center rounded-full border text-xs tabular-nums',
					number === current ? 'border-accent bg-accent/20' : 'border-border'
				]}
			>
				{number}
			</span>
			{label}
		</li>
	{/each}
</ol>
```

- [ ] **Step 3: Create `src/routes/soiltests/components/CsvImportWizard.svelte`**

```svelte
<script lang="ts">
	import { asset } from '$app/paths';
	import { parseCsv } from '$lib/soil-tests/csv';
	import { CSV_REQUIRED_HEADERS } from '$lib/soil-tests/schema';
	import { validateCsv, type CsvCheck } from '$lib/soil-tests/validate';
	import type { ImportJob, OnDuplicate } from '../import-job.svelte';
	import ImportSteps from './ImportSteps.svelte';

	type Props = {
		job: ImportJob;
		knownPaddockIds: ReadonlySet<number>;
		existingSamples: ReadonlySet<string>;
		ondone: (result: { inserted: number; skipped: number }) => void;
	};

	let { job, knownPaddockIds, existingSamples, ondone }: Props = $props();

	type Step = 'choose' | 'check' | 'duplicates' | 'importing';
	const MAX_LISTED = 50;
	const STEP_NUMBER = { choose: 1, check: 2, duplicates: 3, importing: 4 } as const;

	let step = $state<Step>('choose');
	let file = $state.raw<File | null>(null);
	let check = $state.raw<CsvCheck | null>(null);
	let onDuplicate = $state<OnDuplicate>('skip');

	const done = $derived(step === 'importing' && job.stage === 'complete');
	const failed = $derived(step === 'importing' && job.stage === 'error');
	const current = $derived(done ? 5 : STEP_NUMBER[step]);
	const button = 'inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm';
	const primary =
		'inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-bg disabled:opacity-50';

	async function choose(event: Event & { currentTarget: HTMLInputElement }) {
		const [chosen] = event.currentTarget.files ?? [];
		event.currentTarget.value = '';
		if (!chosen) return;
		file = chosen;
		try {
			check = validateCsv(parseCsv(await chosen.text()), { knownPaddockIds, existingSamples });
		} catch {
			check = {
				rowCount: 0,
				preview: { headers: [], rows: [] },
				errors: [
					{
						row: null,
						column: null,
						message: 'Couldn’t read this file as text. Save it as CSV (UTF-8) and try again.'
					}
				],
				warnings: [],
				duplicateSampleIds: []
			};
		}
		step = 'check';
	}

	function startImport() {
		if (!file) return;
		step = 'importing';
		void job.start(file, onDuplicate);
	}

	function continueFromCheck() {
		if (!check || check.errors.length > 0) return;
		if (check.duplicateSampleIds.length > 0) step = 'duplicates';
		else startImport();
	}

	function backToCheck() {
		job.reset();
		step = 'check';
	}

	function chooseAnother() {
		job.reset();
		file = null;
		check = null;
		onDuplicate = 'skip';
		step = 'choose';
	}
</script>

<div class="space-y-5">
	<ImportSteps {current} />

	{#if step === 'choose'}
		<div class="space-y-3">
			<p>
				Choose the CSV file from the lab. Its first row needs these columns:
				{#each CSV_REQUIRED_HEADERS as name, index (name)}<code class="rounded bg-white/10 px-1"
						>{name}</code
					>{index < CSV_REQUIRED_HEADERS.length - 1 ? ', ' : ''}{/each}, and at least one result
				column such as <code class="rounded bg-white/10 px-1">P</code> or
				<code class="rounded bg-white/10 px-1">ph_water</code>.
			</p>
			<p class="text-sm text-muted">Dates can be YYYY-MM-DD or the date numbers Excel uses.</p>
			<label
				class="flex min-h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border text-base font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent hover:border-accent"
			>
				<input type="file" accept=".csv,text/csv" class="sr-only" onchange={choose} />
				Choose CSV file
			</label>
			<a
				href={asset('/samples/soil-tests.csv')}
				download="soil-tests-sample.csv"
				class="inline-flex min-h-11 items-center text-sm text-accent underline-offset-4 hover:underline"
			>
				Download a sample CSV
			</a>
		</div>
	{:else if step === 'check' && check}
		<p>
			<span class="font-semibold">{file?.name}</span>: {check.rowCount} row{check.rowCount === 1
				? ''
				: 's'}
		</p>

		{#if check.preview.rows.length > 0}
			<div class="overflow-x-auto rounded-lg border border-border">
				<table class="text-sm">
					<caption class="sr-only">The first {check.preview.rows.length} rows of the file</caption>
					<thead class="bg-white/5 text-left text-muted">
						<tr>
							{#each check.preview.headers as heading, index (index)}
								<th class="px-3 py-2 whitespace-nowrap">{heading}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each check.preview.rows as cells, rowIndex (rowIndex)}
							<tr class="border-t border-border/60">
								{#each cells as value, cellIndex (cellIndex)}
									<td class="px-3 py-2 whitespace-nowrap">{value}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		{#if check.errors.length > 0}
			<section
				aria-labelledby="csv-errors"
				class="rounded-lg border border-danger/50 bg-danger/10 p-4"
			>
				<h3 id="csv-errors" class="font-semibold">
					{check.errors.length} problem{check.errors.length === 1 ? '' : 's'} to fix before importing
				</h3>
				<ul class="mt-2 list-disc space-y-1 pl-5 text-sm">
					{#each check.errors.slice(0, MAX_LISTED) as issue, index (index)}
						<li>{issue.message}</li>
					{/each}
				</ul>
				{#if check.errors.length > MAX_LISTED}
					<p class="mt-2 text-sm">And {check.errors.length - MAX_LISTED} more.</p>
				{/if}
			</section>
		{:else}
			<p class="font-semibold text-accent">No problems found.</p>
		{/if}

		{#if check.warnings.length > 0}
			<section
				aria-labelledby="csv-warnings"
				class="rounded-lg border border-warn/50 bg-warn/10 p-4"
			>
				<h3 id="csv-warnings" class="font-semibold">Worth knowing</h3>
				<ul class="mt-2 list-disc space-y-1 pl-5 text-sm">
					{#each check.warnings.slice(0, MAX_LISTED) as issue, index (index)}
						<li>{issue.message}</li>
					{/each}
				</ul>
			</section>
		{/if}

		<div class="flex flex-wrap justify-end gap-2">
			<button type="button" class={button} onclick={chooseAnother}>Choose another file</button>
			<button
				type="button"
				class={primary}
				disabled={check.errors.length > 0}
				onclick={continueFromCheck}
			>
				Continue
			</button>
		</div>
	{:else if step === 'duplicates' && check}
		{@const count = check.duplicateSampleIds.length}
		<fieldset class="space-y-2">
			<legend class="mb-2 font-semibold">
				{count} sample{count === 1 ? ' is' : 's are'} already in the system
			</legend>
			<label class="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3">
				<input
					type="radio"
					name="on-duplicate"
					value="skip"
					bind:group={onDuplicate}
					class="size-5 accent-accent"
				/>
				<span>Skip them <span class="text-sm text-muted">(keep the tests already saved)</span></span
				>
			</label>
			<label class="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3">
				<input
					type="radio"
					name="on-duplicate"
					value="replace"
					bind:group={onDuplicate}
					class="size-5 accent-accent"
				/>
				<span
					>Replace them <span class="text-sm text-muted">(use the results in this file)</span></span
				>
			</label>
		</fieldset>
		<div class="flex flex-wrap justify-end gap-2">
			<button type="button" class={button} onclick={() => (step = 'check')}>Back</button>
			<button type="button" class={primary} onclick={startImport}>Import tests</button>
		</div>
	{:else if step === 'importing'}
		{#if done}
			<div role="status">
				<p class="text-lg font-semibold">
					Imported {job.inserted} test{job.inserted === 1 ? '' : 's'}
				</p>
				{#if job.skipped > 0}
					<p class="text-muted">
						Skipped {job.skipped}: already in the system, or without any results.
					</p>
				{/if}
			</div>
			<div class="flex justify-end">
				<button
					type="button"
					class={primary}
					onclick={() => ondone({ inserted: job.inserted, skipped: job.skipped })}
				>
					Close
				</button>
			</div>
		{:else if failed}
			<div role="alert" class="rounded-lg border border-danger/50 bg-danger/10 p-4">
				<p class="font-semibold">The import didn’t finish</p>
				<p class="text-sm">{job.error}</p>
			</div>
			<div class="flex justify-end">
				<button type="button" class={button} onclick={backToCheck}>Back to check</button>
			</div>
		{:else}
			<div role="status" aria-live="polite" class="space-y-2">
				<p class="font-semibold">Importing…</p>
				<div
					role="progressbar"
					aria-label="Import progress"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={job.percent}
					class="h-2 overflow-hidden rounded-full bg-white/10"
				>
					<div
						class="h-full bg-accent transition-[width] motion-reduce:transition-none"
						style:width="{job.percent}%"
					></div>
				</div>
				<p class="text-sm text-muted">{job.detail ?? job.message}</p>
			</div>
		{/if}
	{/if}
</div>
```

Run the autofixer, then the test. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/routes/soiltests/components/ImportSteps.svelte src/routes/soiltests/components/CsvImportWizard.svelte src/routes/soiltests/components/CsvImportWizard.svelte.test.ts
git commit -m "Add a stepped CSV import that checks the file before sending it"
```

---

### Task 8: Rebuild the page

**Files:**

- Modify: `src/routes/soiltests/+page.svelte` (rewrite)
- Create: `src/routes/soiltests/soiltests-page.svelte.test.ts`

**Interfaces:**

- Consumes: everything from Tasks 1–7; `fetchSoilTests`; `ConfirmModal` from `$lib/components/ConfirmModal.svelte`; `CSV_PROGRESS_EVENT_NAME`, `CsvProgressUpdate`.
- Produces: `/soiltests?q=&paddock=&year=&page=` (UX 2's paddock sheet links to `/soiltests?paddock=<id>`).

- [ ] **Step 1: Write the failing page test**

Create `src/routes/soiltests/soiltests-page.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const app = vi.hoisted(() => ({
	page: { url: new URL('http://localhost/soiltests'), state: {} },
	replaceState: vi.fn()
}));
vi.mock('$app/state', () => ({ page: app.page }));
vi.mock('$app/navigation', () => ({ replaceState: app.replaceState }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path, asset: (path: string) => path }));

import '../../app.css';
import SoilTestsPage from './+page.svelte';

const tests = Array.from({ length: 30 }, (_, i) => ({
	id: i + 1,
	fieldID: i < 4 ? '42' : '7',
	id_sample: 1000 + i,
	name_sample: `S-${i + 1}`,
	sample_date: `2024-05-${String((i % 28) + 1).padStart(2, '0')}`,
	ph_water: 5.5,
	P: 60
}));
const farm = {
	features: [
		{ properties: { fieldID: '42', FIELDNAME: 'North flat' } },
		{ properties: { fieldID: '7', FIELDNAME: 'Creek' } }
	]
};

function stubFetch(testsResponse: () => Response = () => Response.json(tests)) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.startsWith('/api/soil-tests')) return testsResponse();
			if (url.startsWith('/api/farm')) return Response.json(farm);
			return new Response('not found', { status: 404 });
		})
	);
}

function openAt(path: string) {
	app.page.url = new URL(`http://localhost${path}`);
	render(SoilTestsPage);
}

afterEach(() => {
	vi.unstubAllGlobals();
	app.replaceState.mockClear();
});

describe('soil tests page on a desktop', () => {
	beforeEach(async () => {
		await page.viewport(1280, 800);
	});

	it('shows 25 tests a page in a table', async () => {
		stubFetch();
		openAt('/soiltests');

		await expect.element(page.getByText('Showing 1–25 of 30')).toBeVisible();
		expect(page.getByRole('row').elements()).toHaveLength(26);
	});

	it('filters to the paddock in ?paddock=', async () => {
		stubFetch();
		openAt('/soiltests?paddock=42');

		await expect.element(page.getByText('Showing 1–4 of 4')).toBeVisible();
		await expect.element(page.getByLabelText('Paddock')).toHaveValue('42');
	});

	it('clamps a page past the end', async () => {
		stubFetch();
		openAt('/soiltests?page=99');

		await expect.element(page.getByText('Showing 26–30 of 30')).toBeVisible();
	});

	it('writes filter changes into the URL and returns to page 1', async () => {
		stubFetch();
		openAt('/soiltests?page=2');

		await page.getByLabelText('Year').selectOptions('2024');
		const [url] = app.replaceState.mock.lastCall as [string];
		expect(url).toBe('/soiltests?year=2024');
	});

	it('explains an empty result and clears the filters', async () => {
		stubFetch();
		openAt('/soiltests?q=nothing-matches');

		await expect.element(page.getByText('No tests match these filters.')).toBeVisible();
		await page.getByRole('button', { name: 'Clear filters' }).click();
		await expect.element(page.getByText('Showing 1–25 of 30')).toBeVisible();
	});

	it('offers Retry when the list fails to load', async () => {
		stubFetch(() => new Response('down', { status: 502 }));
		openAt('/soiltests');

		await expect
			.element(page.getByText('Couldn’t load soil tests. Check the connection and try again.'))
			.toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Retry' })).toBeVisible();
	});
});

describe('soil tests page on a phone', () => {
	beforeEach(async () => {
		await page.viewport(390, 844);
	});

	it('shows cards with statuses in words instead of the table', async () => {
		stubFetch();
		openAt('/soiltests?paddock=42');

		await expect.element(page.getByRole('article').first()).toBeVisible();
		expect(page.getByRole('table').elements()).toHaveLength(0);
		await expect.element(page.getByRole('article').first().getByText('Low')).toBeVisible();
	});
});
```

Run: `npx vitest run --project client src/routes/soiltests/soiltests-page.svelte.test.ts`
Expected: FAIL (the legacy page has no filters or pagination).

- [ ] **Step 2: Rewrite `src/routes/soiltests/+page.svelte`**

Replace the whole file (script, markup and the old `<style>` block) with:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';

	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import CONFIG from '$lib/config';
	import {
		EMPTY_FILTERS,
		filterTests,
		filtersToSearch,
		paginate,
		parseFilters,
		yearsIn,
		type Filters
	} from '$lib/soil-tests/filters';
	import { CSV_PROGRESS_EVENT_NAME, type CsvProgressUpdate } from '$lib/soil-tests/progress';
	import type { BulkDeleteResponse, PaddockSummary, SoilTest } from '$lib/soil-tests/schema';
	import { DEFAULT_SORT, describeSort, sortTests, type SortState } from '$lib/soil-tests/sort';
	import { fetchSoilTests } from '$lib/soil-tests/utils';
	import { sampleKey } from '$lib/soil-tests/validate';

	import BulkDeleteBar from './components/BulkDeleteBar.svelte';
	import CsvImportWizard from './components/CsvImportWizard.svelte';
	import ManualEntryForm from './components/ManualEntryForm.svelte';
	import Pagination from './components/Pagination.svelte';
	import SoilTestCard from './components/SoilTestCard.svelte';
	import SoilTestsTable from './components/SoilTestsTable.svelte';
	import SoilTestsToolbar from './components/SoilTestsToolbar.svelte';
	import Toasts from './components/Toasts.svelte';
	import UploadDialog from './components/UploadDialog.svelte';
	import { ImportJob } from './import-job.svelte';
	import { Toaster } from './toasts.svelte';

	const desktop = new MediaQuery('min-width: 48rem');
	const toaster = new Toaster();
	const job = new ImportJob();

	let tests = $state.raw<SoilTest[]>([]);
	let paddocks = $state.raw<PaddockSummary[]>([]);
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	// Read once from the URL; after that the URL mirrors this state.
	let filters = $state<Filters>(parseFilters(page.url));
	let sort = $state<SortState>(DEFAULT_SORT);
	let editing = $state(false);
	let selected = $state.raw(new Set<number>());
	let confirmingDelete = $state(false);
	let deleting = $state(false);
	let uploadMode = $state<'manual' | 'csv' | null>(null);

	const years = $derived(yearsIn(tests));
	const matching = $derived(sortTests(filterTests(tests, filters), sort));
	const slice = $derived(paginate(matching, filters.page));
	const knownPaddockIds = $derived(new Set(paddocks.map((paddock) => paddock.id)));
	const existingSamples = $derived(
		new Set(tests.map((test) => sampleKey(test.fieldId, test.sampleId)))
	);
	const hasFilters = $derived(
		filters.q.trim() !== '' || filters.paddock !== null || filters.year !== null
	);

	function setFilters(change: Partial<Filters>) {
		filters = { ...filters, ...change, page: change.page ?? 1 };
		replaceState(`${page.url.pathname}${filtersToSearch(filters)}`, page.state);
	}

	async function loadTests(): Promise<boolean> {
		loadError = null;
		try {
			const result = await fetchSoilTests();
			tests = result.tests;
			paddocks = result.paddocks;
			return true;
		} catch (err) {
			console.error('Failed to load soil tests', err);
			loadError = 'Couldn’t load soil tests. Check the connection and try again.';
			return false;
		} finally {
			loading = false;
		}
	}

	function toggleSelected(id: number, checked: boolean) {
		selected = checked
			? new Set([...selected, id])
			: new Set([...selected].filter((other) => other !== id));
	}

	function stopEditing() {
		editing = false;
		confirmingDelete = false;
		selected = new Set();
	}

	async function deleteSelected() {
		if (selected.size === 0 || deleting) return;
		deleting = true;
		const ids = [...selected];
		try {
			const response = await fetch(CONFIG.backend.bulkDelete, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids })
			});
			const result = (response.headers.get('content-type') ?? '').includes('application/json')
				? ((await response.json()) as BulkDeleteResponse & { message?: unknown })
				: null;
			if (!response.ok && response.status !== 207) {
				throw new Error(
					typeof result?.message === 'string'
						? result.message
						: `Delete failed (${response.status})`
				);
			}

			let failed = Array.isArray(result?.failedIds) ? result.failedIds : [];
			if (response.status === 207 && failed.length === 0) {
				const deleted = typeof result?.deleted === 'number' ? result.deleted : undefined;
				if (deleted !== undefined && deleted < ids.length) failed = ids;
			}
			const succeeded = (Array.isArray(result?.ids) ? result.ids : ids).filter(
				(id) => !failed.includes(id)
			);

			if (succeeded.length > 0) {
				tests = tests.filter((test) => !succeeded.includes(test.id));
				toaster.show(`Deleted ${succeeded.length} test${succeeded.length === 1 ? '' : 's'}.`);
			}
			if (failed.length > 0) {
				toaster.show(
					`Couldn’t delete ${failed.length} test${failed.length === 1 ? '' : 's'}.`,
					'warning'
				);
				selected = new Set(failed);
				confirmingDelete = false;
				return;
			}
			selected = new Set();
			confirmingDelete = false;
		} catch (err) {
			console.error('Bulk delete failed', err);
			toaster.show('Couldn’t delete tests. Check the connection and try again.', 'error');
		} finally {
			deleting = false;
		}
	}

	async function closeUpload() {
		if (job.running) await job.cancel();
		else job.reset();
		uploadMode = null;
		void loadTests();
	}

	async function manualSaved() {
		uploadMode = null;
		const refreshed = await loadTests();
		toaster.show(
			refreshed ? 'Soil test added.' : 'Soil test added, but refreshing the list failed.',
			refreshed ? 'success' : 'warning'
		);
	}

	async function importDone({ inserted }: { inserted: number; skipped: number }) {
		job.reset();
		uploadMode = null;
		// New tests are on page 1: newest first, no filters.
		sort = DEFAULT_SORT;
		setFilters({ ...EMPTY_FILTERS });
		const refreshed = await loadTests();
		toaster.show(
			refreshed
				? `Imported ${inserted} test${inserted === 1 ? '' : 's'}.`
				: 'Import complete, but refreshing the list failed.',
			refreshed ? 'success' : 'warning'
		);
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && editing && !confirmingDelete && uploadMode === null)
			stopEditing();
	}

	onMount(() => {
		void loadTests();
		// Kept from the old page: other scripts can push progress with this DOM event.
		const onProgress = (event: Event) => {
			const detail = (event as CustomEvent<CsvProgressUpdate>).detail;
			if (detail) job.apply(detail);
		};
		window.addEventListener(CSV_PROGRESS_EVENT_NAME, onProgress);
		return () => {
			window.removeEventListener(CSV_PROGRESS_EVENT_NAME, onProgress);
			job.stop();
			toaster.destroy();
		};
	});
</script>

<svelte:head>
	<title>Soil tests</title>
</svelte:head>

<svelte:window onkeydown={onWindowKeydown} />

<Toasts {toaster} />

<div class="mx-auto max-w-6xl space-y-4 px-4 pb-8">
	<div class="flex flex-wrap items-center justify-between gap-3 pt-6">
		<h1 class="text-xl font-semibold">Soil tests</h1>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				onclick={() => (uploadMode = 'csv')}
				class="inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-bg"
			>
				Import tests
			</button>
			<button
				type="button"
				onclick={() => (uploadMode = 'manual')}
				class="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm text-text hover:bg-white/5"
			>
				Add a test
			</button>
		</div>
	</div>

	<SoilTestsToolbar
		{filters}
		{paddocks}
		{years}
		{sort}
		showSort={!desktop.current}
		onchange={setFilters}
		onsort={(next) => {
			sort = next;
			setFilters({});
		}}
	/>

	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-muted">{describeSort(sort)}</p>
		{#if !editing}
			<button
				type="button"
				onclick={() => (editing = true)}
				class="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm text-muted hover:text-text"
			>
				Delete tests
			</button>
		{/if}
	</div>

	{#if editing}
		<BulkDeleteBar
			count={selected.size}
			ondelete={() => (confirmingDelete = true)}
			ondone={stopEditing}
		/>
	{/if}

	{#if loading}
		<p class="text-muted">Loading soil tests…</p>
	{:else if loadError}
		<div class="rounded-xl border border-danger/50 bg-danger/10 p-4">
			<p>{loadError}</p>
			<button
				type="button"
				onclick={() => void loadTests()}
				class="mt-2 inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm"
			>
				Retry
			</button>
		</div>
	{:else if matching.length === 0}
		<div class="rounded-xl border border-border bg-panel p-6 text-center">
			<p>{hasFilters ? 'No tests match these filters.' : 'No soil tests yet.'}</p>
			{#if hasFilters}
				<button
					type="button"
					onclick={() => setFilters({ q: '', paddock: null, year: null })}
					class="mt-3 inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm"
				>
					Clear filters
				</button>
			{/if}
		</div>
	{:else}
		{#if desktop.current}
			<SoilTestsTable
				tests={slice.items}
				{sort}
				onsort={(next) => {
					sort = next;
					setFilters({});
				}}
				{editing}
				{selected}
				ontoggle={toggleSelected}
			/>
		{:else}
			<ul class="space-y-3">
				{#each slice.items as test (test.id)}
					<li>
						<SoilTestCard
							{test}
							{editing}
							selected={selected.has(test.id)}
							ontoggle={toggleSelected}
						/>
					</li>
				{/each}
			</ul>
		{/if}
		<Pagination
			{slice}
			onchange={(next) => {
				setFilters({ page: next });
				window.scrollTo({ top: 0 });
			}}
		/>
	{/if}
</div>

{#if uploadMode}
	<UploadDialog
		mode={uploadMode}
		onmodechange={(mode) => (uploadMode = mode)}
		running={job.running}
		onclose={closeUpload}
	>
		{#snippet manual()}
			<ManualEntryForm {paddocks} {existingSamples} onsaved={manualSaved} oncancel={closeUpload} />
		{/snippet}
		{#snippet csv()}
			<CsvImportWizard {job} {knownPaddockIds} {existingSamples} ondone={importDone} />
		{/snippet}
	</UploadDialog>
{/if}

<ConfirmModal
	open={confirmingDelete}
	title="Delete these soil tests?"
	confirmText="Delete"
	cancelText="Cancel"
	loading={deleting}
	disableConfirm={selected.size === 0}
	onconfirm={deleteSelected}
	oncancel={() => {
		if (!deleting) confirmingDelete = false;
	}}
>
	<p class="text-sm">
		You're about to delete {selected.size} test{selected.size === 1 ? '' : 's'}. This can't be
		undone.
	</p>
</ConfirmModal>
```

Notes:

- ESLint's `no-navigation-without-resolve` flags `replaceState` with a built URL; that's one expected error, far below what the old page carried.
- If the autofixer suggests `SvelteSet` for `selected`, keep the plain `Set` in `$state.raw`: it is replaced, never mutated.

Run the autofixer until clean.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run --project client src/routes/soiltests && npx vitest run --project server src/lib/soil-tests && npm run check`
Expected: PASS, no type errors.

- [ ] **Step 4: Remove what nothing uses**

Run: `grep -rn "csvStageDefaults\|CSV_PROGRESS_EVENT_NAME\|metricPlaceholders\|optionalColumns\|normaliseSampleDateValue" src | grep -v "src/lib/soil-tests/"`
Everything listed there is still used; don't delete it. Then check the constraints:

Run: `grep -rn "text-\[1[01]px\]\|uppercase\|on:\|export let\|\$:\|\$app/stores\|class:" src/routes/soiltests`
Expected: no output.

- [ ] **Step 5: Browser check and design review**

Load `frontend-design:frontend-design` and re-read `docs/superpowers/specs/2026-09-27-ui-direction.md`. With the backend running (`../gbros-api`) and `npm run dev`, run `node scripts/screenshot.mjs /tmp/shots-soil /soiltests /soiltests?paddock=<a real field ID>`. At 390px: cards, readable without zoom, the page is a few screens long rather than 23,000px, filters usable with a thumb. At 1280px: the table header stays visible while scrolling the list, status marks sit beside metric values. Then do a real import of `static/samples/soil-tests.csv` against the local backend: the Check step says "No problems found.", the Duplicates step appears if the sample is already imported, and Done shows the counts; after Close the list is newest first on page 1. Fix what doesn't match and re-run the tests.

- [ ] **Step 6: Commit**

```bash
git add src/routes/soiltests
git commit -m "Rebuild soil tests on runes with filters, pagination, phone cards and a checked import"
```

---

### Task 9: Full verification and PR

- [ ] **Step 1: Run everything CI runs**

```bash
npm run check
npm test
npx prettier --check .
npx eslint src 2>&1 | tail -3   # compare with the baseline; must not be higher
npm run build
scripts/smoke-test.sh --local
```

Expected: all pass; the ESLint error count is at or below the baseline.

- [ ] **Step 2: Final design review**

Load `frontend-design:frontend-design`. Screenshot `/soiltests` at both widths again and review against the direction document: 12px minimum, 44px controls, statuses in words or icons, one `<h1>`, sentence-case, "Import tests" → "Importing…" → "Imported 48 tests" wording.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/soil-tests-ux
gh pr create --base staging --title "Soil tests: finding and importing (UX 3)" --body "$(cat <<'EOF'
Implements docs/superpowers/plans/2026-09-27-soil-tests-ux.md.

- Search, paddock and year filters in the URL (`/soiltests?paddock=<id>` works from the map), 25 tests a page
- Phones get cards with pH, P, K and organic matter statuses in words; desktop keeps the table with a sticky header
- CSV import is a checked, stepped flow: problems are listed by row before upload, duplicates can be skipped or replaced (`onDuplicate`)
- The page moves to runes and splits into components; import polling is an `ImportJob` class

The check rules follow the backend (unknown paddocks and non-numeric results block the import, as the backend rejects them); see the table at the top of the plan.

Closes #17

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Leave the worktree in place until the PR merges.
