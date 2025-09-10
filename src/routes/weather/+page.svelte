<script lang="ts">
  import Panel from '$lib/components/Panel.svelte';
  import { onMount } from 'svelte';
  import type { Weather } from '$lib/mockWeather';
  import { fetchWeather } from '$lib/mqss';

  export let data: { w: Weather };
  // updatedAt comes as a string from the API; coerce to Date with a proper type
  let w: Omit<Weather, 'updatedAt'> & { updatedAt: Date } = {
    ...data.w,
    updatedAt: new Date(data.w.updatedAt)
  };

  const now = () => new Date();
  function fmt(n: number, digits = 1) {
    return n.toFixed(digits);
  }
  function arrow(n: number) {
    return n > 0 ? '↑' : n < 0 ? '↓' : '→';
  }

  let secondsAgo = 0;
  let offline = false;
  onMount(() => {
    const tick = setInterval(() => {
      secondsAgo = Math.floor((now().getTime() - w.updatedAt.getTime()) / 1000);
    }, 1000);

    // Poll for latest weather; gracefully fall back if unavailable
    const poll = setInterval(async () => {
      try {
        const latest = await fetchWeather();
        w = { ...latest, updatedAt: new Date(latest.updatedAt) } as typeof w;
        offline = false;
      } catch (_) {
        offline = true;
      }
    }, 15000);

    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  });

  $: dayLabel = 'Daily';
  // chart helpers
  const xs = (t: number) => 40 + (t / 47) * 740;
  const ys = (v: number) => 200 - (v / 14) * 180;
</script>

<header class="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
  <a href="/" class="text-sm text-muted hover:text-white">&larr; Back to home</a>
  <div class="flex items-center gap-3 text-xs">
    <div class="text-muted">Reported {secondsAgo}s ago</div>
    <span class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border ${offline ? 'border-red-400/40 text-red-300 bg-red-400/10' : 'border-green-400/40 text-green-300 bg-green-400/10'}`}>
      <span class={`size-1.5 rounded-full ${offline ? 'bg-red-400' : 'bg-green-400'}`}></span>
      {offline ? 'Offline' : 'Live'}
    </span>
  </div>
</header>

<main class="container mx-auto px-4 pb-8 space-y-5">
  <div class="grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
    <a href="/weather/outdoor" class="block transform transition hover:scale-105">
      <Panel title="Outdoor" className="h-full">
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
    </a>

    <a href="/weather/indoor" class="block transform transition hover:scale-105">
      <Panel title="Indoor" className="h-full">
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
    </a>

    <a href="/weather/solar" class="block transform transition hover:scale-105">
      <Panel title="Solar and UVI" className="h-full">
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
    </a>

    <a href="/weather/rain" class="block transform transition hover:scale-105">
      <Panel title="Rainfall" className="h-full">
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
    </a>

    <a href="/weather/wind" class="block transform transition hover:scale-105 xl:col-span-2">
      <Panel title="Wind" className="h-full">
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
    </a>

    <a href="/weather/pressure" class="block transform transition hover:scale-105">
      <Panel title="Pressure" className="h-full">
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
    </a>

    <a href="/weather/battery" class="block transform transition hover:scale-105">
      <Panel title="Battery" className="h-full">
        <div class="text-sm">
          <div class="text-green-400 font-semibold">{w.battery.status}</div>
          <div class="text-muted">{w.battery.note}</div>
        </div>
      </Panel>
    </a>
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
