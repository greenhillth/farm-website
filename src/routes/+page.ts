import CONFIG from '$lib/config';
import { summariseLatestSoilTests } from '$lib/home-items';
import { fetchWeather } from '$lib/weather';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const [weather, soil] = await Promise.allSettled([
		fetchWeather(fetch),
		fetch(CONFIG.backend.latestTest).then(async (response) => {
			if (!response.ok) throw new Error(`Request failed (${response.status})`);
			return summariseLatestSoilTests(await response.json(), CONFIG.soilMetrics);
		})
	]);

	return {
		weather: weather.status === 'fulfilled' ? weather.value : null,
		soil: soil.status === 'fulfilled' ? soil.value : null
	};
};
