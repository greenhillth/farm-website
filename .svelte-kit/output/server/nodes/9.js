import * as universal from '../entries/pages/weather/_page.ts.js';

export const index = 9;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/+page.ts";
export const imports = ["_app/immutable/nodes/9.B-P4n4zl.js","_app/immutable/chunks/C3gYeSLU.js","_app/immutable/chunks/CxRGDEAJ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/JuifgMeT.js","_app/immutable/chunks/DQ7jUk8X.js","_app/immutable/chunks/BQITOQ2H.js","_app/immutable/chunks/BpVGysJh.js","_app/immutable/chunks/BPPT-HsW.js","_app/immutable/chunks/B83ignaW.js","_app/immutable/chunks/BKBjTOe9.js","_app/immutable/chunks/ajcS3Meh.js","_app/immutable/chunks/CSrG6tpm.js","_app/immutable/chunks/C9W0NbdG.js","_app/immutable/chunks/CsBJ9ToZ.js","_app/immutable/chunks/CEUT2Dup.js"];
export const stylesheets = [];
export const fonts = [];
