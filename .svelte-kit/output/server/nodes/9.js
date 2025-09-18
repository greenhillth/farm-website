import * as universal from '../entries/pages/weather/_page.ts.js';

export const index = 9;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/+page.ts";
export const imports = ["_app/immutable/nodes/9.DLOBUVPD.js","_app/immutable/chunks/zRQxpyKE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CqJAwCt_.js","_app/immutable/chunks/CthTPqsi.js","_app/immutable/chunks/SMSclcs1.js","_app/immutable/chunks/CNYzTQXq.js","_app/immutable/chunks/BkQ9GEEK.js","_app/immutable/chunks/CCVHFpir.js","_app/immutable/chunks/DeAsnCzY.js","_app/immutable/chunks/5_-TE14Q.js","_app/immutable/chunks/BbaiMmwp.js","_app/immutable/chunks/8ZPSmxhP.js"];
export const stylesheets = [];
export const fonts = [];
