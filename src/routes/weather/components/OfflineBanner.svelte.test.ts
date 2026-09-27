import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import OfflineBanner from './OfflineBanner.svelte';

describe('OfflineBanner.svelte', () => {
	it('warns when the numbers are sample data', async () => {
		render(OfflineBanner, { source: 'mock' });

		await expect.element(page.getByText('Weather station offline.')).toBeVisible();
		await expect
			.element(page.getByText('These are sample numbers — don’t use them for decisions.'))
			.toBeVisible();
	});

	it('stays hidden for live readings', async () => {
		render(OfflineBanner, { source: 'ecowitt' });

		expect(page.getByText('Weather station offline.').elements()).toHaveLength(0);
	});
});
