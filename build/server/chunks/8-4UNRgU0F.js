import { f as fetchWeather } from './weather-C6EsKyaj.js';

const load = async () => {
  const res = await fetchWeather();
  return { w: res.weather, connected: res.connected, source: res.source };
};

var _page_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 8;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-O75T8XfU.js')).default;
const universal_id = "src/routes/weather/+page.ts";
const imports = ["_app/immutable/nodes/8.CFwFjuSR.js","_app/immutable/chunks/CY139KZX.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CCFGYCSD.js","_app/immutable/chunks/CdmsYw1U.js","_app/immutable/chunks/i2KPoIqR.js","_app/immutable/chunks/BUMWtct1.js","_app/immutable/chunks/Ckc-z1rI.js","_app/immutable/chunks/CJH7hj5q.js","_app/immutable/chunks/CYky5jYs.js","_app/immutable/chunks/CQWZqjad.js","_app/immutable/chunks/DNrX4qGI.js","_app/immutable/chunks/s4922vBQ.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=8-4UNRgU0F.js.map
