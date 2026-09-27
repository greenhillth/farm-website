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
