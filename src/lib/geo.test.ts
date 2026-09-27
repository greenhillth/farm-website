import { describe, expect, it } from 'vitest';

import {
	findPaddockAt,
	geometryArea,
	geometryCentroid,
	pointInGeometry,
	type Position
} from './geo';

// A 0.01° square at the equator: R² · Δλ · (sin φ2 − sin φ1) ≈ 1,239,203 m².
const square = (x: number, y: number, size: number): Position[] => [
	[x, y],
	[x + size, y],
	[x + size, y + size],
	[x, y + size],
	[x, y]
];
const polygon = { type: 'Polygon', coordinates: [square(0, 0, 0.01)] };
const withHole = {
	type: 'Polygon',
	coordinates: [square(0, 0, 0.01), square(0.004, 0.004, 0.002)]
};
const multi = {
	type: 'MultiPolygon',
	coordinates: [[square(0, 0, 0.01)], [square(0.02, 0, 0.01)]]
};

describe('geometryArea', () => {
	it('measures a known square in square metres', () => {
		expect(geometryArea(polygon) / 1e6).toBeCloseTo(1.2392, 3);
	});

	it('subtracts holes', () => {
		const hole = geometryArea({ type: 'Polygon', coordinates: [square(0.004, 0.004, 0.002)] });
		expect(geometryArea(withHole)).toBeCloseTo(geometryArea(polygon) - hole, 0);
	});

	it('adds the parts of a MultiPolygon', () => {
		expect(geometryArea(multi)).toBeCloseTo(2 * geometryArea(polygon), -1);
	});

	it('is 0 for missing or unsupported geometry', () => {
		expect(geometryArea(null)).toBe(0);
		expect(geometryArea({ type: 'Point', coordinates: [0, 0] })).toBe(0);
	});
});

describe('geometryCentroid', () => {
	it('finds the middle of a square', () => {
		const centroid = geometryCentroid({ type: 'Polygon', coordinates: [square(0, 0, 2)] });
		expect(centroid?.lon).toBeCloseTo(1, 6);
		expect(centroid?.lat).toBeCloseTo(1, 6);
	});

	it('returns null without geometry', () => {
		expect(geometryCentroid(undefined)).toBeNull();
	});
});

describe('pointInGeometry', () => {
	it('is true inside and false outside a polygon', () => {
		expect(pointInGeometry(0.005, 0.005, polygon)).toBe(true);
		expect(pointInGeometry(0.02, 0.005, polygon)).toBe(false);
	});

	it('is false inside a hole', () => {
		expect(pointInGeometry(0.005, 0.005, withHole)).toBe(false);
		expect(pointInGeometry(0.001, 0.001, withHole)).toBe(true);
	});

	it('finds a point in the second part of a MultiPolygon', () => {
		expect(pointInGeometry(0.005, 0.025, multi)).toBe(true);
		expect(pointInGeometry(0.005, 0.015, multi)).toBe(false);
	});

	it('is false for missing or unsupported geometry', () => {
		expect(pointInGeometry(0, 0, null)).toBe(false);
		expect(pointInGeometry(0, 0, { type: 'LineString', coordinates: [] })).toBe(false);
	});
});

describe('findPaddockAt', () => {
	const features = [
		{ id: 'a', geometry: polygon },
		{ id: 'b', geometry: { type: 'Polygon', coordinates: [square(0.02, 0, 0.01)] } }
	];

	it('returns the first feature containing the point', () => {
		expect(findPaddockAt(0.005, 0.025, features)?.id).toBe('b');
	});

	it('returns null outside every feature', () => {
		expect(findPaddockAt(1, 1, features)).toBeNull();
	});
});
