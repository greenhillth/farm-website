

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/map/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true
};
export const universal_id = "src/routes/map/+page.ts";
export const imports = ["_app/immutable/nodes/4.uOnoo9OE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CCFGYCSD.js","_app/immutable/chunks/CdmsYw1U.js","_app/immutable/chunks/i2KPoIqR.js","_app/immutable/chunks/BUMWtct1.js","_app/immutable/chunks/Ckc-z1rI.js","_app/immutable/chunks/Bdri3CNH.js","_app/immutable/chunks/CJH7hj5q.js","_app/immutable/chunks/CYky5jYs.js","_app/immutable/chunks/Bpw-ON10.js","_app/immutable/chunks/CQWZqjad.js","_app/immutable/chunks/DEealsxF.js"];
export const stylesheets = ["_app/immutable/assets/4.CF1J4gj_.css"];
export const fonts = [];
