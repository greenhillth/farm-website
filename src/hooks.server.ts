import type { HandleFetch } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const trimTrailingSlash = (value: string) =>
	value.endsWith('/') ? value.slice(0, -1) : value;

export const handleFetch: HandleFetch = async ({ event, request, fetch }) => {
	const requestUrl = new URL(request.url);
	const sameOrigin = requestUrl.origin === event.url.origin;

	if (sameOrigin && requestUrl.pathname.startsWith('/api/')) {
		const backendOrigin =
			trimTrailingSlash(env.BACKEND_ORIGIN ?? 'http://127.0.0.1:8000');
		const targetUrl = `${backendOrigin}${requestUrl.pathname}${requestUrl.search}`;
		const proxied = new Request(targetUrl, request);
		proxied.headers.set('x-forwarded-host', event.url.host);
		proxied.headers.set('x-forwarded-proto', event.url.protocol.replace(':', ''));
		const forwardedFor = request.headers.get('x-forwarded-for');
		if (forwardedFor) {
			proxied.headers.set('x-forwarded-for', forwardedFor);
		} else if (typeof event.getClientAddress === 'function') {
			const clientAddress = event.getClientAddress();
			if (clientAddress) {
				proxied.headers.set('x-forwarded-for', clientAddress);
			}
		}
		return fetch(proxied);
	}

	return fetch(request);
};
