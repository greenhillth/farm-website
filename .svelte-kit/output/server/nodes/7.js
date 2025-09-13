import * as universal from '../entries/pages/weather/_page.ts.js';

export const index = 7;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/+page.ts";
export const imports = ["_app/immutable/nodes/7.CrcYajwV.js","_app/immutable/chunks/DHu8W8xM.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/KrGMG5d4.js","_app/immutable/chunks/C0ys7KY4.js","_app/immutable/chunks/DN-rPOIK.js","_app/immutable/chunks/ClEjLSVY.js","_app/immutable/chunks/qZ6aaTlc.js","_app/immutable/chunks/CauDJsBl.js","_app/immutable/chunks/CrX52mly.js","_app/immutable/chunks/CALS168o.js","_app/immutable/chunks/CuUo-GuR.js","_app/immutable/chunks/CBS-fKD7.js"];
export const stylesheets = [];
export const fonts = [];
