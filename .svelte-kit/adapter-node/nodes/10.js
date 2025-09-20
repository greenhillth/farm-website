import * as universal from '../entries/pages/weather/_metric_/_page.ts.js';

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_metric_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/[metric]/+page.ts";
export const imports = ["_app/immutable/nodes/10.B8llKsjZ.js","_app/immutable/chunks/C3gYeSLU.js","_app/immutable/chunks/CxRGDEAJ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BwJTUN5G.js","_app/immutable/chunks/DsSUZBsh.js","_app/immutable/chunks/9EmW-GsR.js","_app/immutable/chunks/D-WHDOiA.js","_app/immutable/chunks/DGye0OXN.js","_app/immutable/chunks/CJ5Vqxhv.js","_app/immutable/chunks/BF6W-tJf.js","_app/immutable/chunks/B6_lBng7.js","_app/immutable/chunks/DDlElFAC.js","_app/immutable/chunks/5IiInUXS.js"];
export const stylesheets = [];
export const fonts = [];
