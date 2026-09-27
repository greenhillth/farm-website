import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const app = vi.hoisted(() => ({
	page: { url: new URL('http://localhost/map'), state: {} },
	replaceState: vi.fn()
}));
vi.mock('$app/state', () => ({ page: app.page }));
vi.mock('$app/navigation', () => ({ replaceState: app.replaceState }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

import '../../app.css';
import MapPage from './+page.svelte';

const square = (x: number, y: number) => [
	[
		[x, y],
		[x + 0.01, y],
		[x + 0.01, y + 0.01],
		[x, y + 0.01],
		[x, y]
	]
];
const farm = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			properties: { fieldID: '42', FIELDNAME: 'North flat' },
			geometry: { type: 'Polygon', coordinates: square(146.4, -41.2) }
		},
		{
			type: 'Feature',
			properties: { fieldID: '7', FIELDNAME: 'Creek' },
			geometry: { type: 'Polygon', coordinates: square(146.42, -41.2) }
		},
		{
			type: 'Feature',
			properties: { FIELDNAME: 'No id' },
			geometry: { type: 'Polygon', coordinates: square(146.44, -41.2) }
		}
	]
};
const latest = [{ fieldID: '42', sample_date: '2024-05-01', name_sample: 'NF', ph_water: 5.5 }];

function stubFetch(soil: () => Response = () => Response.json(latest)) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.startsWith('/api/soil-tests')) return soil();
			if (url.startsWith('/api/farm/titles'))
				return Response.json({ type: 'FeatureCollection', features: [] });
			if (url.startsWith('/api/farm')) return Response.json(farm);
			return new Response('not found', { status: 404 });
		})
	);
}

function openAt(path: string) {
	app.page.url = new URL(`http://localhost${path}`);
	render(MapPage);
}

afterEach(() => {
	vi.unstubAllGlobals();
	app.replaceState.mockClear();
});

describe('map page on a phone', () => {
	beforeEach(async () => {
		await page.viewport(390, 844);
	});

	it('shows the map with metric chips and no sidebar', async () => {
		stubFetch();
		openAt('/map');

		await expect.element(page.getByRole('button', { name: 'Layers' })).toBeVisible();
		await expect.element(page.getByRole('group', { name: 'Soil metric' })).toBeVisible();
		await expect
			.element(page.getByRole('heading', { name: 'Map controls' }))
			.not.toBeInTheDocument();
	});

	it('selects the paddock named in ?paddock= and shows its soil status', async () => {
		stubFetch();
		openAt('/map?paddock=42');

		const sheet = page.getByRole('dialog', { name: 'North flat' });
		await expect.element(sheet).toBeVisible();
		await expect.element(sheet.getByText('Low')).toBeVisible();
	});

	it('ignores an unknown or non-numeric ?paddock=', async () => {
		for (const path of ['/map?paddock=999', '/map?paddock=abc']) {
			stubFetch();
			openAt(path);
			await expect.element(page.getByRole('button', { name: 'Layers' })).toBeVisible();
			await new Promise((done) => setTimeout(done, 200));
			expect(page.getByRole('dialog').elements()).toHaveLength(0);
			document.body.innerHTML = '';
		}
	});

	it('says soil data is unavailable when the soil request returns something that is not a list', async () => {
		stubFetch(() => Response.json({ method: 'GET', path: '/api/soil-tests' }));
		openAt('/map?paddock=42');

		const sheet = page.getByRole('dialog', { name: 'North flat' });
		await expect.element(sheet.getByText('Soil data unavailable')).toBeVisible();
	});

	it('searches from the Layers sheet; Escape closes the suggestions first, then the sheet', async () => {
		stubFetch();
		openAt('/map');

		await page.getByRole('button', { name: 'Layers' }).click();
		const search = page.getByRole('combobox', { name: 'Find a paddock' });
		await search.fill('no id');
		await expect.element(page.getByText('No paddock matches “no id”.')).toBeVisible();

		await search.fill('cre');
		await expect.element(page.getByRole('option', { name: /Creek/ })).toBeVisible();
		await userEvent.keyboard('{Escape}');
		await expect.element(page.getByRole('dialog', { name: 'Layers' })).toBeVisible();
		await userEvent.keyboard('{Escape}');
		await expect.element(page.getByRole('dialog', { name: 'Layers' })).not.toBeInTheDocument();
	});

	it('writes the selected paddock into the URL', async () => {
		stubFetch();
		openAt('/map');

		await page.getByRole('button', { name: 'Find a paddock' }).click();
		await page.getByRole('combobox', { name: 'Find a paddock' }).fill('creek');
		await page.getByRole('option', { name: /Creek/ }).click();

		await expect.element(page.getByRole('dialog', { name: 'Creek' })).toBeVisible();
		const [url] = app.replaceState.mock.lastCall as [URL];
		expect(url.searchParams.get('paddock')).toBe('7');
	});
});

describe('map page on a desktop', () => {
	beforeEach(async () => {
		await page.viewport(1280, 800);
	});

	it('keeps the sidebar, with search, and no chips row', async () => {
		stubFetch();
		openAt('/map');

		await expect.element(page.getByRole('heading', { name: 'Map controls' })).toBeVisible();
		await expect.element(page.getByRole('combobox', { name: 'Find a paddock' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Layers' })).not.toBeInTheDocument();
	});
});
