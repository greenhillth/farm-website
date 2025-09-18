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
const imports = ["_app/immutable/nodes/9.BPa_OH1H.js","_app/immutable/chunks/zRQxpyKE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CVWpatV2.js","_app/immutable/chunks/c93sh_Ps.js","_app/immutable/chunks/DLODDmy7.js","_app/immutable/chunks/X9URGx3n.js","_app/immutable/chunks/CRgouM6Z.js","_app/immutable/chunks/D622toXN.js","_app/immutable/chunks/Dou53CLZ.js","_app/immutable/chunks/aPgFrYAU.js","_app/immutable/chunks/BrUP5UVW.js","_app/immutable/chunks/CM2b0VMo.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=9-djZPmHNc.js.map
