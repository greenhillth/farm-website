import type { Weather } from './mockWeather';
import { getMockWeather } from './mockWeather';

/**
 * Fetch full weather payload from the app's weather API endpoint.
 */
export type WeatherResult = { weather: Weather; connected: boolean; source: 'ecowitt' | 'mock' };

export async function fetchWeather(fetchFn: typeof fetch = fetch): Promise<WeatherResult> {
	try {
		const res = await fetchFn(`/svc/weather?_ts=${Date.now()}`);
		if (!res.ok) throw new Error(`status ${res.status}`);
		const data = (await res.json()) as Weather;
		const connected = res.headers.get('x-weather-connected') === 'true';
		const source = (res.headers.get('x-weather-source') as 'ecowitt' | 'mock') || 'mock';
		return { weather: data, connected, source };
	} catch (_) {
		// Fallback placeholder when service is unavailable
		return { weather: getMockWeather(), connected: false, source: 'mock' };
	}
}

/**
 * Fetch a single weather metric from the app's weather API endpoint.
 */
export async function fetchMetric(metric: string, fetchFn: typeof fetch = fetch): Promise<unknown> {
	const res = await fetchFn(`/svc/weather/${metric}?_ts=${Date.now()}`);
	if (!res.ok) {
		throw new Error(`Unknown metric: ${metric}`);
	}
	return res.json();
}
