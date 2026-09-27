import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import CONFIG from '$lib/config';
import MetricChips from './MetricChips.svelte';

describe('MetricChips.svelte', () => {
	it('marks the active metric and reports a new choice', async () => {
		const onchange = vi.fn();
		render(MetricChips, { metrics: CONFIG.soilMetrics, active: 'pH', onchange, layout: 'row' });

		await expect
			.element(page.getByRole('button', { name: 'Soil pH' }))
			.toHaveAttribute('aria-pressed', 'true');
		await expect
			.element(page.getByRole('button', { name: 'Phosphorus' }))
			.toHaveAttribute('aria-pressed', 'false');

		await page.getByRole('button', { name: 'Phosphorus' }).click();
		expect(onchange).toHaveBeenCalledWith('P');
	});

	it('does not report the chip that is already active', async () => {
		const onchange = vi.fn();
		render(MetricChips, { metrics: CONFIG.soilMetrics, active: 'pH', onchange, layout: 'wrap' });

		await page.getByRole('button', { name: 'Soil pH' }).click();
		expect(onchange).not.toHaveBeenCalled();
	});
});
