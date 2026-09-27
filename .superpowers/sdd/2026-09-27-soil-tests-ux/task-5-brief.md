### Task 5: List components

**Files:**

- Create: `src/routes/soiltests/components/Pagination.svelte`
- Create: `src/routes/soiltests/components/Pagination.svelte.test.ts`
- Create: `src/routes/soiltests/components/StatusMark.svelte`
- Create: `src/routes/soiltests/components/SoilTestsToolbar.svelte`
- Create: `src/routes/soiltests/components/SoilTestsTable.svelte`
- Create: `src/routes/soiltests/components/SoilTestCard.svelte`
- Create: `src/routes/soiltests/components/BulkDeleteBar.svelte`
- Create: `src/routes/soiltests/components/Toasts.svelte`

**Interfaces:**

- Consumes: Task 3 modules; `Toaster` (Task 4); `StatusBadge` from `$lib/components/StatusBadge.svelte`; `formatDate`, `formatNumber` from `$lib/soil-tests/utils`; `metricColumns`, `PaddockSummary`, `SoilTest` from `$lib/soil-tests/schema`.
- Produces:
  - `Pagination` props `{ slice: PageSlice<unknown>; onchange: (page: number) => void }`. Renders nothing when `slice.total === 0`.
  - `StatusMark` props `{ status: MetricStatus }`: a compact mark for table cells (`↓` Low, `✓` Optimal, `↑` High, with the word for screen readers and as a tooltip); nothing for `no-data`/`no-range`.
  - `SoilTestsToolbar` props `{ filters: Filters; paddocks: readonly PaddockSummary[]; years: number[]; sort: SortState; showSort: boolean; onchange: (change: Partial<Filters>) => void; onsort: (sort: SortState) => void }`.
  - `SoilTestsTable` props `{ tests: SoilTest[]; sort: SortState; onsort: (sort: SortState) => void; editing: boolean; selected: ReadonlySet<number>; ontoggle: (id: number, checked: boolean) => void }`.
  - `SoilTestCard` props `{ test: SoilTest; editing: boolean; selected: boolean; ontoggle: (id: number, checked: boolean) => void }`.
  - `BulkDeleteBar` props `{ count: number; ondelete: () => void; ondone: () => void }`.
  - `Toasts` props `{ toaster: Toaster }`.

- [ ] **Step 1: Write the failing `Pagination` test**

Create `src/routes/soiltests/components/Pagination.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { paginate } from '$lib/soil-tests/filters';
import Pagination from './Pagination.svelte';

const list = Array.from({ length: 251 }, (_, i) => i);

describe('Pagination.svelte', () => {
	it('announces the range and disables Previous on page 1', async () => {
		render(Pagination, { slice: paginate(list, 1), onchange: () => {} });

		await expect.element(page.getByText('Showing 1–25 of 251')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
		await expect
			.element(page.getByRole('button', { name: 'Page 1', exact: true }))
			.toHaveAttribute('aria-current', 'page');
	});

	it('moves to the next page and to a numbered page', async () => {
		const onchange = vi.fn();
		render(Pagination, { slice: paginate(list, 2), onchange });

		await expect.element(page.getByText('Showing 26–50 of 251')).toBeVisible();
		await page.getByRole('button', { name: 'Next' }).click();
		expect(onchange).toHaveBeenLastCalledWith(3);
		await page.getByRole('button', { name: 'Page 11' }).click();
		expect(onchange).toHaveBeenLastCalledWith(11);
	});

	it('disables Next on the last page', async () => {
		render(Pagination, { slice: paginate(list, 11), onchange: () => {} });

		await expect.element(page.getByText('Showing 251–251 of 251')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Next' })).toBeDisabled();
	});
});
```

Run: `npx vitest run --project client src/routes/soiltests/components/Pagination.svelte.test.ts`
Expected: FAIL, cannot resolve `./Pagination.svelte`.

- [ ] **Step 2: Create `src/routes/soiltests/components/Pagination.svelte`**

