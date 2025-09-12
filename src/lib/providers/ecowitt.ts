import { env } from '$env/dynamic/private';
import { getMockWeather, type Weather } from '$lib/mockWeather';

function computeVPD_c_kPa(tempC: number, rh: number): number {
  const es = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  const ea = (rh / 100) * es;
  return Math.max(0, es - ea);
}

function pick<T = number>(obj: any, keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj && typeof obj[k] !== 'undefined') return obj[k] as T;
  }
  return undefined;
}

function mapToWeather(payload: any): Weather {
  const mock = getMockWeather();
  const data = payload?.data ?? payload ?? {};

  const updatedAt = new Date(
    (payload?.time ?? payload?.server_time ?? Date.now()) as number
  ).toISOString();

  const outdoorTemp =
    pick<number>(data?.outdoor, ['temp', 'temperature', 'tc']) ??
    pick<number>(data, ['outdoor_temperature', 'temperature']);

  const outdoorHumidity =
    pick<number>(data?.outdoor, ['humidity', 'rh']) ??
    pick<number>(data, ['outdoor_humidity', 'humidity']);

  const dewPoint =
    pick<number>(data?.outdoor, ['dewPoint', 'dew_point', 'dewpoint', 'td']) ??
    pick<number>(data, ['dew_point', 'dewpoint']);

  const feelsLike =
    pick<number>(data?.outdoor, ['feelsLike', 'feels_like', 'apparent']) ??
    outdoorTemp;

  const indoorTemp =
    pick<number>(data?.indoor, ['temp', 'temperature', 'tc']) ??
    pick<number>(data, ['indoor_temperature']);

  const indoorHumidity =
    pick<number>(data?.indoor, ['humidity', 'rh']) ??
    pick<number>(data, ['indoor_humidity']);

  const windDir = pick<number>(data?.wind, ['dir', 'direction', 'degree']);
  const windSpeed = pick<number>(data?.wind, ['speed', 'speed_ms', 'avg']) ??
    pick<number>(data, ['wind_speed']);
  const windGust = pick<number>(data?.wind, ['gust', 'gust_ms', 'max']) ??
    pick<number>(data, ['wind_gust']);

  const uvi = pick<number>(data?.solar, ['uvi', 'uv']) ?? pick<number>(data, ['uvi', 'uv']);
  const solar = pick<number>(data?.solar, ['solar', 'radiation', 'solar_radiation']) ??
    pick<number>(data, ['solar', 'radiation']);

  const prRel = pick<number>(data?.pressure, ['relative', 'rel', 'barometer_rel']) ??
    pick<number>(data, ['pressure_relative', 'barometer_rel']);
  const prAbs = pick<number>(data?.pressure, ['absolute', 'abs', 'barometer_abs']) ??
    pick<number>(data, ['pressure_absolute', 'barometer_abs']) ?? prRel;

  const rainRate = pick<number>(data?.rain, ['rate', 'rain_rate']) ?? pick<number>(data, ['rain_rate']);
  const rainDaily = pick<number>(data?.rain, ['daily', 'rain_daily']) ?? pick<number>(data, ['rain_daily']);
  const rainEvent = pick<number>(data?.rain, ['event', 'rain_event']) ?? pick<number>(data, ['rain_event']);
  const rainHourly = pick<number>(data?.rain, ['hourly', 'rain_hourly']) ?? pick<number>(data, ['rain_hourly']);
  const rainWeekly = pick<number>(data?.rain, ['weekly', 'rain_weekly']) ?? pick<number>(data, ['rain_weekly']);
  const rainMonthly = pick<number>(data?.rain, ['monthly', 'rain_monthly']) ?? pick<number>(data, ['rain_monthly']);
  const rainYearly = pick<number>(data?.rain, ['yearly', 'rain_yearly']) ?? pick<number>(data, ['rain_yearly']);

  const vpd =
    outdoorTemp != null && outdoorHumidity != null
      ? computeVPD_c_kPa(outdoorTemp, outdoorHumidity)
      : mock.outdoor.vpd;

  return {
    updatedAt,
    outdoor: {
      temp: outdoorTemp ?? mock.outdoor.temp,
      trend: 0,
      feelsLike: feelsLike ?? outdoorTemp ?? mock.outdoor.feelsLike,
      dewPoint: dewPoint ?? mock.outdoor.dewPoint,
      humidity: outdoorHumidity ?? mock.outdoor.humidity,
      vpd
    },
    indoor: {
      temp: indoorTemp ?? mock.indoor.temp,
      trend: 0,
      humidity: indoorHumidity ?? mock.indoor.humidity
    },
    solar: {
      solar: solar ?? mock.solar.solar,
      uvi: uvi ?? mock.solar.uvi,
      sunrise: mock.solar.sunrise,
      sunset: mock.solar.sunset,
      moon: mock.solar.moon
    },
    rain: {
      rate: rainRate ?? mock.rain.rate,
      daily: rainDaily ?? mock.rain.daily,
      event: rainEvent ?? mock.rain.event,
      hourly: rainHourly ?? mock.rain.hourly,
      weekly: rainWeekly ?? mock.rain.weekly,
      monthly: rainMonthly ?? mock.rain.monthly,
      yearly: rainYearly ?? mock.rain.yearly
    },
    wind: {
      dir: windDir ?? mock.wind.dir,
      speed: windSpeed ?? mock.wind.speed,
      gust: windGust ?? mock.wind.gust,
      timeSpeed: mock.wind.timeSpeed,
      timeGust: mock.wind.timeGust
    },
    pressure: {
      rel: prRel ?? mock.pressure.rel,
      abs: prAbs ?? mock.pressure.abs,
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

async function ensureDeviceMac(appKey: string, apiKey: string): Promise<string> {
  const explicit = env.EW_DEVICE_MAC?.trim();
  if (explicit) return explicit;
  const url = new URL('https://api.ecowitt.net/api/v3/device/list');
  url.searchParams.set('application_key', appKey);
  url.searchParams.set('api_key', apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Ecowitt device list failed: ${res.status}`);
  const j = await res.json();
  const mac = j?.data?.[0]?.mac || j?.data?.devices?.[0]?.mac;
  if (!mac) throw new Error('No Ecowitt devices found; set EW_DEVICE_MAC');
  return mac as string;
}

export type WeatherMeta = { data: Weather; connected: boolean; source: 'ecowitt' | 'mock' };

export async function fetchEcowittWeatherMeta(): Promise<WeatherMeta> {
  const appKey = env.EW_APP_KEY?.trim();
  const apiKey = env.EW_API_KEY?.trim();
  if (!appKey || !apiKey) {
    console.warn('[ecowitt] Missing EW_APP_KEY/EW_API_KEY; serving mock data');
    return { data: getMockWeather(), connected: false, source: 'mock' };
  }
  try {
    const mac = await ensureDeviceMac(appKey, apiKey);
    const url = new URL('https://api.ecowitt.net/api/v3/device/real_time');
    url.searchParams.set('application_key', appKey);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('mac', mac);
    url.searchParams.set('call_back', 'all');
    url.searchParams.set('temp_unitid', '1');
    url.searchParams.set('wind_speed_unitid', '1');
    url.searchParams.set('pressure_unitid', '1');
    url.searchParams.set('rainfall_unitid', '1');
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Ecowitt real_time failed: ${res.status}`);
    const payload = await res.json();
    const data = mapToWeather(payload);
    console.info('[ecowitt] Updated weather from Ecowitt device', { mac, at: data.updatedAt });
    return { data, connected: true, source: 'ecowitt' };
  } catch (_) {
    console.warn('[ecowitt] Fetch failed; serving mock data');
    return { data: getMockWeather(), connected: false, source: 'mock' };
  }
}

export async function fetchEcowittWeather(): Promise<Weather> {
  const { data } = await fetchEcowittWeatherMeta();
  return data;
}
