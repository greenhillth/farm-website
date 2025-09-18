<script lang="ts">
	import { onMount } from 'svelte';
	import Panel from '$lib/components/Panel.svelte';
	import CONFIG from '$lib/config';

	type Paddock = {
		id: string;
		name: string;
		crop?: string | null;
		areaHectares: number | null;
		centroid: { lat: number; lon: number } | null;
	};

	type Position = [number, number];

	const areaFormatter = new Intl.NumberFormat(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	const coordinateFormatter = new Intl.NumberFormat(undefined, {
		minimumFractionDigits: 5,
		maximumFractionDigits: 5
	});

	const EARTH_RADIUS = 6378137;

	const toRadians = (value: number) => (value * Math.PI) / 180;

	const ensureClosed = (coords: Position[]): Position[] => {
		if (coords.length === 0) return coords;
		const [firstLon, firstLat] = coords[0];
		const [lastLon, lastLat] = coords[coords.length - 1];
		if (firstLon === lastLon && firstLat === lastLat) return coords;
		return [...coords, coords[0]];
	};

	const ringArea = (coords: Position[]): number => {
		const ring = ensureClosed(coords);
		if (ring.length < 3) return 0;
		let total = 0;
		for (let i = 0; i < ring.length - 1; i += 1) {
			const [lon1, lat1] = ring[i];
			const [lon2, lat2] = ring[i + 1];
			total += toRadians(lon2 - lon1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
		}
		return (total * EARTH_RADIUS * EARTH_RADIUS) / 2;
	};

	const polygonArea = (coords: Position[][]): number => {
		if (!coords || coords.length === 0) return 0;
		let area = Math.abs(ringArea(coords[0] ?? []));
		for (let i = 1; i < coords.length; i += 1) {
			area -= Math.abs(ringArea(coords[i] ?? []));
		}
		return Math.max(area, 0);
	};

	const geometryArea = (geometry: any): number => {
		if (!geometry) return 0;
		if (geometry.type === 'Polygon') {
			return polygonArea(geometry.coordinates as Position[][]);
		}
		if (geometry.type === 'MultiPolygon') {
			return (geometry.coordinates as Position[][][]).reduce(
				(sum, polygon) => sum + polygonArea(polygon),
				0
			);
		}
		return 0;
	};

	const polygonCentroid = (coords: Position[][]): { lon: number; lat: number } | null => {
		const outer = coords?.[0];
		if (!outer || outer.length < 3) return null;
		const ring = ensureClosed(outer);
		let twiceArea = 0;
		let cx = 0;
		let cy = 0;
		for (let i = 0; i < ring.length - 1; i += 1) {
			const [x1, y1] = ring[i];
			const [x2, y2] = ring[i + 1];
			const cross = x1 * y2 - x2 * y1;
			twiceArea += cross;
			cx += (x1 + x2) * cross;
			cy += (y1 + y2) * cross;
		}
		const area = twiceArea / 2;
		if (!Number.isFinite(area) || Math.abs(area) < 1e-12) {
			const unique = ring.slice(0, -1);
			if (unique.length === 0) return null;
			const sum = unique.reduce(
				(acc, point) => ({ lon: acc.lon + point[0], lat: acc.lat + point[1] }),
				{ lon: 0, lat: 0 }
			);
			return { lon: sum.lon / unique.length, lat: sum.lat / unique.length };
		}
		return { lon: cx / (6 * area), lat: cy / (6 * area) };
	};

	const geometryCentroid = (geometry: any): { lon: number; lat: number } | null => {
		if (!geometry) return null;
		if (geometry.type === 'Polygon') {
			return polygonCentroid(geometry.coordinates as Position[][]);
		}
		if (geometry.type === 'MultiPolygon') {
			let totalArea = 0;
			let lonSum = 0;
			let latSum = 0;
			for (const polygon of geometry.coordinates as Position[][][]) {
				const area = polygonArea(polygon);
				const centroid = polygonCentroid(polygon);
				if (!centroid) continue;
				if (area > 0) {
					lonSum += centroid.lon * area;
					latSum += centroid.lat * area;
					totalArea += area;
				}
			}
			if (totalArea > 0) {
				return { lon: lonSum / totalArea, lat: latSum / totalArea };
			}
			const centroids = (geometry.coordinates as Position[][][])
				.map((polygon) => polygonCentroid(polygon))
				.filter((value): value is { lon: number; lat: number } => Boolean(value));
			if (centroids.length === 0) return null;
			const sum = centroids.reduce(
				(acc, point) => ({ lon: acc.lon + point.lon, lat: acc.lat + point.lat }),
				{ lon: 0, lat: 0 }
			);
			return { lon: sum.lon / centroids.length, lat: sum.lat / centroids.length };
		}
		return null;
	};

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
						crop: null,
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
		? paddocks.filter((p) => `${p.name} ${p.id} ${p.crop ?? ''}`.toLowerCase().includes(searchTerm))
		: paddocks;
</script>

<header class="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
	<a href="/" class="text-muted text-sm hover:text-white">&larr; Back to home</a>
	<div class="text-muted text-xs">Paddock Manager</div>
</header>

<main class="container mx-auto space-y-5 px-4 pb-8">
	<Panel title="Paddocks">
		<div class="mb-3 flex items-center gap-3">
			<input
				placeholder="Search by name or ID…"
				bind:value={q}
				class="border-border focus:ring-accent/40 w-full max-w-md rounded-md border bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2"
			/>
			<a href="/map" class="text-muted text-sm hover:text-white">Open map →</a>
		</div>

		{#if loading}
			<div class="text-muted text-sm">Loading paddocks…</div>
		{:else if error}
			<div class="text-sm text-red-400">{error}</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="text-muted border-border/60 border-b text-left">
						<tr>
							<th class="py-2 pr-4">Name</th>
							<th class="py-2 pr-4">ID</th>
							<th class="py-2 pr-4">Crop</th>
							<th class="py-2 pr-4 text-right">Size (ha)</th>
							<th class="py-2 pr-4 text-right">Latitude</th>
							<th class="py-2 text-right">Longitude</th>
						</tr>
					</thead>
					<tbody>
						{#each filtered as p}
							<tr class="border-border/40 border-b hover:bg-white/5">
								<td class="py-2 pr-4">
									<div class="flex items-center gap-2">
										<span class="font-medium text-white">{p.name}</span>
										{#if p.centroid}
											<a
												class="text-muted text-xs underline hover:text-white"
												href={`/map?metric=OM#${encodeURIComponent(p.name)}`}
											>
												View on map
											</a>
										{/if}
									</div>
								</td>
								<td class="py-2 pr-4">{p.id}</td>
								<td class="py-2 pr-4">{p.crop ?? '-'}</td>
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

	<div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
		<Panel title="Recent Notes">
			<ul class="text-muted list-disc space-y-1 pl-5 text-sm">
				<li>South paddock: inspect fence line</li>
				<li>North ridge: soil sampling next week</li>
				<li>Creek paddock: spot spray blackberry regrowth</li>
			</ul>
		</Panel>

		<Panel title="Upcoming Tasks">
			<ul class="text-muted list-disc space-y-1 pl-5 text-sm">
				<li>Fertilize OM trial plots (Friday)</li>
				<li>Check troughs in Top Flat</li>
			</ul>
		</Panel>
	</div>
</main>
