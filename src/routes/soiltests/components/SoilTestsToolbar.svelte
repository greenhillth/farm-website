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
