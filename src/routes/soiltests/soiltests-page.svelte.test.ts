import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const app = vi.hoisted(() => ({
	page: { url: new URL('http://localhost/soiltests'), state: {} },
	replaceState: vi.fn()
}));
vi.mock('$app/state', () => ({ page: app.page }));
vi.mock('$app/navigation', () => ({ replaceState: app.replaceState }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path, asset: (path: string) => path }));

import '../../app.css';
import SoilTestsPage from './+page.svelte';

const tests = Array.from({ length: 30 }, (_, i) => ({
	id: i + 1,
	fieldID: i < 4 ? '42' : '7',
	id_sample: 1000 + i,
	name_sample: `S-${i + 1}`,
	sample_date: `2024-05-${String((i % 28) + 1).padStart(2, '0')}`,
	ph_water: 5.5,
	P: 60
}));
const farm = {
	features: [
		{ properties: { fieldID: '42', FIELDNAME: 'North flat' } },
		{ properties: { fieldID: '7', FIELDNAME: 'Creek' } }
	]
};

function stubFetch(testsResponse: () => Response = () => Response.json(tests)) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.startsWith('/api/soil-tests')) return testsResponse();
			if (url.startsWith('/api/farm')) return Response.json(farm);
			return new Response('not found', { status: 404 });
		})
	);
}

function openAt(path: string) {
	app.page.url = new URL(`http://localhost${path}`);
	render(SoilTestsPage);
}

afterEach(() => {
	vi.unstubAllGlobals();
	app.replaceState.mockClear();
});

describe('soil tests page on a desktop', () => {
	beforeEach(async () => {
		await page.viewport(1280, 800);
	});

	it('shows 25 tests a page in a table', async () => {
		stubFetch();
		openAt('/soiltests');

		await expect.element(page.getByText('Showing 1–25 of 30')).toBeVisible();
		expect(page.getByRole('row').elements()).toHaveLength(26);
	});

	it('filters to the paddock in ?paddock=', async () => {
		stubFetch();
		openAt('/soiltests?paddock=42');

		await expect.element(page.getByText('Showing 1–4 of 4')).toBeVisible();
		await expect.element(page.getByLabelText('Paddock')).toHaveValue('42');
	});

	it('clamps a page past the end', async () => {
		stubFetch();
		openAt('/soiltests?page=99');

		await expect.element(page.getByText('Showing 26–30 of 30')).toBeVisible();
	});

	it('writes filter changes into the URL and returns to page 1', async () => {
		stubFetch();
		openAt('/soiltests?page=2');

		await page.getByLabelText('Year').selectOptions('2024');
		const [url] = app.replaceState.mock.lastCall as [string];
		expect(url).toBe('/soiltests?year=2024');
	});

	it('explains an empty result and clears the filters', async () => {
		stubFetch();
		openAt('/soiltests?q=nothing-matches');

		await expect.element(page.getByText('No tests match these filters.')).toBeVisible();
		await page.getByRole('button', { name: 'Clear filters' }).click();
		await expect.element(page.getByText('Showing 1–25 of 30')).toBeVisible();
	});

	it('offers Retry when the list fails to load', async () => {
		stubFetch(() => new Response('down', { status: 502 }));
		openAt('/soiltests');

		await expect
			.element(page.getByText('Couldn’t load soil tests. Check the connection and try again.'))
			.toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Retry' })).toBeVisible();
	});

	it('treats closing a finished import like pressing Close', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.startsWith('/api/soil-tests/import'))
				return Response.json({ jobId: 'j1', stage: 'complete', inserted: 3, skipped: 0 });
			if (url.startsWith('/api/soil-tests')) return Response.json(tests);
			if (url.startsWith('/api/farm')) return Response.json(farm);
			return new Response('not found', { status: 404 });
		});
		vi.stubGlobal('fetch', fetchMock);
		openAt('/soiltests?year=2024');

		await page.getByRole('button', { name: 'Import tests' }).click();
		await page
			.getByLabelText('Choose CSV file')
			.upload(
				new File(
					['id_sample,fieldID,sample_date,name_sample,P\n5000,42,2024-05-01,New,50'],
					'tests.csv',
					{ type: 'text/csv' }
				)
			);
		await page.getByRole('button', { name: 'Continue' }).click();
		await expect.element(page.getByText('Imported 3 tests')).toBeVisible();

		await userEvent.keyboard('{Escape}');

		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
		await expect.element(page.getByText('Imported 3 tests.')).toBeVisible();
		await expect.element(page.getByLabelText('Year')).toHaveValue('');
	});

	it('drops a selected test from the delete count when a filter hides it', async () => {
		stubFetch();
		openAt('/soiltests?paddock=42');

		await page.getByRole('button', { name: 'Delete tests' }).click();
		await page.getByRole('checkbox').first().click();
		await expect.element(page.getByText('1 test selected')).toBeVisible();

		await page.getByLabelText('Paddock').selectOptions('7');
		await expect.element(page.getByText('Select the tests to delete.')).toBeVisible();
	});

	it('gives the table selection checkbox a 44px tap target', async () => {
		stubFetch();
		openAt('/soiltests');

		await page.getByRole('button', { name: 'Delete tests' }).click();
		const checkbox = page.getByRole('checkbox').first().element() as HTMLElement;
		const label = checkbox.closest('label');
		expect(label).not.toBeNull();
		const rect = label!.getBoundingClientRect();
		expect(rect.width).toBeGreaterThanOrEqual(44);
		expect(rect.height).toBeGreaterThanOrEqual(44);
	});
});

describe('soil tests page on a phone', () => {
	beforeEach(async () => {
		await page.viewport(390, 844);
	});

	it('shows cards with statuses in words instead of the table', async () => {
		stubFetch();
		openAt('/soiltests?paddock=42');

		await expect.element(page.getByRole('article').first()).toBeVisible();
		expect(page.getByRole('table').elements()).toHaveLength(0);
		await expect.element(page.getByRole('article').first().getByText('Low')).toBeVisible();
	});

	it('gives the card selection checkbox a 44px tap target', async () => {
		stubFetch();
		openAt('/soiltests?paddock=42');

		await page.getByRole('button', { name: 'Delete tests' }).click();
		const checkbox = page.getByRole('checkbox').first().element() as HTMLElement;
		const label = checkbox.closest('label');
		expect(label).not.toBeNull();
		const rect = label!.getBoundingClientRect();
		expect(rect.width).toBeGreaterThanOrEqual(44);
		expect(rect.height).toBeGreaterThanOrEqual(44);
	});
});
