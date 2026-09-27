### Task 7: Weather detail page on runes

**Files:**

- Modify: `src/routes/weather/[metric]/+page.svelte` (rewrite)
- Create: `src/routes/weather/[metric]/metric-page.svelte.test.ts`

**Interfaces:**

- Consumes: `CHARTS`, `buildSeries`, `extremes`, `parseUtcMs` (Task 5); `WeatherChart`, `OfflineBanner`.

- [ ] **Step 1: Write the failing test**

Create `src/routes/weather/[metric]/metric-page.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import {
	ALWAYS_SAMPLE_FIELDS,
	WEATHER_FIELDS,
	getMockWeather,
	type WeatherField
} from '$lib/weather';
import MetricPage from './+page.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

const to = Math.floor(Date.UTC(2026, 8, 26, 12) / 1000);
const range = { from: to - 86400, to };
const history = [
	{ timestamp_utc: '2026-09-26 02:00:00', temp_c: 12, wind_avg_ms: 5, wind_gust_ms: 8 },
	{ timestamp_utc: '2026-09-26 03:00:00', temp_c: 14, wind_avg_ms: 2, wind_gust_ms: 4 }
];

function open(metric: string, source: 'ecowitt' | 'mock' = 'ecowitt') {
	const mockFields: WeatherField[] =
		source === 'mock' ? [...WEATHER_FIELDS] : [...ALWAYS_SAMPLE_FIELDS];
	const data = {
		metric,
		w: getMockWeather(),
		connected: source === 'ecowitt',
		source,
		mockFields,
		history,
		range
	};
	render(MetricPage, { data, params: { metric } } as never);
}

describe('weather detail page', () => {
	it('shows wind highs and lows in km/h, not temperature', async () => {
		open('wind');

		await expect.element(page.getByRole('heading', { level: 1, name: 'Wind' })).toBeVisible();
		await expect.element(page.getByText('Average: highest 18 km/h, lowest 7 km/h')).toBeVisible();
		expect(page.getByText(/°C/).elements()).toHaveLength(0);
	});

	it('says when the station doesn’t report a metric instead of charting sample data', async () => {
		open('indoor');

		await expect
			.element(
				page.getByText('The station doesn’t report indoor readings, so there’s nothing to chart.')
			)
			.toBeVisible();
		expect(page.getByRole('img').elements()).toHaveLength(0);
	});

	it('shows the offline banner on sample data', async () => {
		open('outdoor', 'mock');

		await expect.element(page.getByText('Weather station offline.')).toBeVisible();
	});

	it('lists the recent readings', async () => {
		open('outdoor');

		await expect.element(page.getByRole('heading', { name: 'Recent readings' })).toBeVisible();
		expect(
			page.getByRole('table', { name: 'Recent readings' }).getByRole('row').elements()
		).toHaveLength(3);
	});
});
```

Run: `npx vitest run --project client "src/routes/weather/[metric]/metric-page.svelte.test.ts"`
Expected: FAIL.

