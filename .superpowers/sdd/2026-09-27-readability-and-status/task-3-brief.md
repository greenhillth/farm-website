### Task 3: Spray conditions

**Files:**

- Create: `src/lib/spray.ts`
- Create: `src/lib/spray.test.ts`
- Modify: `src/lib/config.ts` (add a `spray` section after `map`)

**Interfaces:**

- Consumes: `Weather`, `WeatherField` (Task 2).
- Produces (`src/lib/spray.ts`):
  - `type SprayThresholds = { windMinKmh; windGoodMaxKmh; windMarginalMaxKmh; gustMarginalKmh; deltaTGoodMin; deltaTGoodMax; deltaTMarginalMax }` (all `number`)
  - `type SprayVerdict = 'good' | 'marginal' | 'not-suitable' | 'unknown'`
  - `type SprayResult = { verdict: SprayVerdict; reasons: string[]; summary: string }` (`summary` is the reason behind the verdict, for the home tile)
  - `SPRAY_LABELS: Record<SprayVerdict, string>`, `SPRAY_TONES: Record<SprayVerdict, string>` (Tailwind text colour classes)
  - `deltaT(tempC: number, rhPct: number): number | null` (Stull 2011 wet bulb; `null` for humidity ≤ 0 or > 100)
  - `windCheck(kmh: number, t: SprayThresholds)`, `deltaTCheck(dt: number, t: SprayThresholds)`: `{ level: 'good' | 'marginal' | 'not-suitable'; reason: string }`
  - `sprayConditions(weather: Weather, mockFields: readonly WeatherField[], thresholds: SprayThresholds): SprayResult`
- Produces (`CONFIG.spray`): `{ windMinKmh: 3, windGoodMaxKmh: 15, windMarginalMaxKmh: 20, gustMarginalKmh: 20, deltaTGoodMin: 2, deltaTGoodMax: 8, deltaTMarginalMax: 10 }`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/spray.test.ts`:

```ts
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

	it('can’t tell when an input is sample data, and names it', () => {
		expect(sprayConditions(calm, ['wind.speed'], t)).toEqual({
			verdict: 'unknown',
			reasons: ['Can’t tell — the station isn’t reporting wind speed.'],
			summary: 'Can’t tell — the station isn’t reporting wind speed.'
		});
		expect(sprayConditions(calm, ['outdoor.temp', 'outdoor.humidity'], t).reasons).toEqual([
			'Can’t tell — the station isn’t reporting temperature or humidity.'
		]);
	});

	it('can’t tell when humidity is out of range', () => {
		const result = sprayConditions(
			weatherWith({ temp: 20, humidity: 0 }, { speed: 2.5, gust: 4 }),
			[],
			t
		);
		expect(result.verdict).toBe('unknown');
		expect(result.reasons).toEqual(['Can’t tell — the humidity reading is out of range.']);
	});
});
```

Run: `npx vitest run --project server src/lib/spray.test.ts`
Expected: FAIL (`CONFIG.spray` is undefined, `./spray` doesn't exist).

- [ ] **Step 2: Add the thresholds to `src/lib/config.ts`**

After the `map: { … },` block, add:

```ts
	/** Spraying thresholds from common Australian label guidance. Speeds in km/h, Delta T in °C. */
	spray: {
		windMinKmh: 3,
		windGoodMaxKmh: 15,
		windMarginalMaxKmh: 20,
		gustMarginalKmh: 20,
		deltaTGoodMin: 2,
		deltaTGoodMax: 8,
		deltaTMarginalMax: 10
	},
```

- [ ] **Step 3: Create `src/lib/spray.ts`**

```ts
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
	unknown: 'Can’t tell'
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
		return unknown(`Can’t tell — the station isn’t reporting ${orList(missing)}.`);
	}
	const dt = deltaT(weather.outdoor.temp, weather.outdoor.humidity);
	if (dt === null) return unknown('Can’t tell — the humidity reading is out of range.');

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
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run --project server src/lib/spray.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/spray.ts src/lib/spray.test.ts src/lib/config.ts
git commit -m "Work out spraying conditions from wind, gusts, rain and Delta T"
```

---

