import type { PageLoad } from './$types';
import { fetchWeather, fetchWeatherHistory } from '$lib/weather';
import type { WeatherHistoryRow } from '$lib/weather';

export const load: PageLoad = async ({ params, fetch }) => {
	const res = await fetchWeather();
	const now = Math.floor(Date.now() / 1000);
	const from = now - 24 * 60 * 60;
	let history: WeatherHistoryRow[] = [];
	try {
		history = await fetchWeatherHistory(from, now, fetch);
	} catch (_) {
		history = [];
	}
	return {
		metric: params.metric,
		w: res.weather,
		connected: res.connected,
		source: res.source,
		history,
		range: { from, to: now }
	};
};
