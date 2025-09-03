import { $, fmt } from "./utils.js";

export function populateMetricSelect(metrics, def) {
  const sel = $("#metricSelect");
  sel.innerHTML = metrics
    .map(
      (m) => `<option value="${m}" ${m === def ? "selected" : ""}>${m}</option>`
    )
    .join("");
}
export function renderLegend(panel, legend) {
  panel.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px;">${legend.title}</div>
    <div class="ramp" style="background:${legend.gradientCSS}"></div>
    <div class="ticks">
      <span>${fmt(legend.ticks.vmin)}</span><span>${fmt(
    legend.ticks.low
  )}</span>
      <span>${fmt(legend.ticks.mid)}</span><span>${fmt(
    legend.ticks.high
  )}</span>
      <span>${fmt(legend.ticks.vmax)}</span>
    </div>`;
}
