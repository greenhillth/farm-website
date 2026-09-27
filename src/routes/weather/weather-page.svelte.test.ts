import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import {
	ALWAYS_SAMPLE_FIELDS,
	WEATHER_FIELDS,
	getMockWeather,
	type WeatherField
} from '$lib/weather';
import WeatherPage from './+page.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

const to = Math.floor(Date.now() / 1000);
const range = { from: to - 86400, to };

function renderWith(source: 'ecowitt' | 'mock', mockFields: WeatherField[]) {
	const data = {
		w: getMockWeather(),
		connected: source === 'ecowitt',
		source,
		mockFields,
		history: [],
		range
	};
	render(WeatherPage, { data, params: {} } as never);
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
});
