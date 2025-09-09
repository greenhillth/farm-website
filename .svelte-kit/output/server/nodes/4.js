

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/map/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true
};
export const universal_id = "src/routes/map/+page.ts";
export const imports = ["_app/immutable/nodes/4.Cx0CxxaH.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DUanYWtb.js","_app/immutable/chunks/CEDlyOlD.js","_app/immutable/chunks/BAbRxsGe.js","_app/immutable/chunks/BR-ZO3Vo.js","_app/immutable/chunks/DR11qvyx.js","_app/immutable/chunks/iXGh358t.js"];
export const stylesheets = ["_app/immutable/assets/4.CIGW-MKW.css"];
export const fonts = [];
