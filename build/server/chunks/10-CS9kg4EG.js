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
const component = async () => component_cache ??= (await import('./_page.svelte-sNqHh282.js')).default;
const universal_id = "src/routes/weather/[metric]/+page.ts";
const imports = ["_app/immutable/nodes/10.a8_Ix3bx.js","_app/immutable/chunks/C3gYeSLU.js","_app/immutable/chunks/CxRGDEAJ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/JuifgMeT.js","_app/immutable/chunks/DQ7jUk8X.js","_app/immutable/chunks/BpVGysJh.js","_app/immutable/chunks/CM66DKVZ.js","_app/immutable/chunks/A4GWV78b.js","_app/immutable/chunks/B83ignaW.js","_app/immutable/chunks/ajcS3Meh.js","_app/immutable/chunks/CSrG6tpm.js","_app/immutable/chunks/C9W0NbdG.js","_app/immutable/chunks/CsBJ9ToZ.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=10-CS9kg4EG.js.map
