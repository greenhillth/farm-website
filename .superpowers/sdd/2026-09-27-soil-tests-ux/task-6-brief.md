### Task 6: Upload dialog and manual entry

**Files:**

- Create: `src/routes/soiltests/components/UploadDialog.svelte`
- Create: `src/routes/soiltests/components/UploadDialog.svelte.test.ts`
- Create: `src/routes/soiltests/components/ManualEntryForm.svelte`
- Create: `src/routes/soiltests/components/ManualEntryForm.svelte.test.ts`

**Interfaces:**

- Consumes: `sampleKey` (Task 2); `metricColumns`, `metricPlaceholders`, `MetricKey`, `PaddockSummary`; `uploadEndpoint` from `$lib/utils`.
- Produces:
  - `UploadDialog` props `{ mode: 'manual' | 'csv'; onmodechange: (mode: 'manual' | 'csv') => void; running: boolean; onclose: () => void; manual: Snippet; csv: Snippet }`. A native modal `<dialog>` opened on mount. Escape or Close while `running` asks "Stop the import?" inside the dialog instead of closing.
  - `ManualEntryForm` props `{ paddocks: readonly PaddockSummary[]; existingSamples: ReadonlySet<string>; onsaved: () => void; oncancel: () => void }`. Same fields, checks and `POST` payload as the old manual form.

- [ ] **Step 1: Write the failing tests**

Create `src/routes/soiltests/components/UploadDialog.svelte.test.ts`:

```ts
import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';

import '../../../app.css';
import UploadDialog from './UploadDialog.svelte';

const manual = createRawSnippet(() => ({ render: () => '<p>Manual form</p>' }));
const csv = createRawSnippet(() => ({ render: () => '<p>CSV wizard</p>' }));

describe('UploadDialog.svelte', () => {
	it('is a modal dialog showing the chosen mode', async () => {
		render(UploadDialog, {
			mode: 'csv',
			onmodechange: () => {},
			running: false,
			onclose: () => {},
			manual,
			csv
		});

		await expect.element(page.getByRole('dialog', { name: 'Add soil tests' })).toBeVisible();
		await expect.element(page.getByText('CSV wizard')).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: 'Import a CSV' }))
			.toHaveAttribute('aria-pressed', 'true');
	});

	it('closes on Escape when nothing is running', async () => {
		const onclose = vi.fn();
		render(UploadDialog, {
			mode: 'manual',
			onmodechange: () => {},
			running: false,
			onclose,
			manual,
			csv
		});

		await userEvent.keyboard('{Escape}');
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('asks before stopping a running import', async () => {
		const onclose = vi.fn();
		render(UploadDialog, {
			mode: 'csv',
			onmodechange: () => {},
			running: true,
			onclose,
			manual,
			csv
		});

		await page.getByRole('button', { name: 'Close' }).click();
		expect(onclose).not.toHaveBeenCalled();
		await expect.element(page.getByText('Stop the import?')).toBeVisible();

		await page.getByRole('button', { name: 'Keep importing' }).click();
		await expect.element(page.getByText('Stop the import?')).not.toBeInTheDocument();

		await userEvent.keyboard('{Escape}');
		await page.getByRole('button', { name: 'Stop import' }).click();
		expect(onclose).toHaveBeenCalledOnce();
	});
});
```

