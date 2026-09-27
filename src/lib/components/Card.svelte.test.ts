import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import Card from './Card.svelte';

describe('Card.svelte', () => {
	it('renders a labelled link with its title, description and tags', async () => {
		render(Card, {
			href: '/map',
			title: 'Paddock map',
			description: 'Soil tests by paddock',
			tags: ['soil', 'map']
		});

		const link = page.getByRole('link', { name: 'Paddock map' });
		await expect.element(link).toHaveAttribute('href', '/map');
		await expect.element(page.getByRole('heading', { name: 'Paddock map' })).toBeVisible();
		await expect.element(page.getByText('Soil tests by paddock')).toBeVisible();
		await expect.element(page.getByText('#soil')).toBeVisible();
		// Without an image, the hero is a gradient placeholder.
		await expect.element(page.getByRole('img')).not.toBeInTheDocument();
	});

	it('shows the image and badge when given', async () => {
		render(Card, {
			href: '/weather',
			title: 'Weather',
			// A data: URI, so the image never requests SvelteKit's dev server.
			image: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
			imageAlt: 'Weather station',
			badge: 'Live'
		});

		await expect.element(page.getByRole('img', { name: 'Weather station' })).toBeVisible();
		await expect.element(page.getByText('Live')).toBeVisible();
	});

	it('shows a repeated tag once', async () => {
		render(Card, { href: '/soiltests', title: 'Soil', tags: ['soil', 'soil', 'tests'] });

		await expect.element(page.getByText('#tests')).toBeVisible();
		expect(page.getByText('#soil').elements()).toHaveLength(1);
	});

	it('lazy-loads its image', async () => {
		render(Card, {
			href: '/weather',
			title: 'Weather',
			image: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
			imageAlt: 'Weather station'
		});

		const img = page.getByRole('img', { name: 'Weather station' });
		await expect.element(img).toHaveAttribute('loading', 'lazy');
		await expect.element(img).toHaveAttribute('decoding', 'async');
	});
});
