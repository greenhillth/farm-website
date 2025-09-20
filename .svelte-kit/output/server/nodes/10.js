import * as universal from '../entries/pages/weather/_metric_/_page.ts.js';

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_metric_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/[metric]/+page.ts";
export const imports = ["_app/immutable/nodes/10.DCA02yxo.js","_app/immutable/chunks/C3gYeSLU.js","_app/immutable/chunks/CxRGDEAJ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BGYB-Juc.js","_app/immutable/chunks/B5Olihw7.js","_app/immutable/chunks/D8mhcLFN.js","_app/immutable/chunks/yIv7Yito.js","_app/immutable/chunks/BIz-JCsz.js","_app/immutable/chunks/3p1HBkzr.js","_app/immutable/chunks/DmkT_FfW.js","_app/immutable/chunks/Bvch9A-d.js","_app/immutable/chunks/ByUnUfIR.js","_app/immutable/chunks/D9w6eINJ.js"];
export const stylesheets = [];
export const fonts = [];