Create `src/routes/soiltests/components/ManualEntryForm.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import ManualEntryForm from './ManualEntryForm.svelte';

const paddocks = [{ id: 42, name: 'North flat' }];

async function fillRequired(fieldId = '42', sampleId = '1001') {
	await page.getByLabelText('Field ID').fill(fieldId);
	await page.getByLabelText('Sample name').fill('NF-1');
	await page.getByLabelText('Sample ID').fill(sampleId);
	await page.getByLabelText('Sample date').fill('2024-05-01');
}

afterEach(() => vi.unstubAllGlobals());

describe('ManualEntryForm.svelte', () => {
	it('posts the same payload as before and reports success', async () => {
		const fetch = vi.fn(async () => Response.json({ id: 1 }, { status: 201 }));
		vi.stubGlobal('fetch', fetch);
		const onsaved = vi.fn();
		render(ManualEntryForm, {
			paddocks,
			existingSamples: new Set<string>(),
			onsaved,
			oncancel: () => {}
		});

		await fillRequired();
		await page.getByLabelText('pH (H2O)').fill('6.2');
		await page.getByRole('button', { name: 'Save test' }).click();

		await vi.waitFor(() => expect(onsaved).toHaveBeenCalledOnce());
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/api/soil-tests/manual');
		expect(JSON.parse(String(init.body))).toEqual({
			fieldId: 42,
			sampleName: 'NF-1',
			sampleId: 1001,
			sampleDate: '2024-05-01',
			metrics: { ph_water: 6.2 }
		});
	});

	it('refuses a test that already exists', async () => {
		vi.stubGlobal('fetch', vi.fn());
		render(ManualEntryForm, {
			paddocks,
			existingSamples: new Set(['42:1001']),
			onsaved: () => {},
			oncancel: () => {}
		});

		await fillRequired();
		await page.getByLabelText('P', { exact: true }).fill('50');
		await page.getByRole('button', { name: 'Save test' }).click();

		await expect
			.element(page.getByText('A soil test with this field ID and sample ID already exists.'))
			.toBeVisible();
	});

	it('keeps Save disabled until there is a result', async () => {
		render(ManualEntryForm, {
			paddocks,
			existingSamples: new Set<string>(),
			onsaved: () => {},
			oncancel: () => {}
		});

		await fillRequired();
		await expect.element(page.getByRole('button', { name: 'Save test' })).toBeDisabled();
	});
});
```

Run: `npx vitest run --project client src/routes/soiltests/components/UploadDialog.svelte.test.ts src/routes/soiltests/components/ManualEntryForm.svelte.test.ts`
Expected: FAIL, the components don't exist.

- [ ] **Step 2: Create `src/routes/soiltests/components/UploadDialog.svelte`**

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';

	type Mode = 'manual' | 'csv';
	type Props = {
		mode: Mode;
		onmodechange: (mode: Mode) => void;
		running: boolean;
		onclose: () => void;
		manual: Snippet;
		csv: Snippet;
	};

	let { mode, onmodechange, running, onclose, manual, csv }: Props = $props();

	const titleId = $props.id();
	const modes: { value: Mode; label: string }[] = [
		{ value: 'csv', label: 'Import a CSV' },
		{ value: 'manual', label: 'Enter one test' }
	];
	let confirmingClose = $state(false);

	// The dialog exists only while open; showModal gives focus trapping and Escape for free.
	const openModal: Attachment<HTMLDialogElement> = (node) => {
		node.showModal();
		return () => node.close();
	};

	function requestClose() {
		if (running) confirmingClose = true;
		else onclose();
	}
</script>

<dialog
	{@attach openModal}
	aria-labelledby={titleId}
	oncancel={(event) => {
		event.preventDefault();
		requestClose();
	}}
	class="upload-dialog m-auto flex max-h-[min(92dvh,60rem)] w-[min(100%-2rem,48rem)] flex-col rounded-2xl border border-border bg-panel p-0 text-text shadow-2xl"
