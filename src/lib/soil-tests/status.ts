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
