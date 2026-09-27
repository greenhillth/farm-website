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
