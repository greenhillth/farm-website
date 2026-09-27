import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';

import '../../../app.css';
import UploadDialog from './UploadDialog.svelte';

const manual = createRawSnippet(() => ({ render: () => '<p>Manual form</p>' }));
const csv = createRawSnippet(() => ({ render: () => '<p>CSV wizard</p>' }));

describe('UploadDialog.svelte', () => {
	it('is a modal dialog showing the chosen mode', async () => {
		render(UploadDialog, {
			mode: 'csv',
			onmodechange: () => {},
			running: false,
			onclose: () => {},
			manual,
			csv
		});

		await expect.element(page.getByRole('dialog', { name: 'Add soil tests' })).toBeVisible();
		await expect.element(page.getByText('CSV wizard')).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: 'Import a CSV' }))
			.toHaveAttribute('aria-pressed', 'true');
	});

	it('closes on Escape when nothing is running', async () => {
		const onclose = vi.fn();
		render(UploadDialog, {
			mode: 'manual',
			onmodechange: () => {},
			running: false,
			onclose,
			manual,
			csv
		});

		await userEvent.keyboard('{Escape}');
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('asks before stopping a running import', async () => {
		const onclose = vi.fn();
		render(UploadDialog, {
			mode: 'csv',
			onmodechange: () => {},
			running: true,
			onclose,
			manual,
			csv
		});

		await page.getByRole('button', { name: 'Close' }).click();
		expect(onclose).not.toHaveBeenCalled();
		await expect.element(page.getByText('Stop the import?')).toBeVisible();

		await page.getByRole('button', { name: 'Keep importing' }).click();
		await expect.element(page.getByText('Stop the import?')).not.toBeInTheDocument();

		await userEvent.keyboard('{Escape}');
		await page.getByRole('button', { name: 'Stop import' }).click();
		expect(onclose).toHaveBeenCalledOnce();
	});
});
