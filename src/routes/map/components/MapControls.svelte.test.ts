import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import MapControls from './MapControls.svelte';

const baseLayers = [
	{ id: 'imagery', label: 'Satellite', description: 'Aerial imagery.', url: '', options: {} },
	{ id: 'streets', label: 'Streets', description: 'Road map.', url: '', options: {} }
];
const props = {
	baseLayers,
	activeBaseLayer: 'imagery',
	onbasechange: () => {},
	showBoundaries: true,
	showLabels: true,
	showTitles: false,
	showLabelToggle: true,
	titles: { loading: false, error: null, count: 0 },
	onretrytitles: () => {},
	onreset: () => {}
};

describe('MapControls.svelte', () => {
	it('reports a base map change', async () => {
		const onbasechange = vi.fn();
		render(MapControls, { ...props, onbasechange });

		await expect
			.element(page.getByRole('button', { name: 'Satellite' }))
			.toHaveAttribute('aria-pressed', 'true');
		await page.getByRole('button', { name: 'Streets' }).click();
		expect(onbasechange).toHaveBeenCalledWith('streets');
	});

	it('hides the labels toggle when asked (phones have no hover labels)', async () => {
		render(MapControls, { ...props, showLabelToggle: false });

		await expect.element(page.getByLabelText('Show field boundaries')).toBeVisible();
		await expect.element(page.getByLabelText('Show paddock labels')).not.toBeInTheDocument();
	});

	it('uses sentence-case headings', async () => {
		render(MapControls, props);

		await expect.element(page.getByRole('heading', { name: 'Base map' })).toBeVisible();
		expect(page.getByRole('heading', { name: 'Base map' }).element().className).not.toContain(
			'uppercase'
		);
	});
});
