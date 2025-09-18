import * as universal from '../entries/pages/weather/_metric_/_page.ts.js';

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_metric_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/[metric]/+page.ts";
export const imports = ["_app/immutable/nodes/10.YlHVWJLO.js","_app/immutable/chunks/zRQxpyKE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CqJAwCt_.js","_app/immutable/chunks/CthTPqsi.js","_app/immutable/chunks/CNYzTQXq.js","_app/immutable/chunks/DLeCJMEp.js","_app/immutable/chunks/B5mXUOAW.js","_app/immutable/chunks/CCVHFpir.js","_app/immutable/chunks/5_-TE14Q.js","_app/immutable/chunks/BbaiMmwp.js"];
export const stylesheets = [];
export const fonts = [];
