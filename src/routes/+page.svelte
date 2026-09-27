<script lang="ts">
	import { resolve } from '$app/paths';
	import Card from '$lib/components/Card.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import SampleDataChip from '$lib/components/SampleDataChip.svelte';
	import CONFIG from '$lib/config';
	import { compassPoint, mainTools, moreTools, soilHeadline } from '$lib/home-items';
	import { externalLinks } from '$lib/nav';
	import { SPRAY_LABELS, SPRAY_TONES, sprayConditions } from '$lib/spray';
	import { formatDate } from '$lib/soil-tests/utils';
	import type { WeatherField } from '$lib/weather';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const weather = $derived(data.weather);
	const isSample = (field: WeatherField) => weather?.mockFields.includes(field) ?? false;
	const spray = $derived(
		weather ? sprayConditions(weather.weather, weather.mockFields, CONFIG.spray) : null
	);
	const soil = $derived(data.soil);
</script>

<svelte:head>
	<title>Greenhill Bros Farm</title>
</svelte:head>

{#snippet sampleChip()}
	<span class="mt-2 self-start"><SampleDataChip /></span>
{/snippet}

<div class="mx-auto max-w-6xl space-y-8 px-4 py-6">
	<h1 class="text-xl font-semibold md:sr-only">Greenhill Bros Farm</h1>

	<section aria-labelledby="now-title" class="space-y-3">
		<h2 id="now-title" class="text-lg font-semibold">Right now</h2>
		<div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
			{#if weather}
				<a
					href={resolve('/weather')}
					class="flex min-h-28 flex-col rounded-xl border border-border bg-panel p-4 text-text"
				>
					<span class="text-sm text-muted">Temperature</span>
					<span class="mt-1 text-[2.4375rem] leading-none font-semibold tabular-nums">
						{weather.weather.outdoor.temp.toFixed(1)}°
					</span>
					<span class="mt-2 text-sm text-muted">
						Feels like {weather.weather.outdoor.feelsLike.toFixed(0)}°
					</span>
					{#if isSample('outdoor.temp')}{@render sampleChip()}{/if}
				</a>
				<a
					href={resolve('/weather/wind')}
					class="flex min-h-28 flex-col rounded-xl border border-border bg-panel p-4 text-text"
				>
					<span class="text-sm text-muted">Wind</span>
					<span class="mt-1 text-[2.4375rem] leading-none font-semibold tabular-nums">
						{Math.round(weather.weather.wind.speed * 3.6)}
						<span class="text-lg font-normal">km/h</span>
					</span>
					<span class="mt-2 text-sm text-muted">
						From the {compassPoint(weather.weather.wind.dir)}, gusting
						{Math.round(weather.weather.wind.gust * 3.6)} km/h
					</span>
					{#if isSample('wind.speed')}{@render sampleChip()}{/if}
				</a>
				<a
					href={resolve('/weather/rain')}
					class="flex min-h-28 flex-col rounded-xl border border-border bg-panel p-4 text-text"
				>
					<span class="text-sm text-muted">Rain today</span>
					<span class="mt-1 text-[2.4375rem] leading-none font-semibold tabular-nums">
						{weather.weather.rain.daily.toFixed(1)}
						<span class="text-lg font-normal">mm</span>
					</span>
					<span class="mt-2 text-sm text-muted">
						{weather.weather.rain.hourly.toFixed(1)} mm in the last hour
					</span>
					{#if isSample('rain.daily')}{@render sampleChip()}{/if}
				</a>
				{#if spray}
					<a
						href={resolve('/weather')}
						class="flex min-h-28 flex-col rounded-xl border border-border bg-panel p-4 text-text"
					>
						<span class="text-sm text-muted">Spraying now</span>
						<span class={['mt-1 text-2xl leading-tight font-semibold', SPRAY_TONES[spray.verdict]]}>
							{SPRAY_LABELS[spray.verdict]}
						</span>
						<span class="mt-2 text-sm text-muted">{spray.summary}</span>
					</a>
				{/if}
			{:else}
				<p class="col-span-2 rounded-xl border border-border bg-panel p-4 text-muted lg:col-span-4">
					Weather is unavailable. Open the weather page to try again.
				</p>
			{/if}
			<a
				href={resolve('/soiltests')}
				class="col-span-2 flex min-h-28 flex-col rounded-xl border border-border bg-panel p-4 text-text lg:col-span-1"
			>
				<span class="text-sm text-muted">Soil</span>
				{#if soil}
					<span class="mt-1 text-xl leading-tight font-semibold">{soilHeadline(soil)}</span>
					<span class="mt-2 text-sm text-muted">
						{soil.paddocksTested} paddocks tested, latest sample {formatDate(soil.latestSampleDate)}
					</span>
				{:else}
					<span class="mt-1 text-xl leading-tight font-semibold">Unavailable</span>
					<span class="mt-2 text-sm text-muted">Open soil tests to try again.</span>
				{/if}
			</a>
		</div>
	</section>

	<section aria-labelledby="tools-title" class="space-y-3">
		<h2 id="tools-title" class="text-lg font-semibold">Tools</h2>
		<div class="grid gap-4 md:grid-cols-3">
			{#each mainTools as item (item.title)}
				<Card {...item} href={resolve(item.href)} />
			{/each}
		</div>
		<ul class="grid gap-3 sm:grid-cols-2">
			{#each moreTools as item (item.title)}
				<li>
					<a
						href={resolve(item.href)}
						class="flex min-h-14 flex-col justify-center rounded-xl border border-border bg-panel px-4 py-3"
					>
						<span class="font-semibold text-text">{item.title}</span>
						<span class="text-sm text-muted">{item.description}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="links-title" class="space-y-3">
		<h2 id="links-title" class="text-lg font-semibold">Links</h2>
		<ul class="divide-y divide-border rounded-xl border border-border bg-panel">
			{#each externalLinks as link (link.href)}
				<li>
					<a
						href={link.href}
						target="_blank"
						rel="external noopener noreferrer"
						class="flex min-h-12 items-center justify-between gap-3 px-4 text-text"
					>
						{link.label}
						<NavIcon name="external" size={18} />
						<span class="sr-only">(opens in a new tab)</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
</div>
