import type { PageLoad } from './$types';
import { fetchWeather } from '$lib/weather';

export const load: PageLoad = async ({ fetch }) => {
	const res = await fetchWeather(fetch);
	return { w: res.weather, connected: res.connected, source: res.source };
};
