<script lang="ts">
  import Panel from '$lib/components/Panel.svelte';
  import { onMount } from 'svelte';

  type Weather = {
    updatedAt: Date;
    outdoor: { temp: number; trend: number; feelsLike: number; dewPoint: number; humidity: number; vpd: number };
    indoor: { temp: number; trend: number; humidity: number };
    solar: { solar: number; uvi: number; sunrise: string; sunset: string; moon: string };
    rain: { rate: number; daily: number; event: number; hourly: number; weekly: number; monthly: number; yearly: number };
    wind: { dir: number; speed: number; gust: number; timeSpeed?: string; timeGust?: string };
    pressure: { rel: number; abs: number; deltaRel: number; deltaAbs: number };
    battery: { status: 'NORMAL' | 'LOW' | 'CRITICAL'; note?: string };
    series: { t: number; temp: number; feels: number; dew: number }[];
  };

  const now = () => new Date();
  function fmt(n: number, digits = 1) {
    return n.toFixed(digits);
  }
  function arrow(n: number) {
    return n > 0 ? '↑' : n < 0 ? '↓' : '→';
  }

  // Seed with realistic demo values (replace with real API later)
  let w: Weather = {
    updatedAt: now(),
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

  let secondsAgo = 0;
  onMount(() => {
    const id = setInterval(() => {
      secondsAgo = Math.floor((now().getTime() - w.updatedAt.getTime()) / 1000);
    }, 1000);
    return () => clearInterval(id);
  });

  $: dayLabel = 'Daily';
  // chart helpers
  const xs = (t: number) => 40 + (t / 47) * 740;
  const ys = (v: number) => 200 - (v / 14) * 180;
</script>

<header class="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
  <a href="/" class="text-sm text-muted hover:text-white">&larr; Back to home</a>
  <div class="text-xs text-muted">Reported {secondsAgo}s ago</div>
</header>

<main class="container mx-auto px-4 pb-8 space-y-5">
  <div class="grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
    <Panel title="Outdoor">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-muted text-xs mb-1">Temperature</div>
          <div class="text-3xl font-semibold">{fmt(w.outdoor.temp)}<span class="text-base align-top"> °C</span></div>
          <div class="text-xs text-muted mt-1">{arrow(w.outdoor.trend)} {fmt(Math.abs(w.outdoor.trend))} °C/hr</div>
          <div class="text-xs text-muted mt-1">↗ 12.7 °C ↘ 4.9 °C</div>
          <div class="text-xs text-accent mt-1">VPD {fmt(w.outdoor.vpd, 3)} kPa</div>
        </div>
        <div>
          <div class="text-muted text-xs mb-1">Humidity</div>
          <div class="text-3xl font-semibold">{w.outdoor.humidity}<span class="text-base align-top"> %</span></div>
          <div class="text-xs text-muted mt-1">Feels Like {fmt(w.outdoor.feelsLike)} °C</div>
          <div class="text-xs text-muted mt-1">Dew Point {fmt(w.outdoor.dewPoint)} °C</div>
        </div>
      </div>
    </Panel>

    <Panel title="Indoor">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-muted text-xs mb-1">Temperature</div>
          <div class="text-3xl font-semibold">{fmt(w.indoor.temp)}<span class="text-base align-top"> °C</span></div>
          <div class="text-xs text-muted mt-1">{arrow(w.indoor.trend)} {fmt(Math.abs(w.indoor.trend))} °C/hr</div>
          <div class="text-xs text-muted mt-1">↗ 14.6 °C ↘ 11.6 °C</div>
        </div>
        <div>
          <div class="text-muted text-xs mb-1">Humidity</div>
          <div class="text-3xl font-semibold">{w.indoor.humidity}<span class="text-base align-top"> %</span></div>
          <div class="text-xs text-muted mt-1">↗ 64 % ↘ 56 %</div>
        </div>
      </div>
    </Panel>

    <Panel title="Solar and UVI">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-muted text-xs">{w.solar.moon}</div>
          <div class="mt-2">
            <div class="text-muted text-xs mb-1">Solar</div>
            <div class="text-3xl font-semibold">{fmt(w.solar.solar)}<span class="text-base align-top"> W/m²</span></div>
            <div class="text-xs text-muted mt-1">↗ 828.9 W/m²</div>
          </div>
        </div>
        <div>
          <div class="text-muted text-xs mb-1">UVI</div>
          <div class="text-3xl font-semibold">{w.solar.uvi}</div>
          <div class="text-xs text-muted mt-4">☀ Sun Rise {w.solar.sunrise}</div>
          <div class="text-xs text-muted">☀ Sun Set {w.solar.sunset}</div>
        </div>
      </div>
    </Panel>

    <Panel title="Rainfall">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-muted text-xs mb-1">Rain Rate /hr</div>
          <div class="text-3xl font-semibold">{fmt(w.rain.rate)}<span class="text-base align-top"> mm</span></div>
          <div class="text-xs text-muted mt-2">Daily {fmt(w.rain.daily)} mm</div>
        </div>
        <div class="text-xs text-muted space-y-1">
          <div>Event <span class="text-green-400">{fmt(w.rain.event)} mm</span></div>
          <div>Hourly {fmt(w.rain.hourly)} mm</div>
          <div>Weekly {fmt(w.rain.weekly)} mm</div>
          <div>Monthly {fmt(w.rain.monthly)} mm</div>
          <div>Yearly {fmt(w.rain.yearly)} mm</div>
        </div>
      </div>
    </Panel>

    <Panel title="Wind" className="xl:col-span-2">
      <div class="grid grid-cols-3 gap-4 items-center">
        <div class="col-span-2 flex items-center justify-center">
          <!-- Simple wind dial -->
          <svg viewBox="0 0 120 120" class="w-52 h-52">
            <circle cx="60" cy="60" r="54" class="fill-transparent stroke-border" stroke-width="2" />
            <text x="60" y="64" text-anchor="middle" class="fill-white text-3xl font-semibold">{Math.round(w.wind.dir)}</text>
            <text x="60" y="84" text-anchor="middle" class="fill-muted text-xs">{['N','NE','E','SE','S','SW','W','NW'][Math.round(((w.wind.dir%360)+22.5)/45)%8]}</text>
            <g transform={`rotate(${w.wind.dir} 60 60)`}>
              <polygon points="60,12 56,24 64,24" class="fill-accent" />
            </g>
          </svg>
        </div>
        <div class="text-sm text-muted">
          <div class="text-white text-lg font-semibold">Wind {fmt(w.wind.speed)} m/s</div>
          <div>↗ {fmt(w.wind.speed * 3.6)} km/h <span class="text-xs">{w.wind.timeSpeed}</span></div>
          <div class="mt-2 text-white text-lg font-semibold">Gust {fmt(w.wind.gust)} m/s</div>
          <div>↗ {fmt(w.wind.gust * 3.6)} km/h <span class="text-xs">{w.wind.timeGust}</span></div>
        </div>
      </div>
    </Panel>

    <Panel title="Pressure">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-muted text-xs mb-1">Relative</div>
          <div class="text-3xl font-semibold">{fmt(w.pressure.rel, 1)}<span class="text-base align-top"> hPa</span></div>
          <div class="text-xs text-muted mt-1">{arrow(w.pressure.deltaRel)} {fmt(Math.abs(w.pressure.deltaRel),1)} hPa</div>
          <div class="text-xs text-muted mt-1">↗ 994.2 hPa ↘ 990.1 hPa</div>
        </div>
        <div>
          <div class="text-muted text-xs mb-1">Absolute</div>
          <div class="text-3xl font-semibold">{fmt(w.pressure.abs, 1)}<span class="text-base align-top"> hPa</span></div>
          <div class="text-xs text-muted mt-1">{arrow(w.pressure.deltaAbs)} {fmt(Math.abs(w.pressure.deltaAbs),1)} hPa</div>
          <div class="text-xs text-muted mt-1">↗ 994.2 hPa ↘ 990.1 hPa</div>
        </div>
      </div>
    </Panel>

    <Panel title="Battery">
      <div class="text-sm">
        <div class="text-green-400 font-semibold">{w.battery.status}</div>
        <div class="text-muted">{w.battery.note}</div>
      </div>
    </Panel>
  </div>

  <!-- Simple trend chart -->
  <Panel title={`Outdoor — ${dayLabel}`} className="">
    <div class="overflow-x-auto">
      <svg viewBox="0 0 800 240" class="w-full h-64">
        <defs>
          <clipPath id="clip">
            <rect x="40" y="20" width="740" height="180" />
          </clipPath>
        </defs>
        <g>
          <text x="10" y="30" class="fill-muted text-xs">Temp</text>
          <text x="10" y="50" class="fill-muted text-xs">Feels</text>
          <text x="10" y="70" class="fill-muted text-xs">Dew</text>
        </g>
        <g clip-path="url(#clip)">
          <polyline fill="none" stroke="#facc15" stroke-width="2" points={w.series.map(p=>`${xs(p.t)},${ys(p.temp)}`).join(' ')} />
          <polyline fill="none" stroke="#3b82f6" stroke-width="2" points={w.series.map(p=>`${xs(p.t)},${ys(p.feels)}`).join(' ')} />
          <polyline fill="none" stroke="#22c55e" stroke-width="2" points={w.series.map(p=>`${xs(p.t)},${ys(p.dew)}`).join(' ')} />
        </g>
        <g class="text-muted">
          <line x1="40" y1="200" x2="780" y2="200" stroke="currentColor" stroke-opacity="0.3" />
          <text x="782" y="204" class="fill-muted text-xs">0</text>
        </g>
      </svg>
    </div>
  </Panel>
</main>
