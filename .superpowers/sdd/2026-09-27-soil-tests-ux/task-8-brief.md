### Task 8: Rebuild the page

**Files:**

- Modify: `src/routes/soiltests/+page.svelte` (rewrite)
- Create: `src/routes/soiltests/soiltests-page.svelte.test.ts`

**Interfaces:**

- Consumes: everything from Tasks 1–7; `fetchSoilTests`; `ConfirmModal` from `$lib/components/ConfirmModal.svelte`; `CSV_PROGRESS_EVENT_NAME`, `CsvProgressUpdate`.
- Produces: `/soiltests?q=&paddock=&year=&page=` (UX 2's paddock sheet links to `/soiltests?paddock=<id>`).

- [ ] **Step 1: Write the failing page test**

Create `src/routes/soiltests/soiltests-page.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const app = vi.hoisted(() => ({
	page: { url: new URL('http://localhost/soiltests'), state: {} },
	replaceState: vi.fn()
}));
vi.mock('$app/state', () => ({ page: app.page }));
vi.mock('$app/navigation', () => ({ replaceState: app.replaceState }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path, asset: (path: string) => path }));

import '../../app.css';
import SoilTestsPage from './+page.svelte';

const tests = Array.from({ length: 30 }, (_, i) => ({
	id: i + 1,
	fieldID: i < 4 ? '42' : '7',
	id_sample: 1000 + i,
	name_sample: `S-${i + 1}`,
	sample_date: `2024-05-${String((i % 28) + 1).padStart(2, '0')}`,
	ph_water: 5.5,
	P: 60
}));
const farm = {
	features: [
		{ properties: { fieldID: '42', FIELDNAME: 'North flat' } },
		{ properties: { fieldID: '7', FIELDNAME: 'Creek' } }
	]
};

function stubFetch(testsResponse: () => Response = () => Response.json(tests)) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.startsWith('/api/soil-tests')) return testsResponse();
			if (url.startsWith('/api/farm')) return Response.json(farm);
			return new Response('not found', { status: 404 });
		})
	);
}

function openAt(path: string) {
	app.page.url = new URL(`http://localhost${path}`);
	render(SoilTestsPage);
}

afterEach(() => {
	vi.unstubAllGlobals();
	app.replaceState.mockClear();
});

describe('soil tests page on a desktop', () => {
	beforeEach(async () => {
		await page.viewport(1280, 800);
	});

	it('shows 25 tests a page in a table', async () => {
		stubFetch();
		openAt('/soiltests');

		await expect.element(page.getByText('Showing 1–25 of 30')).toBeVisible();
		expect(page.getByRole('row').elements()).toHaveLength(26);
	});

	it('filters to the paddock in ?paddock=', async () => {
		stubFetch();
		openAt('/soiltests?paddock=42');

		await expect.element(page.getByText('Showing 1–4 of 4')).toBeVisible();
		await expect.element(page.getByLabelText('Paddock')).toHaveValue('42');
	});

	it('clamps a page past the end', async () => {
		stubFetch();
		openAt('/soiltests?page=99');

		await expect.element(page.getByText('Showing 26–30 of 30')).toBeVisible();
	});

	it('writes filter changes into the URL and returns to page 1', async () => {
		stubFetch();
		openAt('/soiltests?page=2');

		await page.getByLabelText('Year').selectOptions('2024');
		const [url] = app.replaceState.mock.lastCall as [string];
		expect(url).toBe('/soiltests?year=2024');
	});

	it('explains an empty result and clears the filters', async () => {
		stubFetch();
		openAt('/soiltests?q=nothing-matches');

		await expect.element(page.getByText('No tests match these filters.')).toBeVisible();
		await page.getByRole('button', { name: 'Clear filters' }).click();
		await expect.element(page.getByText('Showing 1–25 of 30')).toBeVisible();
	});

	it('offers Retry when the list fails to load', async () => {
		stubFetch(() => new Response('down', { status: 502 }));
		openAt('/soiltests');

		await expect
			.element(page.getByText('Couldn’t load soil tests. Check the connection and try again.'))
			.toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Retry' })).toBeVisible();
	});
});

