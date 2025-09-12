// @ts-nocheck
import type { PageLoad } from './$types';
import { fetchWeather } from '$lib/mqss';

export const load = async ({ fetch }: Parameters<PageLoad>[0]) => {
  const res = await fetchWeather(fetch);
  return { w: res.weather, connected: res.connected, source: res.source };
};
