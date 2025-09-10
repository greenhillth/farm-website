import { json, error } from '@sveltejs/kit';
import { getMockWeather } from '$lib/mockWeather';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
  const data = getMockWeather();
  const metric = params.metric as keyof typeof data;
  if (metric in data) {
    // @ts-ignore dynamic index
    return json(data[metric]);
  }
  throw error(404, 'Unknown metric');
};
