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
	solar_wm2: 300,
	feels_like_c: 13.1,
	dew_point_c: 8.7,
	vpd_kpa: 0.49,
	indoor_temp_c: 19.5,
	indoor_humidity_pct: 55,
	pressure_abs_hpa: 1004,
	rain_rate_mm_hr: 0.6,
	rain_daily_mm: 2.4,
	rain_event_mm: 3,
	rain_weekly_mm: 10.2,
	rain_monthly_mm: 58.7,
	rain_yearly_mm: 576.8,
	uvi: 3,
	battery_sensor_array: 0
};
// A reading stored before gbros-api#15: only the original nine values.
const legacy = {
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

	it('shows every value the station reports', async () => {
		const { data } = await fetchBackendWeatherMeta(returning(full));

		expect(data.outdoor).toMatchObject({ feelsLike: 13.1, dewPoint: 8.7, vpd: 0.49 });
		expect(data.indoor).toMatchObject({ temp: 19.5, humidity: 55 });
		expect(data.pressure).toMatchObject({ rel: 1012, abs: 1004 });
		expect(data.rain).toMatchObject({
			rate: 0.6,
			daily: 2.4,
			event: 3,
			hourly: 0,
			weekly: 10.2,
			monthly: 58.7,
			yearly: 576.8
		});
		expect(data.solar.uvi).toBe(3);
		expect(data.battery).toEqual({ status: 'NORMAL', note: 'Outdoor sensor array' });
	});

	it('calculates sunrise, sunset and the moon phase instead of using samples', async () => {
		const result = await fetchBackendWeatherMeta(returning(full));

		expect(result.data.solar.sunrise).toMatch(/^\d{2}:\d{2}$/);
		expect(result.data.solar.sunset).toMatch(/^\d{2}:\d{2}$/);
		expect(result.data.solar.sunrise < result.data.solar.sunset).toBe(true);
		expect(result.data.solar.moon).toMatch(/Moon|Crescent|Quarter|Gibbous/);
		expect(result.mockFields).not.toContain('solar.sunrise');
		expect(result.mockFields).not.toContain('solar.moon');
	});

	it('reports a low battery', async () => {
		const { data } = await fetchBackendWeatherMeta(returning({ ...full, battery_sensor_array: 1 }));

		expect(data.battery.status).toBe('LOW');
	});

	it('labels the newer values as samples on a reading from before they were stored', async () => {
		const result = await fetchBackendWeatherMeta(returning(legacy));

		expect(result.mockFields).toEqual(
			expect.arrayContaining([
				'indoor.temp',
				'indoor.humidity',
				'solar.uvi',
				'rain.rate',
				'rain.weekly',
				'battery.status'
			])
		);
		// Rain since midnight used to be stored as rain_24h_mm.
		expect(result.data.rain.daily).toBe(1.2);
		expect(result.mockFields).not.toContain('rain.daily');
		// Computed from temperature and humidity, as before.
		expect(result.mockFields).not.toContain('outdoor.dewPoint');
	});

	it('adds humidity and everything derived from it when humidity is missing', async () => {
		const result = await fetchBackendWeatherMeta(returning({ ...legacy, humidity_pct: null }));

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
