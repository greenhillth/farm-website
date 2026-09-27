<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Panel from '$lib/components/Panel.svelte';
	import CONFIG from '$lib/config';
	import { geometryArea, geometryCentroid } from '$lib/geo';

	type Paddock = {
		id: string;
		name: string;
		areaHectares: number | null;
		centroid: { lat: number; lon: number } | null;
	};

	const areaFormatter = new Intl.NumberFormat(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	const coordinateFormatter = new Intl.NumberFormat(undefined, {
		minimumFractionDigits: 5,
		maximumFractionDigits: 5
	});

	let paddocks: Paddock[] = [];
	let q = '';
	let loading = true;
	let error: string | null = null;

	onMount(async () => {
		try {
			const res = await fetch(CONFIG.backend.geojson);
			if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
			const gj = await res.json();
			paddocks = (gj.features ?? [])
				.map((feature: any) => {
					const props = feature.properties ?? {};
					const geometry = feature.geometry;
					const areaSqM = geometry ? geometryArea(geometry) : null;
					const centroid = geometry ? geometryCentroid(geometry) : null;
					return {
						id: String(props.fieldID || props.ADSFLDID || props.FIELDID || crypto.randomUUID()),
						name: String(props.fieldName || props.FIELDNAME || 'Unnamed'),
						areaHectares:
							typeof areaSqM === 'number' && Number.isFinite(areaSqM) ? areaSqM / 10000 : null,
						centroid: centroid ? { lat: centroid.lat, lon: centroid.lon } : null
					} satisfies Paddock;
				})
				.sort((a: Paddock, b: Paddock) => a.name.localeCompare(b.name));
		} catch (e: any) {
			error = e?.message ?? 'Failed loading paddocks';
		} finally {
			loading = false;
		}
	});

	$: searchTerm = q.trim().toLowerCase();
	$: filtered = searchTerm
		? paddocks.filter((p) => `${p.name} ${p.id}`.toLowerCase().includes(searchTerm))
		: paddocks;
</script>

<div class="container mx-auto space-y-5 px-4 pb-8">
	<h1 class="pt-6 text-xl font-semibold">Paddocks</h1>
	<Panel title="Paddocks">
		<div class="mb-3 flex items-center gap-3">
			<input
				placeholder="Search by name or ID…"
				bind:value={q}
				class="w-full max-w-md rounded-md border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
			/>
		</div>

		{#if loading}
			<div class="text-sm text-muted">Loading paddocks…</div>
		{:else if error}
			<div class="text-sm text-red-400">{error}</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="border-b border-border/60 text-left text-muted">
						<tr>
							<th class="py-2 pr-4">Name</th>
							<th class="py-2 pr-4">ID</th>
							<th class="py-2 pr-4 text-right">Size (ha)</th>
							<th class="py-2 pr-4 text-right">Latitude</th>
							<th class="py-2 text-right">Longitude</th>
						</tr>
					</thead>
					<tbody>
						{#each filtered as p}
							<tr class="border-b border-border/40 hover:bg-white/5">
								<td class="py-2 pr-4">
									<div class="flex items-center gap-2">
										<span class="font-medium text-white">{p.name}</span>
										{#if p.centroid}
											<a
												class="text-xs text-muted underline hover:text-white"
												href={`${resolve('/map')}?paddock=${encodeURIComponent(p.id)}`}
											>
												View on map
											</a>
										{/if}
									</div>
								</td>
								<td class="py-2 pr-4">{p.id}</td>
								<td class="py-2 pr-4 text-right">
									{#if typeof p.areaHectares === 'number'}
										{areaFormatter.format(p.areaHectares)}
									{:else}
										-
									{/if}
								</td>
								<td class="py-2 pr-4 text-right">
									{#if p.centroid}
										{coordinateFormatter.format(p.centroid.lat)}
									{:else}
										-
									{/if}
								</td>
								<td class="py-2 text-right">
									{#if p.centroid}
										{coordinateFormatter.format(p.centroid.lon)}
									{:else}
										-
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Panel>
</div>
