

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/map/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true
};
export const universal_id = "src/routes/map/+page.ts";
export const imports = ["_app/immutable/nodes/4.M_P0D5xu.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/KrGMG5d4.js","_app/immutable/chunks/C0ys7KY4.js","_app/immutable/chunks/DN-rPOIK.js","_app/immutable/chunks/ClEjLSVY.js","_app/immutable/chunks/qZ6aaTlc.js","_app/immutable/chunks/DAHDt1MN.js","_app/immutable/chunks/CauDJsBl.js","_app/immutable/chunks/CrX52mly.js","_app/immutable/chunks/CBkiyM78.js","_app/immutable/chunks/CALS168o.js","_app/immutable/chunks/72STO5oG.js"];
export const stylesheets = ["_app/immutable/assets/4.CIGW-MKW.css"];
export const fonts = [];
