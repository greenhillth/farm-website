import * as universal from '../entries/pages/weather/_metric_/_page.ts.js';

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/weather/_metric_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/weather/[metric]/+page.ts";
export const imports = ["_app/immutable/nodes/10.BgofRkJA.js","_app/immutable/chunks/gAv0IJ0H.js","_app/immutable/chunks/BW0v18n8.js","_app/immutable/chunks/gMANoNyM.js","_app/immutable/chunks/DyE--mCz.js","_app/immutable/chunks/DCbrFlEo.js","_app/immutable/chunks/BbdDiNu8.js","_app/immutable/chunks/qtWtAah2.js","_app/immutable/chunks/CQRSbJO_.js","_app/immutable/chunks/DlfQMObq.js","_app/immutable/chunks/DHsMR0Qm.js","_app/immutable/chunks/C3rpjDiE.js","_app/immutable/chunks/BEAiq2bU.js","_app/immutable/chunks/BFYe4vL5.js","_app/immutable/chunks/DxtC1dWa.js"];
export const stylesheets = [];
export const fonts = [];
