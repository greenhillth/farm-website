import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import {
	ALWAYS_SAMPLE_FIELDS,
	WEATHER_FIELDS,
	getMockWeather,
	type WeatherField
} from '$lib/weather';
import MetricPage from './+page.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

const to = Math.floor(Date.UTC(2026, 8, 26, 12) / 1000);
const range = { from: to - 86400, to };
const history = [
	{ timestamp_utc: '2026-09-26 02:00:00', temp_c: 12, wind_avg_ms: 5, wind_gust_ms: 8 },
	{ timestamp_utc: '2026-09-26 03:00:00', temp_c: 14, wind_avg_ms: 2, wind_gust_ms: 4 }
];

function open(metric: string, source: 'ecowitt' | 'mock' = 'ecowitt') {
	const mockFields: WeatherField[] =
		source === 'mock' ? [...WEATHER_FIELDS] : [...ALWAYS_SAMPLE_FIELDS];
	const data = {
		metric,
		w: getMockWeather(),
		connected: source === 'ecowitt',
		source,
		mockFields,
		history,
		range
	};
	render(MetricPage, { data, params: { metric } } as never);
}

describe('weather detail page', () => {
	it('shows wind highs and lows in km/h, not temperature', async () => {
		open('wind');

		await expect.element(page.getByRole('heading', { level: 1, name: 'Wind' })).toBeVisible();
		await expect.element(page.getByText('Average: highest 18 km/h, lowest 7 km/h')).toBeVisible();
		expect(page.getByText(/°C/).elements()).toHaveLength(0);
	});

	it('says when the station doesn’t report a metric instead of charting sample data', async () => {
		open('indoor');

		await expect
			.element(
				page.getByText('The station doesn’t report indoor readings, so there’s nothing to chart.')
			)
			.toBeVisible();
		expect(page.getByRole('img').elements()).toHaveLength(0);
	});

	it('shows the offline banner on sample data', async () => {
		open('outdoor', 'mock');

		await expect.element(page.getByText('Weather station offline.')).toBeVisible();
	});

	it('lists the recent readings', async () => {
		open('outdoor');

		await expect.element(page.getByRole('heading', { name: 'Recent readings' })).toBeVisible();
		expect(
			page.getByRole('table', { name: 'Recent readings' }).getByRole('row').elements()
		).toHaveLength(3);
	});

	it('lists wind and gust readings in km/h', async () => {
		open('wind');

		const table = page.getByRole('table', { name: 'Recent readings' });
		await expect.element(table.getByText('Wind (km/h)')).toBeVisible();
		await expect.element(table.getByText('Gust (km/h)')).toBeVisible();
		// Newest first: 2 m/s and 4 m/s at 03:00, then 5 m/s and 8 m/s at 02:00.
		const cells = table
			.getByRole('row')
			.elements()
			.slice(1)
			.map((row) => [...row.querySelectorAll('td')].map((td) => td.textContent?.trim()));
		expect(cells.map((row) => row.slice(1, 3))).toEqual([
			['7.2', '14.4'],
			['18.0', '28.8']
		]);
	});

	it('ignores inherited object properties for an unknown metric param', async () => {
		expect(() => open('constructor')).not.toThrow();

		await expect
			.element(
				page.getByText(
					'The station doesn’t report constructor readings, so there’s nothing to chart.'
				)
			)
			.toBeVisible();
		expect(page.getByRole('img').elements()).toHaveLength(0);
	});
});
