import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const resolveBackendBase = () => env.BACKEND_ORIGIN ?? `http://localhost:${env.BACKEND_PORT ?? '8000'}`;

const buildTargetUrl = (path: string, search: string) => {
	const base = resolveBackendBase().replace(/\/$/, '');
	const safePath = path.replace(/^\/+/, '');
	const pathname = safePath ? `/${safePath}` : '';
	return `${base}${pathname}${search}`;
};

const proxy: RequestHandler = async ({ request, params, fetch, url }) => {
	const targetUrl = buildTargetUrl(params.path ?? '', url.search);
	const headers = new Headers(request.headers);
	headers.delete('host');

	const init: RequestInit = {
		method: request.method,
		headers
	};

	if (!['GET', 'HEAD'].includes(request.method)) {
		const body = await request.arrayBuffer();
		init.body = body;
	}

	const response = await fetch(targetUrl, init);

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
