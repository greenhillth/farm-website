import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';

// The shell's layout (md:hidden, shell padding) comes from Tailwind and the app's CSS variables.
import '../../app.css';
import AppShell from './AppShell.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

const logoSrc = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const children = createRawSnippet(() => ({ render: () => '<p>Page body</p>' }));

// Links in these tests must not navigate the test runner's page.
function stopNavigation(event: MouseEvent) {
	if ((event.target as Element).closest('a')) event.preventDefault();
}

describe('AppShell.svelte on a phone', () => {
	beforeEach(async () => {
		await page.viewport(390, 844);
		document.addEventListener('click', stopNavigation);
	});
	afterEach(() => document.removeEventListener('click', stopNavigation));

	it('marks the current section in the tab bar', async () => {
		render(AppShell, { pathname: '/weather/wind', logoSrc, children });

		const nav = page.getByRole('navigation', { name: 'Main' });
		await expect
			.element(nav.getByRole('link', { name: 'Weather' }))
			.toHaveAttribute('aria-current', 'page');
		await expect
			.element(nav.getByRole('link', { name: 'Map' }))
			.not.toHaveAttribute('aria-current');
	});

	it('pads the page so the tab bar never covers the end of it', async () => {
		render(AppShell, { pathname: '/', logoSrc, children });

		const main = page.getByRole('main').element() as HTMLElement;
		expect(parseFloat(getComputedStyle(main).paddingBottom)).toBeGreaterThanOrEqual(64);
	});

	it('opens More as a dialog with the secondary and external links', async () => {
		render(AppShell, { pathname: '/', logoSrc, children });

		await page.getByRole('button', { name: 'More' }).click();
		const dialog = page.getByRole('dialog', { name: 'More' });
		await expect.element(dialog).toBeVisible();
		await expect.element(dialog.getByRole('link', { name: 'Paddocks' })).toBeVisible();
		await expect
			.element(dialog.getByRole('link', { name: 'SharePoint home (opens in a new tab)' }))
			.toHaveAttribute('target', '_blank');
	});

	it('closes More on Escape and returns focus to the More button', async () => {
		render(AppShell, { pathname: '/', logoSrc, children });

		const more = page.getByRole('button', { name: 'More' });
		await more.click();
		await expect.element(page.getByRole('dialog', { name: 'More' })).toBeVisible();
		await userEvent.keyboard('{Escape}');

		await expect.element(page.getByRole('dialog', { name: 'More' })).not.toBeInTheDocument();
		await expect.element(more).toHaveFocus();
	});

	it('closes More when a link in it is followed', async () => {
		render(AppShell, { pathname: '/', logoSrc, children });

		await page.getByRole('button', { name: 'More' }).click();
		await page.getByRole('dialog', { name: 'More' }).getByRole('link', { name: 'Help' }).click();

		await expect.element(page.getByRole('dialog', { name: 'More' })).not.toBeInTheDocument();
	});

	it('marks More active on a secondary page', async () => {
		render(AppShell, { pathname: '/paddocks', logoSrc, children });

		await expect.element(page.getByRole('button', { name: 'More' })).toBeVisible();
		expect(page.getByRole('button', { name: 'More' }).element().className).toContain('text-accent');
	});
});

describe('AppShell.svelte on a desktop', () => {
	beforeEach(async () => {
		await page.viewport(1280, 800);
	});

	it('shows the top bar with the current page marked and no tab bar', async () => {
		render(AppShell, { pathname: '/soiltests', logoSrc, children });

		const nav = page.getByRole('navigation', { name: 'Main' });
		await expect
			.element(nav.getByRole('link', { name: 'Soil tests' }))
			.toHaveAttribute('aria-current', 'page');
		await expect.element(page.getByRole('button', { name: 'More' })).not.toBeInTheDocument();
	});
});
