import { f as fetchWeather } from './weather-Tlt1qppX.js';

const load = async ({ params, fetch }) => {
  const res = await fetchWeather(fetch);
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
const imports = ["_app/immutable/nodes/8.CmoDVQkP.js","_app/immutable/chunks/C-QXI-ql.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/KrGMG5d4.js","_app/immutable/chunks/C0ys7KY4.js","_app/immutable/chunks/ClEjLSVY.js","_app/immutable/chunks/CauDJsBl.js","_app/immutable/chunks/CALS168o.js","_app/immutable/chunks/CuUo-GuR.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=8-DhIM0kM9.js.map
