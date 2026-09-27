### Task 2: Record which weather fields are sample data

**Files:**

- Modify: `src/lib/weather.ts`
- Modify: `src/lib/providers/backend.ts`
- Create: `src/lib/providers/backend.test.ts`
- Modify: `src/routes/weather/+page.ts`, `src/routes/weather/[metric]/+page.ts` (pass `mockFields` through; the dashboard also loads history)

**Interfaces:**

- Produces (`src/lib/weather.ts`):
  - `WEATHER_FIELDS` (readonly tuple of every dotted path in `Weather` except `updatedAt`, plus `'series'`) and `type WeatherField = (typeof WEATHER_FIELDS)[number]`
  - `ALWAYS_SAMPLE_FIELDS: readonly WeatherField[]`: fields the station never reports
  - `WeatherResult` gains `mockFields: WeatherField[]`
  - `dewPointC(tempC: number, rhPct: number): number` (Magnus formula, moved from the provider)
- Produces (`src/lib/providers/backend.ts`): `WeatherMeta` gains `mockFields: WeatherField[]`. A reachable backend lists `ALWAYS_SAMPLE_FIELDS` plus each field it had to fill; an unreachable one lists `WEATHER_FIELDS`.
- Produces: both weather loads return `mockFields`; the dashboard load also returns `history` and `range` like the detail load.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/providers/backend.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { ALWAYS_SAMPLE_FIELDS, WEATHER_FIELDS } from '$lib/weather';
import { fetchBackendWeatherMeta } from './backend';

const full = {
	timestamp_utc: '2026-09-26 01:00:00',
	temp_c: 14.2,
	humidity_pct: 70,
	pressure_hpa: 1012,
	wind_avg_ms: 3,
	wind_gust_ms: 5,
	wind_dir_deg: 200,
	rain_1h_mm: 0,
	rain_24h_mm: 1.2,
	solar_wm2: 300
};
const returning = (body: unknown, status = 200) =>
	vi.fn(async () => Response.json(body, { status })) as unknown as typeof fetch;
const sorted = (fields: readonly string[]) => [...fields].sort();

describe('fetchBackendWeatherMeta mockFields', () => {
	it('lists only the fields the station never reports when a reading is complete', async () => {
		const result = await fetchBackendWeatherMeta(returning(full));

		expect(result.source).toBe('ecowitt');
		expect(sorted(result.mockFields)).toEqual(sorted(ALWAYS_SAMPLE_FIELDS));
		expect(result.data.outdoor.temp).toBe(14.2);
	});

	it('adds humidity and everything derived from it when humidity is missing', async () => {
		const result = await fetchBackendWeatherMeta(returning({ ...full, humidity_pct: null }));

		expect(result.mockFields).toEqual(
			expect.arrayContaining(['outdoor.humidity', 'outdoor.dewPoint', 'outdoor.vpd'])
		);
		expect(result.mockFields).not.toContain('outdoor.temp');
	});

	it('lists every field when the backend is unreachable or fails', async () => {
		const failing = vi.fn(async () => {
			throw new Error('ECONNREFUSED');
		}) as unknown as typeof fetch;

		for (const fetchFn of [failing, returning({ detail: 'down' }, 502)]) {
			const result = await fetchBackendWeatherMeta(fetchFn);
			expect(result.source).toBe('mock');
			expect(sorted(result.mockFields)).toEqual(sorted(WEATHER_FIELDS));
		}
	});
});
```

Run: `npx vitest run --project server src/lib/providers/backend.test.ts`
Expected: FAIL (`ALWAYS_SAMPLE_FIELDS` isn't exported; `mockFields` is undefined).

- [ ] **Step 2: Add the field list and `dewPointC` to `src/lib/weather.ts`**

After the `Weather` type, add:

```ts
/** Every value on the weather pages, as a dotted path into `Weather`. */
export const WEATHER_FIELDS = [
	'outdoor.temp',
	'outdoor.trend',
	'outdoor.feelsLike',
	'outdoor.dewPoint',
	'outdoor.humidity',
	'outdoor.vpd',
	'indoor.temp',
	'indoor.trend',
	'indoor.humidity',
	'solar.solar',
	'solar.uvi',
	'solar.sunrise',
	'solar.sunset',
	'solar.moon',
	'rain.rate',
	'rain.daily',
	'rain.event',
	'rain.hourly',
	'rain.weekly',
	'rain.monthly',
	'rain.yearly',
	'wind.dir',
	'wind.speed',
	'wind.gust',
	'wind.timeSpeed',
	'wind.timeGust',
	'pressure.rel',
	'pressure.abs',
	'pressure.deltaRel',
	'pressure.deltaAbs',
	'battery.status',
	'battery.note',
	'series'
] as const;

