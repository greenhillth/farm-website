import { K as attr_class, z as escape_html, N as slot, G as bind_props, v as pop, t as push, x as attr } from "../../../chunks/index.js";
import { j as fallback } from "../../../chunks/utils2.js";
function Panel($$payload, $$props) {
  let title = $$props["title"];
  let className = fallback($$props["className"], "");
  $$payload.out.push(`<section${attr_class(`bg-panel border border-border rounded-xl shadow-sm ${className}`)}><header class="flex items-center justify-between gap-2 px-4 py-3 md:px-5 md:py-4 border-b border-border/60"><h3 class="text-sm md:text-base font-semibold">${escape_html(title)}</h3> <!---->`);
  slot($$payload, $$props, "actions", {});
  $$payload.out.push(`<!----></header> <div class="p-4 md:p-5"><!---->`);
  slot($$payload, $$props, "default", {});
  $$payload.out.push(`<!----></div> <!---->`);
  slot($$payload, $$props, "footer", {});
  $$payload.out.push(`<!----></section>`);
  bind_props($$props, { title, className });
}
function _page($$payload, $$props) {
  push();
  let dayLabel;
  function fmt(n, digits = 1) {
    return n.toFixed(digits);
  }
  function arrow(n) {
    return n > 0 ? "↑" : n < 0 ? "↓" : "→";
  }
  let w = {
    outdoor: {
      temp: 12.2,
      trend: 0.8,
      feelsLike: 12.2,
      dewPoint: 5.6,
      humidity: 64,
      vpd: 0.511
    },
    indoor: { temp: 14.5, trend: -1.4, humidity: 57 },
    solar: {
      solar: 306.2,
      uvi: 2,
      sunrise: "06:25",
      sunset: "17:57",
      moon: "Waning Gibbous"
    },
    rain: {
      rate: 0,
      daily: 0,
      event: 31.8,
      hourly: 0,
      weekly: 33.6,
      monthly: 33.6,
      yearly: 33.6
    },
    wind: {
      dir: 221,
      speed: 8.6,
      gust: 18.4,
      timeSpeed: "09:46",
      timeGust: "00:07"
    },
    pressure: { rel: 993.7, abs: 993.7, deltaRel: -0.2, deltaAbs: -0.2 },
    battery: { status: "NORMAL", note: "Sensor Array" },
    series: Array.from({ length: 48 }).map((_, i) => ({
      t: i,
      temp: 6 + i * 0.12 + Math.sin(i / 3) * 0.5,
      feels: 5.5 + i * 0.1 + Math.sin(i / 4) * 0.4,
      dew: 3 + Math.sin(i / 5) * 0.3
    }))
  };
  let secondsAgo = 0;
  const xs = (t) => 40 + t / 47 * 740;
  const ys = (v) => 200 - v / 14 * 180;
  dayLabel = "Daily";
  $$payload.out.push(`<header class="container mx-auto px-4 py-4 flex items-center justify-between gap-4"><a href="/" class="text-sm text-muted hover:text-white">← Back to home</a> <div class="text-xs text-muted">Reported ${escape_html(secondsAgo)}s ago</div></header> <main class="container mx-auto px-4 pb-8 space-y-5"><div class="grid gap-4 lg:grid-cols-3 xl:grid-cols-4">`);
  Panel($$payload, {
    title: "Outdoor",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="grid grid-cols-2 gap-4"><div><div class="text-muted text-xs mb-1">Temperature</div> <div class="text-3xl font-semibold">${escape_html(fmt(w.outdoor.temp))}<span class="text-base align-top">°C</span></div> <div class="text-xs text-muted mt-1">${escape_html(arrow(w.outdoor.trend))} ${escape_html(fmt(Math.abs(w.outdoor.trend)))} °C/hr</div> <div class="text-xs text-muted mt-1">↗ 12.7 °C ↘ 4.9 °C</div> <div class="text-xs text-accent mt-1">VPD ${escape_html(fmt(w.outdoor.vpd, 3))} kPa</div></div> <div><div class="text-muted text-xs mb-1">Humidity</div> <div class="text-3xl font-semibold">${escape_html(w.outdoor.humidity)}<span class="text-base align-top">%</span></div> <div class="text-xs text-muted mt-1">Feels Like ${escape_html(fmt(w.outdoor.feelsLike))} °C</div> <div class="text-xs text-muted mt-1">Dew Point ${escape_html(fmt(w.outdoor.dewPoint))} °C</div></div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Panel($$payload, {
    title: "Indoor",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="grid grid-cols-2 gap-4"><div><div class="text-muted text-xs mb-1">Temperature</div> <div class="text-3xl font-semibold">${escape_html(fmt(w.indoor.temp))}<span class="text-base align-top">°C</span></div> <div class="text-xs text-muted mt-1">${escape_html(arrow(w.indoor.trend))} ${escape_html(fmt(Math.abs(w.indoor.trend)))} °C/hr</div> <div class="text-xs text-muted mt-1">↗ 14.6 °C ↘ 11.6 °C</div></div> <div><div class="text-muted text-xs mb-1">Humidity</div> <div class="text-3xl font-semibold">${escape_html(w.indoor.humidity)}<span class="text-base align-top">%</span></div> <div class="text-xs text-muted mt-1">↗ 64 % ↘ 56 %</div></div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Panel($$payload, {
    title: "Solar and UVI",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="grid grid-cols-2 gap-4"><div><div class="text-muted text-xs">${escape_html(w.solar.moon)}</div> <div class="mt-2"><div class="text-muted text-xs mb-1">Solar</div> <div class="text-3xl font-semibold">${escape_html(fmt(w.solar.solar))}<span class="text-base align-top">W/m²</span></div> <div class="text-xs text-muted mt-1">↗ 828.9 W/m²</div></div></div> <div><div class="text-muted text-xs mb-1">UVI</div> <div class="text-3xl font-semibold">${escape_html(w.solar.uvi)}</div> <div class="text-xs text-muted mt-4">☀ Sun Rise ${escape_html(w.solar.sunrise)}</div> <div class="text-xs text-muted">☀ Sun Set ${escape_html(w.solar.sunset)}</div></div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Panel($$payload, {
    title: "Rainfall",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="grid grid-cols-2 gap-4"><div><div class="text-muted text-xs mb-1">Rain Rate /hr</div> <div class="text-3xl font-semibold">${escape_html(fmt(w.rain.rate))}<span class="text-base align-top">mm</span></div> <div class="text-xs text-muted mt-2">Daily ${escape_html(fmt(w.rain.daily))} mm</div></div> <div class="text-xs text-muted space-y-1"><div>Event <span class="text-green-400">${escape_html(fmt(w.rain.event))} mm</span></div> <div>Hourly ${escape_html(fmt(w.rain.hourly))} mm</div> <div>Weekly ${escape_html(fmt(w.rain.weekly))} mm</div> <div>Monthly ${escape_html(fmt(w.rain.monthly))} mm</div> <div>Yearly ${escape_html(fmt(w.rain.yearly))} mm</div></div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Panel($$payload, {
    title: "Wind",
    className: "xl:col-span-2",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="grid grid-cols-3 gap-4 items-center"><div class="col-span-2 flex items-center justify-center"><svg viewBox="0 0 120 120" class="w-52 h-52"><circle cx="60" cy="60" r="54" class="fill-transparent stroke-border" stroke-width="2"></circle><text x="60" y="64" text-anchor="middle" class="fill-white text-3xl font-semibold">${escape_html(Math.round(w.wind.dir))}</text><text x="60" y="84" text-anchor="middle" class="fill-muted text-xs">${escape_html(["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round((w.wind.dir % 360 + 22.5) / 45) % 8])}</text><g${attr("transform", `rotate(${w.wind.dir} 60 60)`)}><polygon points="60,12 56,24 64,24" class="fill-accent"></polygon></g></svg></div> <div class="text-sm text-muted"><div class="text-white text-lg font-semibold">Wind ${escape_html(fmt(w.wind.speed))} m/s</div> <div>↗ ${escape_html(fmt(w.wind.speed * 3.6))} km/h <span class="text-xs">${escape_html(w.wind.timeSpeed)}</span></div> <div class="mt-2 text-white text-lg font-semibold">Gust ${escape_html(fmt(w.wind.gust))} m/s</div> <div>↗ ${escape_html(fmt(w.wind.gust * 3.6))} km/h <span class="text-xs">${escape_html(w.wind.timeGust)}</span></div></div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Panel($$payload, {
    title: "Pressure",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="grid grid-cols-2 gap-4"><div><div class="text-muted text-xs mb-1">Relative</div> <div class="text-3xl font-semibold">${escape_html(fmt(w.pressure.rel, 1))}<span class="text-base align-top">hPa</span></div> <div class="text-xs text-muted mt-1">${escape_html(arrow(w.pressure.deltaRel))} ${escape_html(fmt(Math.abs(w.pressure.deltaRel), 1))} hPa</div> <div class="text-xs text-muted mt-1">↗ 994.2 hPa ↘ 990.1 hPa</div></div> <div><div class="text-muted text-xs mb-1">Absolute</div> <div class="text-3xl font-semibold">${escape_html(fmt(w.pressure.abs, 1))}<span class="text-base align-top">hPa</span></div> <div class="text-xs text-muted mt-1">${escape_html(arrow(w.pressure.deltaAbs))} ${escape_html(fmt(Math.abs(w.pressure.deltaAbs), 1))} hPa</div> <div class="text-xs text-muted mt-1">↗ 994.2 hPa ↘ 990.1 hPa</div></div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Panel($$payload, {
    title: "Battery",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="text-sm"><div class="text-green-400 font-semibold">${escape_html(w.battery.status)}</div> <div class="text-muted">${escape_html(w.battery.note)}</div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></div> `);
  Panel($$payload, {
    title: `Outdoor — ${dayLabel}`,
    className: "",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="overflow-x-auto"><svg viewBox="0 0 800 240" class="w-full h-64"><defs><clipPath id="clip"><rect x="40" y="20" width="740" height="180"></rect></clipPath></defs><g><text x="10" y="30" class="fill-muted text-xs">Temp</text><text x="10" y="50" class="fill-muted text-xs">Feels</text><text x="10" y="70" class="fill-muted text-xs">Dew</text></g><g clip-path="url(#clip)"><polyline fill="none" stroke="#facc15" stroke-width="2"${attr("points", w.series.map((p) => `${xs(p.t)},${ys(p.temp)}`).join(" "))}></polyline><polyline fill="none" stroke="#3b82f6" stroke-width="2"${attr("points", w.series.map((p) => `${xs(p.t)},${ys(p.feels)}`).join(" "))}></polyline><polyline fill="none" stroke="#22c55e" stroke-width="2"${attr("points", w.series.map((p) => `${xs(p.t)},${ys(p.dew)}`).join(" "))}></polyline></g><g class="text-muted"><line x1="40" y1="200" x2="780" y2="200" stroke="currentColor" stroke-opacity="0.3"></line><text x="782" y="204" class="fill-muted text-xs">0</text></g></svg></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></main>`);
  pop();
}
export {
  _page as default
};
