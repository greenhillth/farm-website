import { describe, expect, it } from 'vitest';

import CONFIG from '$lib/config';
import type { MetricOption } from '$lib/config';
import { STATUS_LABELS, extractFieldId, metricStatus, pickMetricValue } from './soil-status';

const pH = CONFIG.soilMetrics.find((m) => m.id === 'pH') as MetricOption; // optimal 6–7
const none = CONFIG.soilMetrics.find((m) => m.id === 'none') as MetricOption;

describe('metricStatus', () => {
	it.each([
		[5.9, 'low'],
		[6, 'optimal'],
		[6.5, 'optimal'],
		[7, 'optimal'],
		[7.1, 'high']
	] as const)('pH %s is %s (both ends of the range are optimal)', (value, expected) => {
		expect(metricStatus(value, pH)).toBe(expected);
	});

	it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])('%s is no-data', (value) => {
		expect(metricStatus(value, pH)).toBe('no-data');
	});

	it('a metric without an optimal range is no-range', () => {
		expect(metricStatus(5, none)).toBe('no-range');
	});

	it('has a label for every status', () => {
		expect(STATUS_LABELS).toEqual({
			low: 'Low',
			optimal: 'Optimal',
			high: 'High',
			'no-data': 'No data',
			'no-range': 'No target'
		});
	});
});

describe('moved readers', () => {
	it('pickMetricValue reads the backend pH column', () => {
		expect(pickMetricValue({ ph_water: 5.89 }, 'pH')).toBe(5.89);
	});

	it('extractFieldId reads a string fieldID', () => {
		expect(extractFieldId({ fieldID: '4251583' })).toBe(4251583);
	});
});
