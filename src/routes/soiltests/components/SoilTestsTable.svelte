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
