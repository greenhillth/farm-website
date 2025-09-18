import * as universal from '../entries/pages/weather/_metric_/_page.ts.js';

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_metric_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/[metric]/+page.ts";
export const imports = ["_app/immutable/nodes/10.BEds2raS.js","_app/immutable/chunks/zRQxpyKE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CUpp2D4R.js","_app/immutable/chunks/D3hnq5Lw.js","_app/immutable/chunks/CyMfPZwD.js","_app/immutable/chunks/C8G_k6Vd.js","_app/immutable/chunks/YV7UHqrJ.js","_app/immutable/chunks/AXX0dV26.js","_app/immutable/chunks/Dc2dfOm4.js","_app/immutable/chunks/CAllNap8.js","_app/immutable/chunks/Cvi7aHJ-.js","_app/immutable/chunks/CSpGEONf.js"];
export const stylesheets = [];
export const fonts = [];
