/** GeoJSON coordinate order: [longitude, latitude]. */
export type Position = [number, number];
export type GeometryLike = { type: string; coordinates?: unknown } | null | undefined;
export type GeoFeature = { geometry?: GeometryLike };

const EARTH_RADIUS = 6378137;

const toRadians = (value: number) => (value * Math.PI) / 180;

function ensureClosed(coords: Position[]): Position[] {
	if (coords.length === 0) return coords;
	const [firstLon, firstLat] = coords[0];
	const [lastLon, lastLat] = coords[coords.length - 1];
	if (firstLon === lastLon && firstLat === lastLat) return coords;
	return [...coords, coords[0]];
}

/** Signed spherical area of a ring in square metres. */
export function ringArea(coords: Position[]): number {
	const ring = ensureClosed(coords);
	if (ring.length < 3) return 0;
	let total = 0;
	for (let i = 0; i < ring.length - 1; i += 1) {
		const [lon1, lat1] = ring[i];
		const [lon2, lat2] = ring[i + 1];
		total += toRadians(lon2 - lon1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
	}
	return (total * EARTH_RADIUS * EARTH_RADIUS) / 2;
}

/** Outer ring minus holes, in square metres. */
export function polygonArea(coords: Position[][]): number {
	if (!coords || coords.length === 0) return 0;
	let area = Math.abs(ringArea(coords[0] ?? []));
	for (let i = 1; i < coords.length; i += 1) {
		area -= Math.abs(ringArea(coords[i] ?? []));
	}
	return Math.max(area, 0);
}

export function geometryArea(geometry: GeometryLike): number {
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
}

function polygonCentroid(coords: Position[][]): { lon: number; lat: number } | null {
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
}

export function geometryCentroid(geometry: GeometryLike): { lon: number; lat: number } | null {
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
}

/** Ray casting; points exactly on an edge may land either side, which is fine at paddock scale. */
function pointInRing(lon: number, lat: number, ring: Position[]): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
			inside = !inside;
		}
	}
	return inside;
}

function pointInPolygon(lon: number, lat: number, rings: Position[][]): boolean {
	if (!rings?.[0] || !pointInRing(lon, lat, rings[0])) return false;
	for (let i = 1; i < rings.length; i += 1) {
		if (pointInRing(lon, lat, rings[i])) return false;
	}
	return true;
}

export function pointInGeometry(lat: number, lon: number, geometry: GeometryLike): boolean {
	if (!geometry) return false;
	if (geometry.type === 'Polygon') {
		return pointInPolygon(lon, lat, geometry.coordinates as Position[][]);
	}
	if (geometry.type === 'MultiPolygon') {
		return (geometry.coordinates as Position[][][]).some((polygon) =>
			pointInPolygon(lon, lat, polygon)
		);
	}
	return false;
}

/** The first feature whose geometry contains the point, or null. */
export function findPaddockAt<F extends GeoFeature>(
	lat: number,
	lon: number,
	features: readonly F[]
): F | null {
	for (const feature of features) {
		if (pointInGeometry(lat, lon, feature.geometry)) return feature;
	}
	return null;
}
