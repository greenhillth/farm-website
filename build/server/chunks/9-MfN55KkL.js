import { f as fetchWeather } from './weather-BzWzo4qi.js';
import './config-BTjo3Pgr.js';

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
const imports = ["_app/immutable/nodes/9.B-P4n4zl.js","_app/immutable/chunks/C3gYeSLU.js","_app/immutable/chunks/CxRGDEAJ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/JuifgMeT.js","_app/immutable/chunks/DQ7jUk8X.js","_app/immutable/chunks/BQITOQ2H.js","_app/immutable/chunks/BpVGysJh.js","_app/immutable/chunks/BPPT-HsW.js","_app/immutable/chunks/B83ignaW.js","_app/immutable/chunks/BKBjTOe9.js","_app/immutable/chunks/ajcS3Meh.js","_app/immutable/chunks/CSrG6tpm.js","_app/immutable/chunks/C9W0NbdG.js","_app/immutable/chunks/CsBJ9ToZ.js","_app/immutable/chunks/CEUT2Dup.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, stylesheets, _page_ts as universal, universal_id };
//# sourceMappingURL=9-MfN55KkL.js.map
