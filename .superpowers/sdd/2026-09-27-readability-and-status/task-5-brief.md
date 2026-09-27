### Task 5: Charts from real history

**Files:**

- Create: `src/routes/weather/chart.ts`
- Create: `src/routes/weather/chart.test.ts`
- Create: `src/routes/weather/components/WeatherChart.svelte`
- Create: `src/routes/weather/components/WeatherChart.svelte.test.ts`

**Interfaces:**

- Consumes: `WeatherHistoryRow`, `dewPointC` from `$lib/weather`.
- Produces (`chart.ts`):
  - `type ChartPoint = { t: number; v: number }` (`t` in ms), `type ChartSeries = { label: string; colour: string; points: ChartPoint[] }`
  - `type ChartSpec = { unit: string; series: { label: string; colour: string; value: (row: WeatherHistoryRow) => number | null | undefined }[] }`
  - `CHARTS: Partial<Record<string, ChartSpec>>` keyed by metric (`outdoor`, `wind`, `rain`, `pressure`, `solar`)
  - `parseUtcMs(value: string): number | null`
  - `buildSeries(history: readonly WeatherHistoryRow[], spec: ChartSpec): ChartSeries[]` (sorted by time; skips missing values and bad timestamps)
  - `hourTicks(from: number, to: number, every?: number): number[]` (local hours divisible by `every`, default 6)
  - `hourlyRows(series: ChartSeries[]): { t: number; values: (number | null)[] }[]` (last value per local hour, for the screen-reader table)
  - `extremes(points: ChartPoint[]): { high: number; low: number } | null`
- Produces: `WeatherChart` props `{ title: string; series: ChartSeries[]; unit: string; from: number; to: number }` (`from`/`to` in ms).

- [ ] **Step 1: Write the failing tests**

Create `src/routes/weather/chart.test.ts` (runs with `TZ=Australia/Melbourne`):

```ts
import { describe, expect, it } from 'vitest';

import { CHARTS, buildSeries, extremes, hourTicks, hourlyRows, parseUtcMs } from './chart';

const rows = [
	{
		timestamp_utc: '2026-09-26 02:00:00',
		temp_c: 12,
		humidity_pct: 80,
		wind_avg_ms: 5,
		wind_gust_ms: 8
	},
	{
		timestamp_utc: '2026-09-26 01:00:00',
		temp_c: 10,
		humidity_pct: 90,
		wind_avg_ms: null,
		wind_gust_ms: 6
	},
	{ timestamp_utc: 'not a time', temp_c: 99 }
];

describe('parseUtcMs', () => {
	it('reads backend timestamps as UTC', () => {
		expect(parseUtcMs('2026-09-26 01:00:00')).toBe(Date.UTC(2026, 8, 26, 1));
		expect(parseUtcMs('2026-09-26T01:00:00+10:00')).toBe(Date.UTC(2026, 8, 25, 15));
		expect(parseUtcMs('nonsense')).toBeNull();
	});
});

describe('buildSeries', () => {
	it('charts temperature and dew point for outdoor, oldest first, skipping bad rows', () => {
		const [temp, dew] = buildSeries(rows, CHARTS.outdoor!);
		expect(temp.label).toBe('Temperature');
		expect(temp.points.map((p) => p.v)).toEqual([10, 12]);
		expect(dew.label).toBe('Dew point');
		expect(dew.points[0].v).toBeCloseTo(8.4, 1);
	});

	it('charts wind in km/h and leaves out missing readings', () => {
		const [average, gust] = buildSeries(rows, CHARTS.wind!);
		expect(CHARTS.wind!.unit).toBe('km/h');
		expect(average.points.map((p) => p.v)).toEqual([18]);
		expect(gust.points.map((p) => Math.round(p.v))).toEqual([22, 29]);
	});
});

describe('hourTicks', () => {
	it('marks every 6 hours on the local clock', () => {
		const from = new Date(2026, 8, 26, 1, 30).getTime();
		const ticks = hourTicks(from, from + 24 * 3600_000);
		expect(ticks.map((t) => new Date(t).getHours())).toEqual([6, 12, 18, 0]);
	});
});

describe('hourlyRows', () => {
	it('keeps the last value per hour for each series', () => {
		const hour = new Date(2026, 8, 26, 9).getTime();
		const series = [
			{
				label: 'A',
				colour: '',
				points: [
					{ t: hour + 60_000, v: 1 },
					{ t: hour + 120_000, v: 2 }
				]
			},
			{ label: 'B', colour: '', points: [{ t: hour + 3600_000, v: 5 }] }
		];
		expect(hourlyRows(series)).toEqual([
			{ t: hour, values: [2, null] },
			{ t: hour + 3600_000, values: [null, 5] }
		]);
	});
});

describe('extremes', () => {
	it('finds the high and low, or null without points', () => {
		expect(
			extremes([
				{ t: 0, v: 3 },
				{ t: 1, v: -1 },
				{ t: 2, v: 7 }
			])
		).toEqual({ high: 7, low: -1 });
		expect(extremes([])).toBeNull();
	});
});
```

