import * as universal from '../entries/pages/weather/_page.ts.js';

export const index = 9;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/+page.ts";
export const imports = ["_app/immutable/nodes/9.DwGXssvR.js","_app/immutable/chunks/gAv0IJ0H.js","_app/immutable/chunks/BW0v18n8.js","_app/immutable/chunks/gMANoNyM.js","_app/immutable/chunks/DyE--mCz.js","_app/immutable/chunks/DCbrFlEo.js","_app/immutable/chunks/DhDNuMY7.js","_app/immutable/chunks/BbdDiNu8.js","_app/immutable/chunks/DHsMR0Qm.js","_app/immutable/chunks/BQ_0hbCf.js","_app/immutable/chunks/C3rpjDiE.js","_app/immutable/chunks/BEAiq2bU.js","_app/immutable/chunks/BFYe4vL5.js","_app/immutable/chunks/DxtC1dWa.js","_app/immutable/chunks/CAPqBfw1.js"];
export const stylesheets = [];
export const fonts = [];
