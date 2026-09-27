import { describe, expect, it } from 'vitest';

import CONFIG from '$lib/config';
import { indexLatestSamples, paddockSoilSummary } from './soil-status';

const metrics = CONFIG.soilMetrics;

describe('indexLatestSamples', () => {
	it('keeps the newest sample for each paddock', () => {
		const index = indexLatestSamples(
			[
				{ fieldID: '42', sample_date: '2020-01-01', name_sample: 'old', ph_water: 5 },
				{ fieldID: '42', sample_date: '2024-05-01', name_sample: 'new', ph_water: 6.5 },
				{ fieldID: '7', sample_date: '2023-03-01', P: 30 }
			],
			metrics
		);

		expect(index.size).toBe(2);
		expect(index.get(42)?.sampleName).toBe('new');
		expect(index.get(42)?.metrics.pH).toBe(6.5);
		expect(index.get(7)?.metrics.P).toBe(30);
	});

	it('skips rows without a paddock id and anything that is not a list', () => {
		expect(indexLatestSamples([{ sample_date: '2024-01-01', ph_water: 6 }], metrics).size).toBe(0);
		expect(indexLatestSamples({ method: 'GET' }, metrics).size).toBe(0);
		expect(indexLatestSamples(null, metrics).size).toBe(0);
	});
});

describe('paddockSoilSummary', () => {
	const sample = indexLatestSamples(
		[{ fieldID: '42', sample_date: '2024-05-01', ph_water: 5.5, P: 120 }],
		metrics
	).get(42);

	it('lists every metric except None, in config order', () => {
		const rows = paddockSoilSummary(sample, metrics);
		expect(rows.map((row) => row.id)).toEqual(
			metrics.filter((metric) => metric.id !== 'none').map((metric) => metric.id)
		);
	});

	it('classifies values and formats them with units', () => {
		const rows = paddockSoilSummary(sample, metrics);
		expect(rows.find((row) => row.id === 'pH')).toEqual({
			id: 'pH',
			label: 'Soil pH',
			valueText: '5.5',
			status: 'low'
		});
		expect(rows.find((row) => row.id === 'P')).toMatchObject({
			valueText: '120 mg/kg',
			status: 'high'
		});
	});

	it('marks missing metrics as no data', () => {
		const rows = paddockSoilSummary(sample, metrics);
		expect(rows.find((row) => row.id === 'K')).toMatchObject({
			valueText: 'No data',
			status: 'no-data'
		});
	});

	it('handles a paddock with no sample at all', () => {
		const rows = paddockSoilSummary(undefined, metrics);
		expect(rows.length).toBeGreaterThan(0);
		expect(rows.every((row) => row.status === 'no-data')).toBe(true);
	});
});
