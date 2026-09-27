import type { MetricId, MetricOption } from '$lib/config';
import {
	extractFieldId,
	metricStatus,
	parseDateMs,
	pickMetricValue,
	type MetricStatus,
	type SoilTestRecord
} from '$lib/soil-status';
import { formatMetricValue, type NormalisedSoilSample } from './helpers';

export type SoilRow = { id: MetricId; label: string; valueText: string; status: MetricStatus };

/** The newest sample for each paddock in a `/soil-tests?latest=true` response. */
export function indexLatestSamples(
	records: unknown,
	metrics: readonly MetricOption[]
): Map<number, NormalisedSoilSample> {
	const next = new Map<number, NormalisedSoilSample>();
	if (!Array.isArray(records)) return next;

	for (const row of records) {
		if (!row || typeof row !== 'object') continue;
		const entry = row as SoilTestRecord;
		const fieldId = extractFieldId(entry);
		if (fieldId === null) continue;

		const values: NormalisedSoilSample['metrics'] = {};
		for (const metric of metrics) {
			if (metric.id === 'none') continue;
			const value = pickMetricValue(entry, metric.id);
			if (value !== null) values[metric.id] = value;
		}

		const sampleDateSource = (entry.sample_date ??
			entry.sampleDate ??
			entry.sample_datetime ??
			entry.SampleDate ??
			entry.date ??
			entry.timestamp ??
			null) as unknown;
		const sampleDate = sampleDateSource ? String(sampleDateSource) : null;
		const sampleDateMs = parseDateMs(sampleDateSource);
		const sampleNameSource = (entry.name_sample ??
			entry.sample_name ??
			entry.sampleName ??
			entry.SampleName ??
			null) as unknown;
		const sampleName =
			sampleNameSource === null || sampleNameSource === undefined ? null : String(sampleNameSource);

		const existing = next.get(fieldId);
		if (existing && (sampleDateMs ?? -Infinity) < (existing.sampleDateMs ?? -Infinity)) continue;

		next.set(fieldId, {
			fieldId,
			sampleDate,
			sampleDateMs,
			sampleName,
			metrics: values,
			raw: entry
		});
	}
	return next;
}

/** One row per metric (except None) for the paddock sheet, in config order. */
export function paddockSoilSummary(
	sample: NormalisedSoilSample | undefined,
	metrics: readonly MetricOption[]
): SoilRow[] {
	return metrics
		.filter((metric) => metric.id !== 'none')
		.map((metric) => {
			const raw = sample?.metrics[metric.id];
			const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
			return {
				id: metric.id,
				label: metric.label,
				valueText: value === null ? 'No data' : formatMetricValue(value, metric),
				status: metricStatus(value, metric)
			};
		});
}
