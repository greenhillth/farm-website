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
