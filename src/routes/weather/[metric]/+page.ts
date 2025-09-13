import type { PageLoad } from './$types';
import { fetchMetric, fetchWeather } from '$lib/weather';

export const load: PageLoad = async ({ params, fetch }) => {
	const res = await fetchWeather();
	let log: unknown = [];
	try {
		log = await fetchMetric(params.metric, fetch);
	} catch (_) {
		log = [];
	}
	return {
		metric: params.metric,
		w: res.weather,
		connected: res.connected,
		source: res.source,
		log
	};
};
