import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import WeatherChart from './WeatherChart.svelte';

const from = new Date(2026, 8, 26, 0).getTime();
const to = from + 24 * 3600_000;
const series = [
	{
		label: 'Temperature',
		colour: '#facc15',
		points: [
			{ t: from + 3600_000, v: 10 },
			{ t: from + 7200_000, v: 12 }
		]
	}
];

describe('WeatherChart.svelte', () => {
	it('has a legend and an hourly table for screen readers', async () => {
		render(WeatherChart, { title: 'Outdoor, last 24 hours', series, unit: '°C', from, to });

		await expect.element(page.getByRole('img', { name: 'Outdoor, last 24 hours' })).toBeVisible();
		await expect.element(page.getByText('Temperature', { exact: true }).first()).toBeVisible();
		expect(page.getByRole('row').elements()).toHaveLength(3);
	});

	it('says so when there are no readings', async () => {
		render(WeatherChart, {
			title: 'Outdoor',
			series: [{ ...series[0], points: [] }],
			unit: '°C',
			from,
			to
		});

		await expect.element(page.getByText('No readings in the last 24 hours.')).toBeVisible();
		expect(page.getByRole('img').elements()).toHaveLength(0);
	});

	it('renders a flat series without duplicate gridline keys', async () => {
		render(WeatherChart, {
			title: 'Pressure, last 24 hours',
			series: [
				{
					label: 'Pressure',
					colour: '#c4b5fd',
					points: [
						{ t: from + 3600_000, v: 1012 },
						{ t: from + 7200_000, v: 1012 }
					]
				}
			],
			unit: 'hPa',
			from,
			to
		});

		await expect.element(page.getByRole('img', { name: 'Pressure, last 24 hours' })).toBeVisible();
	});
});