describe('soil tests page on a phone', () => {
	beforeEach(async () => {
		await page.viewport(390, 844);
	});

	it('shows cards with statuses in words instead of the table', async () => {
		stubFetch();
		openAt('/soiltests?paddock=42');

		await expect.element(page.getByRole('article').first()).toBeVisible();
		expect(page.getByRole('table').elements()).toHaveLength(0);
		await expect.element(page.getByRole('article').first().getByText('Low')).toBeVisible();
	});
});
```

Run: `npx vitest run --project client src/routes/soiltests/soiltests-page.svelte.test.ts`
Expected: FAIL (the legacy page has no filters or pagination).

- [ ] **Step 2: Rewrite `src/routes/soiltests/+page.svelte`**

Replace the whole file (script, markup and the old `<style>` block) with:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';

	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import CONFIG from '$lib/config';
	import {
		EMPTY_FILTERS,
		filterTests,
		filtersToSearch,
		paginate,
		parseFilters,
		yearsIn,
		type Filters
	} from '$lib/soil-tests/filters';
	import { CSV_PROGRESS_EVENT_NAME, type CsvProgressUpdate } from '$lib/soil-tests/progress';
	import type { BulkDeleteResponse, PaddockSummary, SoilTest } from '$lib/soil-tests/schema';
	import { DEFAULT_SORT, describeSort, sortTests, type SortState } from '$lib/soil-tests/sort';
	import { fetchSoilTests } from '$lib/soil-tests/utils';
	import { sampleKey } from '$lib/soil-tests/validate';

	import BulkDeleteBar from './components/BulkDeleteBar.svelte';
	import CsvImportWizard from './components/CsvImportWizard.svelte';
	import ManualEntryForm from './components/ManualEntryForm.svelte';
	import Pagination from './components/Pagination.svelte';
	import SoilTestCard from './components/SoilTestCard.svelte';
	import SoilTestsTable from './components/SoilTestsTable.svelte';
	import SoilTestsToolbar from './components/SoilTestsToolbar.svelte';
	import Toasts from './components/Toasts.svelte';
	import UploadDialog from './components/UploadDialog.svelte';
	import { ImportJob } from './import-job.svelte';
	import { Toaster } from './toasts.svelte';

	const desktop = new MediaQuery('min-width: 48rem');
	const toaster = new Toaster();
	const job = new ImportJob();

	let tests = $state.raw<SoilTest[]>([]);
	let paddocks = $state.raw<PaddockSummary[]>([]);
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	// Read once from the URL; after that the URL mirrors this state.
	let filters = $state<Filters>(parseFilters(page.url));
	let sort = $state<SortState>(DEFAULT_SORT);
	let editing = $state(false);
	let selected = $state.raw(new Set<number>());
	let confirmingDelete = $state(false);
	let deleting = $state(false);
	let uploadMode = $state<'manual' | 'csv' | null>(null);

	const years = $derived(yearsIn(tests));
	const matching = $derived(sortTests(filterTests(tests, filters), sort));
	const slice = $derived(paginate(matching, filters.page));
	const knownPaddockIds = $derived(new Set(paddocks.map((paddock) => paddock.id)));
	const existingSamples = $derived(
		new Set(tests.map((test) => sampleKey(test.fieldId, test.sampleId)))
	);
	const hasFilters = $derived(
		filters.q.trim() !== '' || filters.paddock !== null || filters.year !== null
	);

	function setFilters(change: Partial<Filters>) {
		filters = { ...filters, ...change, page: change.page ?? 1 };
		replaceState(`${page.url.pathname}${filtersToSearch(filters)}`, page.state);
	}

	async function loadTests(): Promise<boolean> {
		loadError = null;
		try {
			const result = await fetchSoilTests();
			tests = result.tests;
			paddocks = result.paddocks;
			return true;
		} catch (err) {
			console.error('Failed to load soil tests', err);
			loadError = 'Couldn’t load soil tests. Check the connection and try again.';
			return false;
		} finally {
			loading = false;
		}
	}

	function toggleSelected(id: number, checked: boolean) {
		selected = checked
			? new Set([...selected, id])
			: new Set([...selected].filter((other) => other !== id));
	}

	function stopEditing() {
		editing = false;
		confirmingDelete = false;
		selected = new Set();
	}

	async function deleteSelected() {
		if (selected.size === 0 || deleting) return;
		deleting = true;
		const ids = [...selected];
		try {
			const response = await fetch(CONFIG.backend.bulkDelete, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids })
			});
			const result = (response.headers.get('content-type') ?? '').includes('application/json')
				? ((await response.json()) as BulkDeleteResponse & { message?: unknown })
				: null;
			if (!response.ok && response.status !== 207) {
				throw new Error(
					typeof result?.message === 'string'
						? result.message
						: `Delete failed (${response.status})`
				);
			}

			let failed = Array.isArray(result?.failedIds) ? result.failedIds : [];
			if (response.status === 207 && failed.length === 0) {
				const deleted = typeof result?.deleted === 'number' ? result.deleted : undefined;
				if (deleted !== undefined && deleted < ids.length) failed = ids;
			}
			const succeeded = (Array.isArray(result?.ids) ? result.ids : ids).filter(
				(id) => !failed.includes(id)
			);

			if (succeeded.length > 0) {
				tests = tests.filter((test) => !succeeded.includes(test.id));
				toaster.show(`Deleted ${succeeded.length} test${succeeded.length === 1 ? '' : 's'}.`);
			}
			if (failed.length > 0) {
				toaster.show(
					`Couldn’t delete ${failed.length} test${failed.length === 1 ? '' : 's'}.`,
					'warning'
				);
				selected = new Set(failed);
				confirmingDelete = false;
				return;
			}
			selected = new Set();
			confirmingDelete = false;
		} catch (err) {
			console.error('Bulk delete failed', err);
			toaster.show('Couldn’t delete tests. Check the connection and try again.', 'error');
		} finally {
			deleting = false;
		}
	}

	async function closeUpload() {
		if (job.running) await job.cancel();
		else job.reset();
		uploadMode = null;
		void loadTests();
	}

	async function manualSaved() {
		uploadMode = null;
		const refreshed = await loadTests();
		toaster.show(
			refreshed ? 'Soil test added.' : 'Soil test added, but refreshing the list failed.',
			refreshed ? 'success' : 'warning'
		);
	}

	async function importDone({ inserted }: { inserted: number; skipped: number }) {
		job.reset();
		uploadMode = null;
		// New tests are on page 1: newest first, no filters.
		sort = DEFAULT_SORT;
		setFilters({ ...EMPTY_FILTERS });
		const refreshed = await loadTests();
		toaster.show(
			refreshed
				? `Imported ${inserted} test${inserted === 1 ? '' : 's'}.`
				: 'Import complete, but refreshing the list failed.',
			refreshed ? 'success' : 'warning'
		);
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && editing && !confirmingDelete && uploadMode === null)
			stopEditing();
	}

	onMount(() => {
		void loadTests();
		// Kept from the old page: other scripts can push progress with this DOM event.
		const onProgress = (event: Event) => {
			const detail = (event as CustomEvent<CsvProgressUpdate>).detail;
			if (detail) job.apply(detail);
		};
		window.addEventListener(CSV_PROGRESS_EVENT_NAME, onProgress);
		return () => {
			window.removeEventListener(CSV_PROGRESS_EVENT_NAME, onProgress);
			job.stop();
			toaster.destroy();
		};
	});
</script>

<svelte:head>
	<title>Soil tests</title>
</svelte:head>

<svelte:window onkeydown={onWindowKeydown} />

<Toasts {toaster} />

<div class="mx-auto max-w-6xl space-y-4 px-4 pb-8">
	<div class="flex flex-wrap items-center justify-between gap-3 pt-6">
		<h1 class="text-xl font-semibold">Soil tests</h1>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				onclick={() => (uploadMode = 'csv')}
				class="inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-bg"
			>
				Import tests
			</button>
			<button
				type="button"
				onclick={() => (uploadMode = 'manual')}
				class="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm text-text hover:bg-white/5"
			>
				Add a test
			</button>
		</div>
	</div>

	<SoilTestsToolbar
		{filters}
		{paddocks}
		{years}
		{sort}
		showSort={!desktop.current}
		onchange={setFilters}
		onsort={(next) => {
			sort = next;
			setFilters({});
		}}
	/>

	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-muted">{describeSort(sort)}</p>
		{#if !editing}
			<button
				type="button"
				onclick={() => (editing = true)}
				class="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm text-muted hover:text-text"
			>
				Delete tests
			</button>
		{/if}
	</div>

	{#if editing}
		<BulkDeleteBar
			count={selected.size}
			ondelete={() => (confirmingDelete = true)}
			ondone={stopEditing}
		/>
	{/if}

	{#if loading}
		<p class="text-muted">Loading soil tests…</p>
	{:else if loadError}
		<div class="rounded-xl border border-danger/50 bg-danger/10 p-4">
			<p>{loadError}</p>
			<button
				type="button"
				onclick={() => void loadTests()}
				class="mt-2 inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm"
			>
				Retry
			</button>
		</div>
	{:else if matching.length === 0}
		<div class="rounded-xl border border-border bg-panel p-6 text-center">
			<p>{hasFilters ? 'No tests match these filters.' : 'No soil tests yet.'}</p>
			{#if hasFilters}
				<button
					type="button"
					onclick={() => setFilters({ q: '', paddock: null, year: null })}
					class="mt-3 inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm"
				>
					Clear filters
				</button>
			{/if}
		</div>
	{:else}
		{#if desktop.current}
			<SoilTestsTable
				tests={slice.items}
				{sort}
				onsort={(next) => {
					sort = next;
					setFilters({});
				}}
				{editing}
				{selected}
				ontoggle={toggleSelected}
			/>
		{:else}
			<ul class="space-y-3">
				{#each slice.items as test (test.id)}
					<li>
						<SoilTestCard
							{test}
							{editing}
							selected={selected.has(test.id)}
							ontoggle={toggleSelected}
						/>
					</li>
				{/each}
			</ul>
		{/if}
		<Pagination
			{slice}
			onchange={(next) => {
				setFilters({ page: next });
				window.scrollTo({ top: 0 });
			}}
		/>
	{/if}
</div>

{#if uploadMode}
	<UploadDialog
		mode={uploadMode}
		onmodechange={(mode) => (uploadMode = mode)}
		running={job.running}
		onclose={closeUpload}
	>
		{#snippet manual()}
			<ManualEntryForm {paddocks} {existingSamples} onsaved={manualSaved} oncancel={closeUpload} />
		{/snippet}
		{#snippet csv()}
			<CsvImportWizard {job} {knownPaddockIds} {existingSamples} ondone={importDone} />
		{/snippet}
	</UploadDialog>
{/if}

<ConfirmModal
	open={confirmingDelete}
	title="Delete these soil tests?"
	confirmText="Delete"
	cancelText="Cancel"
	loading={deleting}
	disableConfirm={selected.size === 0}
	onconfirm={deleteSelected}
	oncancel={() => {
		if (!deleting) confirmingDelete = false;
	}}
>
	<p class="text-sm">
		You're about to delete {selected.size} test{selected.size === 1 ? '' : 's'}. This can't be
		undone.
	</p>
</ConfirmModal>
```

