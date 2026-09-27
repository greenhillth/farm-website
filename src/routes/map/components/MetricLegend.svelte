<script lang="ts">
	import { fromAction } from 'svelte/attachments';

	import type { MetricOption } from '$lib/config';
	import {
		VIRIDIS_GRADIENT,
		formatFieldList,
		formatLegendTick,
		formatPercent,
		keepTooltipInView,
		type LegendDetails,
		type LegendPercents,
		type MetricStats
	} from '../helpers';

	type Props = {
		metric: MetricOption;
		stats: MetricStats | null;
		percents: LegendPercents;
		details: LegendDetails;
		colouredCount: number;
		scaleReady: boolean;
		loading: boolean;
		error: string | null;
		onretry: () => void;
		compact?: boolean;
	};

	let {
		metric,
		stats,
		percents,
		details,
		colouredCount,
		scaleReady,
		loading,
		error,
		onretry,
		compact = false
	}: Props = $props();

	let expanded = $state(false);
	const panelId = $props.id();

	const unit = $derived(metric.unit ? ` ${metric.unit}` : '');
	const cmin = $derived(typeof metric.c_min === 'number' ? metric.c_min : null);
	const cmax = $derived(typeof metric.c_max === 'number' ? metric.c_max : null);
	const within = $derived(details.opt.within);
	const tooltipInView = fromAction(keepTooltipInView);
</script>

{#snippet bar(height: string)}
	<div class={['relative w-full rounded-full', height]}>
		<div
			class="pointer-events-none absolute inset-0 rounded-full"
			style:background={VIRIDIS_GRADIENT}
		></div>
		{#if percents.showOpt}
			<div
				class="pointer-events-none absolute inset-y-0 rounded-full bg-white/35 ring-1 ring-white/70"
				style:left="{percents.optLoPct}%"
				style:width="{percents.optWidth}%"
			></div>
		{/if}
	</div>
{/snippet}

{#snippet status()}
	{#if metric.id === 'none'}
		<p>Choose a soil metric to colour paddocks by their latest test.</p>
	{:else if loading}
		<p>Loading the latest soil test results…</p>
	{:else if error}
		<p class="text-danger">{error}</p>
		<button
			type="button"
			onclick={onretry}
			class="mt-2 inline-flex min-h-11 items-center rounded-lg border border-danger/40 bg-danger/10 px-4 text-sm text-text hover:bg-danger/20"
		>
			Retry
		</button>
	{:else if !scaleReady}
		<p>There's no colour scale for {metric.label} yet.</p>
	{:else if !stats}
		<p>No paddocks have recent samples for {metric.label} yet.</p>
	{/if}
{/snippet}

{#if compact}
	<div
		class="rounded-xl border border-border bg-panel/95 text-xs text-muted shadow-lg backdrop-blur"
	>
		{#if stats && scaleReady && !error && !loading}
			<button
				type="button"
				aria-expanded={expanded}
				aria-controls={panelId}
				onclick={() => (expanded = !expanded)}
				class="flex min-h-11 w-full flex-col gap-1.5 px-3 py-2 text-left"
			>
				{@render bar('h-2')}
				<span class="flex w-full justify-between gap-2">
					<span>{formatLegendTick(cmin)}</span>
					<span class="text-text">
						{within.count} of {within.total} in optimal range
					</span>
					<span>{formatLegendTick(cmax)}</span>
				</span>
			</button>
			{#if expanded}
				<ul id={panelId} class="space-y-1 border-t border-border px-3 py-2 text-sm">
					{#if details.opt.range}
						<li>
							Optimal {formatLegendTick(details.opt.range[0])} to {formatLegendTick(
								details.opt.range[1]
							)}{unit}
						</li>
					{/if}
					<li>
						Lowest {formatLegendTick(details.min.value)}{unit}: {formatFieldList(
							details.min.fields
						)}
					</li>
					<li>
						Highest {formatLegendTick(details.max.value)}{unit}: {formatFieldList(
							details.max.fields
						)}
					</li>
					<li>Median {formatLegendTick(stats.median)}{unit}</li>
				</ul>
			{/if}
		{:else}
			<div class="px-3 py-2 text-sm">{@render status()}</div>
		{/if}
	</div>
{:else}
	<div class="space-y-2 text-xs text-muted">
		{#if stats && scaleReady && !error && !loading && metric.id !== 'none'}
			<p class="text-sm">
				Colouring {colouredCount} paddock{colouredCount === 1 ? '' : 's'} using {metric.label}.
			</p>
			<div class="space-y-2 rounded-lg border border-border bg-white/5 p-3">
				<p class="font-semibold text-text">Scale{metric.unit ? ` (${metric.unit})` : ''}</p>
				<div class="relative">
					{@render bar('h-2.5')}
					{#if percents.showOpt}
						<button
							type="button"
							class="group absolute -inset-y-2 cursor-default focus-visible:outline-2 focus-visible:outline-accent"
							style:left="{percents.optLoPct}%"
							style:width="{percents.optWidth}%"
							aria-label={`Optimal range ${formatLegendTick(details.opt.range?.[0])}${unit} to ${formatLegendTick(details.opt.range?.[1])}${unit}`}
						>
							<span
								{@attach tooltipInView}
								role="tooltip"
								class="pointer-events-none absolute -top-20 left-1/2 hidden w-60 -translate-x-1/2 rounded-lg bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-xl group-hover:block group-focus-visible:block"
							>
								Optimal {formatLegendTick(details.opt.range?.[0])}{unit} to {formatLegendTick(
									details.opt.range?.[1]
								)}{unit}
							</span>
						</button>
					{/if}
					{#each [{ label: 'Lowest', pct: percents.lowPct, value: details.min.value, fields: details.min.fields }, { label: 'Highest', pct: percents.highPct, value: details.max.value, fields: details.max.fields }] as marker (marker.label)}
						<button
							type="button"
							class="group absolute -top-3 flex h-8 w-8 -translate-x-1/2 cursor-default items-end justify-center focus-visible:outline-2 focus-visible:outline-accent"
							style:left="{marker.pct}%"
							aria-label={`${marker.label} value ${formatLegendTick(marker.value)}${unit}`}
						>
							<span class="pointer-events-none h-full w-1.5 rounded-full bg-white/85"></span>
							<span
								{@attach tooltipInView}
								role="tooltip"
								class="pointer-events-none absolute -top-20 left-1/2 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-xl group-hover:block group-focus-visible:block"
							>
								{marker.label}
								{formatLegendTick(marker.value)}{unit}: {formatFieldList(marker.fields)}
							</span>
						</button>
					{/each}
				</div>
				<div class="flex justify-between">
					<span>{formatLegendTick(cmin)}</span>
					<span>Median {formatLegendTick(stats.median)}{unit}</span>
					<span>{formatLegendTick(cmax)}</span>
				</div>
				{#if details.opt.range}
					<p class="text-accent">
						{within.count} of {within.total} paddocks in the optimal range ({formatPercent(
							within.pct
						)})
					</p>
				{/if}
			</div>
		{:else}
			<div class="text-sm">{@render status()}</div>
		{/if}
	</div>
{/if}
