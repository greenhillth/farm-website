import { f as fetchWeather, a as fetchWeatherHistory } from './weather-BQ_E83Pl.js';

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
const component = async () => component_cache ??= (await import('./_page.svelte-MrB7jYTn.js')).default;
const universal_id = "src/routes/weather/[metric]/+page.ts";
const imports = ["_app/immutable/nodes/10.YlHVWJLO.js","_app/immutable/chunks/zRQxpyKE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CqJAwCt_.js","_app/immutable/chunks/CthTPqsi.js","_app/immutable/chunks/CNYzTQXq.js","_app/immutable/chunks/DLeCJMEp.js","_app/immutable/chunks/B5mXUOAW.js","_app/immutable/chunks/CCVHFpir.js","_app/immutable/chunks/5_-TE14Q.js","_app/immutable/chunks/BbaiMmwp.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=10-xm7xxWgL.js.map
