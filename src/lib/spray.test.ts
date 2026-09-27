import { describe, expect, it } from 'vitest';

import CONFIG from '$lib/config';
import { deltaT, deltaTCheck, sprayConditions, windCheck } from './spray';
import { getMockWeather, type Weather } from './weather';

const t = CONFIG.spray;

function weatherWith(
	outdoor: Partial<Weather['outdoor']>,
	wind: Partial<Weather['wind']>,
	hourlyRain = 0
) {
	const base = getMockWeather();
	return {
		...base,
		outdoor: { ...base.outdoor, ...outdoor },
		wind: { ...base.wind, ...wind },
		rain: { ...base.rain, hourly: hourlyRain }
	};
}

// 20 °C and 60 % humidity give Delta T 4.99; 2.5 m/s is 9 km/h, 4 m/s is 14.4 km/h.
const calm = weatherWith({ temp: 20, humidity: 60 }, { speed: 2.5, gust: 4 });

describe('deltaT', () => {
	it('matches published reference values', () => {
		expect(deltaT(25, 50)).toBeCloseTo(7.0, 1);
		expect(deltaT(20, 90)).toBeCloseTo(1.23, 1);
		expect(deltaT(30, 20)).toBeCloseTo(14.1, 1);
	});

	it('is unknown for humidity of 0 or out of range', () => {
		expect(deltaT(20, 0)).toBeNull();
		expect(deltaT(20, 101)).toBeNull();
		expect(deltaT(Number.NaN, 50)).toBeNull();
	});
});

describe('windCheck', () => {
	it.each([
		[2.9, 'not-suitable'],
		[3, 'good'],
		[15, 'good'],
		[15.1, 'marginal'],
		[20, 'marginal'],
		[20.1, 'not-suitable']
	] as const)('%s km/h is %s', (kmh, level) => {
		expect(windCheck(kmh, t).level).toBe(level);
	});

	it('explains still air as an inversion risk', () => {
		expect(windCheck(1, t).reason).toBe('Wind 1 km/h: too still, spray may drift in an inversion');
	});
});

describe('deltaTCheck', () => {
	it.each([
		[1.9, 'not-suitable'],
		[2, 'good'],
		[8, 'good'],
		[8.1, 'marginal'],
		[10, 'marginal'],
		[10.1, 'not-suitable']
	] as const)('Delta T %s is %s', (dt, level) => {
		expect(deltaTCheck(dt, t).level).toBe(level);
	});
});

describe('sprayConditions', () => {
	it('is good with a reason per input on a calm, dry day', () => {
		expect(sprayConditions(calm, [], t)).toEqual({
			verdict: 'good',
			reasons: ['Wind 9 km/h', 'Gusts 14 km/h', 'No rain in the last hour', 'Delta T 5.0 °C'],
			summary: 'Wind 9 km/h'
		});
	});

	it('makes strong gusts marginal', () => {
		const result = sprayConditions(
			weatherWith({ temp: 20, humidity: 60 }, { speed: 2.5, gust: 6 }),
			[],
			t
		);
		expect(result.verdict).toBe('marginal');
		expect(result.summary).toBe('Gusting 22 km/h');
	});

	it('takes the worst check: any rain in the last hour is not suitable', () => {
		const result = sprayConditions(
			weatherWith({ temp: 20, humidity: 60 }, { speed: 2.5, gust: 6 }, 0.4),
			[],
			t
		);
		expect(result.verdict).toBe('not-suitable');
		expect(result.summary).toBe('Rain in the last hour (0.4 mm)');
	});

	it(`can’t tell when an input is sample data, and names it`, () => {
		expect(sprayConditions(calm, ['wind.speed'], t)).toEqual({
			verdict: 'unknown',
			reasons: [`Can’t tell — the station isn’t reporting wind speed.`],
			summary: `Can’t tell — the station isn’t reporting wind speed.`
		});
		expect(sprayConditions(calm, ['outdoor.temp', 'outdoor.humidity'], t).reasons).toEqual([
			`Can’t tell — the station isn’t reporting temperature or humidity.`
		]);
	});

	it(`can’t tell when humidity is out of range`, () => {
		const result = sprayConditions(
			weatherWith({ temp: 20, humidity: 0 }, { speed: 2.5, gust: 4 }),
			[],
			t
		);
		expect(result.verdict).toBe('unknown');
		expect(result.reasons).toEqual([`Can’t tell — the humidity reading is out of range.`]);
	});
});
