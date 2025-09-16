import { f as fetchWeather, a as fetchMetric } from './weather-C6EsKyaj.js';

const load = async ({ params, fetch }) => {
  const res = await fetchWeather();
  let log = [];
  try {
    log = await fetchMetric(params.metric, fetch);
  } catch (_) {
    log = [];
  }
  return {
    metric: params.metric,
    w: res.weather,
    connected: res.connected,
    source: res.source,
    log
  };
};

var _page_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 8;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-tAhHuV0H.js')).default;
const universal_id = "src/routes/weather/[metric]/+page.ts";
const imports = ["_app/immutable/nodes/8.DCcQ2WT6.js","_app/immutable/chunks/CY139KZX.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C-6_ZYAD.js","_app/immutable/chunks/CzOZ74WA.js","_app/immutable/chunks/ClbvZk9Z.js","_app/immutable/chunks/DWD2Y0Zj.js","_app/immutable/chunks/p4PcDCk2.js","_app/immutable/chunks/DQ-CN1Tm.js","_app/immutable/chunks/DWxY_OJU.js","_app/immutable/chunks/EeQyfODi.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=8-CyghuePD.js.map
