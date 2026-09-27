import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';

import '../../../app.css';
import DetailSheet from './DetailSheet.svelte';

const children = createRawSnippet(() => ({ render: () => '<p>Sheet body</p>' }));

describe('DetailSheet.svelte', () => {
	it('is a dialog named by its title and takes focus when it opens', async () => {
		render(DetailSheet, {
			title: 'North flat',
			subtitle: 'Paddock 42',
			onclose: () => {},
			children
		});

		const sheet = page.getByRole('dialog', { name: 'North flat' });
		await expect.element(sheet).toBeVisible();
		await expect.element(sheet).toHaveFocus();
		await expect.element(page.getByText('Paddock 42')).toBeVisible();
	});

	it('closes on Escape and with the close button', async () => {
		const onclose = vi.fn();
		render(DetailSheet, { title: 'North flat', onclose, children });

		await userEvent.keyboard('{Escape}');
		expect(onclose).toHaveBeenCalledTimes(1);
		await page.getByRole('button', { name: 'Close' }).click();
		expect(onclose).toHaveBeenCalledTimes(2);
	});
});
