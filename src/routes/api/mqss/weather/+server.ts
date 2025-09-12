import { json } from '@sveltejs/kit';
import { fetchEcowittWeatherMeta } from '$lib/providers/ecowitt';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const meta = await fetchEcowittWeatherMeta();
  return json(meta.data, {
    headers: {
      'x-weather-connected': String(meta.connected),
      'x-weather-source': meta.source
    }
  });
};