export type WeatherField = (typeof WEATHER_FIELDS)[number];

/** Fields the station doesn't report: the provider fills them from getMockWeather() or with 0. */
export const ALWAYS_SAMPLE_FIELDS: readonly WeatherField[] = [
	'outdoor.trend',
	'indoor.temp',
	'indoor.trend',
	'indoor.humidity',
	'solar.uvi',
	'solar.sunrise',
	'solar.sunset',
	'solar.moon',
	'rain.rate',
	'rain.event',
	'rain.weekly',
	'rain.monthly',
	'rain.yearly',
	'wind.timeSpeed',
	'wind.timeGust',
	'pressure.deltaRel',
	'pressure.deltaAbs',
	'battery.status',
	'battery.note',
	'series'
];

/** Dew point in °C (Magnus formula). */
export function dewPointC(tempC: number, rhPct: number): number {
	const a = 17.27;
	const b = 237.7;
	const alpha = (a * tempC) / (b + tempC) + Math.log(rhPct / 100);
	return (b * alpha) / (a - alpha);
}
```

Change `WeatherResult` and `fetchWeather` to:

```ts
export type WeatherResult = {
	weather: Weather;
	connected: boolean;
	source: 'ecowitt' | 'mock';
	/** Values that are sample data rather than readings; every field when `source` is `'mock'`. */
	mockFields: WeatherField[];
};
```

```ts
export async function fetchWeather(fetchFn: typeof fetch = fetch): Promise<WeatherResult> {
	const { data, connected, source, mockFields } = await fetchBackendWeatherMeta(fetchFn);
	return { weather: data, connected, source, mockFields };
}
```

- [ ] **Step 3: Record filled fields in `src/lib/providers/backend.ts`**

Replace the import line with:

```ts
import {
	ALWAYS_SAMPLE_FIELDS,
	WEATHER_FIELDS,
	dewPointC,
	getMockWeather,
	type Weather,
	type WeatherField
} from '$lib/weather';
```

Change `WeatherMeta` to:

```ts
export type WeatherMeta = {
	data: Weather;
	connected: boolean;
	source: 'ecowitt' | 'mock';
	mockFields: WeatherField[];
};
```

Replace `mapReadingToWeather` with:

```ts
function mapReadingToWeather(r: WeatherReading): { weather: Weather; mockFields: WeatherField[] } {
	const mock = getMockWeather();
	const mocked = new Set<WeatherField>(ALWAYS_SAMPLE_FIELDS);
	// Use the reading when present; otherwise fall back and record every field that fallback feeds.
	const pick = <T>(value: T | null | undefined, fallback: T, ...fields: WeatherField[]): T => {
		if (value !== null && value !== undefined) return value;
		for (const field of fields) mocked.add(field);
		return fallback;
	};

	const tempC = r.temp_c ?? null;
	const rh = r.humidity_pct ?? null;
	const both = tempC !== null && rh !== null;

	const weather: Weather = {
		updatedAt: coerceUtcIsoString(r.timestamp_utc),
		outdoor: {
			temp: pick(tempC, mock.outdoor.temp, 'outdoor.temp'),
			trend: 0,
			feelsLike: pick(tempC, mock.outdoor.feelsLike, 'outdoor.feelsLike'),
			dewPoint: both ? dewPointC(tempC, rh) : pick(null, mock.outdoor.dewPoint, 'outdoor.dewPoint'),
			humidity: pick(rh, mock.outdoor.humidity, 'outdoor.humidity'),
			vpd: both ? computeVPD_c_kPa(tempC, rh) : pick(null, mock.outdoor.vpd, 'outdoor.vpd')
		},
		indoor: { temp: mock.indoor.temp, trend: 0, humidity: mock.indoor.humidity },
		solar: {
			solar: pick(r.solar_wm2, mock.solar.solar, 'solar.solar'),
			uvi: mock.solar.uvi,
			sunrise: mock.solar.sunrise,
			sunset: mock.solar.sunset,
			moon: mock.solar.moon
		},
		rain: {
			rate: 0,
			daily: pick(r.rain_24h_mm, mock.rain.daily, 'rain.daily'),
			event: mock.rain.event,
			hourly: pick(r.rain_1h_mm, mock.rain.hourly, 'rain.hourly'),
			weekly: mock.rain.weekly,
			monthly: mock.rain.monthly,
			yearly: mock.rain.yearly
		},
		wind: {
			dir: pick(r.wind_dir_deg, mock.wind.dir, 'wind.dir'),
			speed: pick(r.wind_avg_ms, mock.wind.speed, 'wind.speed'),
			gust: pick(r.wind_gust_ms, mock.wind.gust, 'wind.gust'),
			timeSpeed: mock.wind.timeSpeed,
			timeGust: mock.wind.timeGust
		},
		pressure: {
			rel: pick(r.pressure_hpa, mock.pressure.rel, 'pressure.rel'),
			abs: pick(r.pressure_hpa, mock.pressure.abs, 'pressure.abs'),
			deltaRel: 0,
			deltaAbs: 0
		},
		battery: { status: mock.battery.status, note: mock.battery.note },
		series: mock.series
	};

	return { weather, mockFields: [...mocked] };
}
```

and `fetchBackendWeatherMeta`'s body with:

```ts
try {
	const res = await fetchFn(CONFIG.backend.currentWeather);
	if (!res.ok) throw new Error(`backend /weather/current failed: ${res.status}`);
	const reading = (await res.json()) as WeatherReading;
	const { weather, mockFields } = mapReadingToWeather(reading);
	return { data: weather, connected: true, source: 'ecowitt', mockFields };
} catch {
	console.warn('[backend] Fetch failed; serving mock data');
	return {
		data: getMockWeather(),
		connected: false,
		source: 'mock',
		mockFields: [...WEATHER_FIELDS]
	};
}
```

- [ ] **Step 4: Pass `mockFields` through the loads**

`src/routes/weather/+page.ts` becomes:

```ts
import type { PageLoad } from './$types';
import { fetchWeather, fetchWeatherHistory, type WeatherHistoryRow } from '$lib/weather';

