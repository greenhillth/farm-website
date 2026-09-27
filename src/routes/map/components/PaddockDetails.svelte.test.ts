import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import PaddockDetails from './PaddockDetails.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

const rows = [
	{ id: 'pH', label: 'Soil pH', valueText: '5.5', status: 'low' as const },
	{ id: 'P', label: 'Phosphorus', valueText: '60 mg/kg', status: 'optimal' as const },
	{ id: 'K', label: 'Potassium', valueText: 'No data', status: 'no-data' as const }
];
const props = {
	fieldId: 42,
	areaHa: 12.345,
	sampleDate: '2024-05-01',
	sampleName: 'NF-2024',
	rows,
	hasSample: true,
	soilLoading: false,
	soilError: null,
	onretry: () => {}
};

describe('PaddockDetails.svelte', () => {
	it('shows each metric with its value and status in words', async () => {
		render(PaddockDetails, props);

		await expect.element(page.getByText('12.3 ha')).toBeVisible();
		await expect.element(page.getByText('1 May 2024 (NF-2024)')).toBeVisible();
		const pH = page.getByRole('listitem').filter({ hasText: 'Soil pH' });
		await expect.element(pH.getByText('5.5')).toBeVisible();
		await expect.element(pH.getByText('Low')).toBeVisible();
		await expect
			.element(
				page.getByRole('listitem').filter({ hasText: 'Potassium' }).getByText('No data').last()
			)
			.toBeVisible();
	});

	it('links to that paddock’s soil tests', async () => {
		render(PaddockDetails, props);

		await expect
			.element(page.getByRole('link', { name: 'See soil tests' }))
			.toHaveAttribute('href', '/soiltests?paddock=42');
	});

	it('says when the paddock has never been tested', async () => {
		render(PaddockDetails, { ...props, hasSample: false, sampleDate: null, sampleName: null });

		await expect.element(page.getByText('No soil tests for this paddock yet.')).toBeVisible();
	});

	it('offers Retry when soil data failed to load', async () => {
		const onretry = vi.fn();
		render(PaddockDetails, { ...props, soilError: 'failed', onretry });

		await expect.element(page.getByText('Soil data unavailable')).toBeVisible();
		await page.getByRole('button', { name: 'Retry' }).click();
		expect(onretry).toHaveBeenCalledOnce();
	});
});
