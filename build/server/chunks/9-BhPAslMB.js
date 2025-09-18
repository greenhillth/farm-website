import { f as fetchWeather } from './weather-BQ_E83Pl.js';

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
const component = async () => component_cache ??= (await import('./_page.svelte-O75T8XfU.js')).default;
const universal_id = "src/routes/weather/+page.ts";
const imports = ["_app/immutable/nodes/9.DLOBUVPD.js","_app/immutable/chunks/zRQxpyKE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CqJAwCt_.js","_app/immutable/chunks/CthTPqsi.js","_app/immutable/chunks/SMSclcs1.js","_app/immutable/chunks/CNYzTQXq.js","_app/immutable/chunks/BkQ9GEEK.js","_app/immutable/chunks/CCVHFpir.js","_app/immutable/chunks/DeAsnCzY.js","_app/immutable/chunks/5_-TE14Q.js","_app/immutable/chunks/BbaiMmwp.js","_app/immutable/chunks/8ZPSmxhP.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=9-BhPAslMB.js.map
