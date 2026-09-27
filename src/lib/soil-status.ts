import type { MetricId, MetricOption } from '$lib/config';

export type SoilTestRecord = Record<string, unknown>;

const METRIC_VALUE_KEYS: Record<MetricId, string[]> = {
	none: [],
	OM: ['OM', 'om', 'OrganicMatter', 'organic_matter', 'total_C', 'Total_C'],
	P: ['P', 'p', 'Phosphorus'],
	K: ['K', 'k', 'Potassium'],
	M: ['Mg', 'mg', 'Magnesium', 'magnesium'],
	Ca: ['Ca', 'ca', 'Calcium', 'calcium'],
	pH: ['ph_water', 'pH', 'ph', 'ph_H2O', 'ph_h2o']
};

const FIELD_ID_KEYS = [
	'fieldID',
	'fieldId',
	'FIELDID',
	'FIELD_ID',
	'ADSFLDID',
	'adsfldid',
	'field_id',
	'id_field',
	'paddockId',
	'paddock_id'
];

export function normaliseFieldId(value: unknown): number | null {
	if (value === null || value === undefined) return null;
	const text = String(value).trim();
	if (text === '') return null;
	const num = Number(text);
	return Number.isInteger(num) ? num : null;
}

export function extractFieldId(record: SoilTestRecord): number | null {
	for (const key of FIELD_ID_KEYS) {
		if (key in record) {
			const candidate = normaliseFieldId(record[key]);
			if (candidate !== null) return candidate;
		}
	}
	return null;
}

export function toNumber(value: unknown): number | null {
	if (value === null || value === undefined) return null;
	const candidate = typeof value === 'string' ? value.trim() : value;
	if (candidate === '') return null;
	const num = Number(candidate);
	return Number.isFinite(num) ? num : null;
}

export function pickMetricValue(record: SoilTestRecord, metricId: MetricId): number | null {
	const keys = METRIC_VALUE_KEYS[metricId] ?? [];
	for (const key of keys) {
		if (!(key in record)) continue;
		const candidate = toNumber(record[key]);
		if (candidate !== null) return candidate;
	}
	return null;
}

export function parseDateMs(value: unknown): number | null {
	if (!value) return null;
	const timestamp = Date.parse(String(value));
	return Number.isNaN(timestamp) ? null : timestamp;
}

export type MetricStatus = 'low' | 'optimal' | 'high' | 'no-data' | 'no-range';

export const STATUS_LABELS: Record<MetricStatus, string> = {
	low: 'Low',
	optimal: 'Optimal',
	high: 'High',
	'no-data': 'No data',
	'no-range': 'No target'
};

/** Classifies a value against the metric's optimal range; both ends of the range count as optimal. */
export function metricStatus(
	value: number | null | undefined,
	metric: Pick<MetricOption, 'range_optimal'>
): MetricStatus {
	if (typeof value !== 'number' || !Number.isFinite(value)) return 'no-data';
	const [low, high] = metric.range_optimal;
	if (typeof low !== 'number' || typeof high !== 'number') return 'no-range';
	if (value < low) return 'low';
	if (value > high) return 'high';
	return 'optimal';
}
