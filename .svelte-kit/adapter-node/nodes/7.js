import * as universal from '../entries/pages/weather/_page.ts.js';

export const index = 7;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/+page.ts";
export const imports = ["_app/immutable/nodes/7.BRHlKGTO.js","_app/immutable/chunks/CY139KZX.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C-6_ZYAD.js","_app/immutable/chunks/CzOZ74WA.js","_app/immutable/chunks/CYB-70ru.js","_app/immutable/chunks/ClbvZk9Z.js","_app/immutable/chunks/BZM75AQp.js","_app/immutable/chunks/DQ-CN1Tm.js","_app/immutable/chunks/S5dyTfSz.js","_app/immutable/chunks/DWxY_OJU.js","_app/immutable/chunks/EeQyfODi.js","_app/immutable/chunks/D0eNdZx1.js"];
export const stylesheets = [];
export const fonts = [];
