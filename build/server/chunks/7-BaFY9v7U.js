import { f as fetchWeather } from './weather-BoqO9Ble.js';

const load = async () => {
  const res = await fetchWeather();
  return { w: res.weather, connected: res.connected, source: res.source };
};

var _page_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 7;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-O75T8XfU.js')).default;
const universal_id = "src/routes/weather/+page.ts";
const imports = ["_app/immutable/nodes/7.Dh-KT1wg.js","_app/immutable/chunks/B4KIXfoe.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/KrGMG5d4.js","_app/immutable/chunks/C0ys7KY4.js","_app/immutable/chunks/DN-rPOIK.js","_app/immutable/chunks/ClEjLSVY.js","_app/immutable/chunks/qZ6aaTlc.js","_app/immutable/chunks/CauDJsBl.js","_app/immutable/chunks/CrX52mly.js","_app/immutable/chunks/CALS168o.js","_app/immutable/chunks/CuUo-GuR.js","_app/immutable/chunks/CBS-fKD7.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=7-BaFY9v7U.js.map
