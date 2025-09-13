function computeVPD_c_kPa(tempC, rh) {
  const es = 0.6108 * Math.exp(17.27 * tempC / (tempC + 237.3));
  const ea = rh / 100 * es;
  return Math.max(0, es - ea);
}
function mapReadingToWeather(r) {
  const mock = getMockWeather();
  const updatedAt = new Date(r.timestamp_utc ?? (/* @__PURE__ */ new Date()).toISOString()).toISOString();
  const tempC = r.temp_c ?? void 0;
  const rh = r.humidity_pct ?? void 0;
  const vpd = tempC != null && rh != null ? computeVPD_c_kPa(tempC, rh) : mock.outdoor.vpd;
  const dewPoint = tempC != null && rh != null ? (() => {
    const a = 17.27;
    const b = 237.7;
    const alpha = a * tempC / (b + tempC) + Math.log(rh / 100);
    return b * alpha / (a - alpha);
  })() : mock.outdoor.dewPoint;
  const windSpeed = r.wind_avg_ms ?? void 0;
  const windGust = r.wind_gust_ms ?? void 0;
  const windDir = r.wind_dir_deg ?? void 0;
  const pressure = r.pressure_hpa ?? void 0;
  const solar = r.solar_wm2 ?? void 0;
  const hourlyRain = r.rain_1h_mm ?? void 0;
  const dailyRain = r.rain_24h_mm ?? void 0;
  return {
    updatedAt,
    outdoor: {
      temp: tempC ?? mock.outdoor.temp,
      trend: 0,
      feelsLike: tempC ?? mock.outdoor.feelsLike,
      dewPoint,
      humidity: rh ?? mock.outdoor.humidity,
      vpd
    },
    indoor: {
      temp: mock.indoor.temp,
      trend: 0,
      humidity: mock.indoor.humidity
    },
    solar: {
      solar: solar ?? mock.solar.solar,
      uvi: mock.solar.uvi,
      sunrise: mock.solar.sunrise,
      sunset: mock.solar.sunset,
      moon: mock.solar.moon
    },
    rain: {
      rate: 0,
      daily: dailyRain ?? mock.rain.daily,
      event: mock.rain.event,
      hourly: hourlyRain ?? mock.rain.hourly,
      weekly: mock.rain.weekly,
      monthly: mock.rain.monthly,
      yearly: mock.rain.yearly
    },
    wind: {
      dir: windDir ?? mock.wind.dir,
      speed: windSpeed ?? mock.wind.speed,
      gust: windGust ?? mock.wind.gust,
      timeSpeed: mock.wind.timeSpeed,
      timeGust: mock.wind.timeGust
    },
    pressure: {
      rel: pressure ?? mock.pressure.rel,
      abs: pressure ?? mock.pressure.abs,
      deltaRel: 0,
      deltaAbs: 0
    },
    battery: {
      status: mock.battery.status,
      note: mock.battery.note
    },
    series: mock.series
  };
}
async function fetchBackendWeatherMeta(apiBase) {
  try {
    const res = await fetch(`${apiBase.replace(/\/$/, "")}/weather/current`);
    if (!res.ok) throw new Error(`backend /weather/current failed: ${res.status}`);
    const reading = await res.json();
    return { data: mapReadingToWeather(reading), connected: true, source: "ecowitt" };
  } catch (err) {
    console.warn("[backend] Fetch failed; serving mock data");
    return { data: getMockWeather(), connected: false, source: "mock" };
  }
}
function getMockWeather() {
  const now = /* @__PURE__ */ new Date();
  return {
    updatedAt: now.toISOString(),
    outdoor: { temp: 12.2, trend: 0.8, feelsLike: 12.2, dewPoint: 5.6, humidity: 64, vpd: 0.511 },
    indoor: { temp: 14.5, trend: -1.4, humidity: 57 },
    solar: { solar: 306.2, uvi: 2, sunrise: "06:25", sunset: "17:57", moon: "Waning Gibbous" },
    rain: { rate: 0, daily: 0, event: 31.8, hourly: 0, weekly: 33.6, monthly: 33.6, yearly: 33.6 },
    wind: { dir: 221, speed: 8.6, gust: 18.4, timeSpeed: "09:46", timeGust: "00:07" },
    pressure: { rel: 993.7, abs: 993.7, deltaRel: -0.2, deltaAbs: -0.2 },
    battery: { status: "NORMAL", note: "Sensor Array" },
    series: Array.from({ length: 48 }).map((_, i) => ({
      t: i,
      temp: 6 + i * 0.12 + Math.sin(i / 3) * 0.5,
      feels: 5.5 + i * 0.1 + Math.sin(i / 4) * 0.4,
      dew: 3 + Math.sin(i / 5) * 0.3
    }))
  };
}
async function fetchWeather() {
  const { data, connected, source } = await fetchBackendWeatherMeta("/api");
  return { weather: data, connected, source };
}
export {
  fetchWeather as f
};
