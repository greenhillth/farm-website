import { describe, expect, it, vi } from 'vitest';

import { ALWAYS_SAMPLE_FIELDS, WEATHER_FIELDS } from '$lib/weather';
import { fetchBackendWeatherMeta } from './backend';

const full = {
	timestamp_utc: '2026-09-26 01:00:00',
	temp_c: 14.2,
	humidity_pct: 70,
	pressure_hpa: 1012,
	wind_avg_ms: 3,
	wind_gust_ms: 5,
	wind_dir_deg: 200,
	rain_1h_mm: 0,
	rain_24h_mm: 1.2,
	solar_wm2: 300
};
const returning = (body: unknown, status = 200) =>
	vi.fn(async () => Response.json(body, { status })) as unknown as typeof fetch;
const sorted = (fields: readonly string[]) => [...fields].sort();

describe('fetchBackendWeatherMeta mockFields', () => {
	it('lists only the fields the station never reports when a reading is complete', async () => {
		const result = await fetchBackendWeatherMeta(returning(full));

		expect(result.source).toBe('ecowitt');
		expect(sorted(result.mockFields)).toEqual(sorted(ALWAYS_SAMPLE_FIELDS));
		expect(result.data.outdoor.temp).toBe(14.2);
	});

	it('adds humidity and everything derived from it when humidity is missing', async () => {
		const result = await fetchBackendWeatherMeta(returning({ ...full, humidity_pct: null }));

		expect(result.mockFields).toEqual(
			expect.arrayContaining(['outdoor.humidity', 'outdoor.dewPoint', 'outdoor.vpd'])
		);
		expect(result.mockFields).not.toContain('outdoor.temp');
	});

	it('lists every field when the backend is unreachable or fails', async () => {
		const failing = vi.fn(async () => {
			throw new Error('ECONNREFUSED');
		}) as unknown as typeof fetch;

		for (const fetchFn of [failing, returning({ detail: 'down' }, 502)]) {
			const result = await fetchBackendWeatherMeta(fetchFn);
			expect(result.source).toBe('mock');
			expect(sorted(result.mockFields)).toEqual(sorted(WEATHER_FIELDS));
		}
	});
});
