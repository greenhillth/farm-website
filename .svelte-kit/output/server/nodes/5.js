

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/map/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true
};
export const universal_id = "src/routes/map/+page.ts";
export const imports = ["_app/immutable/nodes/5.ChgT-Ehi.js","_app/immutable/chunks/gMANoNyM.js","_app/immutable/chunks/DyE--mCz.js","_app/immutable/chunks/DCbrFlEo.js","_app/immutable/chunks/DhDNuMY7.js","_app/immutable/chunks/BbdDiNu8.js","_app/immutable/chunks/qtWtAah2.js","_app/immutable/chunks/CQRSbJO_.js","_app/immutable/chunks/DlfQMObq.js","_app/immutable/chunks/DHsMR0Qm.js","_app/immutable/chunks/BQ_0hbCf.js","_app/immutable/chunks/EmKaA4BU.js","_app/immutable/chunks/BsSCd72H.js","_app/immutable/chunks/BO9nOoVN.js","_app/immutable/chunks/C3rpjDiE.js","_app/immutable/chunks/BFYe4vL5.js","_app/immutable/chunks/DxtC1dWa.js","_app/immutable/chunks/Dl_-jij7.js","_app/immutable/chunks/BW0v18n8.js"];
export const stylesheets = ["_app/immutable/assets/5.oeF-9tmh.css"];
export const fonts = [];
