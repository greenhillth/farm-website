import { b as private_env } from './shared-server-DaWdgxVh.js';

const resolveBackendBase = () => private_env.BACKEND_ORIGIN ?? `http://localhost:${private_env.BACKEND_PORT ?? "8000"}`;
const buildTargetUrl = (path, search) => {
  const base = resolveBackendBase().replace(/\/$/, "");
  const safePath = path.replace(/^\/+/, "");
  const pathname = safePath ? `/${safePath}` : "";
  return `${base}${pathname}${search}`;
};
const proxy = async ({ request, params, fetch, url }) => {
  const targetUrl = buildTargetUrl(params.path ?? "", url.search);
  const headers = new Headers(request.headers);
  headers.delete("host");
  const init = {
    method: request.method,
    headers
  };
  if (!["GET", "HEAD"].includes(request.method)) {
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
const GET = proxy;
const POST = proxy;
const PUT = proxy;
const PATCH = proxy;
const DELETE = proxy;
const OPTIONS = proxy;
const HEAD = proxy;

export { DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT };
//# sourceMappingURL=_server.ts-7Lu9Ek4W.js.map
