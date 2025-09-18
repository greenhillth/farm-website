

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/map/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true
};
export const universal_id = "src/routes/map/+page.ts";
export const imports = ["_app/immutable/nodes/5._tZTXEqm.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CUpp2D4R.js","_app/immutable/chunks/D3hnq5Lw.js","_app/immutable/chunks/BKAmdj7v.js","_app/immutable/chunks/CyMfPZwD.js","_app/immutable/chunks/BAepqZDa.js","_app/immutable/chunks/C8G_k6Vd.js","_app/immutable/chunks/YV7UHqrJ.js","_app/immutable/chunks/AXX0dV26.js","_app/immutable/chunks/vHK5TZWi.js","_app/immutable/chunks/CRIVDraG.js","_app/immutable/chunks/Cemeu-3r.js","_app/immutable/chunks/BWB5JzbP.js","_app/immutable/chunks/Dc2dfOm4.js","_app/immutable/chunks/Cvi7aHJ-.js","_app/immutable/chunks/CSpGEONf.js","_app/immutable/chunks/w9uLdyuF.js"];
export const stylesheets = ["_app/immutable/assets/5.C4goDB40.css"];
export const fonts = [];
