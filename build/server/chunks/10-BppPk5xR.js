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
const component = async () => component_cache ??= (await import('./_page.svelte-sNqHh282.js')).default;
const universal_id = "src/routes/weather/[metric]/+page.ts";
const imports = ["_app/immutable/nodes/10.BEds2raS.js","_app/immutable/chunks/zRQxpyKE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CUpp2D4R.js","_app/immutable/chunks/D3hnq5Lw.js","_app/immutable/chunks/CyMfPZwD.js","_app/immutable/chunks/C8G_k6Vd.js","_app/immutable/chunks/YV7UHqrJ.js","_app/immutable/chunks/AXX0dV26.js","_app/immutable/chunks/Dc2dfOm4.js","_app/immutable/chunks/CAllNap8.js","_app/immutable/chunks/Cvi7aHJ-.js","_app/immutable/chunks/CSpGEONf.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=10-BppPk5xR.js.map
