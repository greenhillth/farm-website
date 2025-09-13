// @ts-nocheck
import type { PageLoad } from './$types';
import { fetchWeather } from '$lib/weather';

export const load = async () => {
	const res = await fetchWeather();
	return { w: res.weather, connected: res.connected, source: res.source };
};
;null as any as PageLoad;