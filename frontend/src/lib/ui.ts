import { $, fmt } from "./utils";

// Classes mirror your originals (indicator via ::before)
const baseBtn =
  "relative group w-full flex items-center gap-2 rounded-md " +
  "px-3 py-2 pl-5 text-sm text-muted transition " +
  "hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-accent/40 " +
  "before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 " +
  "before:w-px before:rounded before:bg-transparent before:transition-colors " +
  "group-hover:before:bg-accent/50";

const activeBtn = "text-white bg-white/10";
const iconChip =
  "inline-flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-xs";

export function renderMetricNav(
  container: HTMLElement,
  metrics: string[],
  active: string,
  onClick: (m: string) => void
) {
  container.innerHTML = metrics
    .map(
      (m) => `
    <button class="${baseBtn} ${
        m === active ? activeBtn : ""
      }" data-metric="${m}">
      <span class="${iconChip}">${m}</span>
      <span class="truncate">${m}</span>
    </button>
  `
    )
    .join("");

  container
    .querySelectorAll<HTMLButtonElement>("button[data-metric]")
    .forEach((btn) =>
      btn.addEventListener("click", () => onClick(btn.dataset.metric!))
    );
}

export function setActiveMetric(container: HTMLElement, active: string) {
  container
    .querySelectorAll<HTMLButtonElement>("button[data-metric]")
    .forEach((btn) => {
      const isActive = btn.dataset.metric === active;
      btn.classList.toggle("text-white", isActive);
      btn.classList.toggle("bg-white/10", isActive);
    });
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

