import { describe, expect, it } from 'vitest';

import {
	VIRIDIS_STOPS,
	buildPaddockTooltipHtml,
	clamp,
	computeMetricStats,
	extractFieldId,
	pickMetricValue,
	toPct,
	viridisColor,
	type NormalisedSoilSample
} from './helpers';
import CONFIG from '$lib/config';
import type { MetricOption } from '$lib/config';

const sample = (fieldId: number, P?: number): NormalisedSoilSample => ({
	fieldId,
	sampleDate: null,
	sampleDateMs: null,
	sampleName: null,
	metrics: P === undefined ? {} : { P },
	raw: {}
});

const phosphorus = { id: 'P' } as MetricOption;

describe('extractFieldId', () => {
	it('reads the first integer-valued id key, skipping blank ones', () => {
		expect(extractFieldId({ fieldID: ' ', ADSFLDID: '2798980' })).toBe(2798980);
	});

	it('returns null when no key holds an integer', () => {
		expect(extractFieldId({ fieldID: '12.5', name: 'Dam' })).toBeNull();
	});
});

describe('pickMetricValue', () => {
	it('falls back through alias keys and parses numeric strings', () => {
		expect(pickMetricValue({ ph_water: '', pH: '5.9' }, 'pH')).toBe(5.9);
	});

	it('returns null when the metric is absent', () => {
		expect(pickMetricValue({ K: 10 }, 'P')).toBeNull();
	});
});

describe('clamp and toPct', () => {
	it('clamps NaN to the minimum and accepts reversed bounds', () => {
		expect(clamp(Number.NaN, 2, 5)).toBe(2);
		expect(clamp(10, 5, 0)).toBe(5);
	});

	it('returns 0 for a zero-width scale instead of dividing by zero', () => {
		expect(toPct(3, 4, 4)).toBe(0);
		expect(toPct(15, 10, 20)).toBe(50);
	});
});

describe('viridisColor', () => {
	it('maps the scale ends to the first and last stops', () => {
		expect(viridisColor(0, 0, 100)).toBe(VIRIDIS_STOPS[0]);
		expect(viridisColor(100, 0, 100)).toBe(VIRIDIS_STOPS[VIRIDIS_STOPS.length - 1]);
	});

	it('clamps out-of-range values and treats NaN as the lowest colour', () => {
		expect(viridisColor(500, 0, 100)).toBe(VIRIDIS_STOPS[VIRIDIS_STOPS.length - 1]);
		expect(viridisColor(Number.NaN, 0, 100)).toBe(VIRIDIS_STOPS[0]);
	});
});

describe('computeMetricStats', () => {
	it('ignores samples without the metric', () => {
		const samples = new Map([
			[1, sample(1, 30)],
			[2, sample(2)],
			[3, sample(3, 10)],
			[4, sample(4, 20)]
		]);
		expect(computeMetricStats(phosphorus, samples)).toEqual({
			min: 10,
			max: 30,
			mean: 20,
			median: 20,
			count: 3
		});
	});

	it('returns null when no sample has a value', () => {
		expect(computeMetricStats(phosphorus, new Map([[1, sample(1)]]))).toBeNull();
	});
});

describe('buildPaddockTooltipHtml', () => {
	const phosphorus = CONFIG.soilMetrics.find((m) => m.id === 'P')!;
	const none = CONFIG.soilMetrics.find((m) => m.id === 'none')!;
	const base = {
		name: 'North',
		displayId: '7',
		metric: phosphorus,
		valueText: '55 mg/kg',
		sampleDate: '2026-03-01',
		colorable: true
	};

	it('escapes the paddock name, id and value', () => {
		const html = buildPaddockTooltipHtml({
			...base,
			name: '<script>x</script>',
			displayId: '"7"',
			valueText: '<1'
		});
		expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
		expect(html).toContain('ID: &quot;7&quot;');
		expect(html).toContain('Phosphorus: &lt;1');
		expect(html).not.toContain('<script>');
	});

	it('shows only the name and id when no metric is selected', () => {
		expect(buildPaddockTooltipHtml({ ...base, metric: none })).toBe(
			'<div><strong>North</strong></div><div>ID: 7</div>'
		);
	});

	it('shows the sample date, or says there is no recent sample', () => {
		expect(buildPaddockTooltipHtml(base)).toContain('Sample: ');
		const noSample = buildPaddockTooltipHtml({ ...base, sampleDate: null, valueText: null });
		expect(noSample).toContain('Phosphorus: No data');
		expect(noSample).toContain('No recent sample');
	});
});
