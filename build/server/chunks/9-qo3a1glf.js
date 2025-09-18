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
const component = async () => component_cache ??= (await import('./_page.svelte-ChlTT4s4.js')).default;
const universal_id = "src/routes/weather/+page.ts";
const imports = ["_app/immutable/nodes/9.Bwwjstx_.js","_app/immutable/chunks/zRQxpyKE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/76m0y0zj.js","_app/immutable/chunks/Cy7NpJy3.js","_app/immutable/chunks/BN5QsEzf.js","_app/immutable/chunks/CuXKmgDK.js","_app/immutable/chunks/BWS38yz9.js","_app/immutable/chunks/LLHKzi1v.js","_app/immutable/chunks/CxhXp5PL.js","_app/immutable/chunks/BNfZqJWD.js","_app/immutable/chunks/BxrZu97y.js","_app/immutable/chunks/Bcbkfd4L.js","_app/immutable/chunks/BzYxXZdQ.js","_app/immutable/chunks/CddE555Y.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=9-qo3a1glf.js.map