```svelte
<script lang="ts">
	import { pageList, type PageSlice } from '$lib/soil-tests/filters';

	type Props = { slice: PageSlice<unknown>; onchange: (page: number) => void };

	let { slice, onchange }: Props = $props();

	const pages = $derived(pageList(slice.page, slice.pageCount));
	const button =
		'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border px-3 text-sm disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
</script>

{#if slice.total > 0}
	<nav aria-label="Pages" class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-muted" aria-live="polite">
			Showing {slice.start}–{slice.end} of {slice.total}
		</p>
		<div class="flex flex-wrap items-center gap-1">
			<button
				type="button"
				class={[button, 'text-text hover:bg-white/5']}
				disabled={slice.page <= 1}
				onclick={() => onchange(slice.page - 1)}
			>
				Previous
			</button>
			{#each pages as number, index (index)}
				{#if number === null}
					<span class="px-1 text-muted" aria-hidden="true">…</span>
				{:else}
					<button
						type="button"
						aria-label="Page {number}"
						aria-current={number === slice.page ? 'page' : undefined}
						class={[
							button,
							number === slice.page
								? 'border-accent bg-accent/15 text-text'
								: 'text-muted hover:bg-white/5'
						]}
						onclick={() => onchange(number)}
					>
						{number}
					</button>
				{/if}
			{/each}
			<button
				type="button"
				class={[button, 'text-text hover:bg-white/5']}
				disabled={slice.page >= slice.pageCount}
				onclick={() => onchange(slice.page + 1)}
			>
				Next
			</button>
		</div>
	</nav>
{/if}
```

Run the autofixer, then the test. Expected: PASS.

- [ ] **Step 3: Create `src/routes/soiltests/components/StatusMark.svelte`**

```svelte
<script lang="ts">
	import { STATUS_LABELS, type MetricStatus } from '$lib/soil-status';

	type Props = { status: MetricStatus };

	let { status }: Props = $props();

	const marks: Partial<Record<MetricStatus, { symbol: string; tone: string }>> = {
		low: { symbol: '↓', tone: 'text-status-low' },
		optimal: { symbol: '✓', tone: 'text-accent' },
		high: { symbol: '↑', tone: 'text-status-high' }
	};
	const mark = $derived(marks[status]);
</script>

{#if mark}
	<span
		class={['ml-1 inline-block w-3 text-center font-semibold', mark.tone]}
		title={STATUS_LABELS[status]}
	>
		<span aria-hidden="true">{mark.symbol}</span>
		<span class="sr-only">{STATUS_LABELS[status]}</span>
	</span>
{/if}
```

- [ ] **Step 4: Create `src/routes/soiltests/components/SoilTestsToolbar.svelte`**

```svelte
<script lang="ts">
	import type { Filters } from '$lib/soil-tests/filters';
	import type { PaddockSummary } from '$lib/soil-tests/schema';
	import { SORT_PRESETS, sortId, type SortState } from '$lib/soil-tests/sort';

	type Props = {
		filters: Filters;
		paddocks: readonly PaddockSummary[];
		years: number[];
		sort: SortState;
		showSort: boolean;
		onchange: (change: Partial<Filters>) => void;
		onsort: (sort: SortState) => void;
	};

	let { filters, paddocks, years, sort, showSort, onchange, onsort }: Props = $props();

	const uid = $props.id();
	const byName = $derived([...paddocks].sort((a, b) => a.name.localeCompare(b.name)));
	const currentSort = $derived(sortId(sort));
	const control =
		'min-h-11 w-full rounded-lg border border-border bg-white/5 px-3 text-base text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
</script>

<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]">
	<div>
		<label for="{uid}-q" class="mb-1 block text-sm text-muted">Search</label>
		<input
			id="{uid}-q"
			type="search"
			placeholder="Paddock, sample or ID"
			value={filters.q}
			oninput={(event) => onchange({ q: event.currentTarget.value })}
			class={control}
		/>
	</div>
	<div>
		<label for="{uid}-paddock" class="mb-1 block text-sm text-muted">Paddock</label>
		<select
			id="{uid}-paddock"
			value={filters.paddock === null ? '' : String(filters.paddock)}
			onchange={(event) => {
				const value = event.currentTarget.value;
				onchange({ paddock: value === '' ? null : Number(value) });
			}}
			class={control}
		>
			<option value="">All paddocks</option>
			{#each byName as paddock (paddock.id)}
				<option value={String(paddock.id)}>{paddock.name} ({paddock.id})</option>
			{/each}
		</select>
	</div>
	<div>
		<label for="{uid}-year" class="mb-1 block text-sm text-muted">Year</label>
		<select
			id="{uid}-year"
			value={filters.year === null ? '' : String(filters.year)}
			onchange={(event) => {
				const value = event.currentTarget.value;
				onchange({ year: value === '' ? null : Number(value) });
			}}
			class={control}
		>
			<option value="">All years</option>
			{#each years as year (year)}
				<option value={String(year)}>{year}</option>
			{/each}
		</select>
	</div>
	{#if showSort}
		<div>
			<label for="{uid}-sort" class="mb-1 block text-sm text-muted">Order</label>
			<select
				id="{uid}-sort"
				value={currentSort}
				onchange={(event) => {
					const preset = SORT_PRESETS.find(
						(option) => sortId(option.state) === event.currentTarget.value
					);
					if (preset) onsort(preset.state);
				}}
				class={control}
			>
				{#if !SORT_PRESETS.some((option) => sortId(option.state) === currentSort)}
					<option value={currentSort}>Custom order</option>
				{/if}
				{#each SORT_PRESETS as option (sortId(option.state))}
					<option value={sortId(option.state)}>{option.label}</option>
				{/each}
			</select>
		</div>
	{/if}
</div>
```

