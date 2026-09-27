<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';

	import Panel from '$lib/components/Panel.svelte';
	import SampleDataChip from '$lib/components/SampleDataChip.svelte';
	import SprayPanel from '$lib/components/SprayPanel.svelte';
	import CONFIG from '$lib/config';
	import { compassPoint } from '$lib/home-items';
	import { sprayConditions } from '$lib/spray';
	import { fetchWeather, type WeatherField, type WeatherResult } from '$lib/weather';
	import { CHARTS, buildSeries } from './chart';
	import OfflineBanner from './components/OfflineBanner.svelte';
	import WeatherChart from './components/WeatherChart.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The load's reading until the first 15-second refresh replaces it.
	let fresh = $state.raw<WeatherResult | null>(null);
	let now = $state(Date.now());

	const current = $derived(
		fresh ?? {
			weather: data.w,
			connected: data.connected,
			source: data.source,
			mockFields: data.mockFields
		}
	);
	const w = $derived(current.weather);
	const spray = $derived(sprayConditions(w, current.mockFields, CONFIG.spray));
	const outdoorSeries = $derived(buildSeries(data.history, CHARTS.outdoor!));
	const ageSeconds = $derived(
		Math.max(0, Math.round((now - new Date(w.updatedAt).getTime()) / 1000))
	);

	const isSample = (field: WeatherField) => current.mockFields.includes(field);
	const anySample = (fields: WeatherField[]) => fields.some(isSample);
	const fmt = (value: number, digits = 1) => value.toFixed(digits);

	function age(seconds: number) {
		if (seconds < 60) return `${seconds} s ago`;
		const minutes = Math.round(seconds / 60);
		return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
	}

	onMount(() => {
		const tick = setInterval(() => (now = Date.now()), 1000);
		const poll = setInterval(async () => {
			fresh = await fetchWeather();
		}, 15_000);
		return () => {
			clearInterval(tick);
			clearInterval(poll);
		};
	});
</script>

<svelte:head>
	<title>Weather</title>
</svelte:head>

