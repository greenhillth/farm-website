import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

// Forwards /api/* to the backend with the path unchanged (gbros-api's routes include /api),
// matching the dev proxy in vite.config.ts and handleFetch in hooks.server.ts.
const backendBase = () =>
	(env.BACKEND_ORIGIN ?? `http://localhost:${env.BACKEND_PORT ?? '8000'}`).replace(/\/+$/, '');

// Hop-by-hop headers (RFC 7230 §6.1) describe this leg of the connection, not the request, so
// they must not be forwarded; undici's fetch() throws on several of them (transfer-encoding,
// keep-alive, upgrade) rather than ignoring them. "host" and "expect" are dropped for the same
// reason (curl sends "Expect: 100-continue" on large bodies, which undici also rejects).
const HOP_BY_HOP_HEADERS = [
	'host',
	'expect',
	'connection',
	'keep-alive',
	'proxy-connection',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade'
];

const proxy: RequestHandler = async ({ request, fetch, url }) => {
	const targetUrl = `${backendBase()}${url.pathname}${url.search}`;
	const headers = new Headers(request.headers);
	// A "Connection" header can name additional per-connection headers to strip; the body is
	// already buffered below, so dropping any of these (including transfer-encoding) is safe.
	const named = (headers.get('connection') ?? '').split(',').map((name) => name.trim());
	for (const name of [...HOP_BY_HOP_HEADERS, ...named]) {
		if (name) headers.delete(name);
	}

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
