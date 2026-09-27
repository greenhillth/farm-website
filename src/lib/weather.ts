/**
 * Weather data structure.
 */
export type Weather = {
	updatedAt: string;
	outdoor: {
		temp: number;
		trend: number;
		feelsLike: number;
		dewPoint: number;
		humidity: number;
		vpd: number;
	};
	indoor: { temp: number; trend: number; humidity: number };
	solar: { solar: number; uvi: number; sunrise: string; sunset: string; moon: string };
	rain: {
		rate: number;
		daily: number;
		event: number;
		hourly: number;
		weekly: number;
		monthly: number;
		yearly: number;
	};
	wind: { dir: number; speed: number; gust: number; timeSpeed?: string; timeGust?: string };
	pressure: { rel: number; abs: number; deltaRel: number; deltaAbs: number };
	battery: { status: 'NORMAL' | 'LOW' | 'CRITICAL'; note?: string };
	series: { t: number; temp: number; feels: number; dew: number }[];
};

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

/**
 * Fields the station doesn't report and the app doesn't calculate yet (sunrise, sunset and
 * the moon phase are calculated in `$lib/sun`): the provider fills
 * them from getMockWeather() or with 0. Everything else is sample data only when a reading
 * lacks it (e.g. readings stored before gbros-api#15).
 */
export const ALWAYS_SAMPLE_FIELDS: readonly WeatherField[] = [
	'outdoor.trend',
	'indoor.trend',
	'wind.timeSpeed',
	'wind.timeGust',
	'pressure.deltaRel',
	'pressure.deltaAbs',
	'series'
];

/** Dew point in °C (Magnus formula). */
export function dewPointC(tempC: number, rhPct: number): number {
	const a = 17.27;
	const b = 237.7;
	const alpha = (a * tempC) / (b + tempC) + Math.log(rhPct / 100);
	return (b * alpha) / (a - alpha);
}

/**
 * Fallback mock weather data.
 */

export function getMockWeather(): Weather {
	const now = new Date();
	return {
		updatedAt: now.toISOString(),
		outdoor: { temp: 12.2, trend: 0.8, feelsLike: 12.2, dewPoint: 5.6, humidity: 64, vpd: 0.511 },
		indoor: { temp: 14.5, trend: -1.4, humidity: 57 },
		solar: { solar: 306.2, uvi: 2, sunrise: '06:25', sunset: '17:57', moon: 'Waning Gibbous' },
		rain: { rate: 0, daily: 0, event: 31.8, hourly: 0, weekly: 33.6, monthly: 33.6, yearly: 33.6 },
		wind: { dir: 221, speed: 8.6, gust: 18.4, timeSpeed: '09:46', timeGust: '00:07' },
		pressure: { rel: 993.7, abs: 993.7, deltaRel: -0.2, deltaAbs: -0.2 },
		battery: { status: 'NORMAL', note: 'Sensor Array' },
		series: Array.from({ length: 48 }).map((_, i) => ({
			t: i,
			temp: 6 + i * 0.12 + Math.sin(i / 3) * 0.5,
			feels: 5.5 + i * 0.1 + Math.sin(i / 4) * 0.4,
			dew: 3 + Math.sin(i / 5) * 0.3
		}))
	};
}

/**
 * Fetch full weather payload from the app's weather API endpoint.
 */
export type WeatherResult = {
	weather: Weather;
	connected: boolean;
	source: 'ecowitt' | 'mock';
	/** Values that are sample data rather than readings; every field when `source` is `'mock'`. */
	mockFields: WeatherField[];
};

// Fetch via backend provider mapping FastAPI reading -> Weather shape
import { fetchBackendWeatherMeta } from '$lib/providers/backend';
import CONFIG from './config';

/** Pass SvelteKit's `fetch` from a load function; relative `/api` URLs fail on the server otherwise. */
export async function fetchWeather(fetchFn: typeof fetch = fetch): Promise<WeatherResult> {
	const { data, connected, source, mockFields } = await fetchBackendWeatherMeta(fetchFn);
	return { weather: data, connected, source, mockFields };
}

/**
 * Fetch a single weather metric from the app's weather API endpoint.
 */
export type WeatherHistoryRow = {
	timestamp_utc: string;
	tz?: string | null;
	temp_c?: number | null;
	humidity_pct?: number | null;
	pressure_hpa?: number | null;
	wind_avg_ms?: number | null;
	wind_gust_ms?: number | null;
	wind_dir_deg?: number | null;
	rain_1h_mm?: number | null;
	rain_24h_mm?: number | null;
	solar_wm2?: number | null;
	// Stored since gbros-api#15; absent from older readings.
	dew_point_c?: number | null;
	indoor_temp_c?: number | null;
	indoor_humidity_pct?: number | null;
	rain_daily_mm?: number | null;
	uvi?: number | null;
	/** Series rows only: how many readings the bucket averages. */
	count?: number;
};

export type WeatherSeries = { bucketSec: number; rows: WeatherHistoryRow[] };

/** Readings averaged into buckets (gusts and rain totals take the maximum), for long spans. */
export async function fetchWeatherSeries(
	from: number,
	to: number,
	fetchFn: typeof fetch = fetch,
	points = 500
): Promise<WeatherSeries> {
	const res = await fetchFn(
		`${CONFIG.backend.weatherSeries}?from=${from}&to=${to}&points=${points}`
	);
	if (!res.ok) {
		throw new Error(`Unable to fetch series: ${res.status}`);
	}
	const json = await res.json();
	return {
		bucketSec: typeof json?.bucket_sec === 'number' ? json.bucket_sec : 60,
		rows: Array.isArray(json?.data) ? (json.data as WeatherHistoryRow[]) : []
	};
}

export async function fetchWeatherHistory(
	from: number,
	to: number,
	fetchFn: typeof fetch = fetch
): Promise<WeatherHistoryRow[]> {
	// The backend's default limit (1,000) is less than a day of 60-second readings.
	const res = await fetchFn(
		`${CONFIG.backend.weatherHistory}?from=${from}&to=${to}&limit=2000&_ts=${Date.now()}`
	);
	if (!res.ok) {
		throw new Error(`Unable to fetch history: ${res.status}`);
	}
	const json = await res.json();
	const rows = Array.isArray(json?.data) ? (json.data as WeatherHistoryRow[]) : [];
	return rows;
}
