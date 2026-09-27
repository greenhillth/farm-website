import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import SprayPanel from './SprayPanel.svelte';

describe('SprayPanel.svelte', () => {
	it.each([
		['good', 'Good'],
		['marginal', 'Marginal'],
		['not-suitable', 'Not suitable']
	] as const)('shows %s as a word with its reasons', async (verdict, label) => {
		render(SprayPanel, {
			result: {
				verdict,
				reasons: ['Wind 9 km/h', 'No rain in the last hour'],
				summary: 'Wind 9 km/h'
			}
		});

		await expect.element(page.getByRole('heading', { name: 'Spraying now' })).toBeVisible();
		await expect.element(page.getByText(label, { exact: true })).toBeVisible();
		await expect.element(page.getByText('No rain in the last hour')).toBeVisible();
	});

	it('explains why it can’t tell', async () => {
		const reason = 'Can’t tell — the station isn’t reporting wind speed.';
		render(SprayPanel, { result: { verdict: 'unknown', reasons: [reason], summary: reason } });

		await expect.element(page.getByText('Can’t tell', { exact: true })).toBeVisible();
		await expect.element(page.getByText(reason)).toBeVisible();
	});
});
