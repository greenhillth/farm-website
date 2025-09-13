import { getMockWeather, type Weather } from '$lib/weather';

export type WeatherMeta = { data: Weather; connected: boolean; source: 'ecowitt' | 'mock' };

type WeatherReading = {
  timestamp_utc: string;
  tz?: string;
  temp_c?: number | null;
  humidity_pct?: number | null;
  pressure_hpa?: number | null;
  wind_avg_ms?: number | null;
  wind_gust_ms?: number | null;
  wind_dir_deg?: number | null;
  rain_1h_mm?: number | null;
  rain_24h_mm?: number | null;
  solar_wm2?: number | null;
};

function computeVPD_c_kPa(tempC: number, rh: number): number {
  const es = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  const ea = (rh / 100) * es;
  return Math.max(0, es - ea);
}

function mapReadingToWeather(r: WeatherReading): Weather {
  const mock = getMockWeather();
  const updatedAt = new Date(r.timestamp_utc ?? new Date().toISOString()).toISOString();

  const tempC = r.temp_c ?? undefined;
  const rh = r.humidity_pct ?? undefined;
  const vpd = tempC != null && rh != null ? computeVPD_c_kPa(tempC, rh) : mock.outdoor.vpd;

  // Simple dew point approximation (Magnus formula)
  const dewPoint =
    tempC != null && rh != null
      ? (() => {
          const a = 17.27;
          const b = 237.7;
          const alpha = (a * tempC) / (b + tempC) + Math.log(rh / 100);
          return (b * alpha) / (a - alpha);
        })()
      : mock.outdoor.dewPoint;

  const windSpeed = r.wind_avg_ms ?? undefined;
  const windGust = r.wind_gust_ms ?? undefined;
  const windDir = r.wind_dir_deg ?? undefined;
  const pressure = r.pressure_hpa ?? undefined;
  const solar = r.solar_wm2 ?? undefined;

  const hourlyRain = r.rain_1h_mm ?? undefined;
  const dailyRain = r.rain_24h_mm ?? undefined;

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

export async function fetchBackendWeatherMeta(apiBase: string): Promise<WeatherMeta> {
  try {
    const res = await fetch(`${apiBase.replace(/\/$/, '')}/weather/current`);
    if (!res.ok) throw new Error(`backend /weather/current failed: ${res.status}`);
    const reading = (await res.json()) as WeatherReading;
    return { data: mapReadingToWeather(reading), connected: true, source: 'ecowitt' };
  } catch (err) {
    console.warn('[backend] Fetch failed; serving mock data');
    return { data: getMockWeather(), connected: false, source: 'mock' };
  }
}
