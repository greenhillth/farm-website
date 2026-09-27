import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { ImportJob } from '../import-job.svelte';
import CsvImportWizard from './CsvImportWizard.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path, asset: (path: string) => path }));

const header = 'id_sample,fieldID,sample_date,name_sample,P,ph_water';
const csv = (...rows: string[]) =>
	new File([[header, ...rows].join('\n')], 'tests.csv', { type: 'text/csv' });

function setup(fetch = vi.fn()) {
	const job = new ImportJob({ fetch, minDelayMs: 0, defaultDelayMs: 0 });
	const ondone = vi.fn();
	render(CsvImportWizard, {
		job,
		knownPaddockIds: new Set([42]),
		existingSamples: new Set(['42:1001']),
		ondone
	});
	return { ondone };
}

describe('CsvImportWizard.svelte', () => {
	it('lists a blocking problem by row and disables Continue', async () => {
		setup();

		await page
			.getByLabelText('Choose CSV file')
			.upload(csv('1002,42,2024-05-01,A,50,6.1', '1003,abc,2024-05-01,B,50,6.1'));

		await expect
			.element(page.getByText('Row 3: fieldID “abc” isn’t a whole number.'))
			.toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
		await expect
			.element(page.getByRole('listitem').filter({ hasText: 'Check' }))
			.toHaveAttribute('aria-current', 'step');
	});

	it('asks about duplicates and sends onDuplicate=replace when chosen', async () => {
		const fetch = vi.fn(async (input: RequestInfo | URL) => {
			if (String(input).startsWith('/api/soil-tests/import?')) {
				return Response.json({ jobId: 'j1', stage: 'queued' }, { status: 202 });
			}
			return Response.json({ jobId: 'j1', stage: 'complete', inserted: 2, skipped: 0 });
		});
		const { ondone } = setup(fetch);

		await page
			.getByLabelText('Choose CSV file')
			.upload(csv('1001,42,2024-05-01,A,50,6.1', '1002,42,2024-05-01,B,50,6.1'));
		await expect.element(page.getByText('No problems found.')).toBeVisible();
		await page.getByRole('button', { name: 'Continue' }).click();

		await expect.element(page.getByText('1 sample is already in the system')).toBeVisible();
		await page.getByRole('radio', { name: /Replace them/ }).click();
		await page.getByRole('button', { name: 'Import tests' }).click();

		await expect.element(page.getByText('Imported 2 tests')).toBeVisible();
		expect(String(fetch.mock.calls[0][0])).toBe('/api/soil-tests/import?onDuplicate=replace');

		await page.getByRole('button', { name: 'Close' }).click();
		expect(ondone).toHaveBeenCalledWith({ inserted: 2, skipped: 0 });
	});

	it('goes straight to importing when there are no duplicates, and offers Back to check on failure', async () => {
		const fetch = vi.fn(async () =>
			Response.json({ detail: 'Row 2: unknown fieldID' }, { status: 400 })
		);
		setup(fetch);

		await page.getByLabelText('Choose CSV file').upload(csv('1002,42,2024-05-01,A,50,6.1'));
		await page.getByRole('button', { name: 'Continue' }).click();

		await expect.element(page.getByText('Row 2: unknown fieldID')).toBeVisible();
		await page.getByRole('button', { name: 'Back to check' }).click();
		await expect.element(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
	});
});
