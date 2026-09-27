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