Notes:

- ESLint's `no-navigation-without-resolve` flags `replaceState` with a built URL; that's one expected error, far below what the old page carried.
- If the autofixer suggests `SvelteSet` for `selected`, keep the plain `Set` in `$state.raw`: it is replaced, never mutated.

Run the autofixer until clean.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run --project client src/routes/soiltests && npx vitest run --project server src/lib/soil-tests && npm run check`
Expected: PASS, no type errors.

- [ ] **Step 4: Remove what nothing uses**

Run: `grep -rn "csvStageDefaults\|CSV_PROGRESS_EVENT_NAME\|metricPlaceholders\|optionalColumns\|normaliseSampleDateValue" src | grep -v "src/lib/soil-tests/"`
Everything listed there is still used; don't delete it. Then check the constraints:

Run: `grep -rn "text-\[1[01]px\]\|uppercase\|on:\|export let\|\$:\|\$app/stores\|class:" src/routes/soiltests`
Expected: no output.

- [ ] **Step 5: Browser check and design review**

Load `frontend-design:frontend-design` and re-read `docs/superpowers/specs/2026-09-27-ui-direction.md`. With the backend running (`../gbros-api`) and `npm run dev`, run `node scripts/screenshot.mjs /tmp/shots-soil /soiltests /soiltests?paddock=<a real field ID>`. At 390px: cards, readable without zoom, the page is a few screens long rather than 23,000px, filters usable with a thumb. At 1280px: the table header stays visible while scrolling the list, status marks sit beside metric values. Then do a real import of `static/samples/soil-tests.csv` against the local backend: the Check step says "No problems found.", the Duplicates step appears if the sample is already imported, and Done shows the counts; after Close the list is newest first on page 1. Fix what doesn't match and re-run the tests.

- [ ] **Step 6: Commit**

```bash
git add src/routes/soiltests
git commit -m "Rebuild soil tests on runes with filters, pagination, phone cards and a checked import"
```

---

