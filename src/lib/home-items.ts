import type { Pathname } from '$app/types';

import type { MetricOption } from '$lib/config';
import {
	extractFieldId,
	metricStatus,
	parseDateMs,
	pickMetricValue,
	type SoilTestRecord
} from '$lib/soil-status';

export type HomeItem = {
	href: Pathname;
	title: string;
	description: string;
	image?: string | null;
	imageAlt?: string;
};

export const mainTools: HomeItem[] = [
	{
		href: '/map',
		title: 'Farm map',
		description: 'Find a paddock and see how its soil is doing.',
		image: '/img/map-card.webp',
		imageAlt: 'Aerial view of the farm'
	},
	{
		href: '/weather',
		title: 'Weather',
		description: 'Conditions from the farm’s own weather station.',
		image: '/img/weather-station.webp',
		imageAlt: 'The farm weather station'
	},
	{
		href: '/soiltests',
		title: 'Soil tests',
		description: 'Look up lab results or add new ones.',
		image: '/img/soil-card.webp',
		imageAlt: 'A handful of soil'
	}
];

export const moreTools: HomeItem[] = [
	{
		href: '/paddocks',
		title: 'Paddocks',
		description: 'Every paddock with its size and location.'
	},
	{ href: '/manual', title: 'Help', description: 'How to use this site and upload soil tests.' }
];

export type SoilSummary = {
	paddocksTested: number;
	latestSampleDate: string | null;
	worst: { metricLabel: string; direction: 'low' | 'high'; count: number } | null;
};

/**
 * Summarises `/soil-tests?latest=true` rows for the home page: paddocks tested, the newest
 * sample date, and the metric with the most paddocks outside its optimal range (ties go to the
 * first metric in config order). Returns null when the response isn't a list.
 */
export function summariseLatestSoilTests(
	rows: unknown,
	metrics: readonly MetricOption[]
): SoilSummary | null {
	if (!Array.isArray(rows)) return null;

	const newestByField = new Map<number, { record: SoilTestRecord; ms: number }>();
	let latestMs = -Infinity;
	let latestSampleDate: string | null = null;

	for (const row of rows) {
		if (!row || typeof row !== 'object') continue;
		const record = row as SoilTestRecord;
		const fieldId = extractFieldId(record);
		if (fieldId === null) continue;

		const ms = parseDateMs(record.sample_date) ?? -Infinity;
		const existing = newestByField.get(fieldId);
		if (!existing || ms >= existing.ms) newestByField.set(fieldId, { record, ms });
		if (ms > latestMs) {
			latestMs = ms;
			latestSampleDate = String(record.sample_date);
		}
	}

	let worst: SoilSummary['worst'] = null;
	for (const metric of metrics) {
		if (metric.id === 'none') continue;
		const counts = { low: 0, high: 0 };
		for (const { record } of newestByField.values()) {
			const status = metricStatus(pickMetricValue(record, metric.id), metric);
			if (status === 'low' || status === 'high') counts[status] += 1;
		}
		for (const direction of ['low', 'high'] as const) {
			const count = counts[direction];
			if (count > 0 && (!worst || count > worst.count)) {
				worst = { metricLabel: metric.label, direction, count };
			}
		}
	}

	return { paddocksTested: newestByField.size, latestSampleDate, worst };
}

export function soilHeadline(summary: SoilSummary): string {
	if (summary.worst) {
		const { metricLabel, direction, count } = summary.worst;
		return `${metricLabel} ${direction} in ${count} paddock${count === 1 ? '' : 's'}`;
	}
	return summary.paddocksTested > 0 ? 'All tested paddocks in range' : 'No soil tests yet';
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** The nearest of the eight compass points to a bearing in degrees. */
export function compassPoint(degrees: number): string {
	const normalised = ((degrees % 360) + 360) % 360;
	return COMPASS_POINTS[Math.round(normalised / 45) % 8];
}
