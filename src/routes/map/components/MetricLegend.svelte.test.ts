import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import CONFIG from '$lib/config';
import type { MetricOption } from '$lib/config';
import MetricLegend from './MetricLegend.svelte';
import type { LegendDetails, LegendPercents } from '../helpers';

const pH = CONFIG.soilMetrics.find((metric) => metric.id === 'pH') as MetricOption;
const stats = { min: 5.2, max: 7.4, mean: 6.1, median: 6.0, count: 20 };
const percents: LegendPercents = {
	lowPct: 7,
	highPct: 80,
	showOpt: true,
	optLoPct: 33,
	optHiPct: 67,
	optWidth: 34,
	optMidPct: 50
};
const details: LegendDetails = {
	min: { value: 5.2, fields: ['Creek'] },
	max: { value: 7.4, fields: ['North flat'] },
	opt: { range: [6, 7], within: { count: 12, pct: 60, total: 20 } }
};
const base = {
	metric: pH,
	stats,
	percents,
	details,
	colouredCount: 20,
	scaleReady: true,
	loading: false,
	error: null,
	onretry: () => {}
};

describe('MetricLegend.svelte', () => {
	it('summarises the optimal range in the full legend', async () => {
		render(MetricLegend, base);

		await expect.element(page.getByText('Colouring 20 paddocks using Soil pH.')).toBeVisible();
		await expect
			.element(page.getByText('12 of 20 paddocks in the optimal range (60%)'))
			.toBeVisible();
	});

	it('expands the compact legend to show the details in words', async () => {
		render(MetricLegend, { ...base, compact: true });

		const toggle = page.getByRole('button', { name: /12 of 20 in optimal range/ });
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
		await toggle.click();
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect.element(page.getByText('Optimal 6 to 7')).toBeVisible();
		await expect.element(page.getByText('Lowest 5.2: Creek')).toBeVisible();
	});

	it('offers Retry when soil data failed to load', async () => {
		const onretry = vi.fn();
		render(MetricLegend, { ...base, stats: null, error: "Couldn't load soil tests.", onretry });

		await page.getByRole('button', { name: 'Retry' }).click();
		expect(onretry).toHaveBeenCalledOnce();
	});
});
