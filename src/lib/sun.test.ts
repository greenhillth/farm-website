import { describe, expect, it } from 'vitest';

import { moonAge, moonPhase, sunTimes } from './sun';

const FARM = { lat: -41.1895, lon: 146.4645, timeZone: 'Australia/Hobart' };
const hhmmss = (d: Date | null) =>
	d?.toLocaleTimeString('en-GB', { timeZone: FARM.timeZone, hour12: false }) ?? null;
const minutes = (t: string) => {
	const [h, m, s] = t.split(':').map(Number);
	return h * 60 + m + s / 60;
};

// Reference times from the astral library for the farm, in local (AEST/AEDT) time.
const REFERENCE: [string, string, string][] = [
	['2026-09-27T12:00:00+10:00', '05:55:57', '18:15:18'],
	['2026-12-21T12:00:00+11:00', '05:37:44', '20:46:18'],
	['2026-06-21T12:00:00+10:00', '07:40:05', '16:51:39'],
	['2026-03-01T12:00:00+11:00', '06:55:01', '19:57:17'],
	['2026-10-04T12:00:00+11:00', '06:44:06', '19:22:35']
];

describe('sunTimes', () => {
	it.each(REFERENCE)('on %s matches the reference within 3 minutes', (at, rise, set) => {
		const { sunrise, sunset } = sunTimes(new Date(at), FARM.lat, FARM.lon, FARM.timeZone);

		expect(Math.abs(minutes(hhmmss(sunrise)!) - minutes(rise))).toBeLessThan(3);
		expect(Math.abs(minutes(hhmmss(sunset)!) - minutes(set))).toBeLessThan(3);
	});

	it('uses the local calendar day, not the UTC one', () => {
		// 06:00 local on 27 Sept is still 26 Sept in UTC.
		const early = sunTimes(
			new Date('2026-09-27T06:00:00+10:00'),
			FARM.lat,
			FARM.lon,
			FARM.timeZone
		);
		const late = sunTimes(new Date('2026-09-27T23:00:00+10:00'), FARM.lat, FARM.lon, FARM.timeZone);

		expect(hhmmss(early.sunrise)).toBe(hhmmss(late.sunrise));
	});

	it('returns null where the sun never sets', () => {
		expect(sunTimes(new Date('2026-06-21T12:00:00Z'), 80, 0, 'UTC')).toEqual({
			sunrise: null,
			sunset: null
		});
	});
});

describe('moonPhase', () => {
	// astral's phases for the same dates (on its 0–28 scale: 14.73, 11.16, 6.64, 12.01, 21.89).
	it.each([
		['2026-09-27T12:00:00Z', 'Full Moon'],
		['2026-12-21T12:00:00Z', 'Waxing Gibbous'],
		['2026-06-21T12:00:00Z', 'First Quarter'],
		['2026-03-01T12:00:00Z', 'Waxing Gibbous'],
		['2026-10-04T12:00:00Z', 'Last Quarter']
	])('on %s is %s', (at, phase) => {
		expect(moonPhase(new Date(at))).toBe(phase);
	});

	it('gives an age within the synodic month', () => {
		const age = moonAge(new Date('2026-09-27T12:00:00Z'));
		expect(age).toBeGreaterThan(13);
		expect(age).toBeLessThan(16);
	});
});
