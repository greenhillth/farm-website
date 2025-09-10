export type Weather = {
  updatedAt: string;
  outdoor: { temp: number; trend: number; feelsLike: number; dewPoint: number; humidity: number; vpd: number };
  indoor: { temp: number; trend: number; humidity: number };
  solar: { solar: number; uvi: number; sunrise: string; sunset: string; moon: string };
  rain: { rate: number; daily: number; event: number; hourly: number; weekly: number; monthly: number; yearly: number };
  wind: { dir: number; speed: number; gust: number; timeSpeed?: string; timeGust?: string };
  pressure: { rel: number; abs: number; deltaRel: number; deltaAbs: number };
  battery: { status: 'NORMAL' | 'LOW' | 'CRITICAL'; note?: string };
  series: { t: number; temp: number; feels: number; dew: number }[];
};

/**
 * Returns mock weather data. In production this would be replaced with
 * requests to the real MQSS backend.
 */
export function getMockWeather(): Weather {
  const now = new Date();
  return {
    updatedAt: now.toISOString(),
    outdoor: { temp: 12.2, trend: 0.8, feelsLike: 12.2, dewPoint: 5.6, humidity: 64, vpd: 0.511 },
    indoor: { temp: 14.5, trend: -1.4, humidity: 57 },
    solar: { solar: 306.2, uvi: 2, sunrise: '06:25', sunset: '17:57', moon: 'Waning Gibbous' },
    rain: { rate: 0, daily: 0, event: 31.8, hourly: 0, weekly: 33.6, monthly: 33.6, yearly: 33.6 },
    wind: { dir: 221, speed: 8.6, gust: 18.4, timeSpeed: '09:46', timeGust: '00:07' },
    pressure: { rel: 993.7, abs: 993.7, deltaRel: -0.2, deltaAbs: -0.2 },
    battery: { status: 'NORMAL', note: 'Sensor Array' },
    series: Array.from({ length: 48 }).map((_, i) => ({
      t: i,
      temp: 6 + i * 0.12 + Math.sin(i / 3) * 0.5,
      feels: 5.5 + i * 0.1 + Math.sin(i / 4) * 0.4,
      dew: 3 + Math.sin(i / 5) * 0.3
    }))
  };
}
