import type { PageLoad } from './$types';
import { fetchWeather } from '$lib/mqss';

export const load: PageLoad = async ({ params, fetch }) => {
  const w = await fetchWeather(fetch);
  return { metric: params.metric, w };
};
