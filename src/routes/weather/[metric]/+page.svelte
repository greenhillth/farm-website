<script lang="ts">
	import type { Weather } from '$lib/weather';

	export let data: { metric: string; w: Weather; log: Record<string, any>[] };
	const metric = data.metric;
	const w = data.w;
	const log = Array.isArray(data.log) ? data.log : [];
	const headers =
		log.length &&
		log[0] !== null &&
		typeof log[0] === 'object' &&
		!Array.isArray(log[0])
			? Object.keys(log[0])
			: [];

	const titles: Record<string, string> = {
		outdoor: 'Outdoor',
		indoor: 'Indoor',
		solar: 'Solar and UVI',
		rain: 'Rainfall',
		wind: 'Wind',
		pressure: 'Pressure',
		battery: 'Battery'
	};
	const title = titles[metric] ?? metric;

	// Simple 24hr temperature series from the mock data
	const series = w.series;
	const xs = (t: number) => 40 + (t / 47) * 740;
	const ys = (v: number) => 200 - (v / 14) * 180;
	const high = Math.max(...series.map((p) => p.temp));
	const low = Math.min(...series.map((p) => p.temp));
	const bom = { high: 13, low: 5 };
</script>

<div class="relative container mx-auto px-4 pb-8">
	<a
		href="/weather"
		aria-label="Back to weather"
		class="border-border bg-panel/95 hover:bg-panel focus:ring-accent/40 absolute top-3 left-3 z-[1000] flex items-center gap-2 rounded-full border px-3 py-2 text-sm text-white shadow-md backdrop-blur focus:ring-2 focus:outline-none"
	>
		<!-- arrow-left icon -->
		<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="size-5" viewBox="0 0 24 24"
			><path
				d="M10.5 6 4.5 12l6 6M4.5 12h15"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/></svg
		>
		<span class="hidden sm:inline">Back</span>
	</a>

	<h1 class="mt-12 mb-6 text-center text-2xl font-semibold">{title}</h1>

	<section class="mb-6 text-center">
		<div class="text-xl font-semibold">High {high.toFixed(1)}°C / Low {low.toFixed(1)}°C</div>
		<div class="text-muted text-sm">BoM Benchmark: High {bom.high}°C, Low {bom.low}°C</div>
	</section>

	<section class="overflow-x-auto">
		<svg viewBox="0 0 800 240" class="h-64 w-full">
			<defs>
				<clipPath id="clipDetail">
					<rect x="40" y="20" width="740" height="180" />
				</clipPath>
			</defs>
			<g clip-path="url(#clipDetail)">
				<polyline
					fill="none"
					stroke="#facc15"
					stroke-width="2"
					points={series.map((p) => `${xs(p.t)},${ys(p.temp)}`).join(' ')}
				/>
			</g>
			<g class="text-muted">
				<line x1="40" y1="200" x2="780" y2="200" stroke="currentColor" stroke-opacity="0.3" />
				<text x="782" y="204" class="fill-muted text-xs">0</text>
			</g>
		</svg>
	</section>

	<section class="mt-8">
		<h2 class="mb-2 text-lg font-semibold">Recent readings</h2>
		{#if log.length}
			<div class="overflow-x-auto">
				<table class="min-w-full text-left text-sm">
					<thead>
						<tr>
							{#each headers as h}
								<th class="border-b px-2 py-1 font-medium">{h}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each log as row}
							<tr>
								{#each headers as h}
									<td class="border-b px-2 py-1">{row?.[h] ?? ''}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-muted text-sm">No recent readings available.</p>
		{/if}
	</section>
</div>
