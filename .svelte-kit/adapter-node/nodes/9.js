import * as universal from '../entries/pages/weather/_page.ts.js';

export const index = 9;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/+page.ts";
export const imports = ["_app/immutable/nodes/9.Bwwjstx_.js","_app/immutable/chunks/zRQxpyKE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/76m0y0zj.js","_app/immutable/chunks/Cy7NpJy3.js","_app/immutable/chunks/BN5QsEzf.js","_app/immutable/chunks/CuXKmgDK.js","_app/immutable/chunks/BWS38yz9.js","_app/immutable/chunks/LLHKzi1v.js","_app/immutable/chunks/CxhXp5PL.js","_app/immutable/chunks/BNfZqJWD.js","_app/immutable/chunks/BxrZu97y.js","_app/immutable/chunks/Bcbkfd4L.js","_app/immutable/chunks/BzYxXZdQ.js","_app/immutable/chunks/CddE555Y.js"];
export const stylesheets = [];
export const fonts = [];
