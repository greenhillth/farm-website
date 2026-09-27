import CONFIG from '$lib/config';
import {
	ALWAYS_SAMPLE_FIELDS,
	WEATHER_FIELDS,
	dewPointC,
	getMockWeather,
	type Weather,
	type WeatherField
} from '$lib/weather';

export type WeatherMeta = {
	data: Weather;
	connected: boolean;
	source: 'ecowitt' | 'mock';
	mockFields: WeatherField[];
};

type WeatherReading = {
	timestamp_utc: string;
	tz?: string;
	temp_c?: number | null;
	humidity_pct?: number | null;
	pressure_hpa?: number | null;
	wind_avg_ms?: number | null;
	wind_gust_ms?: number | null;
	wind_dir_deg?: number | null;
	rain_1h_mm?: number | null;
	rain_24h_mm?: number | null;
	solar_wm2?: number | null;
};

function coerceUtcIsoString(value?: string): string {
	if (!value) {
		return new Date().toISOString();
	}

	const trimmed = value.trim();
	const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
	const normalized = trimmed.replace(' ', 'T');
	const stamped = hasTz ? normalized : `${normalized}Z`;
	const parsed = new Date(stamped);

	if (!Number.isNaN(parsed.getTime())) {
		return parsed.toISOString();
	}

	const fallback = new Date(trimmed);
	return Number.isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
}

function computeVPD_c_kPa(tempC: number, rh: number): number {
	const es = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
	const ea = (rh / 100) * es;
	return Math.max(0, es - ea);
}

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

export async function fetchBackendWeatherMeta(fetchFn: typeof fetch = fetch): Promise<WeatherMeta> {
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
}
