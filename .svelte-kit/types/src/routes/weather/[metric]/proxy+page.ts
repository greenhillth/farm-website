// @ts-nocheck
import type { PageLoad } from './$types';
import { fetchWeather } from '$lib/mqss';

export const load = async ({ params, fetch }: Parameters<PageLoad>[0]) => {
  const w = await fetchWeather(fetch);
  return { metric: params.metric, w };
};
