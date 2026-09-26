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
});
