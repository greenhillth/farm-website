import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { paginate } from '$lib/soil-tests/filters';
import Pagination from './Pagination.svelte';

const list = Array.from({ length: 251 }, (_, i) => i);

describe('Pagination.svelte', () => {
	it('announces the range and disables Previous on page 1', async () => {
		render(Pagination, { slice: paginate(list, 1), onchange: () => {} });

		await expect.element(page.getByText('Showing 1–25 of 251')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
		await expect
			.element(page.getByRole('button', { name: 'Page 1', exact: true }))
			.toHaveAttribute('aria-current', 'page');
	});

	it('moves to the next page and to a numbered page', async () => {
		const onchange = vi.fn();
		render(Pagination, { slice: paginate(list, 2), onchange });

		await expect.element(page.getByText('Showing 26–50 of 251')).toBeVisible();
		await page.getByRole('button', { name: 'Next' }).click();
		expect(onchange).toHaveBeenLastCalledWith(3);
		await page.getByRole('button', { name: 'Page 11' }).click();
		expect(onchange).toHaveBeenLastCalledWith(11);
	});

	it('disables Next on the last page', async () => {
		render(Pagination, { slice: paginate(list, 11), onchange: () => {} });

		await expect.element(page.getByText('Showing 251–251 of 251')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Next' })).toBeDisabled();
	});
});
