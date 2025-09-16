import { f as fetchWeather, a as fetchMetric } from "../../../../chunks/weather.js";
const load = async ({ params, fetch }) => {
  const res = await fetchWeather();
  let log = [];
  try {
    log = await fetchMetric(params.metric, fetch);
  } catch (_) {
    log = [];
  }
  return {
    metric: params.metric,
    w: res.weather,
    connected: res.connected,
    source: res.source,
    log
  };
};
export {
  load
};
