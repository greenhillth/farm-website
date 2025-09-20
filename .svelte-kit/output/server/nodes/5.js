

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/map/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true
};
export const universal_id = "src/routes/map/+page.ts";
export const imports = ["_app/immutable/nodes/5.5P4N7krj.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BwJTUN5G.js","_app/immutable/chunks/DsSUZBsh.js","_app/immutable/chunks/DGtjQllA.js","_app/immutable/chunks/9EmW-GsR.js","_app/immutable/chunks/CX9GW7SH.js","_app/immutable/chunks/D-WHDOiA.js","_app/immutable/chunks/DGye0OXN.js","_app/immutable/chunks/CJ5Vqxhv.js","_app/immutable/chunks/DqRQz1vC.js","_app/immutable/chunks/CxCTO3sE.js","_app/immutable/chunks/DZT4s9Gg.js","_app/immutable/chunks/B4zGmnkn.js","_app/immutable/chunks/BF6W-tJf.js","_app/immutable/chunks/DDlElFAC.js","_app/immutable/chunks/5IiInUXS.js","_app/immutable/chunks/CBkjmUdE.js","_app/immutable/chunks/CxRGDEAJ.js"];
export const stylesheets = ["_app/immutable/assets/5._3FwJddv.css"];
export const fonts = [];
