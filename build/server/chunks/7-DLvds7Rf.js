import { f as fetchWeather } from './weather-C6EsKyaj.js';

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
const imports = ["_app/immutable/nodes/7.BRHlKGTO.js","_app/immutable/chunks/CY139KZX.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C-6_ZYAD.js","_app/immutable/chunks/CzOZ74WA.js","_app/immutable/chunks/CYB-70ru.js","_app/immutable/chunks/ClbvZk9Z.js","_app/immutable/chunks/BZM75AQp.js","_app/immutable/chunks/DQ-CN1Tm.js","_app/immutable/chunks/S5dyTfSz.js","_app/immutable/chunks/DWxY_OJU.js","_app/immutable/chunks/EeQyfODi.js","_app/immutable/chunks/D0eNdZx1.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=7-DLvds7Rf.js.map
