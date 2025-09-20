import * as universal from '../entries/pages/weather/_metric_/_page.ts.js';

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_metric_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/[metric]/+page.ts";
export const imports = ["_app/immutable/nodes/10.a8_Ix3bx.js","_app/immutable/chunks/C3gYeSLU.js","_app/immutable/chunks/CxRGDEAJ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/JuifgMeT.js","_app/immutable/chunks/DQ7jUk8X.js","_app/immutable/chunks/BpVGysJh.js","_app/immutable/chunks/CM66DKVZ.js","_app/immutable/chunks/A4GWV78b.js","_app/immutable/chunks/B83ignaW.js","_app/immutable/chunks/ajcS3Meh.js","_app/immutable/chunks/CSrG6tpm.js","_app/immutable/chunks/C9W0NbdG.js","_app/immutable/chunks/CsBJ9ToZ.js"];
export const stylesheets = [];
export const fonts = [];
