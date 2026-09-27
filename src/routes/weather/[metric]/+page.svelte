<script lang="ts">
	import { resolve } from '$app/paths';
	import type { WeatherHistoryRow } from '$lib/weather';
	import { CHARTS, buildSeries, extremes, parseUtcMs } from '../chart';
	import OfflineBanner from '../components/OfflineBanner.svelte';
	import WeatherChartPanel from '../components/WeatherChartPanel.svelte';
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
		rain: ['rain_1h_mm', 'rain_24h_mm', 'rain_daily_mm'],
		indoor: ['indoor_temp_c', 'indoor_humidity_pct'],
		wind: ['wind_avg_ms', 'wind_gust_ms', 'wind_dir_deg'],
		pressure: ['pressure_hpa']
	};
	const HEADINGS: Partial<Record<keyof WeatherHistoryRow, string>> = {
		timestamp_utc: 'Time',
		temp_c: 'Temperature (°C)',
		humidity_pct: 'Humidity (%)',
		solar_wm2: 'Solar (W/m²)',
		rain_1h_mm: 'Rain, past hour (mm)',
		rain_24h_mm: 'Rain, past 24 hours (mm)',
		rain_daily_mm: 'Rain, since midnight (mm)',
		indoor_temp_c: 'Temperature (°C)',
		indoor_humidity_pct: 'Humidity (%)',
		wind_avg_ms: 'Wind (km/h)',
		wind_gust_ms: 'Gust (km/h)',
		wind_dir_deg: 'Direction (°)',
		pressure_hpa: 'Pressure (hPa)'
	};

	/** Only own properties: `data.metric` is a route param, and a plain-object lookup would
	 *  otherwise resolve to inherited members like `constructor` or `toString`. */
	const own = <T,>(table: Partial<Record<string, T>>, key: string): T | undefined =>
		Object.hasOwn(table, key) ? table[key] : undefined;

	const title = $derived(own(TITLES, data.metric) ?? data.metric);
	const spec = $derived(own(CHARTS, data.metric));
	const series = $derived(spec ? buildSeries(data.history, spec) : []);
	const summaries = $derived(
		series.flatMap((line) => {
			const range = extremes(line.points);
			return range ? [{ label: line.label, ...range }] : [];
		})
	);
	const columns = $derived<(keyof WeatherHistoryRow)[]>([
		'timestamp_utc',
		...(own(FIELDS, data.metric) ?? [])
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
		// The backend stores wind in m/s; the summaries and chart show km/h.
		if ((key === 'wind_avg_ms' || key === 'wind_gust_ms') && typeof raw === 'number') {
			return (raw * 3.6).toFixed(1);
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
			<p class="text-sm text-muted">Highs and lows are for the last {hours} hours.</p>
			<WeatherChartPanel
				history={data.history}
				range={data.range}
				metric={data.metric}
				metrics={[{ key: data.metric, label: title }]}
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
								<th scope="col" class="px-3 py-2 font-semibold">{HEADINGS[column] ?? column}</th>
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
