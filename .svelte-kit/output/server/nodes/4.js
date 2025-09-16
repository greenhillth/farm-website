

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/map/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true
};
export const universal_id = "src/routes/map/+page.ts";
export const imports = ["_app/immutable/nodes/4.B5vjkbuj.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C-6_ZYAD.js","_app/immutable/chunks/CzOZ74WA.js","_app/immutable/chunks/CYB-70ru.js","_app/immutable/chunks/ClbvZk9Z.js","_app/immutable/chunks/BZM75AQp.js","_app/immutable/chunks/DWD2Y0Zj.js","_app/immutable/chunks/DQ-CN1Tm.js","_app/immutable/chunks/S5dyTfSz.js","_app/immutable/chunks/D_0hGWiV.js","_app/immutable/chunks/DWxY_OJU.js","_app/immutable/chunks/Dyaow1ko.js"];
export const stylesheets = ["_app/immutable/assets/4.CIGW-MKW.css"];
export const fonts = [];
