<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';

	import { hourTicks, hourlyRows, type ChartSeries } from '../chart';

	type Props = { title: string; series: ChartSeries[]; unit: string; from: number; to: number };

	let { title, series, unit, from, to }: Props = $props();

	const wide = new MediaQuery('min-width: 48rem');
	let measured = $state(0);
	const width = $derived(measured || 360);
	const height = $derived(wide.current ? 260 : 300);
	const pad = { left: 40, right: 12, top: 12, bottom: 28 };

	const values = $derived(series.flatMap((line) => line.points.map((point) => point.v)));
	const min = $derived(values.length ? Math.floor(Math.min(...values)) : 0);
	const max = $derived(Math.max(min + 1, values.length ? Math.ceil(Math.max(...values)) : 1));
	const span = $derived(max - min || 1);
	const ticks = $derived(hourTicks(from, to));
	const rows = $derived(hourlyRows(series));
	const timeFormat = new Intl.DateTimeFormat('en-AU', { hour: 'numeric' });
	const rowFormat = new Intl.DateTimeFormat('en-AU', { weekday: 'short', hour: 'numeric' });

	const x = (t: number) => pad.left + ((t - from) / (to - from)) * (width - pad.left - pad.right);
	const y = (v: number) =>
		height - pad.bottom - ((v - min) / span) * (height - pad.top - pad.bottom);
</script>

{#if values.length === 0}
	<p class="text-muted">No readings in the last 24 hours.</p>
{:else}
	<ul class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
		{#each series as line (line.label)}
			<li class="flex items-center gap-2">
				<span class="h-1 w-5 rounded-full" style:background={line.colour} aria-hidden="true"></span>
				{line.label}
			</li>
		{/each}
	</ul>
	<div bind:clientWidth={measured}>
		<svg viewBox="0 0 {width} {height}" {height} class="block w-full" role="img" aria-label={title}>
			{#each [min, (min + max) / 2, max] as value, i (i)}
				<line
					x1={pad.left}
					x2={width - pad.right}
					y1={y(value)}
					y2={y(value)}
					stroke="rgb(var(--border))"
				/>
				<text
					x={pad.left - 6}
					y={y(value) + 4}
					text-anchor="end"
					font-size="12"
					fill="rgb(var(--muted))"
				>
					{Math.round(value)}
				</text>
			{/each}
			{#each ticks as tick (tick)}
				<text
					x={x(tick)}
					y={height - 8}
					text-anchor="middle"
					font-size="12"
					fill="rgb(var(--muted))"
				>
					{timeFormat.format(tick)}
				</text>
			{/each}
			{#each series as line (line.label)}
				<polyline
					fill="none"
					stroke={line.colour}
					stroke-width="2"
					stroke-linejoin="round"
					points={line.points.map((point) => `${x(point.t)},${y(point.v)}`).join(' ')}
				/>
			{/each}
		</svg>
	</div>
	<table class="sr-only">
		<caption>{title}, hourly, in {unit}</caption>
		<thead>
			<tr>
				<th scope="col">Time</th>
				{#each series as line (line.label)}
					<th scope="col">{line.label}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.t)}
				<tr>
					<th scope="row">{rowFormat.format(row.t)}</th>
					{#each row.values as value, index (index)}
						<td>{value === null ? '-' : value.toFixed(1)}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
