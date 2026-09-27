<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';

	import { hourlyRows, segments, tickFormat, timeTicks, type ChartSeries } from '../chart';

	type Props = {
		title: string;
		series: ChartSeries[];
		unit: string;
		from: number;
		to: number;
		/** Words after "No readings in", e.g. "the last 7 days". */
		period?: string;
		/** Readings further apart than this are drawn as a gap, not a line. */
		gapMs?: number;
	};

	let {
		title,
		series,
		unit,
		from,
		to,
		period = 'the last 24 hours',
		gapMs = 10 * 60_000
	}: Props = $props();

	const wide = new MediaQuery('min-width: 48rem');
	let measured = $state(0);
	const width = $derived(measured || 360);
	const height = $derived(wide.current ? 260 : 300);
	const pad = { left: 40, right: 12, top: 12, bottom: 28 };

	const values = $derived(series.flatMap((line) => line.points.map((point) => point.v)));
	const min = $derived(values.length ? Math.floor(Math.min(...values)) : 0);
	const max = $derived(Math.max(min + 1, values.length ? Math.ceil(Math.max(...values)) : 1));
	const span = $derived(max - min || 1);
	const long = $derived(to - from > 2 * 24 * 3600_000);
	// About one label per 56px, so month names don't run together on a phone.
	const ticks = $derived.by(() => {
		const all = timeTicks(from, to);
		const room = Math.max(2, Math.floor((width - pad.left - pad.right) / 56));
		const step = Math.ceil(all.length / room);
		return all.filter((_, i) => i % step === 0);
	});
	// A decimal place when the range is small, so 0 to 1 isn't labelled 0, 1, 1.
	const digits = $derived(span < 5 ? 1 : 0);
	const timeFormat = $derived(tickFormat(from, to));
	// Hourly rows for a day or two; past that each (already bucketed) point is a row.
	const rows = $derived(long ? hourlyRows(series, (t) => t) : hourlyRows(series));
	const rowFormat = $derived(
		long
			? new Intl.DateTimeFormat('en-AU', {
					day: 'numeric',
					month: 'short',
					year: 'numeric',
					hour: 'numeric'
				})
			: new Intl.DateTimeFormat('en-AU', { weekday: 'short', hour: 'numeric' })
	);

	const x = (t: number) => pad.left + ((t - from) / (to - from)) * (width - pad.left - pad.right);
	const y = (v: number) =>
		height - pad.bottom - ((v - min) / span) * (height - pad.top - pad.bottom);
</script>

{#if values.length === 0}
	<p class="text-muted">No readings in {period}.</p>
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
					{value.toFixed(digits)}
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
				{#each segments(line.points, gapMs) as segment, i (i)}
					{#if segment.length === 1}
						<circle cx={x(segment[0].t)} cy={y(segment[0].v)} r="1.5" fill={line.colour} />
					{:else}
						<polyline
							fill="none"
							stroke={line.colour}
							stroke-width="2"
							stroke-linejoin="round"
							points={segment.map((point) => `${x(point.t)},${y(point.v)}`).join(' ')}
						/>
					{/if}
				{/each}
			{/each}
		</svg>
	</div>
	<table class="sr-only">
		<caption>{title}, {long ? 'averaged' : 'hourly'}, in {unit}</caption>
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
