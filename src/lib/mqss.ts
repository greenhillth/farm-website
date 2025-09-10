import type { Weather } from './mockWeather';
import { getMockWeather } from './mockWeather';

/**
 * Fetch full weather payload from the mock MQSS endpoint.
 */
export async function fetchWeather(fetchFn: typeof fetch = fetch): Promise<Weather> {
  try {
    const res = await fetchFn('/api/mqss/weather');
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as Weather;
    return data;
  } catch (_) {
    // Fallback placeholder when service is unavailable
    return getMockWeather();
  }
}

/**
 * Fetch a single weather metric from the mock MQSS endpoint.
 */
export async function fetchMetric(metric: string, fetchFn: typeof fetch = fetch): Promise<unknown> {
  const res = await fetchFn(`/api/mqss/weather/${metric}`);
  if (!res.ok) {
    throw new Error(`Unknown metric: ${metric}`);
  }
  return res.json();
}
