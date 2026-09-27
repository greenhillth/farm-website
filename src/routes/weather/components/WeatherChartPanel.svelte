<script lang="ts">
	import { fetchWeatherSeries, type WeatherHistoryRow } from '$lib/weather';
	import {
		CHARTS,
		CHART_METRICS,
		TIMESPANS,
		buildSeries,
		wellFilled,
		type Timespan
	} from '../chart';
	import WeatherChart from './WeatherChart.svelte';

	type Props = {
		/** Raw readings for the last 24 hours, from the page load. */
		history: WeatherHistoryRow[];
		/** The load's window in Unix seconds; its end anchors every timespan. */
		range: { to: number };
		/** The metric shown first. */
		metric?: string;
		/** The metrics offered; with only one, the selector is hidden. */
		metrics?: readonly { key: string; label: string }[];
	};

	let { history, range, metric = 'outdoor', metrics = CHART_METRICS }: Props = $props();

	// Only the initial value comes from the prop; the selector owns it afterwards.
	// svelte-ignore state_referenced_locally
	let selected = $state(metric);
	let span = $state<Timespan>(TIMESPANS[0]);
	let loading = $state(false);
	let failed = $state(false);
	// Longer spans come from /api/weather/series; each is fetched once per page view.
	let fetched = $state<Record<string, { rows: WeatherHistoryRow[]; gapMs: number }>>({});
	let request = 0;

	const spec = $derived(CHARTS[selected]);
	const label = $derived(metrics.find((m) => m.key === selected)?.label ?? selected);
	const from = $derived((range.to - span.seconds) * 1000);
	const to = $derived(range.to * 1000);
	const source = $derived(
		span.key === '24h' ? { rows: history, gapMs: 10 * 60_000 } : fetched[span.key]
	);
	const series = $derived(spec && source ? buildSeries(source.rows, spec) : []);

	async function choose(next: Timespan) {
		span = next;
		failed = false;
		if (next.key === '24h' || fetched[next.key]) return;
		const id = ++request;
		loading = true;
		try {
			const result = await fetchWeatherSeries(
				range.to - next.seconds,
				range.to,
				fetch,
				next.points
			);
			// Readings further apart than three buckets are a gap in the data.
			fetched[next.key] = { rows: wellFilled(result.rows), gapMs: 3 * result.bucketSec * 1000 };
		} catch {
			if (id === request) failed = true;
		} finally {
			if (id === request) loading = false;
		}
	}
</script>

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-3">
		{#if metrics.length > 1}
			<label class="flex items-center gap-2 text-sm">
				<span class="text-muted">Show</span>
				<select
					bind:value={selected}
					class="min-h-11 rounded-lg border border-border bg-panel px-3 text-text"
				>
					{#each metrics as option (option.key)}
						<option value={option.key}>{option.label}</option>
					{/each}
				</select>
			</label>
		{/if}
		<div role="group" aria-label="Timespan" class="flex flex-wrap gap-1">
			{#each TIMESPANS as option (option.key)}
				<button
					type="button"
					aria-pressed={span.key === option.key}
					onclick={() => void choose(option)}
					class={[
						'min-h-11 rounded-lg border px-3 text-sm',
						span.key === option.key
							? 'border-accent bg-accent/10 font-semibold text-accent'
							: 'border-border text-muted hover:text-text'
					]}
				>
					{option.label}
				</button>
			{/each}
		</div>
	</div>

	{#if !spec}
		<p class="text-muted">There's no chart for {label.toLowerCase()} yet.</p>
	{:else if failed}
		<p class="text-warn" role="alert">Couldn't load readings for the last {span.label}.</p>
	{:else if loading || !source}
		<p class="text-muted" aria-live="polite">Loading the last {span.label}…</p>
	{:else}
		<WeatherChart
			title="{label}, last {span.label}"
			{series}
			unit={spec.unit}
			{from}
			{to}
			period="the last {span.label}"
			gapMs={source.gapMs}
		/>
	{/if}
</div>