- [ ] **Step 2: Rewrite `src/routes/weather/[metric]/+page.svelte`**

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { WeatherHistoryRow } from '$lib/weather';
	import { CHARTS, buildSeries, extremes, parseUtcMs } from '../chart';
	import OfflineBanner from '../components/OfflineBanner.svelte';
	import WeatherChart from '../components/WeatherChart.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const TITLES: Record<string, string> = {
		outdoor: 'Outdoor',
		indoor: 'Indoor',
		solar: 'Solar and UVI',
		rain: 'Rainfall',
		wind: 'Wind',
		pressure: 'Pressure',
		battery: 'Battery'
	};
	const FIELDS: Record<string, (keyof WeatherHistoryRow)[]> = {
		outdoor: ['temp_c', 'humidity_pct'],
		solar: ['solar_wm2'],
		rain: ['rain_1h_mm', 'rain_24h_mm'],
		wind: ['wind_avg_ms', 'wind_gust_ms', 'wind_dir_deg'],
		pressure: ['pressure_hpa']
	};
	const HEADINGS: Partial<Record<keyof WeatherHistoryRow, string>> = {
		timestamp_utc: 'Time',
		temp_c: 'Temperature (°C)',
		humidity_pct: 'Humidity (%)',
		solar_wm2: 'Solar (W/m²)',
		rain_1h_mm: 'Rain, past hour (mm)',
		rain_24h_mm: 'Rain, past day (mm)',
		wind_avg_ms: 'Wind (m/s)',
		wind_gust_ms: 'Gust (m/s)',
		wind_dir_deg: 'Direction (°)',
		pressure_hpa: 'Pressure (hPa)'
	};

	const title = $derived(TITLES[data.metric] ?? data.metric);
	const spec = $derived(CHARTS[data.metric]);
	const series = $derived(spec ? buildSeries(data.history, spec) : []);
	const summaries = $derived(
		series.flatMap((line) => {
			const range = extremes(line.points);
			return range ? [{ label: line.label, ...range }] : [];
		})
	);
	const columns = $derived<(keyof WeatherHistoryRow)[]>([
		'timestamp_utc',
		...(FIELDS[data.metric] ?? [])
	]);
	const rows = $derived(
		[...data.history].sort(
			(a, b) => (parseUtcMs(b.timestamp_utc) ?? 0) - (parseUtcMs(a.timestamp_utc) ?? 0)
		)
	);
	const hours = $derived(Math.max(1, Math.round((data.range.to - data.range.from) / 3600)));
	const timeFormat = new Intl.DateTimeFormat('en-AU', {
		weekday: 'short',
		hour: 'numeric',
		minute: '2-digit'
	});

	function cell(row: WeatherHistoryRow, key: keyof WeatherHistoryRow) {
		const raw = row[key];
		if (raw === null || raw === undefined) return '-';
		if (key === 'timestamp_utc') {
			const ms = parseUtcMs(String(raw));
			return ms === null ? String(raw) : timeFormat.format(ms);
		}
		return typeof raw === 'number'
			? Number.isInteger(raw)
				? String(raw)
				: raw.toFixed(1)
			: String(raw);
	}
</script>

<svelte:head>
	<title>{title} weather</title>
</svelte:head>

<div class="mx-auto max-w-6xl space-y-5 px-4 pb-8">
	<a
		href={resolve('/weather')}
		class="inline-flex min-h-11 items-center gap-2 pt-4 text-sm text-muted hover:text-text"
	>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="size-5" aria-hidden="true">
			<path
				d="M10.5 6 4.5 12l6 6M4.5 12h15"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		All weather
	</a>

	<h1 class="text-xl font-semibold">{title}</h1>

	<OfflineBanner source={data.source} />

	{#if spec}
		<section class="space-y-2">
			{#each summaries as summary (summary.label)}
				<p class="text-lg">
					{summary.label}: highest {Math.round(summary.high)}
					{spec.unit}, lowest {Math.round(summary.low)}
					{spec.unit}
				</p>
			{/each}
			<WeatherChart
				title="{title}, last {hours} hours"
				{series}
				unit={spec.unit}
				from={data.range.from * 1000}
				to={data.range.to * 1000}
			/>
		</section>
	{:else}
		<p class="text-muted">
			The station doesn’t report {title.toLowerCase()} readings, so there’s nothing to chart.
		</p>
	{/if}

	<section class="space-y-2">
		<h2 class="text-lg font-semibold">Recent readings</h2>
		<p class="text-sm text-muted">The last {hours} hours, newest first.</p>
		{#if rows.length}
			<div class="max-h-[60vh] overflow-auto rounded-xl border border-border">
				<table class="min-w-full text-left text-sm" aria-label="Recent readings">
					<thead class="sticky top-0 bg-panel">
						<tr>
							{#each columns as column (column)}
								<th class="px-3 py-2 font-semibold">{HEADINGS[column] ?? column}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each rows as row (row.timestamp_utc)}
							<tr class="border-t border-border/60">
								{#each columns as column (column)}
									<td class="px-3 py-2 tabular-nums">{cell(row, column)}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-muted">No readings in the last {hours} hours.</p>
		{/if}
	</section>
</div>
```

Run the autofixer until clean, then the test. Expected: PASS. (The test's "no °C" check passes because the wind page's table headings are in m/s and the summaries in km/h.)

- [ ] **Step 3: Commit**

```bash
git add "src/routes/weather/[metric]/+page.svelte" "src/routes/weather/[metric]/metric-page.svelte.test.ts"
git commit -m "Rebuild the weather detail page with per-metric charts from real history"
```

---

