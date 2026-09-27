import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import ManualEntryForm from './ManualEntryForm.svelte';

const paddocks = [{ id: 42, name: 'North flat' }];

async function fillRequired(fieldId = '42', sampleId = '1001') {
	await page.getByLabelText('Field ID').fill(fieldId);
	await page.getByLabelText('Sample name').fill('NF-1');
	await page.getByLabelText('Sample ID').fill(sampleId);
	await page.getByLabelText('Sample date').fill('2024-05-01');
}

afterEach(() => vi.unstubAllGlobals());

describe('ManualEntryForm.svelte', () => {
	it('posts the same payload as before and reports success', async () => {
		const fetch = vi.fn(async () => Response.json({ id: 1 }, { status: 201 }));
		vi.stubGlobal('fetch', fetch);
		const onsaved = vi.fn();
		render(ManualEntryForm, {
			paddocks,
			existingSamples: new Set<string>(),
			onsaved,
			oncancel: () => {}
		});

		await fillRequired();
		await page.getByLabelText('pH (H2O)').fill('6.2');
		await page.getByRole('button', { name: 'Save test' }).click();

		await vi.waitFor(() => expect(onsaved).toHaveBeenCalledOnce());
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/api/soil-tests/manual');
		expect(JSON.parse(String(init.body))).toEqual({
			fieldId: 42,
			sampleName: 'NF-1',
			sampleId: 1001,
			sampleDate: '2024-05-01',
			metrics: { ph_water: 6.2 }
		});
	});

	it('refuses a test that already exists', async () => {
		vi.stubGlobal('fetch', vi.fn());
		render(ManualEntryForm, {
			paddocks,
			existingSamples: new Set(['42:1001']),
			onsaved: () => {},
			oncancel: () => {}
		});

		await fillRequired();
		await page.getByLabelText('P', { exact: true }).fill('50');
		await page.getByRole('button', { name: 'Save test' }).click();

		await expect
			.element(page.getByText('A soil test with this field ID and sample ID already exists.'))
			.toBeVisible();
	});

	it('keeps Save disabled until there is a result', async () => {
		render(ManualEntryForm, {
			paddocks,
			existingSamples: new Set<string>(),
			onsaved: () => {},
			oncancel: () => {}
		});

		await fillRequired();
		await expect.element(page.getByRole('button', { name: 'Save test' })).toBeDisabled();
	});
});
