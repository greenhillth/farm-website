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
const component = async () => component_cache ??= (await import('./_page.svelte-CxKFGqnB.js')).default;
const universal_id = "src/routes/weather/+page.ts";
const imports = ["_app/immutable/nodes/9.B-n5JCap.js","_app/immutable/chunks/zRQxpyKE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CUpp2D4R.js","_app/immutable/chunks/D3hnq5Lw.js","_app/immutable/chunks/BKAmdj7v.js","_app/immutable/chunks/CyMfPZwD.js","_app/immutable/chunks/BAepqZDa.js","_app/immutable/chunks/AXX0dV26.js","_app/immutable/chunks/vHK5TZWi.js","_app/immutable/chunks/Dc2dfOm4.js","_app/immutable/chunks/CAllNap8.js","_app/immutable/chunks/Cvi7aHJ-.js","_app/immutable/chunks/CSpGEONf.js","_app/immutable/chunks/DJExScv9.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=9-DI20A8Gb.js.map
