/**
 * Sunrise, sunset and moon phase, calculated rather than fetched: the weather station
 * doesn't report them, and the astronomy needs no service or key. Sunrise and sunset use
 * the standard sunrise equation (as NOAA and Geoscience Australia do), good to a couple of
 * minutes; the moon phase comes from the average synodic month.
 */

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J2000 = 2_451_545;
const julian = (ms: number) => ms / DAY_MS + 2_440_587.5;
const fromJulian = (j: number) => (j - 2_440_587.5) * DAY_MS;

/** The calendar date of `at` in `timeZone`, as UTC noon of that date. */
function localNoon(at: Date, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(at);
	const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	return Date.UTC(part('year'), part('month') - 1, part('day'), 12);
}

/**
 * Sunrise and sunset on the calendar day of `at` in `timeZone`, at latitude/longitude in
 * degrees (south and west negative). Null where the sun doesn't rise or set that day.
 */
export function sunTimes(
	at: Date,
	lat: number,
	lon: number,
	timeZone: string
): { sunrise: Date | null; sunset: Date | null } {
	// Days since J2000 at the local solar noon of that date.
	const n = Math.round(julian(localNoon(at, timeZone)) - J2000 - lon / 360) + 0.0008;
	const meanNoon = n - lon / 360;
	const anomaly = (357.5291 + 0.98560028 * meanNoon) % 360;
	const centre =
		1.9148 * Math.sin(anomaly * RAD) +
		0.02 * Math.sin(2 * anomaly * RAD) +
		0.0003 * Math.sin(3 * anomaly * RAD);
	const longitude = (anomaly + centre + 180 + 102.9372) % 360;
	const transit =
		J2000 + meanNoon + 0.0053 * Math.sin(anomaly * RAD) - 0.0069 * Math.sin(2 * longitude * RAD);
	const declination = Math.asin(Math.sin(longitude * RAD) * Math.sin(23.4397 * RAD));
	// -0.833°: the sun's upper edge on the horizon, allowing for refraction.
	const cosHour =
		(Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(declination)) /
		(Math.cos(lat * RAD) * Math.cos(declination));
	if (cosHour < -1 || cosHour > 1) return { sunrise: null, sunset: null };
	const hour = Math.acos(cosHour) / RAD / 360;
	return {
		sunrise: new Date(fromJulian(transit - hour)),
		sunset: new Date(fromJulian(transit + hour))
	};
}

const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const PHASES = [
	'New Moon',
	'Waxing Crescent',
	'First Quarter',
	'Waxing Gibbous',
	'Full Moon',
	'Waning Gibbous',
	'Last Quarter',
	'Waning Crescent'
] as const;

/** Days since the last new moon, 0 to about 29.5. */
export function moonAge(at: Date): number {
	const days = (at.getTime() - KNOWN_NEW_MOON) / DAY_MS;
	return ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
}

/** The moon's phase name: eight equal slices of the month, centred on each principal phase. */
export function moonPhase(at: Date): (typeof PHASES)[number] {
	const slice = Math.floor((moonAge(at) / SYNODIC_DAYS) * 8 + 0.5) % 8;
	return PHASES[slice];
}