- [ ] **Step 5: Create `src/routes/soiltests/components/SoilTestsTable.svelte`**

The old table (its lines 1084–1209) on runes, with a sticky header inside its own scroll area, `aria-sort` on the headers and a `StatusMark` beside each metric that has an optimal range.

```svelte
<script lang="ts">
	import { metricColumns, type MetricKey, type SoilTest } from '$lib/soil-tests/schema';
	import { nextSort, type PrimarySortColumn, type SortState } from '$lib/soil-tests/sort';
	import { testMetricStatus } from '$lib/soil-tests/status';
	import { formatDate, formatNumber } from '$lib/soil-tests/utils';
	import StatusMark from './StatusMark.svelte';

	type Props = {
		tests: SoilTest[];
		sort: SortState;
		onsort: (sort: SortState) => void;
		editing: boolean;
		selected: ReadonlySet<number>;
		ontoggle: (id: number, checked: boolean) => void;
	};

	let { tests, sort, onsort, editing, selected, ontoggle }: Props = $props();

	const primary: { column: PrimarySortColumn; label: string }[] = [
		{ column: 'sample', label: 'Sample' },
		{ column: 'paddock', label: 'Paddock' },
		{ column: 'farm', label: 'Farm' },
		{ column: 'date', label: 'Sample date' },
		{ column: 'client', label: 'Client' }
	];

	function ariaSort(column: PrimarySortColumn | MetricKey) {
		const active = sort.type === 'metric' ? sort.key === column : sort.type === column;
		if (!active) return 'none';
		return sort.direction === 'asc' ? 'ascending' : 'descending';
	}

	const sortButton =
		'inline-flex min-h-11 items-center gap-1 font-semibold hover:text-text focus-visible:outline-2 focus-visible:outline-accent';
</script>

<div class="max-h-[calc(100dvh-16rem)] overflow-auto rounded-xl border border-border">
	<table class="w-full text-sm">
		<thead
			class="sticky top-0 z-10 bg-panel text-left text-muted shadow-[0_1px_0_rgb(var(--border))]"
		>
			<tr>
				{#if editing}
					<th class="w-12 px-3"><span class="sr-only">Select</span></th>
				{/if}
				{#each primary as { column, label } (column)}
					<th class="px-3" aria-sort={ariaSort(column)}>
						<button type="button" class={sortButton} onclick={() => onsort(nextSort(sort, column))}>
							{label}
							<span aria-hidden="true" class="w-3 text-xs">
								{ariaSort(column) === 'ascending'
									? '▲'
									: ariaSort(column) === 'descending'
										? '▼'
										: ''}
							</span>
						</button>
					</th>
				{/each}
				{#each metricColumns as column (column.key)}
					<th class="px-3 text-right" aria-sort={ariaSort(column.key)}>
						<button
							type="button"
							class={[sortButton, 'justify-end']}
							onclick={() => onsort(nextSort(sort, column.key))}
						>
							{column.label}
							<span aria-hidden="true" class="w-3 text-xs">
								{ariaSort(column.key) === 'ascending'
									? '▲'
									: ariaSort(column.key) === 'descending'
										? '▼'
										: ''}
							</span>
						</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each tests as test (test.id)}
				<tr
					class={[
						'border-t border-border/60',
						selected.has(test.id) ? 'bg-danger/10' : 'hover:bg-white/5'
					]}
				>
					{#if editing}
						<td class="px-3">
							<input
								type="checkbox"
								class="size-5 accent-danger"
								checked={selected.has(test.id)}
								onchange={(event) => ontoggle(test.id, event.currentTarget.checked)}
								aria-label="Select {test.sampleName ?? 'test'} from {formatDate(test.sampleDate)}"
							/>
						</td>
					{/if}
					<td class="px-3 py-2">
						<span class="block font-medium text-text">{test.sampleName ?? 'Unnamed sample'}</span>
						<span class="text-xs text-muted">Sample ID {test.sampleId}</span>
					</td>
					<td class="px-3 py-2">
						<span class="block">{test.paddockName}</span>
						<span class="text-xs text-muted">Field ID {test.fieldId}</span>
					</td>
					<td class="px-3 py-2">{test.farm ?? '-'}</td>
					<td class="px-3 py-2 whitespace-nowrap">{formatDate(test.sampleDate)}</td>
					<td class="px-3 py-2">{test.client ?? '-'}</td>
					{#each metricColumns as column (column.key)}
						<td class="px-3 py-2 text-right whitespace-nowrap tabular-nums">
							{formatNumber(test.metrics[column.key])}<StatusMark
								status={testMetricStatus(column.key, test.metrics[column.key])}
							/>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
```

