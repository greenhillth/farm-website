import type { PageLoad } from './$types';
import { fetchWeather } from '$lib/weather';

export const load: PageLoad = async () => {
	const res = await fetchWeather();
	return { w: res.weather, connected: res.connected, source: res.source };
};
