import * as universal from '../entries/pages/weather/_page.ts.js';

export const index = 9;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/+page.ts";
export const imports = ["_app/immutable/nodes/9.senVA_wo.js","_app/immutable/chunks/C3gYeSLU.js","_app/immutable/chunks/CxRGDEAJ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BwJTUN5G.js","_app/immutable/chunks/DsSUZBsh.js","_app/immutable/chunks/DGtjQllA.js","_app/immutable/chunks/9EmW-GsR.js","_app/immutable/chunks/CX9GW7SH.js","_app/immutable/chunks/CJ5Vqxhv.js","_app/immutable/chunks/DqRQz1vC.js","_app/immutable/chunks/BF6W-tJf.js","_app/immutable/chunks/B6_lBng7.js","_app/immutable/chunks/DDlElFAC.js","_app/immutable/chunks/5IiInUXS.js","_app/immutable/chunks/us8eDjq2.js"];
export const stylesheets = [];
export const fonts = [];
