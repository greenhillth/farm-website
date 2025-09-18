import * as universal from '../entries/pages/weather/_page.ts.js';

export const index = 9;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/+page.ts";
export const imports = ["_app/immutable/nodes/9.B-n5JCap.js","_app/immutable/chunks/zRQxpyKE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CUpp2D4R.js","_app/immutable/chunks/D3hnq5Lw.js","_app/immutable/chunks/BKAmdj7v.js","_app/immutable/chunks/CyMfPZwD.js","_app/immutable/chunks/BAepqZDa.js","_app/immutable/chunks/AXX0dV26.js","_app/immutable/chunks/vHK5TZWi.js","_app/immutable/chunks/Dc2dfOm4.js","_app/immutable/chunks/CAllNap8.js","_app/immutable/chunks/Cvi7aHJ-.js","_app/immutable/chunks/CSpGEONf.js","_app/immutable/chunks/DJExScv9.js"];
export const stylesheets = [];
export const fonts = [];
