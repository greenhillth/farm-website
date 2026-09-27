import type { Weather, WeatherField } from './weather';

export type SprayThresholds = {
	windMinKmh: number;
	windGoodMaxKmh: number;
	windMarginalMaxKmh: number;
	gustMarginalKmh: number;
	deltaTGoodMin: number;
	deltaTGoodMax: number;
	deltaTMarginalMax: number;
};
export type SprayVerdict = 'good' | 'marginal' | 'not-suitable' | 'unknown';
export type SprayResult = { verdict: SprayVerdict; reasons: string[]; summary: string };
type Level = Exclude<SprayVerdict, 'unknown'>;
type Check = { level: Level; reason: string };

export const SPRAY_LABELS: Record<SprayVerdict, string> = {
	good: 'Good',
	marginal: 'Marginal',
	'not-suitable': 'Not suitable',
	unknown: "Can't tell"
};

export const SPRAY_TONES: Record<SprayVerdict, string> = {
	good: 'text-accent',
	marginal: 'text-warn',
	'not-suitable': 'text-danger',
	unknown: 'text-muted'
};

const RANK: Record<Level, number> = { good: 0, marginal: 1, 'not-suitable': 2 };

/** Dry bulb minus wet bulb, with the wet bulb from Stull (2011). */
export function deltaT(tempC: number, rhPct: number): number | null {
	if (!Number.isFinite(tempC) || !Number.isFinite(rhPct) || rhPct <= 0 || rhPct > 100) return null;
	const wetBulb =
		tempC * Math.atan(0.151977 * Math.sqrt(rhPct + 8.313659)) +
		Math.atan(tempC + rhPct) -
		Math.atan(rhPct - 1.676331) +
		0.00391838 * rhPct ** 1.5 * Math.atan(0.023101 * rhPct) -
		4.686035;
	return tempC - wetBulb;
}

export function windCheck(kmh: number, t: SprayThresholds): Check {
	const text = `Wind ${Math.round(kmh)} km/h`;
	if (kmh < t.windMinKmh) {
		return { level: 'not-suitable', reason: `${text}: too still, spray may drift in an inversion` };
	}
	if (kmh <= t.windGoodMaxKmh) return { level: 'good', reason: text };
	if (kmh <= t.windMarginalMaxKmh)
		return { level: 'marginal', reason: `${text}: on the strong side` };
	return { level: 'not-suitable', reason: `${text}: too strong` };
}

export function deltaTCheck(dt: number, t: SprayThresholds): Check {
	const text = `Delta T ${dt.toFixed(1)} °C`;
	if (dt < t.deltaTGoodMin) {
		return { level: 'not-suitable', reason: `${text}: too humid, droplets may not dry` };
	}
	if (dt <= t.deltaTGoodMax) return { level: 'good', reason: text };
	if (dt <= t.deltaTMarginalMax)
		return { level: 'marginal', reason: `${text}: droplets drying fast` };
	return { level: 'not-suitable', reason: `${text}: too dry, droplets evaporate` };
}

const INPUTS: [WeatherField, string][] = [
	['wind.speed', 'wind speed'],
	['wind.gust', 'gusts'],
	['rain.hourly', 'rain'],
	['outdoor.temp', 'temperature'],
	['outdoor.humidity', 'humidity']
];

function orList(words: string[]): string {
	return words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} or ${words.at(-1)}`;
}

function unknown(reason: string): SprayResult {
	return { verdict: 'unknown', reasons: [reason], summary: reason };
}

/** The worst of the wind, gust, rain and Delta T checks. Speeds arrive in m/s. */
export function sprayConditions(
	weather: Weather,
	mockFields: readonly WeatherField[],
	thresholds: SprayThresholds
): SprayResult {
	const missing = INPUTS.filter(([field]) => mockFields.includes(field)).map(([, label]) => label);
	if (missing.length > 0) {
		return unknown(`Can't tell — the station isn't reporting ${orList(missing)}.`);
	}
	const dt = deltaT(weather.outdoor.temp, weather.outdoor.humidity);
	if (dt === null) return unknown("Can't tell — the humidity reading is out of range.");

	const gustKmh = weather.wind.gust * 3.6;
	const rain = weather.rain.hourly;
	const checks: Check[] = [
		windCheck(weather.wind.speed * 3.6, thresholds),
		gustKmh > thresholds.gustMarginalKmh
			? { level: 'marginal', reason: `Gusting ${Math.round(gustKmh)} km/h` }
			: { level: 'good', reason: `Gusts ${Math.round(gustKmh)} km/h` },
		rain > 0
			? { level: 'not-suitable', reason: `Rain in the last hour (${rain.toFixed(1)} mm)` }
			: { level: 'good', reason: 'No rain in the last hour' },
		deltaTCheck(dt, thresholds)
	];

	const worst = checks.reduce((a, b) => (RANK[b.level] > RANK[a.level] ? b : a));
	return {
		verdict: worst.level,
		reasons: checks.map((check) => check.reason),
		summary: worst.reason
	};
}
