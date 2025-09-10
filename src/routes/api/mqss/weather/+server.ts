import { json } from '@sveltejs/kit';
import { getMockWeather } from '$lib/mockWeather';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
  return json(getMockWeather());
};
