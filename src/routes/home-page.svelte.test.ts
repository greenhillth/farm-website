import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { ALWAYS_SAMPLE_FIELDS, WEATHER_FIELDS, getMockWeather } from '$lib/weather';
import HomePage from './+page.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

const live = {
	weather: getMockWeather(),
	connected: true,
	source: 'ecowitt' as const,
	mockFields: [...ALWAYS_SAMPLE_FIELDS]
};
const offline = {
	...live,
	connected: false,
	source: 'mock' as const,
	mockFields: [...WEATHER_FIELDS]
};
const soil = {
	paddocksTested: 12,
	latestSampleDate: '2024-05-01',
	worst: { metricLabel: 'Soil pH', direction: 'low' as const, count: 3 }
};

function renderHome(data: { weather: unknown; soil: unknown }) {
	// `params` etc. aren't used by the page; the cast keeps the test focused on `data`.
	render(HomePage, { data, params: {} } as never);
}

describe('home page', () => {
	it('shows live readings and the soil headline', async () => {
		renderHome({ weather: live, soil });

		await expect.element(page.getByText('12.2°')).toBeVisible();
		await expect.element(page.getByText('From the SW, gusting 66 km/h')).toBeVisible();
		await expect.element(page.getByText('Soil pH low in 3 paddocks')).toBeVisible();
		expect(page.getByText('Sample data').elements()).toHaveLength(0);
	});

	it('labels every weather tile when the station is offline', async () => {
		renderHome({ weather: offline, soil });

		expect(page.getByText('Sample data').elements()).toHaveLength(3);
	});

	it('says whether it’s a good time to spray, with the reason', async () => {
		renderHome({ weather: live, soil });

		const tile = page.getByRole('link').filter({ hasText: 'Spraying now' });
		// Mock wind is 8.6 m/s = 31 km/h.
		await expect.element(tile.getByText('Not suitable')).toBeVisible();
		await expect.element(tile.getByText('Wind 31 km/h: too strong')).toBeVisible();
	});

	it('can’t judge spraying from sample data', async () => {
		renderHome({ weather: offline, soil });

		await expect
			.element(
				page
					.getByRole('link')
					.filter({ hasText: 'Spraying now' })
					.getByText('Can’t tell', { exact: true })
			)
			.toBeVisible();
	});

	it('labels only the tile whose reading is sample data', async () => {
		renderHome({ weather: { ...live, mockFields: [...ALWAYS_SAMPLE_FIELDS, 'rain.daily'] }, soil });

		expect(page.getByText('Sample data').elements()).toHaveLength(1);
		await expect
			.element(page.getByRole('link').filter({ hasText: 'Rain today' }).getByText('Sample data'))
			.toBeVisible();
	});

	it('labels a tile when any value it shows is sample data', async () => {
		renderHome({
			weather: { ...live, mockFields: [...ALWAYS_SAMPLE_FIELDS, 'rain.hourly'] },
			soil
		});

		expect(page.getByText('Sample data').elements()).toHaveLength(1);
		await expect
			.element(page.getByRole('link').filter({ hasText: 'Rain today' }).getByText('Sample data'))
			.toBeVisible();
	});

	it('explains when weather or soil data is unavailable', async () => {
		renderHome({ weather: null, soil: null });

		await expect.element(page.getByText(/Weather is unavailable/)).toBeVisible();
		await expect.element(page.getByText('Unavailable', { exact: true })).toBeVisible();
	});

	it('links the main tools and opens external links in a new tab', async () => {
		renderHome({ weather: live, soil });

		await expect
			.element(page.getByRole('link', { name: 'Farm map' }))
			.toHaveAttribute('href', '/map');
		await expect
			.element(page.getByRole('link', { name: 'SharePoint home (opens in a new tab)' }))
			.toHaveAttribute('target', '_blank');
	});
});
