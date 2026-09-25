import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

// Forwards /api/* to the backend with the path unchanged (gbros-api's routes include /api),
// matching the dev proxy in vite.config.ts and handleFetch in hooks.server.ts.
const backendBase = () =>
	(env.BACKEND_ORIGIN ?? `http://localhost:${env.BACKEND_PORT ?? '8000'}`).replace(/\/+$/, '');

const proxy: RequestHandler = async ({ request, fetch, url }) => {
	const targetUrl = `${backendBase()}${url.pathname}${url.search}`;
	const headers = new Headers(request.headers);
	headers.delete('host');
	// undici's fetch() doesn't support forwarding "expect" (curl sends "Expect: 100-continue"
	// on large multipart bodies); dropping it is safe since the body is already buffered below.
	headers.delete('expect');

	const init: RequestInit = {
		method: request.method,
		headers
	};

	if (!['GET', 'HEAD'].includes(request.method)) {
		const body = await request.arrayBuffer();
		init.body = body;
	}

	let response: Response;
	try {
		response = await fetch(targetUrl, init);
	} catch (err) {
		console.error(`[api proxy] ${request.method} ${targetUrl} failed`, err);
		return new Response('Backend unavailable', { status: 502 });
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});
};

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