- [ ] **Step 6: Create `src/routes/soiltests/components/SoilTestCard.svelte`**

```svelte
<script lang="ts">
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import type { MetricKey, SoilTest } from '$lib/soil-tests/schema';
	import { testMetricStatus } from '$lib/soil-tests/status';
	import { formatDate, formatNumber } from '$lib/soil-tests/utils';

	type Props = {
		test: SoilTest;
		editing: boolean;
		selected: boolean;
		ontoggle: (id: number, checked: boolean) => void;
	};

	let { test, editing, selected, ontoggle }: Props = $props();

	const headline = $derived(
		(
			[
				{ key: 'ph_water', label: 'pH', value: test.metrics.ph_water },
				{ key: 'P', label: 'Phosphorus', value: test.metrics.P },
				{ key: 'K', label: 'Potassium', value: test.metrics.K },
				{ key: 'OM', label: 'Organic matter', value: test.organicMatter }
			] as { key: MetricKey | 'OM'; label: string; value: number | undefined }[]
		).map((metric) => ({ ...metric, status: testMetricStatus(metric.key, metric.value) }))
	);
	const rest = $derived(
		(
			[
				{ key: 'Ca', label: 'Calcium' },
				{ key: 'Mg', label: 'Magnesium' },
				{ key: 'S', label: 'Sulphur' },
				{ key: 'Na', label: 'Sodium' }
			] as { key: MetricKey; label: string }[]
		).map((metric) => ({
			...metric,
			value: test.metrics[metric.key],
			status: testMetricStatus(metric.key, test.metrics[metric.key])
		}))
	);
	const showsStatus = (status: string) =>
		status === 'low' || status === 'optimal' || status === 'high';
</script>

<article
	class={[
		'rounded-xl border bg-panel p-4',
		selected ? 'border-danger/60 bg-danger/10' : 'border-border'
	]}
>
	<header class="flex items-start gap-3">
		{#if editing}
			<input
				type="checkbox"
				class="mt-1 size-5 accent-danger"
				checked={selected}
				onchange={(event) => ontoggle(test.id, event.currentTarget.checked)}
				aria-label="Select {test.sampleName ?? 'test'} from {formatDate(test.sampleDate)}"
			/>
		{/if}
		<div class="min-w-0 flex-1">
			<h2 class="text-lg font-semibold">{test.paddockName}</h2>
			<p class="text-sm text-muted">
				{test.sampleName ?? 'Unnamed sample'}, {formatDate(test.sampleDate)}
			</p>
		</div>
	</header>

	<dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
		{#each headline as metric (metric.key)}
			<div>
				<dt class="text-xs text-muted">{metric.label}</dt>
				<dd class="flex flex-wrap items-center gap-x-2">
					<span class="text-base tabular-nums">{formatNumber(metric.value)}</span>
					{#if showsStatus(metric.status)}<StatusBadge status={metric.status} />{/if}
				</dd>
			</div>
		{/each}
	</dl>

	<details class="mt-3">
		<summary class="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-accent">
			All results
		</summary>
		<dl class="grid grid-cols-2 gap-x-4 gap-y-3 pt-2">
			{#each rest as metric (metric.key)}
				<div>
					<dt class="text-xs text-muted">{metric.label}</dt>
					<dd class="flex flex-wrap items-center gap-x-2">
						<span class="tabular-nums">{formatNumber(metric.value)}</span>
						{#if showsStatus(metric.status)}<StatusBadge status={metric.status} />{/if}
					</dd>
				</div>
			{/each}
			<div>
				<dt class="text-xs text-muted">Field ID</dt>
				<dd>{test.fieldId}</dd>
			</div>
			<div>
				<dt class="text-xs text-muted">Sample ID</dt>
				<dd>{test.sampleId}</dd>
			</div>
			<div>
				<dt class="text-xs text-muted">Farm</dt>
				<dd>{test.farm ?? '-'}</dd>
			</div>
			<div>
				<dt class="text-xs text-muted">Client</dt>
				<dd>{test.client ?? '-'}</dd>
			</div>
		</dl>
	</details>
</article>
```

