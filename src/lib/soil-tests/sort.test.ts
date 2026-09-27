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
