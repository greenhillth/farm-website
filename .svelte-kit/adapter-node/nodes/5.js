

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/map/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true
};
export const universal_id = "src/routes/map/+page.ts";
export const imports = ["_app/immutable/nodes/5.D1pMF-CH.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/JuifgMeT.js","_app/immutable/chunks/DQ7jUk8X.js","_app/immutable/chunks/BQITOQ2H.js","_app/immutable/chunks/BpVGysJh.js","_app/immutable/chunks/BPPT-HsW.js","_app/immutable/chunks/CM66DKVZ.js","_app/immutable/chunks/A4GWV78b.js","_app/immutable/chunks/B83ignaW.js","_app/immutable/chunks/BKBjTOe9.js","_app/immutable/chunks/7N3vqeI3.js","_app/immutable/chunks/JUwWWdSW.js","_app/immutable/chunks/DbgaR2Qa.js","_app/immutable/chunks/ajcS3Meh.js","_app/immutable/chunks/C9W0NbdG.js","_app/immutable/chunks/CsBJ9ToZ.js","_app/immutable/chunks/DTYDvhzr.js","_app/immutable/chunks/CxRGDEAJ.js"];
export const stylesheets = ["_app/immutable/assets/5.C4goDB40.css"];
export const fonts = [];