Create `src/routes/weather/components/WeatherChart.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import WeatherChart from './WeatherChart.svelte';

const from = new Date(2026, 8, 26, 0).getTime();
const to = from + 24 * 3600_000;
const series = [
	{
		label: 'Temperature',
		colour: '#facc15',
		points: [
			{ t: from + 3600_000, v: 10 },
			{ t: from + 7200_000, v: 12 }
		]
	}
];

describe('WeatherChart.svelte', () => {
	it('has a legend and an hourly table for screen readers', async () => {
		render(WeatherChart, { title: 'Outdoor, last 24 hours', series, unit: '°C', from, to });

		await expect.element(page.getByRole('img', { name: 'Outdoor, last 24 hours' })).toBeVisible();
		await expect.element(page.getByText('Temperature', { exact: true }).first()).toBeVisible();
		expect(page.getByRole('row').elements()).toHaveLength(3);
	});

	it('says so when there are no readings', async () => {
		render(WeatherChart, {
			title: 'Outdoor',
			series: [{ ...series[0], points: [] }],
			unit: '°C',
			from,
			to
		});

		await expect.element(page.getByText('No readings in the last 24 hours.')).toBeVisible();
		expect(page.getByRole('img').elements()).toHaveLength(0);
	});
});
```

Run: `npx vitest run --project server src/routes/weather/chart.test.ts && npx vitest run --project client src/routes/weather/components/WeatherChart.svelte.test.ts`
Expected: FAIL (the modules don't exist).

- [ ] **Step 2: Create `src/routes/weather/chart.ts`**

```ts
import { dewPointC, type WeatherHistoryRow } from '$lib/weather';

export type ChartPoint = { t: number; v: number };
export type ChartSeries = { label: string; colour: string; points: ChartPoint[] };
export type ChartSpec = {
	unit: string;
	series: {
		label: string;
		colour: string;
		value: (row: WeatherHistoryRow) => number | null | undefined;
	}[];
};

const HOUR = 3600_000;
const kmh = (ms: number | null | undefined) => (ms === null || ms === undefined ? null : ms * 3.6);

/** Series to chart for each weather detail page; metrics missing here have no history to chart. */
export const CHARTS: Partial<Record<string, ChartSpec>> = {
	outdoor: {
		unit: '°C',
		series: [
			{ label: 'Temperature', colour: '#facc15', value: (row) => row.temp_c },
			{
				label: 'Dew point',
				colour: 'rgb(var(--status-high))',
				value: (row) =>
					row.temp_c != null && row.humidity_pct != null && row.humidity_pct > 0
						? dewPointC(row.temp_c, row.humidity_pct)
						: null
			}
		]
	},
	wind: {
		unit: 'km/h',
		series: [
			{ label: 'Average', colour: 'rgb(var(--accent))', value: (row) => kmh(row.wind_avg_ms) },
			{ label: 'Gust', colour: 'rgb(var(--warn))', value: (row) => kmh(row.wind_gust_ms) }
		]
	},
	rain: {
		unit: 'mm',
		series: [
			{
				label: 'Rain in the past hour',
				colour: 'rgb(var(--status-high))',
				value: (row) => row.rain_1h_mm
			}
		]
	},
	pressure: {
		unit: 'hPa',
		series: [{ label: 'Pressure', colour: '#c4b5fd', value: (row) => row.pressure_hpa }]
	},
	solar: {
		unit: 'W/m²',
		series: [{ label: 'Solar', colour: '#facc15', value: (row) => row.solar_wm2 }]
	}
};

/** Backend timestamps are UTC, often without a zone ("2026-09-26 01:00:00"). */
export function parseUtcMs(value: string): number | null {
	const trimmed = value.trim();
	const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
	const iso = trimmed.replace(' ', 'T');
	const ms = new Date(hasZone ? iso : `${iso}Z`).getTime();
	return Number.isNaN(ms) ? null : ms;
}

export function buildSeries(history: readonly WeatherHistoryRow[], spec: ChartSpec): ChartSeries[] {
	const timed = history
		.map((row) => ({ row, t: parseUtcMs(String(row.timestamp_utc ?? '')) }))
		.filter((entry): entry is { row: WeatherHistoryRow; t: number } => entry.t !== null)
		.sort((a, b) => a.t - b.t);

	return spec.series.map(({ label, colour, value }) => ({
		label,
		colour,
		points: timed.flatMap(({ row, t }) => {
			const v = value(row);
			return typeof v === 'number' && Number.isFinite(v) ? [{ t, v }] : [];
		})
	}));
}

export function hourTicks(from: number, to: number, every = 6): number[] {
	const tick = new Date(from);
	tick.setMinutes(0, 0, 0);
	if (tick.getTime() < from) tick.setHours(tick.getHours() + 1);
	while (tick.getHours() % every !== 0) tick.setHours(tick.getHours() + 1);

	const ticks: number[] = [];
	while (tick.getTime() <= to) {
		ticks.push(tick.getTime());
		tick.setHours(tick.getHours() + every);
	}
	return ticks;
}

export function hourlyRows(series: ChartSeries[]): { t: number; values: (number | null)[] }[] {
	const rows = new Map<number, (number | null)[]>();
	series.forEach((line, index) => {
		for (const point of line.points) {
			const hour = new Date(point.t);
			hour.setMinutes(0, 0, 0);
			const key = hour.getTime();
			const values = rows.get(key) ?? series.map(() => null);
			values[index] = point.v;
			rows.set(key, values);
		}
	});
	return [...rows.entries()].sort(([a], [b]) => a - b).map(([t, values]) => ({ t, values }));
}

export function extremes(points: ChartPoint[]): { high: number; low: number } | null {
	if (points.length === 0) return null;
	const values = points.map((point) => point.v);
	return { high: Math.max(...values), low: Math.min(...values) };
}

export { HOUR };
```

- [ ] **Step 3: Create `src/routes/weather/components/WeatherChart.svelte`**

A taller viewBox below `md` so lines and labels stay readable at 390px; axis labels are 12px at phone width.

```svelte
<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';

	import { hourTicks, hourlyRows, type ChartSeries } from '../chart';

	type Props = { title: string; series: ChartSeries[]; unit: string; from: number; to: number };

	let { title, series, unit, from, to }: Props = $props();

	const wide = new MediaQuery('min-width: 48rem');
	const width = $derived(wide.current ? 800 : 360);
	const height = $derived(wide.current ? 260 : 300);
	const pad = { left: 40, right: 12, top: 12, bottom: 28 };

	const values = $derived(series.flatMap((line) => line.points.map((point) => point.v)));
	const min = $derived(values.length ? Math.floor(Math.min(...values)) : 0);
	const max = $derived(values.length ? Math.ceil(Math.max(...values)) : 1);
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
	<svg viewBox="0 0 {width} {height}" class="w-full" role="img" aria-label={title}>
		{#each [min, (min + max) / 2, max] as value (value)}
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
			<text x={x(tick)} y={height - 8} text-anchor="middle" font-size="12" fill="rgb(var(--muted))">
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
```

Run the autofixer, then both test files. Expected: PASS. (The unused `HOUR` re-export at the end of `chart.ts` can go if nothing imports it by the end of Task 7.)

- [ ] **Step 4: Commit**

```bash
git add src/routes/weather/chart.ts src/routes/weather/chart.test.ts src/routes/weather/components/WeatherChart.svelte src/routes/weather/components/WeatherChart.svelte.test.ts
git commit -m "Chart weather from the station's real 24-hour history"
```

---

