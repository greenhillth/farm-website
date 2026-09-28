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

	it('does not scroll the map when it takes focus while sliding up (phone)', async () => {
		// The map shell clips its overflow. Focusing the sheet while its slide-up animation still
		// has it below the shell used to scroll the shell up, so the sheet jumped to the top of the
		// screen before snapping back to the bottom.
		await page.viewport(390, 800);
		const shell = document.createElement('div');
		shell.style.cssText = 'position: relative; height: 600px; overflow: hidden';
		document.body.append(shell);

		render(DetailSheet, {
			target: shell,
			props: { title: 'North flat', onclose: () => {}, children }
		});

		await expect.element(page.getByRole('dialog', { name: 'North flat' })).toHaveFocus();
		expect(shell.scrollTop).toBe(0);
		shell.remove();
	});
});
