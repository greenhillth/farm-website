import { f as fetchWeather } from "../../../chunks/weather.js";
const load = async () => {
  const res = await fetchWeather();
  return { w: res.weather, connected: res.connected, source: res.source };
};
export {
  load
};
