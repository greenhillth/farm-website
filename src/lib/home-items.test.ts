import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import CONFIG from '$lib/config';
import {
	compassPoint,
	mainTools,
	moreTools,
	soilHeadline,
	summariseLatestSoilTests
} from './home-items';

const staticDir = fileURLToPath(new URL('../../static', import.meta.url));
const MAX_CARD_IMAGE_BYTES = 150_000;
const items = [...mainTools, ...moreTools];
const localImages = items
	.map((item) => item.image)
	.filter((image): image is string => typeof image === 'string');

describe('home tools', () => {
	it.each(localImages)('%s is a thumbnail under 150 KB in static/', (image) => {
		expect(existsSync(`${staticDir}${image}`)).toBe(true);
		expect(statSync(`${staticDir}${image}`).size).toBeLessThan(MAX_CARD_IMAGE_BYTES);
	});

	it('has unique titles, which the home page uses as keys', () => {
		const titles = items.map((item) => item.title);
		expect(new Set(titles).size).toBe(titles.length);
	});

	it('leads with the three main jobs', () => {
		expect(mainTools.map((item) => item.href)).toEqual(['/map', '/weather', '/soiltests']);
	});
});

describe('summariseLatestSoilTests', () => {
	const metrics = CONFIG.soilMetrics; // pH optimal 6–7, P optimal 40–90

	it('returns null for anything that is not an array', () => {
		expect(summariseLatestSoilTests({ method: 'GET' }, metrics)).toBeNull();
		expect(summariseLatestSoilTests(null, metrics)).toBeNull();
	});

	it('handles no rows', () => {
		expect(summariseLatestSoilTests([], metrics)).toEqual({
			paddocksTested: 0,
			latestSampleDate: null,
			worst: null
		});
	});

	it('counts each paddock once, using its newest sample', () => {
		const rows = [
			{ fieldID: '1', sample_date: '2020-01-01', ph_water: 5.0 },
			{ fieldID: '1', sample_date: '2024-05-01', ph_water: 6.5 },
			{ fieldID: '2', sample_date: '2023-03-01', ph_water: 5.5 }
		];
		expect(summariseLatestSoilTests(rows, metrics)).toEqual({
			paddocksTested: 2,
			latestSampleDate: '2024-05-01',
			worst: { metricLabel: 'Soil pH', direction: 'low', count: 1 }
		});
	});

	it('picks the metric with the most paddocks outside its range', () => {
		const rows = [
			{ fieldID: '1', sample_date: '2024-01-01', ph_water: 5.0, P: 100 },
			{ fieldID: '2', sample_date: '2024-01-01', ph_water: 6.5, P: 120 },
			{ fieldID: '3', sample_date: '2024-01-01', ph_water: 6.5, P: 150 }
		];
		expect(summariseLatestSoilTests(rows, metrics)?.worst).toEqual({
			metricLabel: 'Phosphorus',
			direction: 'high',
			count: 3
		});
	});

	it('ignores rows without a paddock id and dates that do not parse', () => {
		const rows = [
			{ sample_date: '2025-01-01', ph_water: 5 },
			{ fieldID: '7', sample_date: 'not a date', ph_water: 6.5 }
		];
		expect(summariseLatestSoilTests(rows, metrics)).toEqual({
			paddocksTested: 1,
			latestSampleDate: null,
			worst: null
		});
	});
});

describe('soilHeadline', () => {
	it('names the worst problem', () => {
		expect(
			soilHeadline({
				paddocksTested: 9,
				latestSampleDate: null,
				worst: { metricLabel: 'Soil pH', direction: 'low', count: 3 }
			})
		).toBe('Soil pH low in 3 paddocks');
	});

	it('uses the singular for one paddock', () => {
		expect(
			soilHeadline({
				paddocksTested: 9,
				latestSampleDate: null,
				worst: { metricLabel: 'Potassium', direction: 'high', count: 1 }
			})
		).toBe('Potassium high in 1 paddock');
	});

	it('says so when everything is in range, or nothing is tested', () => {
		expect(soilHeadline({ paddocksTested: 4, latestSampleDate: null, worst: null })).toBe(
			'All tested paddocks in range'
		);
		expect(soilHeadline({ paddocksTested: 0, latestSampleDate: null, worst: null })).toBe(
			'No soil tests yet'
		);
	});
});

describe('compassPoint', () => {
	it.each([
		[0, 'N'],
		[22, 'N'],
		[23, 'NE'],
		[221, 'SW'],
		[359, 'N'],
		[-45, 'NW'],
		[405, 'NE']
	])('%s° is %s', (degrees, expected) => {
		expect(compassPoint(degrees)).toBe(expected);
	});
});
