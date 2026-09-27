import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { getMockWeather } from '$lib/weather';
import HomePage from './+page.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

const live = { weather: getMockWeather(), connected: true, source: 'ecowitt' as const };
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
		renderHome({ weather: { ...live, connected: false, source: 'mock' }, soil });

		expect(page.getByText('Sample data').elements()).toHaveLength(3);
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
