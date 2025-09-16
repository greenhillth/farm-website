import * as universal from '../entries/pages/weather/_page.ts.js';

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/+page.ts";
export const imports = ["_app/immutable/nodes/8.CFwFjuSR.js","_app/immutable/chunks/CY139KZX.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CCFGYCSD.js","_app/immutable/chunks/CdmsYw1U.js","_app/immutable/chunks/i2KPoIqR.js","_app/immutable/chunks/BUMWtct1.js","_app/immutable/chunks/Ckc-z1rI.js","_app/immutable/chunks/CJH7hj5q.js","_app/immutable/chunks/CYky5jYs.js","_app/immutable/chunks/CQWZqjad.js","_app/immutable/chunks/DNrX4qGI.js","_app/immutable/chunks/s4922vBQ.js"];
export const stylesheets = [];
export const fonts = [];
