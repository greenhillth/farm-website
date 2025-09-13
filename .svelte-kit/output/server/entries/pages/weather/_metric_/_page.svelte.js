import { z as escape_html, x as attr, G as bind_props, v as pop, t as push } from "../../../../chunks/index.js";
function _page($$payload, $$props) {
  push();
  let data = $$props["data"];
  const metric = data.metric;
  const w = data.w;
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
  $$payload.out.push(`<div class="relative container mx-auto px-4 pb-8"><a href="/weather" aria-label="Back to weather" class="border-border bg-panel/95 hover:bg-panel focus:ring-accent/40 absolute top-3 left-3 z-[1000] flex items-center gap-2 rounded-full border px-3 py-2 text-sm text-white shadow-md backdrop-blur focus:ring-2 focus:outline-none"><svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="size-5" viewBox="0 0 24 24"><path d="M10.5 6 4.5 12l6 6M4.5 12h15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg> <span class="hidden sm:inline">Back</span></a> <h1 class="mt-12 mb-6 text-center text-2xl font-semibold">${escape_html(title)}</h1> <section class="mb-6 text-center"><div class="text-xl font-semibold">High ${escape_html(high.toFixed(1))}°C / Low ${escape_html(low.toFixed(1))}°C</div> <div class="text-muted text-sm">BoM Benchmark: High ${escape_html(bom.high)}°C, Low ${escape_html(bom.low)}°C</div></section> <section class="overflow-x-auto"><svg viewBox="0 0 800 240" class="h-64 w-full"><defs><clipPath id="clipDetail"><rect x="40" y="20" width="740" height="180"></rect></clipPath></defs><g clip-path="url(#clipDetail)"><polyline fill="none" stroke="#facc15" stroke-width="2"${attr("points", series.map((p) => `${xs(p.t)},${ys(p.temp)}`).join(" "))}></polyline></g><g class="text-muted"><line x1="40" y1="200" x2="780" y2="200" stroke="currentColor" stroke-opacity="0.3"></line><text x="782" y="204" class="fill-muted text-xs">0</text></g></svg></section></div>`);
  bind_props($$props, { data });
  pop();
}
export {
  _page as default
};
