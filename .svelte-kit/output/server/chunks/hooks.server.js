import { b as private_env } from "./shared-server.js";
const trimTrailingSlash = (value) => value.endsWith("/") ? value.slice(0, -1) : value;
const handleFetch = async ({ event, request, fetch }) => {
  const requestUrl = new URL(request.url);
  const sameOrigin = requestUrl.origin === event.url.origin;
  if (sameOrigin && requestUrl.pathname.startsWith("/api/")) {
    const backendOrigin = trimTrailingSlash(private_env.BACKEND_ORIGIN ?? "http://127.0.0.1:8000");
    const targetUrl = `${backendOrigin}${requestUrl.pathname}${requestUrl.search}`;
    const proxied = new Request(targetUrl, request);
    proxied.headers.set("x-forwarded-host", event.url.host);
    proxied.headers.set("x-forwarded-proto", event.url.protocol.replace(":", ""));
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      proxied.headers.set("x-forwarded-for", forwardedFor);
    } else if (typeof event.getClientAddress === "function") {
      const clientAddress = event.getClientAddress();
      if (clientAddress) {
        proxied.headers.set("x-forwarded-for", clientAddress);
      }
    }
    return fetch(proxied);
  }
  return fetch(request);
};
export {
  handleFetch
};
