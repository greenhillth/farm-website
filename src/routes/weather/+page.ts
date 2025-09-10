import type { PageLoad } from './$types';
import { fetchWeather } from '$lib/mqss';

export const load: PageLoad = async ({ fetch }) => {
  const w = await fetchWeather(fetch);
  return { w };
};
