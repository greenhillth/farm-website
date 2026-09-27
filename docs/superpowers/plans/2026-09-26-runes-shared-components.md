# Shared components on Svelte 5 runes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Before editing any `.svelte` file, load the `svelte:svelte-code-writer` skill and use its documentation lookup and autofixer. Every `.svelte` file you change must come back clean from the autofixer.

**Goal:** `Card`, `Panel` and `ConfirmModal` use Svelte 5 runes, snippets and callback props, with component tests, so later page migrations can build on them.

**Architecture:** Each component is rewritten in place, keeping its markup and styles. `export let` becomes typed `$props()`, `<slot>` becomes `Snippet` props rendered with `{@render}`, `createEventDispatcher` becomes `onconfirm`/`oncancel` callback props, `on:` becomes `onclick`/`onkeydown`, and `ConfirmModal`'s reactive focus block becomes an `{@attach}` on the dialog. The places that use these components are updated in the same task as the component, so every commit builds. Pages stay in legacy mode otherwise. Their migration is a later plan.

**Tech Stack:** Svelte 5.57 (runes, `$props.id()`, `{@attach}`, `createRawSnippet`), SvelteKit 2, Tailwind 4, Vitest 5 browser mode (`client` project: `*.svelte.test.ts`, headless Chromium, `vitest-browser-svelte`).

**Spec:** Item 2 of the 2026-09-26 repository review ("Modernising to Svelte 5"), shared components only.

## Global Constraints

