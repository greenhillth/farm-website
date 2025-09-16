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

const index = 9;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-tAhHuV0H.js')).default;
const universal_id = "src/routes/weather/[metric]/+page.ts";
const imports = ["_app/immutable/nodes/9.D4f1KgeO.js","_app/immutable/chunks/CY139KZX.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CCFGYCSD.js","_app/immutable/chunks/CdmsYw1U.js","_app/immutable/chunks/BUMWtct1.js","_app/immutable/chunks/Bdri3CNH.js","_app/immutable/chunks/Bfj5he0d.js","_app/immutable/chunks/CJH7hj5q.js","_app/immutable/chunks/CQWZqjad.js","_app/immutable/chunks/DNrX4qGI.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=9-DJGadGkC.js.map
