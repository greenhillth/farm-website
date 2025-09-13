import { f as fetchWeather } from "../../../chunks/weather.js";
const load = async ({ fetch }) => {
  const res = await fetchWeather(fetch);
  return { w: res.weather, connected: res.connected, source: res.source };
};
export {
  load
};
