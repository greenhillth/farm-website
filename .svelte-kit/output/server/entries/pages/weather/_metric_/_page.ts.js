import { f as fetchWeather } from "../../../../chunks/weather.js";
const load = async ({ params, fetch }) => {
  const res = await fetchWeather(fetch);
  return { metric: params.metric, w: res.weather, connected: res.connected, source: res.source };
};
export {
  load
};
