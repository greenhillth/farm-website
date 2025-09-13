import { z as escape_html, K as attr_class, x as attr, G as bind_props, v as pop, t as push } from "../../../chunks/index.js";
import { P as Panel } from "../../../chunks/Panel.js";
function _page($$payload, $$props) {
  push();
  let dayLabel;
  let data = $$props["data"];
  let w = { ...data.w, updatedAt: new Date(data.w.updatedAt) };
  function fmt(n, digits = 1) {
    return n.toFixed(digits);
  }
  function arrow(n) {
    return n > 0 ? "↑" : n < 0 ? "↓" : "→";
  }
  let secondsAgo = 0;
  let offline = !data.connected;
  data.source;
  const xs = (t) => 40 + t / 47 * 740;
  const ys = (v) => 200 - v / 14 * 180;
  dayLabel = "Daily";
  $$payload.out.push(`<header class="container mx-auto flex items-center justify-between gap-4 px-4 py-4"><a href="/" class="text-muted text-sm hover:text-white">← Back to home</a> <div class="flex items-center gap-3 text-xs"><div class="text-muted">Reported ${escape_html(secondsAgo)}s ago</div> <span${attr_class(`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${offline ? "border-red-400/40 bg-red-400/10 text-red-300" : "border-green-400/40 bg-green-400/10 text-green-300"}`)}${attr("title", offline ? "Using mock data" : "Connected to Ecowitt")}><span${attr_class(`size-1.5 rounded-full ${offline ? "bg-red-400" : "bg-green-400"}`)}></span> ${escape_html(offline ? "Mock" : "Live (Ecowitt)")}</span></div></header> <main class="container mx-auto space-y-5 px-4 pb-8"><div class="grid gap-4 lg:grid-cols-3 xl:grid-cols-4"><a href="/weather/outdoor" class="block transform transition hover:scale-105">`);
  Panel($$payload, {
    title: "Outdoor",
    className: "h-full",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="grid grid-cols-2 gap-4"><div><div class="text-muted mb-1 text-xs">Temperature</div> <div class="text-3xl font-semibold">${escape_html(fmt(w.outdoor.temp))}<span class="align-top text-base">°C</span></div> <div class="text-muted mt-1 text-xs">${escape_html(arrow(w.outdoor.trend))}
							${escape_html(fmt(Math.abs(w.outdoor.trend)))} °C/hr</div> <div class="text-muted mt-1 text-xs">↗ 12.7 °C ↘ 4.9 °C</div> <div class="text-accent mt-1 text-xs">VPD ${escape_html(fmt(w.outdoor.vpd, 3))} kPa</div></div> <div><div class="text-muted mb-1 text-xs">Humidity</div> <div class="text-3xl font-semibold">${escape_html(w.outdoor.humidity)}<span class="align-top text-base">%</span></div> <div class="text-muted mt-1 text-xs">Feels Like ${escape_html(fmt(w.outdoor.feelsLike))} °C</div> <div class="text-muted mt-1 text-xs">Dew Point ${escape_html(fmt(w.outdoor.dewPoint))} °C</div></div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></a> <a href="/weather/indoor" class="block transform transition hover:scale-105">`);
  Panel($$payload, {
    title: "Indoor",
    className: "h-full",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="grid grid-cols-2 gap-4"><div><div class="text-muted mb-1 text-xs">Temperature</div> <div class="text-3xl font-semibold">${escape_html(fmt(w.indoor.temp))}<span class="align-top text-base">°C</span></div> <div class="text-muted mt-1 text-xs">${escape_html(arrow(w.indoor.trend))}
							${escape_html(fmt(Math.abs(w.indoor.trend)))} °C/hr</div> <div class="text-muted mt-1 text-xs">↗ 14.6 °C ↘ 11.6 °C</div></div> <div><div class="text-muted mb-1 text-xs">Humidity</div> <div class="text-3xl font-semibold">${escape_html(w.indoor.humidity)}<span class="align-top text-base">%</span></div> <div class="text-muted mt-1 text-xs">↗ 64 % ↘ 56 %</div></div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></a> <a href="/weather/solar" class="block transform transition hover:scale-105">`);
  Panel($$payload, {
    title: "Solar and UVI",
    className: "h-full",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="grid grid-cols-2 gap-4"><div><div class="text-muted text-xs">${escape_html(w.solar.moon)}</div> <div class="mt-2"><div class="text-muted mb-1 text-xs">Solar</div> <div class="text-3xl font-semibold">${escape_html(fmt(w.solar.solar))}<span class="align-top text-base">W/m²</span></div> <div class="text-muted mt-1 text-xs">↗ 828.9 W/m²</div></div></div> <div><div class="text-muted mb-1 text-xs">UVI</div> <div class="text-3xl font-semibold">${escape_html(w.solar.uvi)}</div> <div class="text-muted mt-4 text-xs">☀ Sun Rise ${escape_html(w.solar.sunrise)}</div> <div class="text-muted text-xs">☀ Sun Set ${escape_html(w.solar.sunset)}</div></div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></a> <a href="/weather/rain" class="block transform transition hover:scale-105">`);
  Panel($$payload, {
    title: "Rainfall",
    className: "h-full",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="grid grid-cols-2 gap-4"><div><div class="text-muted mb-1 text-xs">Rain Rate /hr</div> <div class="text-3xl font-semibold">${escape_html(fmt(w.rain.rate))}<span class="align-top text-base">mm</span></div> <div class="text-muted mt-2 text-xs">Daily ${escape_html(fmt(w.rain.daily))} mm</div></div> <div class="text-muted space-y-1 text-xs"><div>Event <span class="text-green-400">${escape_html(fmt(w.rain.event))} mm</span></div> <div>Hourly ${escape_html(fmt(w.rain.hourly))} mm</div> <div>Weekly ${escape_html(fmt(w.rain.weekly))} mm</div> <div>Monthly ${escape_html(fmt(w.rain.monthly))} mm</div> <div>Yearly ${escape_html(fmt(w.rain.yearly))} mm</div></div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></a> <a href="/weather/wind" class="block transform transition hover:scale-105 xl:col-span-2">`);
  Panel($$payload, {
    title: "Wind",
    className: "h-full",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="grid grid-cols-3 items-center gap-4"><div class="col-span-2 flex items-center justify-center"><svg viewBox="0 0 120 120" class="h-52 w-52"><circle cx="60" cy="60" r="54" class="stroke-border fill-transparent" stroke-width="2"></circle><text x="60" y="64" text-anchor="middle" class="fill-white text-3xl font-semibold">${escape_html(Math.round(w.wind.dir))}</text><text x="60" y="84" text-anchor="middle" class="fill-muted text-xs">${escape_html(["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round((w.wind.dir % 360 + 22.5) / 45) % 8])}</text><g${attr("transform", `rotate(${w.wind.dir} 60 60)`)}><polygon points="60,12 56,24 64,24" class="fill-accent"></polygon></g></svg></div> <div class="text-muted text-sm"><div class="text-lg font-semibold text-white">Wind ${escape_html(fmt(w.wind.speed))} m/s</div> <div>↗ ${escape_html(fmt(w.wind.speed * 3.6))} km/h <span class="text-xs">${escape_html(w.wind.timeSpeed)}</span></div> <div class="mt-2 text-lg font-semibold text-white">Gust ${escape_html(fmt(w.wind.gust))} m/s</div> <div>↗ ${escape_html(fmt(w.wind.gust * 3.6))} km/h <span class="text-xs">${escape_html(w.wind.timeGust)}</span></div></div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></a> <a href="/weather/pressure" class="block transform transition hover:scale-105">`);
  Panel($$payload, {
    title: "Pressure",
    className: "h-full",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="grid grid-cols-2 gap-4"><div><div class="text-muted mb-1 text-xs">Relative</div> <div class="text-3xl font-semibold">${escape_html(fmt(w.pressure.rel, 1))}<span class="align-top text-base">hPa</span></div> <div class="text-muted mt-1 text-xs">${escape_html(arrow(w.pressure.deltaRel))}
							${escape_html(fmt(Math.abs(w.pressure.deltaRel), 1))} hPa</div> <div class="text-muted mt-1 text-xs">↗ 994.2 hPa ↘ 990.1 hPa</div></div> <div><div class="text-muted mb-1 text-xs">Absolute</div> <div class="text-3xl font-semibold">${escape_html(fmt(w.pressure.abs, 1))}<span class="align-top text-base">hPa</span></div> <div class="text-muted mt-1 text-xs">${escape_html(arrow(w.pressure.deltaAbs))}
							${escape_html(fmt(Math.abs(w.pressure.deltaAbs), 1))} hPa</div> <div class="text-muted mt-1 text-xs">↗ 994.2 hPa ↘ 990.1 hPa</div></div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></a> <a href="/weather/battery" class="block transform transition hover:scale-105">`);
  Panel($$payload, {
    title: "Battery",
    className: "h-full",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="text-sm"><div class="font-semibold text-green-400">${escape_html(w.battery.status)}</div> <div class="text-muted">${escape_html(w.battery.note)}</div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></a></div> `);
  Panel($$payload, {
    title: `Outdoor — ${dayLabel}`,
    className: "",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="overflow-x-auto"><svg viewBox="0 0 800 240" class="h-64 w-full"><defs><clipPath id="clip"><rect x="40" y="20" width="740" height="180"></rect></clipPath></defs><g><text x="10" y="30" class="fill-muted text-xs">Temp</text><text x="10" y="50" class="fill-muted text-xs">Feels</text><text x="10" y="70" class="fill-muted text-xs">Dew</text></g><g clip-path="url(#clip)"><polyline fill="none" stroke="#facc15" stroke-width="2"${attr("points", w.series.map((p) => `${xs(p.t)},${ys(p.temp)}`).join(" "))}></polyline><polyline fill="none" stroke="#3b82f6" stroke-width="2"${attr("points", w.series.map((p) => `${xs(p.t)},${ys(p.feels)}`).join(" "))}></polyline><polyline fill="none" stroke="#22c55e" stroke-width="2"${attr("points", w.series.map((p) => `${xs(p.t)},${ys(p.dew)}`).join(" "))}></polyline></g><g class="text-muted"><line x1="40" y1="200" x2="780" y2="200" stroke="currentColor" stroke-opacity="0.3"></line><text x="782" y="204" class="fill-muted text-xs">0</text></g></svg></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></main>`);
  bind_props($$props, { data });
  pop();
}
export {
  _page as default
};
