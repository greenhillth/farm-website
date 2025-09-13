import { f as fetchWeather } from "../../../../chunks/weather.js";
const load = async ({ params }) => {
  const res = await fetchWeather();
  return { metric: params.metric, w: res.weather, connected: res.connected, source: res.source };
};
export {
  load
};
