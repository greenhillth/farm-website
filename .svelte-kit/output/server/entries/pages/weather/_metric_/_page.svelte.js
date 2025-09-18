import { z as escape_html, x as attr, F as ensure_array_like, G as bind_props, v as pop, t as push } from "../../../../chunks/index.js";
function _page($$payload, $$props) {
  push();
  let data = $$props["data"];
  const metric = data.metric;
  const w = data.w;
  const history = Array.isArray(data.history) ? data.history : [];
  const metricFields = {
    outdoor: ["temp_c", "humidity_pct"],
    indoor: [],
    solar: ["solar_wm2"],
    rain: ["rain_1h_mm", "rain_24h_mm"],
    wind: ["wind_avg_ms", "wind_gust_ms", "wind_dir_deg"],
    pressure: ["pressure_hpa"],
    battery: []
  };
  const selectedFields = metricFields[metric] ?? [];
  const baseColumns = selectedFields.length ? ["timestamp_utc", ...selectedFields] : ["timestamp_utc"];
  const columns = selectedFields.length > 0 ? baseColumns : history.length && typeof history[0] === "object" ? [
    "timestamp_utc",
    ...Object.keys(history[0]).filter((k) => k !== "timestamp_utc")
  ] : baseColumns;
  const rangeHours = Math.max(1, Math.round((data.range.to - data.range.from) / 3600));
  const parseUtc = (value) => {
    const trimmed = value.trim();
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
    const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
    const stamped = hasTz ? normalized : `${normalized}Z`;
    return new Date(stamped);
  };
  const formatValue = (key, value) => {
    if (value === null || value === void 0) return "";
    if (key === "timestamp_utc" && typeof value === "string") {
      const parsed = parseUtc(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
    }
    if (typeof value === "number") {
      return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    }
    return String(value);
  };
  const titles = {
    outdoor: "Outdoor",
    indoor: "Indoor",
    solar: "Solar and UVI",
    rain: "Rainfall",
    wind: "Wind",
    pressure: "Pressure",
    battery: "Battery"
  };
  const title = titles[metric] ?? metric;
  const series = w.series;
  const xs = (t) => 40 + t / 47 * 740;
  const ys = (v) => 200 - v / 14 * 180;
  const high = Math.max(...series.map((p) => p.temp));
  const low = Math.min(...series.map((p) => p.temp));
  const bom = { high: 13, low: 5 };
  $$payload.out.push(`<div class="relative container mx-auto px-4 pb-8"><a href="/weather" aria-label="Back to weather" class="border-border bg-panel/95 hover:bg-panel focus:ring-accent/40 absolute top-3 left-3 z-[1000] flex items-center gap-2 rounded-full border px-3 py-2 text-sm text-white shadow-md backdrop-blur focus:ring-2 focus:outline-none"><svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="size-5" viewBox="0 0 24 24"><path d="M10.5 6 4.5 12l6 6M4.5 12h15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg> <span class="hidden sm:inline">Back</span></a> <h1 class="mt-12 mb-6 text-center text-2xl font-semibold">${escape_html(title)}</h1> <section class="mb-6 text-center"><div class="text-xl font-semibold">High ${escape_html(high.toFixed(1))}°C / Low ${escape_html(low.toFixed(1))}°C</div> <div class="text-muted text-sm">BoM Benchmark: High ${escape_html(bom.high)}°C, Low ${escape_html(bom.low)}°C</div></section> <section class="overflow-x-auto"><svg viewBox="0 0 800 240" class="h-64 w-full"><defs><clipPath id="clipDetail"><rect x="40" y="20" width="740" height="180"></rect></clipPath></defs><g clip-path="url(#clipDetail)"><polyline fill="none" stroke="#facc15" stroke-width="2"${attr("points", series.map((p) => `${xs(p.t)},${ys(p.temp)}`).join(" "))}></polyline></g><g class="text-muted"><line x1="40" y1="200" x2="780" y2="200" stroke="currentColor" stroke-opacity="0.3"></line><text x="782" y="204" class="fill-muted text-xs">0</text></g></svg></section> <section class="mt-8"><h2 class="mb-1 text-lg font-semibold">Recent readings</h2> <p class="text-muted mb-2 text-xs">Showing last ${escape_html(rangeHours)}h of data.</p> `);
  if (history.length) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(columns);
    const each_array_1 = ensure_array_like(history);
    $$payload.out.push(`<div class="overflow-x-auto"><table class="min-w-full text-left text-sm"><thead><tr><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let h = each_array[$$index];
      $$payload.out.push(`<th class="border-b px-2 py-1 font-medium">${escape_html(h === "timestamp_utc" ? "Timestamp" : h)}</th>`);
    }
    $$payload.out.push(`<!--]--></tr></thead><tbody><!--[-->`);
    for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
      let row = each_array_1[$$index_2];
      const each_array_2 = ensure_array_like(columns);
      $$payload.out.push(`<tr><!--[-->`);
      for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
        let h = each_array_2[$$index_1];
        $$payload.out.push(`<td class="border-b px-2 py-1">${escape_html(formatValue(h, row?.[h]))}</td>`);
      }
      $$payload.out.push(`<!--]--></tr>`);
    }
    $$payload.out.push(`<!--]--></tbody></table></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<p class="text-muted text-sm">No recent readings available.</p>`);
  }
  $$payload.out.push(`<!--]--></section></div>`);
  bind_props($$props, { data });
  pop();
}
export {
  _page as default
};
