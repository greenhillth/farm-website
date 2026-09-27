import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import StatusBadge from './StatusBadge.svelte';

describe('StatusBadge.svelte', () => {
	it('shows the status in words, not only colour', async () => {
		render(StatusBadge, { status: 'low' });
		await expect.element(page.getByText('Low')).toBeVisible();
	});

	it('uses a custom label when given', async () => {
		render(StatusBadge, { status: 'optimal', label: 'In range' });
		await expect.element(page.getByText('In range')).toBeVisible();
	});
});
