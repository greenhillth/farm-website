import { afterEach, describe, expect, it, vi } from 'vitest';

import CONFIG from '$lib/config';
import { fetchSoilTests, normaliseSampleDateValue } from './utils';

describe('normaliseSampleDateValue', () => {
	it('treats numeric strings like Excel serial numbers', () => {
		expect(normaliseSampleDateValue('45000')).toBe(normaliseSampleDateValue(45000));
	});

	// Known bug: the 1899-12-30 epoch already absorbs Excel's 1900 leap-year bug, so the extra
	// day subtracted for serials >= 60 makes every date one day early. Remove `.fails` once fixed.
	it.fails('converts Excel serial 45000 to 2023-03-15', () => {
		expect(normaliseSampleDateValue(45000)).toBe('2023-03-15');
	});

	// Known bug: non-ISO text parses as local midnight, and toISOString() then shifts it back a day
	// in Australian time zones. Remove `.fails` once fixed.
	it.fails('keeps the calendar date of non-ISO text like "1 March 2023"', () => {
		expect(normaliseSampleDateValue('1 March 2023')).toBe('2023-03-01');
	});

	it('normalises ISO date strings and keeps unparseable text as-is', () => {
		expect(normaliseSampleDateValue('2024-02-29')).toBe('2024-02-29');
		expect(normaliseSampleDateValue('not a date')).toBe('not a date');
	});

	it('returns null for empty input', () => {
		expect(normaliseSampleDateValue('  ')).toBeNull();
		expect(normaliseSampleDateValue(null)).toBeNull();
	});
});

describe('fetchSoilTests', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function stubBackend(tests: unknown, farm: unknown, testsStatus = 200) {
		const fetchMock = vi.fn(async (url: string) => {
			const body = url === CONFIG.backend.tests ? tests : farm;
			const status = url === CONFIG.backend.tests ? testsStatus : 200;
			return new Response(JSON.stringify(body), { status });
		});
		vi.stubGlobal('fetch', fetchMock);
		return fetchMock;
	}

	const farm = {
		type: 'FeatureCollection',
		features: [{ properties: { fieldID: '101', fieldName: 'Above Dam', FARM: 'Woodcote' } }]
	};

	it('joins tests to paddocks, maps metric aliases and sorts newest first', async () => {
		stubBackend(
			[
				{ id: 1, fieldID: '101', id_sample: '7', sample_date: '2022-05-01', p: '12.5' },
				{ id: 2, fieldID: 202, id_sample: 8, sample_date: '2024-01-10', PH: 6.1 }
			],
			farm
		);

		const { tests, paddocks } = await fetchSoilTests();

		expect(tests.map((t) => t.id)).toEqual([2, 1]);
		expect(tests[1]).toMatchObject({
			fieldId: 101,
			paddockName: 'Above Dam',
			farm: 'Woodcote',
			sampleId: 7,
			metrics: { P: 12.5 }
		});
		expect(tests[0].paddockName).toBe('Unknown paddock');
		expect(tests[0].metrics.ph_water).toBe(6.1);
		expect(paddocks).toEqual([
			{ id: 101, name: 'Above Dam', farm: 'Woodcote' },
			{ id: 202, name: 'Unknown paddock', farm: undefined }
		]);
	});

	it('rejects a row without an integer field ID', async () => {
		stubBackend([{ id: 1, fieldID: 'abc', id_sample: 1 }], farm);
		await expect(fetchSoilTests()).rejects.toThrow('valid integer field ID');
	});

	it('reports the status when the tests request fails', async () => {
		stubBackend([], farm, 503);
		await expect(fetchSoilTests()).rejects.toThrow('Tests request failed (503)');
	});
});
