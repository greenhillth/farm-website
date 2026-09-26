import { createRawSnippet } from 'svelte';
import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import ConfirmModal from './ConfirmModal.svelte';

const body = createRawSnippet(() => ({ render: () => '<p>Delete 3 records?</p>' }));

describe('ConfirmModal.svelte', () => {
	it('renders nothing while closed', async () => {
		render(ConfirmModal, { open: false, title: 'Delete?' });

		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});

	it('shows a labelled, focused dialog with its body when open', async () => {
		render(ConfirmModal, { open: true, title: 'Delete?', children: body });

		const dialog = page.getByRole('dialog', { name: 'Delete?' });
		await expect.element(dialog).toBeVisible();
		await expect.element(dialog).toHaveFocus();
		await expect.element(page.getByText('Delete 3 records?')).toBeVisible();
	});

	it('calls onconfirm and oncancel from its buttons', async () => {
		const onconfirm = vi.fn();
		const oncancel = vi.fn();
		render(ConfirmModal, {
			open: true,
			title: 'Delete?',
			confirmText: 'Delete',
			onconfirm,
			oncancel
		});

		await page.getByRole('button', { name: 'Delete' }).click();
		await page.getByRole('button', { name: 'Cancel' }).click();

		expect(onconfirm).toHaveBeenCalledOnce();
		expect(oncancel).toHaveBeenCalledOnce();
	});

	it('cancels on Escape and on the backdrop, but not on a click inside the dialog', async () => {
		const oncancel = vi.fn();
		render(ConfirmModal, { open: true, title: 'Delete?', oncancel });

		await userEvent.keyboard('{Escape}');
		expect(oncancel).toHaveBeenCalledTimes(1);

		await page.getByRole('heading', { name: 'Delete?' }).click();
		expect(oncancel).toHaveBeenCalledTimes(1);

		// The backdrop is role="presentation", so reach it through the dialog.
		(page.getByRole('dialog').element().parentElement as HTMLElement).click();
		expect(oncancel).toHaveBeenCalledTimes(2);
	});

	it('blocks every way out while loading', async () => {
		const oncancel = vi.fn();
		render(ConfirmModal, {
			open: true,
			title: 'Delete?',
			confirmText: 'Delete',
			loading: true,
			oncancel
		});

		await expect.element(page.getByRole('button', { name: 'Delete' })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
		await userEvent.keyboard('{Escape}');
		(page.getByRole('dialog').element().parentElement as HTMLElement).click();
		expect(oncancel).not.toHaveBeenCalled();
	});
});
