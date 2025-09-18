import * as universal from '../entries/pages/weather/_metric_/_page.ts.js';

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_metric_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/[metric]/+page.ts";
export const imports = ["_app/immutable/nodes/10.wN4SxL-H.js","_app/immutable/chunks/zRQxpyKE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/76m0y0zj.js","_app/immutable/chunks/Cy7NpJy3.js","_app/immutable/chunks/CuXKmgDK.js","_app/immutable/chunks/CpGDwUWb.js","_app/immutable/chunks/C8Q-pcS8.js","_app/immutable/chunks/LLHKzi1v.js","_app/immutable/chunks/BNfZqJWD.js","_app/immutable/chunks/BxrZu97y.js","_app/immutable/chunks/Bcbkfd4L.js","_app/immutable/chunks/BzYxXZdQ.js"];
export const stylesheets = [];
export const fonts = [];