{#snippet value(field: WeatherField, text: string, unit: string)}
	<span
		class={isSample(field) ? 'underline decoration-dotted underline-offset-4 opacity-60' : ''}
		title={isSample(field) ? 'Sample value' : undefined}
	>
		{text}<span class="text-base font-normal"> {unit}</span>
	</span>
{/snippet}

{#snippet chip(fields: WeatherField[])}
	{#if anySample(fields)}<SampleDataChip />{/if}
{/snippet}

{#snippet reading(label: string, field: WeatherField, text: string, unit: string)}
	<div>
		<p class="text-sm text-muted">{label}</p>
		<p class="text-2xl font-semibold tabular-nums">{@render value(field, text, unit)}</p>
	</div>
{/snippet}

<div class="mx-auto max-w-6xl space-y-5 px-4 pb-8">
	<div class="flex flex-wrap items-center justify-between gap-3 pt-6">
		<h1 class="text-xl font-semibold">Weather</h1>
		<div class="flex items-center gap-3 text-sm">
			<span class="text-muted">Updated {age(ageSeconds)}</span>
			<span
				class={[
					'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold',
					current.connected ? 'border-accent/50 text-accent' : 'border-warn/60 text-warn'
				]}
			>
				<span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
				{current.connected ? 'Live' : 'Offline'}
			</span>
		</div>
	</div>

	<OfflineBanner source={current.source} />

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		<SprayPanel result={spray} />

		<a href={resolve('/weather/outdoor')} class="block text-text">
			<Panel title="Outdoor" class="h-full hover:border-accent">
				{#snippet actions()}{@render chip([
						'outdoor.temp',
						'outdoor.humidity',
						'outdoor.feelsLike',
						'outdoor.dewPoint',
						'outdoor.vpd'
					])}{/snippet}
				<div class="grid grid-cols-2 gap-4">
					{@render reading('Temperature', 'outdoor.temp', fmt(w.outdoor.temp), '°C')}
					{@render reading('Humidity', 'outdoor.humidity', fmt(w.outdoor.humidity, 0), '%')}
					{@render reading('Feels like', 'outdoor.feelsLike', fmt(w.outdoor.feelsLike), '°C')}
					{@render reading('Dew point', 'outdoor.dewPoint', fmt(w.outdoor.dewPoint), '°C')}
				</div>
				<p class="mt-3 text-sm text-muted">
					VPD {@render value('outdoor.vpd', fmt(w.outdoor.vpd, 2), 'kPa')}
				</p>
			</Panel>
		</a>

		<a href={resolve('/weather/wind')} class="block text-text">
			<Panel title="Wind" class="h-full hover:border-accent">
				{#snippet actions()}{@render chip(['wind.speed', 'wind.gust', 'wind.dir'])}{/snippet}
				<div class="grid grid-cols-2 gap-4">
					{@render reading('Average', 'wind.speed', String(Math.round(w.wind.speed * 3.6)), 'km/h')}
					{@render reading('Gust', 'wind.gust', String(Math.round(w.wind.gust * 3.6)), 'km/h')}
				</div>
				<p class="mt-3 text-sm text-muted">
					From the {@render value(
						'wind.dir',
						compassPoint(w.wind.dir),
						`(${Math.round(w.wind.dir)}°)`
					)}
				</p>
			</Panel>
		</a>

		<a href={resolve('/weather/rain')} class="block text-text">
			<Panel title="Rainfall" class="h-full hover:border-accent">
				{#snippet actions()}{@render chip([
						'rain.daily',
						'rain.hourly',
						'rain.weekly',
						'rain.monthly',
						'rain.yearly'
					])}{/snippet}
				<div class="grid grid-cols-2 gap-4">
					{@render reading('Today', 'rain.daily', fmt(w.rain.daily), 'mm')}
					{@render reading('Past hour', 'rain.hourly', fmt(w.rain.hourly), 'mm')}
				</div>
				<p class="mt-3 text-sm text-muted">
					Week {@render value('rain.weekly', fmt(w.rain.weekly), 'mm')}, month
					{@render value('rain.monthly', fmt(w.rain.monthly), 'mm')}, year
					{@render value('rain.yearly', fmt(w.rain.yearly), 'mm')}
				</p>
			</Panel>
		</a>

		<a href={resolve('/weather/pressure')} class="block text-text">
			<Panel title="Pressure" class="h-full hover:border-accent">
				{#snippet actions()}{@render chip(['pressure.rel', 'pressure.abs'])}{/snippet}
				<div class="grid grid-cols-2 gap-4">
					{@render reading('Relative', 'pressure.rel', fmt(w.pressure.rel), 'hPa')}
					{@render reading('Absolute', 'pressure.abs', fmt(w.pressure.abs), 'hPa')}
				</div>
			</Panel>
		</a>

		<a href={resolve('/weather/solar')} class="block text-text">
			<Panel title="Solar and UVI" class="h-full hover:border-accent">
				{#snippet actions()}{@render chip([
						'solar.solar',
						'solar.uvi',
						'solar.sunrise',
						'solar.sunset'
					])}{/snippet}
				<div class="grid grid-cols-2 gap-4">
					{@render reading('Solar', 'solar.solar', fmt(w.solar.solar, 0), 'W/m²')}
					{@render reading('UV index', 'solar.uvi', String(w.solar.uvi), '')}
				</div>
				<p class="mt-3 text-sm text-muted">
					Sunrise {@render value('solar.sunrise', w.solar.sunrise, '')}, sunset
					{@render value('solar.sunset', w.solar.sunset, '')}
				</p>
			</Panel>
		</a>

		<a href={resolve('/weather/indoor')} class="block text-text">
			<Panel title="Indoor" class="h-full hover:border-accent">
				{#snippet actions()}{@render chip(['indoor.temp', 'indoor.humidity'])}{/snippet}
				<div class="grid grid-cols-2 gap-4">
					{@render reading('Temperature', 'indoor.temp', fmt(w.indoor.temp), '°C')}
					{@render reading('Humidity', 'indoor.humidity', fmt(w.indoor.humidity, 0), '%')}
				</div>
			</Panel>
		</a>

		<a href={resolve('/weather/battery')} class="block text-text">
			<Panel title="Battery" class="h-full hover:border-accent">
				{#snippet actions()}{@render chip(['battery.status', 'battery.note'])}{/snippet}
				<p class="font-semibold">{@render value('battery.status', w.battery.status, '')}</p>
				<p class="text-sm text-muted">{w.battery.note}</p>
			</Panel>
		</a>
	</div>

	<Panel title="Outdoor, last 24 hours">
		<WeatherChart
			title="Outdoor temperature and dew point, last 24 hours"
			series={outdoorSeries}
			unit="°C"
			from={data.range.from * 1000}
			to={data.range.to * 1000}
		/>
	</Panel>
</div>