>
	<header class="flex items-center gap-3 border-b border-border py-2 pr-2 pl-5">
		<h2 id={titleId} class="flex-1 text-lg font-semibold">Add soil tests</h2>
		<button
			type="button"
			aria-label="Close"
			onclick={requestClose}
			class="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-white/10 hover:text-text"
		>
			<svg
				viewBox="0 0 24 24"
				class="size-5"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" />
			</svg>
		</button>
	</header>

	<div class="flex gap-2 px-5 pt-4" role="group" aria-label="How to add tests">
		{#each modes as option (option.value)}
			<button
				type="button"
				aria-pressed={mode === option.value}
				disabled={running}
				onclick={() => onmodechange(option.value)}
				class={[
					'inline-flex min-h-11 flex-1 items-center justify-center rounded-full border px-4 text-sm disabled:opacity-50',
					mode === option.value
						? 'border-accent bg-accent/15 text-text'
						: 'border-border text-muted hover:text-text'
				]}
			>
				{option.label}
			</button>
		{/each}
	</div>

	{#if confirmingClose}
		<div role="alert" class="mx-5 mt-4 rounded-lg border border-warn/50 bg-warn/10 p-4">
			<p class="font-semibold">Stop the import?</p>
			<p class="text-sm text-muted">Tests the server has already saved will stay saved.</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<button
					type="button"
					onclick={() => (confirmingClose = false)}
					class="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm"
				>
					Keep importing
				</button>
				<button
					type="button"
					onclick={() => {
						confirmingClose = false;
						onclose();
					}}
					class="inline-flex min-h-11 items-center rounded-lg border border-danger/60 bg-danger/20 px-4 text-sm font-semibold"
				>
					Stop import
				</button>
			</div>
		</div>
	{/if}

	<div class="overflow-y-auto px-5 py-4">
		{#if mode === 'csv'}
			{@render csv()}
		{:else}
			{@render manual()}
		{/if}
	</div>
</dialog>

<style>
	.upload-dialog::backdrop {
		background: rgb(0 0 0 / 0.6);
	}
</style>
```

- [ ] **Step 3: Create `src/routes/soiltests/components/ManualEntryForm.svelte`**

The old manual form (its lines 794–911 and 1237–1334) on runes, with the checks unchanged and plainer messages.

```svelte
<script lang="ts">
	import {
		metricColumns,
		metricPlaceholders,
		type MetricKey,
		type PaddockSummary
	} from '$lib/soil-tests/schema';
	import { sampleKey } from '$lib/soil-tests/validate';
	import { uploadEndpoint } from '$lib/utils';

	type Props = {
		paddocks: readonly PaddockSummary[];
		existingSamples: ReadonlySet<string>;
		onsaved: () => void;
		oncancel: () => void;
	};

	let { paddocks, existingSamples, onsaved, oncancel }: Props = $props();

	const uid = $props.id();
	let fieldId = $state('');
	let sampleName = $state('');
	let sampleId = $state('');
	let sampleDate = $state('');
	let client = $state('');
	let results = $state(
		Object.fromEntries(metricColumns.map((column) => [column.key, ''])) as Record<MetricKey, string>
	);
	let error = $state<string | null>(null);
	let submitting = $state(false);

	const resultCount = $derived(
		metricColumns.filter((column) => results[column.key].trim() !== '').length
	);
	const input =
		'min-h-11 w-full rounded-lg border border-border bg-white/5 px-3 text-base text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

	function fail(message: string) {
		error = message;
		submitting = false;
	}

	async function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		submitting = true;

		const parsedFieldId = Number(fieldId.trim());
		if (!fieldId.trim() || !Number.isInteger(parsedFieldId))
			return fail('Field ID must be a whole number.');
		const parsedSampleId = Number(sampleId.trim());
		if (!sampleId.trim() || !Number.isInteger(parsedSampleId)) {
			return fail('Sample ID must be a whole number.');
		}
		if (existingSamples.has(sampleKey(parsedFieldId, parsedSampleId))) {
			return fail('A soil test with this field ID and sample ID already exists.');
		}

		const metrics: Partial<Record<MetricKey, number>> = {};
		for (const { key, label } of metricColumns) {
			const raw = results[key].trim();
			if (!raw) continue;
			const value = Number(raw);
			if (!Number.isFinite(value)) return fail(`${label} must be a number.`);
			metrics[key] = value;
		}
		if (Object.keys(metrics).length === 0) return fail('Enter at least one result.');

		try {
			const response = await fetch(uploadEndpoint('manual'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fieldId: parsedFieldId,
					sampleName: sampleName.trim(),
					sampleId: parsedSampleId,
					sampleDate,
					client: client.trim() || undefined,
					metrics
				})
			});
			if (!response.ok) {
				let message = `Couldn’t save the test (${response.status}).`;
				try {
					const problem = (await response.json()) as { message?: unknown; detail?: unknown };
					const reason = problem.message ?? problem.detail;
					if (typeof reason === 'string') message = reason;
				} catch {
					// Keep the fallback message.
				}
				return fail(message);
			}
			submitting = false;
			onsaved();
		} catch {
			fail('Couldn’t save the test. Check the connection and try again.');
		}
	}
