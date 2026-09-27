import { describe, expect, it, vi } from 'vitest';

import { load } from './+page';

type Event = Parameters<typeof load>[0];
type Result = { weather: { source: string } | null; soil: { paddocksTested: number } | null };

const reading = { timestamp_utc: '2026-09-26 01:00:00', temp_c: 14.2, humidity_pct: 70 };
const latest = [{ fieldID: '1', sample_date: '2024-01-01', ph_water: 6.5 }];

function fetchWith(routes: Record<string, () => Response>) {
	return vi.fn(async (input: RequestInfo | URL) => {
		const url = String(input);
		for (const [prefix, respond] of Object.entries(routes)) {
			if (url.startsWith(prefix)) return respond();
		}
		return new Response('not found', { status: 404 });
	});
}

describe('home load', () => {
	it('returns weather and a soil summary', async () => {
		const fetch = fetchWith({
			'/api/weather/current': () => Response.json(reading),
			'/api/soil-tests?latest=true': () => Response.json(latest)
		});
		const result = (await load({ fetch } as unknown as Event)) as Result;

		expect(result.weather?.source).toBe('ecowitt');
		expect(result.soil?.paddocksTested).toBe(1);
	});

	it('still returns the soil summary when the weather station is down', async () => {
		const fetch = fetchWith({
			'/api/weather/current': () => new Response('down', { status: 502 }),
			'/api/soil-tests?latest=true': () => Response.json(latest)
		});
		const result = (await load({ fetch } as unknown as Event)) as Result;

		expect(result.weather?.source).toBe('mock');
		expect(result.soil?.paddocksTested).toBe(1);
	});

	it('returns soil as null when the soil request fails or is not a list', async () => {
		for (const respond of [
			() => new Response('error', { status: 500 }),
			() => Response.json({ method: 'GET', path: '/api/soil-tests' })
		]) {
			const fetch = fetchWith({
				'/api/weather/current': () => Response.json(reading),
				'/api/soil-tests?latest=true': respond
			});
			const result = (await load({ fetch } as unknown as Event)) as Result;
			expect(result.soil).toBeNull();
			expect(result.weather?.source).toBe('ecowitt');
		}
	});
});