(`showsStatus` receives a `MetricStatus`; if `svelte-check` wants the narrower type, type its parameter as `MetricStatus` imported from `$lib/soil-status`.)

- [ ] **Step 7: Create `BulkDeleteBar.svelte` and `Toasts.svelte`**

`src/routes/soiltests/components/BulkDeleteBar.svelte`:

```svelte
<script lang="ts">
	type Props = { count: number; ondelete: () => void; ondone: () => void };

	let { count, ondelete, ondone }: Props = $props();
</script>

<div
	class="flex flex-wrap items-center gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-2"
	role="region"
	aria-label="Delete tests"
>
	<p class="flex-1 text-sm" aria-live="polite">
		{count === 0
			? 'Select the tests to delete.'
			: `${count} test${count === 1 ? '' : 's'} selected`}
	</p>
	<button
		type="button"
		onclick={ondone}
		class="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm text-text hover:bg-white/5"
	>
		Done
	</button>
	<button
		type="button"
		onclick={ondelete}
		disabled={count === 0}
		class="inline-flex min-h-11 items-center rounded-lg border border-danger/60 bg-danger/20 px-4 text-sm font-semibold text-text hover:bg-danger/30 disabled:opacity-40"
	>
		Delete {count > 0 ? count : ''}
	</button>
</div>
```

`src/routes/soiltests/components/Toasts.svelte`:

```svelte
<script lang="ts">
	import type { Toaster } from '../toasts.svelte';

	type Props = { toaster: Toaster };

	let { toaster }: Props = $props();

	const tone = {
		success: 'border-accent/50 bg-panel text-text',
		warning: 'border-warn/60 bg-panel text-text',
		error: 'border-danger/60 bg-panel text-text'
	};
</script>

<div
	class="pointer-events-none fixed inset-x-4 top-4 z-[2100] flex flex-col items-end gap-2 md:top-[calc(var(--shell-top)+1rem)]"
	aria-live="polite"
>
	{#each toaster.items as toast (toast.id)}
		<div
			role={toast.variant === 'error' ? 'alert' : 'status'}
			class={[
				'pointer-events-auto flex max-w-sm items-center gap-2 rounded-lg border py-1 pr-1 pl-4 text-sm shadow-lg',
				tone[toast.variant]
			]}
		>
			<span class="flex-1">{toast.message}</span>
			<button
				type="button"
				onclick={() => toaster.dismiss(toast.id)}
				aria-label="Dismiss"
				class="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:text-text"
			>
				<svg
					viewBox="0 0 24 24"
					class="size-4"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" />
				</svg>
			</button>
		</div>
	{/each}
</div>
```

Run the autofixer on every new component, then `npm run check`. Expected: clean. (The table and card are exercised by the page test in Task 8.)

- [ ] **Step 8: Commit**

```bash
git add src/routes/soiltests/components
git commit -m "Add soil test list components: toolbar, table, cards, pagination and toasts"
```

---

