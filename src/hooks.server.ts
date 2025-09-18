import type { HandleFetch } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const trimTrailingSlash = (value: string) => (value.endsWith('/') ? value.slice(0, -1) : value);

export const handleFetch: HandleFetch = async ({ event, request, fetch }) => {
	const requestUrl = new URL(request.url);

	if (requestUrl.origin === event.url.origin && requestUrl.pathname.startsWith('/api/')) {
		const backendOrigin = env.BACKEND_ORIGIN ?? 'http://localhost:8000';
		const targetBase = trimTrailingSlash(backendOrigin);
		const targetUrl = `${targetBase}${requestUrl.pathname}${requestUrl.search}`;

		if (request.method === 'GET' || request.method === 'HEAD') {
			return fetch(targetUrl, {
				method: request.method,
				headers: request.headers
			});
		}

		const cloned = request.clone();
		const body = await cloned.arrayBuffer();

		return fetch(targetUrl, {
			method: request.method,
			headers: request.headers,
			body
		});
	}

	return fetch(request);
};
