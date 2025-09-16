// @ts-nocheck
import type { PageLoad } from './$types';
import { fetchMetric, fetchWeather } from '$lib/weather';

export const load = async ({ params, fetch }: Parameters<PageLoad>[0]) => {
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
