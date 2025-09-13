import type { PageLoad } from './$types';
import { fetchWeather } from '$lib/weather';

export const load: PageLoad = async ({ params }) => {
	const res = await fetchWeather();
	return { metric: params.metric, w: res.weather, connected: res.connected, source: res.source };
};
