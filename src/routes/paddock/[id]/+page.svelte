<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import type { Feature, Polygon } from 'geojson';
	import CONFIG from '$lib/config';

	let mapDiv: HTMLDivElement;
	let paddock: Feature<Polygon, Record<string, unknown>> | null = null;
	let stats: Record<string, unknown> = {};

	onMount(async () => {
		const id = get(page).params.id;
		const geojson = await fetch(CONFIG.data.geojson)
			.then((r) => r.json())
			.catch(() => null);
		if (!geojson) return;
		paddock =
			geojson.features.find(
				(f: Feature<Polygon, Record<string, unknown>>) =>
					String(f.properties?.id ?? f.properties?.name) === id
			) ?? null;
		if (!paddock) return;

		const map = L.map(mapDiv);
		L.tileLayer(CONFIG.tiles.url, CONFIG.tiles).addTo(map);
		const layer = L.geoJSON(paddock).addTo(map);
		map.fitBounds(layer.getBounds());
		stats = paddock.properties || {};
	});
</script>

<div class="flex h-dvh">
	<main class="relative flex-1">
		<div bind:this={mapDiv} class="absolute inset-0"></div>
	</main>
	<aside class="bg-panel border-border w-80 overflow-auto border-l p-4">
		{#if paddock}
			<h2 class="mb-2 text-lg font-semibold">Paddock {stats.name ?? stats.id}</h2>
			<ul class="space-y-1 text-sm">
				<li><strong>ID:</strong> {stats.id ?? 'N/A'}</li>
				<li><strong>Name:</strong> {stats.name ?? 'N/A'}</li>
				<li><strong>Crop:</strong> {stats.crop ?? 'N/A'}</li>
				<li><strong>Irrigated:</strong> {stats.irrigated ?? 'N/A'}</li>
				{#each CONFIG.metrics as m (m)}
					<li><strong>{m}:</strong> {stats[m] ?? 'N/A'}</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm">Paddock not found.</p>
		{/if}
	</aside>
</div>
