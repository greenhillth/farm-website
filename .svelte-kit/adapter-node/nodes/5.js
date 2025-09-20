

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/map/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true
};
export const universal_id = "src/routes/map/+page.ts";
export const imports = ["_app/immutable/nodes/5.BD35HQzJ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BGYB-Juc.js","_app/immutable/chunks/B5Olihw7.js","_app/immutable/chunks/ClJE1Kg2.js","_app/immutable/chunks/D8mhcLFN.js","_app/immutable/chunks/BFhjBrwe.js","_app/immutable/chunks/yIv7Yito.js","_app/immutable/chunks/BIz-JCsz.js","_app/immutable/chunks/3p1HBkzr.js","_app/immutable/chunks/Cwyng8yH.js","_app/immutable/chunks/DudNRLWB.js","_app/immutable/chunks/mgwfwNoq.js","_app/immutable/chunks/BGIEavHh.js","_app/immutable/chunks/DmkT_FfW.js","_app/immutable/chunks/ByUnUfIR.js","_app/immutable/chunks/D9w6eINJ.js","_app/immutable/chunks/C5YzzkN2.js","_app/immutable/chunks/CxRGDEAJ.js"];
export const stylesheets = ["_app/immutable/assets/5._3FwJddv.css"];
export const fonts = [];
