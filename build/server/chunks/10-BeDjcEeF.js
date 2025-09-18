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
const component = async () => component_cache ??= (await import('./_page.svelte-uI8FL2q7.js')).default;
const universal_id = "src/routes/weather/[metric]/+page.ts";
const imports = ["_app/immutable/nodes/10.wN4SxL-H.js","_app/immutable/chunks/zRQxpyKE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/76m0y0zj.js","_app/immutable/chunks/Cy7NpJy3.js","_app/immutable/chunks/CuXKmgDK.js","_app/immutable/chunks/CpGDwUWb.js","_app/immutable/chunks/C8Q-pcS8.js","_app/immutable/chunks/LLHKzi1v.js","_app/immutable/chunks/BNfZqJWD.js","_app/immutable/chunks/BxrZu97y.js","_app/immutable/chunks/Bcbkfd4L.js","_app/immutable/chunks/BzYxXZdQ.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=10-BeDjcEeF.js.map
