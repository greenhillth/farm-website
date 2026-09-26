import { createRawSnippet } from 'svelte';
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import Panel from './Panel.svelte';

const html = (markup: string) => createRawSnippet(() => ({ render: () => markup }));

describe('Panel.svelte', () => {
	it('renders its title, body, actions and footer, and takes a class', async () => {
		render(Panel, {
			title: 'Paddocks',
			class: 'h-full',
			children: html('<p>Body text</p>'),
			actions: html('<button>Add</button>'),
			footer: html('<p>Footer text</p>')
		});

		const heading = page.getByRole('heading', { name: 'Paddocks' });
		await expect.element(heading).toBeVisible();
		await expect.element(page.getByText('Body text')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Add' })).toBeVisible();
		await expect.element(page.getByText('Footer text')).toBeVisible();

		const section = heading.element().closest('section')!;
		expect(section.classList.contains('h-full')).toBe(true);
		expect(section.classList.contains('bg-panel')).toBe(true);
	});

	it('renders without optional props and without a stray class', async () => {
		render(Panel, { title: 'Empty' });

		const section = page.getByRole('heading', { name: 'Empty' }).element().closest('section')!;
		expect(section.className).not.toContain('undefined');
		expect(section.querySelector('header')!.children).toHaveLength(1);
	});
});