</script>

<form {onsubmit} class="space-y-5">
	<div class="grid gap-4 md:grid-cols-2">
		<div>
			<label for="{uid}-field" class="mb-1 block text-sm">Field ID</label>
			<input
				id="{uid}-field"
				type="text"
				inputmode="numeric"
				required
				list="{uid}-paddocks"
				placeholder="e.g. 4251583"
				bind:value={fieldId}
				class={input}
			/>
			<datalist id="{uid}-paddocks">
				{#each paddocks as paddock (paddock.id)}
					<option value={String(paddock.id)}>{paddock.name}</option>
				{/each}
			</datalist>
		</div>
		<div>
			<label for="{uid}-name" class="mb-1 block text-sm">Sample name</label>
			<input
				id="{uid}-name"
				type="text"
				required
				placeholder="e.g. ES30"
				bind:value={sampleName}
				class={input}
			/>
		</div>
		<div>
			<label for="{uid}-sample" class="mb-1 block text-sm">Sample ID</label>
			<input
				id="{uid}-sample"
				type="text"
				inputmode="numeric"
				required
				placeholder="e.g. 100021"
				bind:value={sampleId}
				class={input}
			/>
		</div>
		<div>
			<label for="{uid}-date" class="mb-1 block text-sm">Sample date</label>
			<input id="{uid}-date" type="date" required bind:value={sampleDate} class={input} />
		</div>
		<div class="md:col-span-2">
			<label for="{uid}-client" class="mb-1 block text-sm"
				>Client <span class="text-muted">(optional)</span></label
			>
			<input
				id="{uid}-client"
				type="text"
				placeholder="e.g. Botanical Resources"
				bind:value={client}
				class={input}
			/>
		</div>
	</div>

	<fieldset class="rounded-xl border border-border p-4">
		<legend class="px-1 font-semibold">Results</legend>
		<p class="mb-3 text-sm text-muted">Enter at least one. Leave the rest blank.</p>
		<div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
			{#each metricColumns as column (column.key)}
				<div>
					<label for="{uid}-{column.key}" class="mb-1 block text-sm">{column.label}</label>
					<input
						id="{uid}-{column.key}"
						type="text"
						inputmode="decimal"
						placeholder={metricPlaceholders[column.key]}
						bind:value={results[column.key]}
						class={input}
					/>
				</div>
			{/each}
		</div>
	</fieldset>

	{#if error}
		<p role="alert" class="rounded-lg border border-danger/50 bg-danger/10 px-4 py-3 text-sm">
			{error}
		</p>
	{/if}

	<div class="flex flex-wrap justify-end gap-2">
		<button
			type="button"
			onclick={oncancel}
			class="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm"
		>
			Cancel
		</button>
		<button
			type="submit"
			disabled={submitting || resultCount === 0}
			class="inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-bg disabled:opacity-50"
		>
			{submitting ? 'Saving…' : 'Save test'}
		</button>
	</div>
</form>
```

Run the autofixer on both components, then the tests. Expected: PASS. If `getByLabelText('P', { exact: true })` also matches "pH (H2O)" in your Playwright version, use `page.getByRole('textbox', { name: 'P', exact: true })`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/soiltests/components/UploadDialog.svelte src/routes/soiltests/components/UploadDialog.svelte.test.ts src/routes/soiltests/components/ManualEntryForm.svelte src/routes/soiltests/components/ManualEntryForm.svelte.test.ts
git commit -m "Add the upload dialog and move manual entry into its own component"
```

---

