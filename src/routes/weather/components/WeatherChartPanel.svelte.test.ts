import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import WeatherChartPanel from './WeatherChartPanel.svelte';

const to = Math.floor(Date.UTC(2026, 8, 27, 12) / 1000);
const range = { from: to - 86400, to };
const history = [
	{ timestamp_utc: '2026-09-27T10:00:00+00:00', temp_c: 10, humidity_pct: 80 },
	{ timestamp_utc: '2026-09-27T10:01:00+00:00', temp_c: 11, humidity_pct: 78 }
];
const week = {
	bucket_sec: 1260,
	data: [
		{ timestamp_utc: '2026-09-21T00:00:00+00:00', count: 21, temp_c: 8, humidity_pct: 90 },
		{ timestamp_utc: '2026-09-21T00:21:00+00:00', count: 21, temp_c: 9, humidity_pct: 88 }
	]
};

afterEach(() => vi.unstubAllGlobals());

function stubSeries(response: () => Response) {
	const fetchMock = vi.fn(async () => response());
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

describe('WeatherChartPanel.svelte', () => {
	it('starts on the last 24 hours from the page load, without fetching', async () => {
		const fetchMock = stubSeries(() => Response.json(week));
		render(WeatherChartPanel, { history, range });

		await expect
			.element(page.getByRole('img', { name: 'Temperature and dew point, last 24 hours' }))
			.toBeVisible();
		await expect
			.element(page.getByRole('button', { name: '24 hours' }))
			.toHaveAttribute('aria-pressed', 'true');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('switches metric without fetching', async () => {
		stubSeries(() => Response.json(week));
		render(WeatherChartPanel, { history, range });

		await page.getByRole('combobox', { name: 'Show' }).selectOptions('Humidity');

		await expect.element(page.getByRole('img', { name: 'Humidity, last 24 hours' })).toBeVisible();
	});

	it('fetches the series once when a longer timespan is chosen', async () => {
		const fetchMock = stubSeries(() => Response.json(week));
		render(WeatherChartPanel, { history, range });

		await page.getByRole('button', { name: '7 days' }).click();
		await expect
			.element(page.getByRole('img', { name: 'Temperature and dew point, last 7 days' }))
			.toBeVisible();
		expect(fetchMock).toHaveBeenCalledWith(
			`/api/weather/series?from=${to - 7 * 86400}&to=${to}&points=336`
		);

		await page.getByRole('button', { name: '24 hours' }).click();
		await page.getByRole('button', { name: '7 days' }).click();
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('says so when the series request fails', async () => {
		stubSeries(() => new Response('Bad gateway', { status: 502 }));
		render(WeatherChartPanel, { history, range });

		await page.getByRole('button', { name: '1 year' }).click();

		await expect
			.element(page.getByRole('alert'))
			.toHaveTextContent("Couldn't load readings for the last 1 year.");
	});

	it('hides the metric selector when there is only one metric', async () => {
		stubSeries(() => Response.json(week));
		render(WeatherChartPanel, {
			history: [
				{ timestamp_utc: '2026-09-27T10:00:00+00:00', wind_avg_ms: 2, wind_gust_ms: 5 },
				{ timestamp_utc: '2026-09-27T10:01:00+00:00', wind_avg_ms: 3, wind_gust_ms: 6 }
			],
			range,
			metric: 'wind',
			metrics: [{ key: 'wind', label: 'Wind' }]
		});

		await expect.element(page.getByRole('img', { name: 'Wind, last 24 hours' })).toBeVisible();
		expect(page.getByRole('combobox').elements()).toHaveLength(0);
	});
});