export const load: PageLoad = async ({ fetch }) => {
	const now = Math.floor(Date.now() / 1000);
	const from = now - 24 * 60 * 60;
	const [res, history] = await Promise.all([
		fetchWeather(fetch),
		fetchWeatherHistory(from, now, fetch).catch((): WeatherHistoryRow[] => [])
	]);
	return {
		w: res.weather,
		connected: res.connected,
		source: res.source,
		mockFields: res.mockFields,
		history,
		range: { from, to: now }
	};
};
```

`src/routes/weather/[metric]/+page.ts` becomes the same shape (this also clears its two existing ESLint errors):

```ts
import type { PageLoad } from './$types';
import { fetchWeather, fetchWeatherHistory, type WeatherHistoryRow } from '$lib/weather';

export const load: PageLoad = async ({ params, fetch }) => {
	const now = Math.floor(Date.now() / 1000);
	const from = now - 24 * 60 * 60;
	const [res, history] = await Promise.all([
		fetchWeather(fetch),
		fetchWeatherHistory(from, now, fetch).catch((): WeatherHistoryRow[] => [])
	]);
	return {
		metric: params.metric,
		w: res.weather,
		connected: res.connected,
		source: res.source,
		mockFields: res.mockFields,
		history,
		range: { from, to: now }
	};
};
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run --project server src/lib/providers/backend.test.ts src/routes/weather/load.test.ts src/routes/home-load.test.ts && npm run check`
Expected: PASS. `npm run check` may report errors in the weather pages and the home page test fixture (they don't pass `mockFields` yet); Tasks 6–8 fix those. Note which in the commit body.

- [ ] **Step 6: Commit**

```bash
git add src/lib/weather.ts src/lib/providers/backend.ts src/lib/providers/backend.test.ts src/routes/weather/+page.ts "src/routes/weather/[metric]/+page.ts"
git commit -m "Report which weather values are sample data"
```

---

