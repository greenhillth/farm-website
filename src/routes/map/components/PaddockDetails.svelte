<script lang="ts">
	import { resolve } from '$app/paths';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { formatSampleDate } from '../helpers';
	import type { SoilRow } from '../soil-status';

	type Props = {
		fieldId: number;
		areaHa: number | null;
		sampleDate: string | null;
		sampleName: string | null;
		rows: SoilRow[];
		hasSample: boolean;
		soilLoading: boolean;
		soilError: string | null;
		onretry: () => void;
	};

	let {
		fieldId,
		areaHa,
		sampleDate,
		sampleName,
		rows,
		hasSample,
		soilLoading,
		soilError,
		onretry
	}: Props = $props();

	const areaFormatter = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 });
	const latest = $derived(
		sampleDate
			? `${formatSampleDate(sampleDate)}${sampleName ? ` (${sampleName})` : ''}`
			: (sampleName ?? '-')
	);
</script>

<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
	<dt class="text-muted">Area</dt>
	<dd>{areaHa === null ? '-' : `${areaFormatter.format(areaHa)} ha`}</dd>
	{#if hasSample}
		<dt class="text-muted">Latest sample</dt>
		<dd>{latest}</dd>
	{/if}
</dl>

<div class="mt-4">
	{#if soilError}
		<p class="font-semibold">Soil data unavailable</p>
		<p class="text-sm text-muted">Check the connection and try again.</p>
		<button
			type="button"
			onclick={onretry}
			class="mt-2 inline-flex min-h-11 items-center rounded-lg border border-border bg-white/5 px-4 text-sm hover:bg-white/10"
		>
			Retry
		</button>
	{:else if soilLoading}
		<p class="text-sm text-muted">Loading soil results…</p>
	{:else if !hasSample}
		<p class="text-sm text-muted">No soil tests for this paddock yet.</p>
	{:else}
		<ul class="divide-y divide-border">
			{#each rows as row (row.id)}
				<li class="flex min-h-12 items-center justify-between gap-3">
					<span>{row.label}</span>
					<span class="flex items-center gap-3">
						<span class="tabular-nums">{row.valueText}</span>
						<StatusBadge status={row.status} />
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<a
	href={`${resolve('/soiltests')}?paddock=${fieldId}`}
	class="mt-4 inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline"
>
	See soil tests
</a>
