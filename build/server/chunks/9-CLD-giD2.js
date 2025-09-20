import { f as fetchWeather } from './weather-BzWzo4qi.js';
import './config-BTjo3Pgr.js';

const load = async () => {
  const res = await fetchWeather();
  return { w: res.weather, connected: res.connected, source: res.source };
};

var _page_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 9;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-ChlTT4s4.js')).default;
const universal_id = "src/routes/weather/+page.ts";
const imports = ["_app/immutable/nodes/9.YlSagDaU.js","_app/immutable/chunks/C3gYeSLU.js","_app/immutable/chunks/CxRGDEAJ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BGYB-Juc.js","_app/immutable/chunks/B5Olihw7.js","_app/immutable/chunks/ClJE1Kg2.js","_app/immutable/chunks/D8mhcLFN.js","_app/immutable/chunks/BFhjBrwe.js","_app/immutable/chunks/3p1HBkzr.js","_app/immutable/chunks/Cwyng8yH.js","_app/immutable/chunks/DmkT_FfW.js","_app/immutable/chunks/Bvch9A-d.js","_app/immutable/chunks/ByUnUfIR.js","_app/immutable/chunks/D9w6eINJ.js","_app/immutable/chunks/HN-Rx9fn.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=9-CLD-giD2.js.map
