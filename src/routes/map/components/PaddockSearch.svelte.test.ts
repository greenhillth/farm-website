import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import PaddockSearch from './PaddockSearch.svelte';

const paddocks = [
	{ id: 42, name: 'North flat', displayId: '42' },
	{ id: 7, name: 'Creek', displayId: '7' },
	{ id: 9, name: 'Northern hill', displayId: '9' }
];

describe('PaddockSearch.svelte', () => {
	it('filters by name, case-insensitively', async () => {
		render(PaddockSearch, { paddocks, onselect: () => {} });

		await page.getByRole('combobox', { name: 'Find a paddock' }).fill('NORTH');
		await expect.element(page.getByRole('option', { name: /North flat/ })).toBeVisible();
		await expect.element(page.getByRole('option', { name: /Northern hill/ })).toBeVisible();
		await expect.element(page.getByRole('option', { name: /Creek/ })).not.toBeInTheDocument();
	});

	it('matches an ID', async () => {
		render(PaddockSearch, { paddocks, onselect: () => {} });

		await page.getByRole('combobox', { name: 'Find a paddock' }).fill('7');
		await expect.element(page.getByRole('option', { name: /Creek/ })).toBeVisible();
	});

	it('picks a suggestion with the arrow keys and Enter', async () => {
		const onselect = vi.fn();
		render(PaddockSearch, { paddocks, onselect });

		await page.getByRole('combobox', { name: 'Find a paddock' }).fill('north');
		await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
		expect(onselect).toHaveBeenCalledWith(9);
		await expect.element(page.getByRole('listbox')).not.toBeInTheDocument();
	});

	it('picks a suggestion with a click', async () => {
		const onselect = vi.fn();
		render(PaddockSearch, { paddocks, onselect });

		await page.getByRole('combobox', { name: 'Find a paddock' }).fill('creek');
		await page.getByRole('option', { name: /Creek/ }).click();
		expect(onselect).toHaveBeenCalledWith(7);
	});

	it('closes the suggestions on Escape without letting the key reach the sheet', async () => {
		const outer = vi.fn();
		document.addEventListener('keydown', outer);
		render(PaddockSearch, { paddocks, onselect: () => {} });

		await page.getByRole('combobox', { name: 'Find a paddock' }).fill('north');
		await userEvent.keyboard('{Escape}');
		await expect.element(page.getByRole('listbox')).not.toBeInTheDocument();
		expect(outer).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
		document.removeEventListener('keydown', outer);
	});

	it('says so when nothing matches', async () => {
		render(PaddockSearch, { paddocks, onselect: () => {} });

		await page.getByRole('combobox', { name: 'Find a paddock' }).fill('zzz');
		await expect.element(page.getByText('No paddock matches “zzz”.')).toBeVisible();
	});
});