- Work only in your own worktree under `.claude/worktrees/`. Never edit or switch branches in the main checkout.
- After `npm ci`, and before changing anything, record the ESLint baseline for the paths listed in the final task: `npx eslint <paths> 2>&1 | tail -3`. Later checks compare against it.
- Run `npm ci` first in the worktree. If it fails with `Tsconfig not found .../.svelte-kit/tsconfig.json`, run `npx svelte-kit sync` in the main checkout (`/Users/tomgreenhill/Projects/farm-website/farm-website`), then retry. Run `npx playwright install chromium` if browser tests say Chromium is missing.
- Before your first commit, move off the `worktree-<name>` branch you started on: `git fetch origin`, `git switch --no-track -c chore/runes-shared-components origin/staging`, then `git branch -d <the worktree-… branch>`. The branch is based on `staging`, not `main`.
- First commit: copy this plan to `docs/superpowers/plans/2026-09-26-runes-shared-components.md` and run `npx prettier --write` on it (CI checks Markdown formatting).
- Runes only in the rewritten components: no `export let`, `$:`, `<slot>`, `on:`, `createEventDispatcher` or `class:`. Use clsx-style arrays for conditional classes.
- In component tests, images use `data:` URIs (real paths hit SvelteKit's dev middleware and log a `cookie` error).
- Prettier: tabs, single quotes, no trailing commas, width 100. Run `npx prettier --write` on the files you touch.
- Don't add ESLint errors. `npx eslint <touched files>` must report fewer errors than, or the same number as, `origin/staging`. It should drop, because keyed `{#each}` removes some.
- Don't touch files outside this plan's **Files** lists. Parallel branches own the rest. In particular, don't edit `src/routes/+page.svelte` (home) or `src/routes/map/`.
- Before pushing, all of these must pass: `npm run check`, `npm test`, `npx prettier --check .`, `npm run build`, `scripts/smoke-test.sh --local`.
- Push the branch and open a PR into `staging` (`--base staging`). Don't merge it. Leave the worktree in place: it gets deleted after the PR merges.

## Review Focus

1. A `Card` given the same tag twice → renders it once instead of crashing. Svelte 5 throws on duplicate keys in a keyed `{#each}` (test in Task 1).
2. `ConfirmModal` click inside the dialog → doesn't cancel. Only a click on the backdrop itself cancels. This replaces `on:click|self` (test in Task 3).
3. `ConfirmModal` while `loading` → Escape, backdrop and both buttons do nothing (test in Task 3).
4. `ConfirmModal` reopened → the dialog gets focus each time it opens, not only the first time. The dialog is created fresh inside `{#if open}`, so the attachment runs on every open (test in Task 3 covers the first open, and the soil-tests page check in Task 4 covers reopening).
5. `Panel` with no `class` and no `actions`/`footer` → renders exactly as before, with no `undefined` class string (test in Task 2).

---

### Task 1: `Card` on runes

**Files:**

- Modify: `src/lib/components/Card.svelte`
- Test: `src/lib/components/Card.svelte.test.ts` (add tests)

**Interfaces:**

- Produces: `Card` props, unchanged in name and type: `href: string; title: string; description?: string; tags?: string[]; image?: string | null; imageAlt?: string; badge?: string | null`. The home page spreads `{...item}` into it.

- [ ] **Step 1: Write the failing tests**

Add inside the existing `describe('Card.svelte', ...)` in `src/lib/components/Card.svelte.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest --run --project client src/lib/components/Card.svelte.test.ts`
Expected: the two new tests FAIL (the tag renders twice, and there's no `loading` attribute). The existing two pass.

- [ ] **Step 3: Rewrite the script and the parts that change**

Replace the `<script>` block of `src/lib/components/Card.svelte`:

```svelte
<script lang="ts">
	type Props = {
		href: string;
		title: string;
		description?: string;
		tags?: string[];
		image?: string | null;
		imageAlt?: string;
		badge?: string | null;
	};

	let {
		href,
		title,
		description = '',
		tags = [],
		image = null,
		imageAlt = '',
		badge = null
	}: Props = $props();

	// A keyed each throws on duplicate keys, so each tag is shown once.
	const uniqueTags = $derived([...new Set(tags)]);
</script>
```

In the markup, add `loading="lazy"` and `decoding="async"` to the `<img>`, and replace the tags block:

```svelte
{#if uniqueTags.length}
	<div class="mt-3 flex flex-wrap gap-2">
		{#each uniqueTags as tag (tag)}
			<span
				class="inline-flex items-center rounded-full border border-border bg-white/5 px-2 py-0.5 text-xs text-muted"
			>
				#{tag}
			</span>
		{/each}
	</div>
{/if}
```

Leave all other markup and classes as they are. Run the svelte autofixer on the file.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest --run --project client src/lib/components/Card.svelte.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/lib/components/Card.svelte src/lib/components/Card.svelte.test.ts
git add src/lib/components/Card.svelte src/lib/components/Card.svelte.test.ts
git commit -m "Move Card to runes, key its tags and lazy-load its image"
```

---

### Task 2: `Panel` on runes with snippets

**Files:**

- Modify: `src/lib/components/Panel.svelte`
- Test: `src/lib/components/Panel.svelte.test.ts` (create)
- Modify: `src/routes/weather/+page.svelte` (the 8 `<Panel ... className=...>` usages, lines ~71–246)
- Modify: `src/routes/timesheet/+page.svelte` (the `<svelte:fragment slot="footer">` at line ~43)

**Interfaces:**

- Produces: `Panel` props `{ title: string; class?: ClassValue; children?: Snippet; actions?: Snippet; footer?: Snippet }`. The `className` prop is removed and callers pass `class`. `actions` renders in the header after the title, `footer` after the body.

- [ ] **Step 1: Write the failing test**

Create `src/lib/components/Panel.svelte.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest --run --project client src/lib/components/Panel.svelte.test.ts`
Expected: the first test FAILS (the `class` prop is ignored and the `actions` snippet isn't rendered by a named slot).

- [ ] **Step 3: Rewrite `Panel.svelte`**

Replace the whole file:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	type Props = {
		title: string;
		class?: ClassValue;
		children?: Snippet;
		actions?: Snippet;
		footer?: Snippet;
	};

	let { title, class: className, children, actions, footer }: Props = $props();
</script>

<section class={['rounded-xl border border-border bg-panel shadow-sm', className]}>
	<header
		class="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3 md:px-5 md:py-4"
	>
		<h3 class="text-sm font-semibold md:text-base">{title}</h3>
		{@render actions?.()}
	</header>
	<div class="p-4 md:p-5">
		{@render children?.()}
	</div>
	{@render footer?.()}
</section>
```

Run the svelte autofixer on it.

- [ ] **Step 4: Update the places that use it**

In `src/routes/weather/+page.svelte`, change every `className="h-full"` on `<Panel>` to `class="h-full"`, and remove `className=""` from the last `<Panel>` (line ~246). Find them with `grep -n className src/routes/weather/+page.svelte`, which should return nothing afterwards. Change nothing else in the file.

In `src/routes/timesheet/+page.svelte`, replace the footer fragment:

```svelte
{#snippet footer()}
	<div
		class="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3 text-sm md:px-5"
	>
		<div class="text-muted">Total</div>
		<div class="font-semibold">{total.toFixed(1)} hours</div>
	</div>
{/snippet}
```

Confirm nothing else uses the old API: `grep -rn 'className=\|slot="actions"\|slot="footer"' src/routes` must return only non-Panel matches (none are expected).

- [ ] **Step 5: Run the tests and type check**

Run: `npx vitest --run --project client src/lib/components/Panel.svelte.test.ts` (2 passed) and `npm run check` (0 errors).

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/lib/components/Panel.svelte src/lib/components/Panel.svelte.test.ts src/routes/weather/+page.svelte src/routes/timesheet/+page.svelte
git add src/lib/components/Panel.svelte src/lib/components/Panel.svelte.test.ts src/routes/weather/+page.svelte src/routes/timesheet/+page.svelte
git commit -m "Move Panel to runes with class, actions and footer props"
```

---

### Task 3: `ConfirmModal` on runes with callback props

**Files:**

- Modify: `src/lib/components/ConfirmModal.svelte` (script and markup; keep the `<style>` block unchanged)
- Test: `src/lib/components/ConfirmModal.svelte.test.ts` (create)
- Modify: `src/routes/soiltests/+page.svelte` (the `<ConfirmModal>` usage at lines ~1501–1516 only)

**Interfaces:**

- Produces: `ConfirmModal` props `{ open?: boolean; title?: string; confirmText?: string; cancelText?: string; loading?: boolean; disableConfirm?: boolean; onconfirm?: () => void; oncancel?: () => void; children?: Snippet }`. The `confirm`/`cancel` events are removed.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/components/ConfirmModal.svelte.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest --run --project client src/lib/components/ConfirmModal.svelte.test.ts`
Expected: the callback tests FAIL (the component dispatches events and ignores `onconfirm`/`oncancel`).

- [ ] **Step 3: Rewrite the script and markup**

Replace everything above `<style>` in `src/lib/components/ConfirmModal.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';

	type Props = {
		open?: boolean;
		title?: string;
		confirmText?: string;
		cancelText?: string;
		loading?: boolean;
		disableConfirm?: boolean;
		onconfirm?: () => void;
		oncancel?: () => void;
		children?: Snippet;
	};

	let {
		open = false,
		title = '',
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		loading = false,
		disableConfirm = false,
		onconfirm,
		oncancel,
		children
	}: Props = $props();

	const titleId = $props.id();

	// The dialog is created each time `open` turns true, so this focuses it on every opening.
	const focusOnMount: Attachment<HTMLElement> = (node) => {
		node.focus();
	};

	function handleBackdropClick(event: MouseEvent) {
		if (event.target !== event.currentTarget || loading) return;
		oncancel?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!open || loading) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			oncancel?.();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="confirm-backdrop" role="presentation" onclick={handleBackdropClick}>
		<div
			class="confirm-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			tabindex="-1"
			{@attach focusOnMount}
		>
			<h2 class="confirm-title" id={titleId}>{title}</h2>
			<div class="confirm-body">
				{@render children?.()}
			</div>
			<div class="confirm-actions">
				<button
					type="button"
					class="confirm-secondary"
					onclick={() => oncancel?.()}
					disabled={loading}
				>
					{cancelText}
				</button>
				<button
					type="button"
					class="confirm-primary"
					onclick={() => onconfirm?.()}
					disabled={loading || disableConfirm}
				>
					{#if loading}
						<svg class="confirm-spinner" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
							<circle
								class="confirm-spinner-track"
								cx="12"
								cy="12"
								r="10"
								fill="none"
								stroke-width="4"
							/>
							<path
								class="confirm-spinner-head"
								d="M4 12a8 8 0 018-8"
								fill="none"
								stroke-linecap="round"
								stroke-width="4"
							/>
						</svg>
					{/if}
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
```

Keep the `<style>` block exactly as it is. Run the svelte autofixer. If it raises an a11y warning about the backdrop's click handler, compare it with `origin/staging`: the old `on:click|self` on the same `role="presentation"` element passed svelte-check with 0 warnings. Resolve any new warning the way the autofixer suggests without changing behaviour, and `npm run check` must stay at 0 warnings.

- [ ] **Step 4: Update the soil-tests page**

In `src/routes/soiltests/+page.svelte`, change only these two lines of the `<ConfirmModal>` usage:

```svelte
onconfirm={doBulkDelete}
oncancel={cancelDelete}
```

(They replace `on:confirm={doBulkDelete}` and `on:cancel={cancelDelete}`. The slotted `<p>` children stay as they are and become the `children` snippet automatically.)

- [ ] **Step 5: Run the tests and type check**

Run: `npx vitest --run --project client src/lib/components/ConfirmModal.svelte.test.ts` (5 passed), `npm test` (all pass), and `npm run check` (0 errors, 0 warnings).

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/lib/components/ConfirmModal.svelte src/lib/components/ConfirmModal.svelte.test.ts src/routes/soiltests/+page.svelte
git add src/lib/components/ConfirmModal.svelte src/lib/components/ConfirmModal.svelte.test.ts src/routes/soiltests/+page.svelte
git commit -m "Move ConfirmModal to runes with onconfirm/oncancel and a focus attachment"
```

---

### Task 4: Full verification, check in the browser, and PR

- [ ] **Step 1: CI-equivalent checks**

Run each command, and don't continue while any of them fails:

```bash
npm run check
npm test
npx prettier --check .
npm run build
scripts/smoke-test.sh --local
npx eslint src/lib/components src/routes/weather/+page.svelte src/routes/timesheet/+page.svelte src/routes/soiltests/+page.svelte
```

The ESLint error count for these paths must be no higher than on `origin/staging`.

- [ ] **Step 2: Check in the browser**

Start the built app against the stub backend the way `scripts/smoke-test.sh --local` does (read the script for ports and env vars), and use Playwright MCP browser tools:

- `/`: cards render with images and tags, and hovering scales the card.
- `/weather`: every panel has its title and full height in the grid.
- `/timesheet`: the Recent Entries panel shows the Total footer.
- `/soiltests`: enter edit mode, select a row if the stub's response allows it (the stub echoes JSON, so the list may be empty; in that case, say that you couldn't exercise the modal in the browser), open the delete modal, check that it has focus, press Escape, open it again and check focus again, then Cancel.

Report what you could and couldn't check.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin chore/runes-shared-components
gh pr create --base staging --title "Move Card, Panel and ConfirmModal to Svelte 5 runes" --body "<summary: API changes (Panel class/actions/footer, ConfirmModal onconfirm/oncancel), callers updated, tests added, verification run; end with the attribution lines from the session>"
```

Don't merge.
