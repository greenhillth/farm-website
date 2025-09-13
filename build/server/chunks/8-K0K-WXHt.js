import { f as fetchWeather } from './weather-BoqO9Ble.js';

const load = async ({ params }) => {
  const res = await fetchWeather();
  return { metric: params.metric, w: res.weather, connected: res.connected, source: res.source };
};

var _page_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 8;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-DdabZ2zm.js')).default;
const universal_id = "src/routes/weather/[metric]/+page.ts";
const imports = ["_app/immutable/nodes/8.DFsmG78K.js","_app/immutable/chunks/B4KIXfoe.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/KrGMG5d4.js","_app/immutable/chunks/C0ys7KY4.js","_app/immutable/chunks/ClEjLSVY.js","_app/immutable/chunks/CauDJsBl.js","_app/immutable/chunks/CALS168o.js","_app/immutable/chunks/CuUo-GuR.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=8-K0K-WXHt.js.map
