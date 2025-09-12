import { json, error } from '@sveltejs/kit';
import { fetchEcowittWeatherMeta } from '$lib/providers/ecowitt';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const meta = await fetchEcowittWeatherMeta();
  const data = meta.data;
  const metric = params.metric as keyof typeof data;
  if (metric in data) {
    // @ts-ignore dynamic index
    return json(data[metric], {
      headers: {
        'x-weather-connected': String(meta.connected),
        'x-weather-source': meta.source
      }
    });
  }
  throw error(404, 'Unknown metric');
};
