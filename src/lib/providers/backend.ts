import CONFIG from '$lib/config';
import { moonPhase, sunTimes } from '$lib/sun';
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
	// Stored since gbros-api#15; null on readings from before it was deployed.
	feels_like_c?: number | null;
	dew_point_c?: number | null;
	vpd_kpa?: number | null;
	indoor_temp_c?: number | null;
	indoor_humidity_pct?: number | null;
	pressure_abs_hpa?: number | null;
	rain_rate_mm_hr?: number | null;
	rain_daily_mm?: number | null;
	rain_event_mm?: number | null;
	rain_weekly_mm?: number | null;
	rain_monthly_mm?: number | null;
	rain_yearly_mm?: number | null;
	uvi?: number | null;
	/** 0 is normal, 1 is low. */
	battery_sensor_array?: number | null;
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

function batteryOf(
	level: number | null | undefined,
	fallback: Weather['battery'],
	mocked: Set<WeatherField>
): Weather['battery'] {
	if (level === null || level === undefined) {
		mocked.add('battery.status');
		mocked.add('battery.note');
		return fallback;
	}
	return { status: level > 0 ? 'LOW' : 'NORMAL', note: 'Outdoor sensor array' };
}

const clock = new Intl.DateTimeFormat('en-AU', {
	timeZone: CONFIG.farm.timeZone,
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

/** Today's sunrise and sunset at the farm, and the moon phase: calculated, not reported. */
function sky(now: Date): { sunrise: string; sunset: string; moon: string } {
	const { lat, lon, timeZone } = CONFIG.farm;
	const { sunrise, sunset } = sunTimes(now, lat, lon, timeZone);
	return {
		sunrise: sunrise ? clock.format(sunrise) : '-',
		sunset: sunset ? clock.format(sunset) : '-',
		moon: moonPhase(now)
	};
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
		// The station's own feels-like, dew point and VPD; before gbros-api#15 they weren't
		// stored, so fall back to the temperature and to computing them.
		outdoor: {
			temp: pick(tempC, mock.outdoor.temp, 'outdoor.temp'),
			trend: 0,
			feelsLike: pick(r.feels_like_c ?? tempC, mock.outdoor.feelsLike, 'outdoor.feelsLike'),
			dewPoint:
				r.dew_point_c ??
				(both ? dewPointC(tempC, rh) : pick(null, mock.outdoor.dewPoint, 'outdoor.dewPoint')),
			humidity: pick(rh, mock.outdoor.humidity, 'outdoor.humidity'),
			vpd:
				r.vpd_kpa ??
				(both ? computeVPD_c_kPa(tempC, rh) : pick(null, mock.outdoor.vpd, 'outdoor.vpd'))
		},
		indoor: {
			temp: pick(r.indoor_temp_c, mock.indoor.temp, 'indoor.temp'),
			trend: 0,
			humidity: pick(r.indoor_humidity_pct, mock.indoor.humidity, 'indoor.humidity')
		},
		solar: {
			solar: pick(r.solar_wm2, mock.solar.solar, 'solar.solar'),
			uvi: pick(r.uvi, mock.solar.uvi, 'solar.uvi'),
			...sky(new Date())
		},
		rain: {
			rate: pick(r.rain_rate_mm_hr, mock.rain.rate, 'rain.rate'),
			// Before gbros-api#15, rain since midnight was stored as rain_24h_mm.
			daily: pick(r.rain_daily_mm ?? r.rain_24h_mm, mock.rain.daily, 'rain.daily'),
			event: pick(r.rain_event_mm, mock.rain.event, 'rain.event'),
			hourly: pick(r.rain_1h_mm, mock.rain.hourly, 'rain.hourly'),
			weekly: pick(r.rain_weekly_mm, mock.rain.weekly, 'rain.weekly'),
			monthly: pick(r.rain_monthly_mm, mock.rain.monthly, 'rain.monthly'),
			yearly: pick(r.rain_yearly_mm, mock.rain.yearly, 'rain.yearly')
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
			abs: pick(r.pressure_abs_hpa ?? r.pressure_hpa, mock.pressure.abs, 'pressure.abs'),
			deltaRel: 0,
			deltaAbs: 0
		},
		battery: batteryOf(r.battery_sensor_array, mock.battery, mocked),
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
