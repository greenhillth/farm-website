import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import {
	ALWAYS_SAMPLE_FIELDS,
	WEATHER_FIELDS,
	getMockWeather,
	type Weather,
	type WeatherField
} from '$lib/weather';
import WeatherPage from './+page.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

// The page polls `fetchWeather`, which reads through the backend provider. Mock the provider:
// `$lib/weather` and `$lib/providers/backend` import each other, and mocking `$lib/weather`
// with `importOriginal` deadlocks the browser test on that cycle.
const { fetchBackendWeatherMeta } = vi.hoisted(() => ({ fetchBackendWeatherMeta: vi.fn() }));
vi.mock('$lib/providers/backend', () => ({ fetchBackendWeatherMeta }));

const to = Math.floor(Date.now() / 1000);
const range = { from: to - 86400, to };

function pageData(
	source: 'ecowitt' | 'mock',
	mockFields: WeatherField[],
	w: Weather = getMockWeather()
) {
	return { w, connected: source === 'ecowitt', source, mockFields, history: [], range };
}

function renderWith(
	source: 'ecowitt' | 'mock',
	mockFields: WeatherField[],
	w: Weather = getMockWeather()
) {
	return render(WeatherPage, { data: pageData(source, mockFields, w), params: {} } as never);
}

function withTemp(temp: number): Weather {
	const w = getMockWeather();
	return { ...w, outdoor: { ...w.outdoor, temp } };
}

const panel = (title: string) =>
	page.getByRole('link').filter({ has: page.getByRole('heading', { name: title }) });

describe('weather page', () => {
	it('chips only the panels that contain sample values', async () => {
		renderWith('ecowitt', [...ALWAYS_SAMPLE_FIELDS, 'outdoor.humidity']);

		await expect.element(panel('Outdoor').getByText('Sample data')).toBeVisible();
		expect(panel('Pressure').getByText('Sample data').elements()).toHaveLength(0);
		await expect.element(panel('Outdoor').getByTitle('Sample value').first()).toBeVisible();
		expect(page.getByText('Weather station offline.').elements()).toHaveLength(0);
	});

	it('shows the offline banner and can’t judge spraying on sample data', async () => {
		renderWith('mock', [...WEATHER_FIELDS]);

		await expect.element(page.getByText('Weather station offline.')).toBeVisible();
		await expect.element(page.getByText('Can’t tell', { exact: true })).toBeVisible();
	});

	it('leads with the spraying verdict', async () => {
		renderWith('ecowitt', [...ALWAYS_SAMPLE_FIELDS]);

		const headings = page.getByRole('heading', { level: 3 }).elements();
		expect(headings[0].textContent).toBe('Spraying now');
		// Mock wind is 8.6 m/s = 31 km/h.
		await expect.element(page.getByText('Not suitable', { exact: true })).toBeVisible();
	});

	it('says there are no readings to chart instead of drawing sample lines', async () => {
		renderWith('ecowitt', [...ALWAYS_SAMPLE_FIELDS]);

		await expect.element(page.getByText('No readings in the last 24 hours.')).toBeVisible();
	});

	it('calls a live but old reading stale and won’t judge spraying on it', async () => {
		const old = {
			...getMockWeather(),
			updatedAt: new Date(Date.now() - 2 * 3600_000).toISOString()
		};
		renderWith('ecowitt', [...ALWAYS_SAMPLE_FIELDS], old);

		await expect.element(page.getByText('Stale', { exact: true })).toBeVisible();
		expect(page.getByText('Live', { exact: true }).elements()).toHaveLength(0);
		await expect.element(page.getByText('Can’t tell', { exact: true })).toBeVisible();
	});
});

describe('weather page refresh', () => {
	afterEach(() => {
		vi.useRealTimers();
		fetchBackendWeatherMeta.mockReset();
	});

	it('says how old a live reading is but not sample data', async () => {
		renderWith('ecowitt', [...ALWAYS_SAMPLE_FIELDS]);
		await expect.element(page.getByText(/^Updated /)).toBeVisible();
	});

	it('doesn’t claim sample data was just updated', async () => {
		renderWith('mock', [...WEATHER_FIELDS]);
		await expect.element(page.getByText('Offline', { exact: true })).toBeVisible();
		expect(page.getByText(/^Updated /).elements()).toHaveLength(0);
	});

	it('skips a refresh while the last one is still loading', async () => {
		vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
		fetchBackendWeatherMeta.mockReturnValue(new Promise(() => {}));
		renderWith('ecowitt', [...ALWAYS_SAMPLE_FIELDS]);

		await vi.advanceTimersByTimeAsync(45_000);
		expect(fetchBackendWeatherMeta).toHaveBeenCalledTimes(1);
	});

	it('shows the new load’s reading instead of an older refresh', async () => {
		vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
		fetchBackendWeatherMeta.mockResolvedValue({
			data: withTemp(31.4),
			connected: true,
			source: 'ecowitt',
			mockFields: [...ALWAYS_SAMPLE_FIELDS]
		});
		const screen = await renderWith('ecowitt', [...ALWAYS_SAMPLE_FIELDS]);

		await vi.advanceTimersByTimeAsync(15_000);
		await expect.element(page.getByText(/^31\.4/)).toBeVisible();

		await screen.rerender({
			data: pageData('ecowitt', [...ALWAYS_SAMPLE_FIELDS], withTemp(7.3))
		} as never);
		await expect.element(page.getByText(/^7\.3/)).toBeVisible();
		expect(page.getByText(/^31\.4/).elements()).toHaveLength(0);
	});
});
