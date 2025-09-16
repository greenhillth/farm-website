import { $, fmt } from "./utils";

type MetricOption = { id: string; label: string };

export function renderMetricNav(
  container: HTMLElement,
  metrics: MetricOption[],
  active: string,
  onClick: (m: string) => void
) {
  const activeLabel = metrics.find((m) => m.id === active)?.label ?? active;
  container.innerHTML = `
    <details class="group">
      <summary class="flex items-center justify-between rounded-md px-3 py-2 text-sm text-white/90 bg-white/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
        <span>Soil Data Overlay</span>
        <span class="text-xs text-muted" data-active-label>${activeLabel}</span>
      </summary>
      <div class="mt-2 space-y-1 rounded-md border border-border bg-panel/80 p-2">
        ${metrics
          .map(
            (m) => `
              <label class="flex items-center gap-2 rounded px-2 py-1 text-sm text-muted hover:bg-white/5">
                <input type="radio" name="metric" value="${m.id}" data-label="${m.label}" ${
              m.id === active ? "checked" : ""
            } class="accent-accent" />
                <span>${m.label}</span>
              </label>
            `
          )
          .join("")}
      </div>
    </details>
  `;

  container
    .querySelectorAll<HTMLInputElement>('input[type="radio"][name="metric"]')
    .forEach((input) =>
      input.addEventListener("change", () => {
        if (input.checked) {
          onClick(input.value);
        }
      })
    );
}

export function setActiveMetric(container: HTMLElement, active: string) {
  let labelText = active;
  container
    .querySelectorAll<HTMLInputElement>('input[type="radio"][name="metric"]')
    .forEach((input) => {
      const isActive = input.value === active;
      if (isActive) labelText = input.dataset.label ?? active;
      input.checked = isActive;
    });
  const labelTarget = container.querySelector<HTMLElement>(
    "[data-active-label]"
  );
  if (labelTarget) labelTarget.textContent = labelText;
}

export function renderLegend(
  container: HTMLElement,
  legend: { title: string; gradientCSS: string; ticks: Record<string, number> }
) {
  container.innerHTML = `
    <div class="font-semibold mb-1">${legend.title}</div>
    <div class="h-3 border border-border" style="background:${
      legend.gradientCSS
    }"></div>
    <div class="flex justify-between text-xs text-muted mt-1">
      <span>${fmt(legend.ticks.vmin)}</span><span>${fmt(
    legend.ticks.low
  )}</span>
      <span>${fmt(legend.ticks.mid)}</span><span>${fmt(
    legend.ticks.high
  )}</span>
      <span>${fmt(legend.ticks.vmax)}</span>
    </div>`;
}
