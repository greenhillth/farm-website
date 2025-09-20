import { f as fetchWeather, a as fetchWeatherHistory } from './weather-BzWzo4qi.js';
import './config-BTjo3Pgr.js';

const load = async ({ params, fetch }) => {
  const res = await fetchWeather();
  const now = Math.floor(Date.now() / 1e3);
  const from = now - 24 * 60 * 60;
  let history = [];
  try {
    history = await fetchWeatherHistory(from, now, fetch);
  } catch (_) {
    history = [];
  }
  return {
    metric: params.metric,
    w: res.weather,
    connected: res.connected,
    source: res.source,
    history,
    range: { from, to: now }
  };
};

var _page_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 10;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-uI8FL2q7.js')).default;
const universal_id = "src/routes/weather/[metric]/+page.ts";
const imports = ["_app/immutable/nodes/10.DCA02yxo.js","_app/immutable/chunks/C3gYeSLU.js","_app/immutable/chunks/CxRGDEAJ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BGYB-Juc.js","_app/immutable/chunks/B5Olihw7.js","_app/immutable/chunks/D8mhcLFN.js","_app/immutable/chunks/yIv7Yito.js","_app/immutable/chunks/BIz-JCsz.js","_app/immutable/chunks/3p1HBkzr.js","_app/immutable/chunks/DmkT_FfW.js","_app/immutable/chunks/Bvch9A-d.js","_app/immutable/chunks/ByUnUfIR.js","_app/immutable/chunks/D9w6eINJ.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=10-4FFCr4Ci.js.map
