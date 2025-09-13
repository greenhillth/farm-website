// @ts-nocheck
import type { PageLoad } from './$types';
import { fetchWeather } from '$lib/weather';

export const load = async ({ params }: Parameters<PageLoad>[0]) => {
	const res = await fetchWeather();
	return { metric: params.metric, w: res.weather, connected: res.connected, source: res.source };
};
