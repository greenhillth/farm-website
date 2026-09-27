import { describe, expect, it, vi } from 'vitest';

import type { Weather } from '$lib/weather';
import { load as dashboardLoad } from './+page';
import { load as metricLoad } from './[metric]/+page';

// A backend reading whose temperature differs from getMockWeather()'s 12.2 °C.
const reading = { timestamp_utc: '2026-09-26 01:00:00', temp_c: 14.2, humidity_pct: 70 };

function backendFetch() {
	return vi.fn(async (input: RequestInfo | URL) => {
		const url = String(input);
		if (url.startsWith('/api/weather/current')) return Response.json(reading);
		if (url.startsWith('/api/weather?')) return Response.json({ data: [] });
		return new Response('not found', { status: 404 });
	});
}

type DashboardEvent = Parameters<typeof dashboardLoad>[0];
type MetricEvent = Parameters<typeof metricLoad>[0];
// PageLoad results are typed `void | Record<string, any>`; these loads always return data.
type LoadResult = { w: Weather; connected: boolean; source: string; metric?: string };

describe('weather load functions', () => {
	it('dashboard load reads current weather through the fetch it is given', async () => {
		const fetch = backendFetch();
		const result = (await dashboardLoad({ fetch } as unknown as DashboardEvent)) as LoadResult;

		expect(fetch).toHaveBeenCalledWith('/api/weather/current');
		expect(result).toMatchObject({ connected: true, source: 'ecowitt' });
		expect(result.w.outdoor.temp).toBe(14.2);
	});

	it('metric load reads current weather through the fetch it is given', async () => {
		const fetch = backendFetch();
		const result = (await metricLoad({
			fetch,
			params: { metric: 'outdoor' }
		} as unknown as MetricEvent)) as LoadResult;

		expect(fetch).toHaveBeenCalledWith('/api/weather/current');
		expect(result).toMatchObject({ connected: true, source: 'ecowitt', metric: 'outdoor' });
		expect(result.w.outdoor.temp).toBe(14.2);
	});

	it('falls back to mock data when the backend fails', async () => {
		const fetch = vi.fn(async () => new Response('Backend unavailable', { status: 502 }));
		const result = (await dashboardLoad({ fetch } as unknown as DashboardEvent)) as LoadResult;

		expect(result).toMatchObject({ connected: false, source: 'mock' });
		expect(result.w.outdoor.temp).toBe(12.2);
	});
});
