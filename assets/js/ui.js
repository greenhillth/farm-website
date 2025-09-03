import { $, fmt } from "./utils.js";

// Base button (looks like Tailwind docs items)
// - uses a before: pseudo-element as the vertical indicator
const baseBtn =
  "relative group w-full flex items-center gap-2 rounded-md " +
  "px-3 py-2 pl-5 text-sm text-muted transition " +
  "hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-accent/40 " +
  // indicator line (hidden by default; appears on hover)
  "before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 " +
  "before:w-px before:rounded before:bg-transparent before:transition-colors " +
  "group-hover:before:bg-accent/50";

const activeBtn =
  // brighter text + subtle chip bg
  "text-white bg-white/10 " +
  // make the indicator thicker and fully accent when active
  "before:w-[2px] before:bg-accent";

function classes(isActive) {
  return isActive ? `${baseBtn} ${activeBtn}` : baseBtn;
}

export function renderMetricNav(container, metrics, activeMetric) {
  container.innerHTML = metrics
    .map(
      (m) => `
    <button type="button"
            class="${classes(m === activeMetric)}"
            data-metric="${m}" aria-current="${
        m === activeMetric ? "page" : "false"
      }">
      <span class="truncate">${m}</span>
    </button>
  `
    )
    .join("");
}

export function bindMetricNav(container, onSelect) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-metric]");
    if (!btn) return;
    onSelect(btn.dataset.metric);
  });

  // keyboard nav (Up/Down + Enter/Space)
  container.addEventListener("keydown", (e) => {
    const buttons = [...container.querySelectorAll("button[data-metric]")];
    const i = buttons.indexOf(document.activeElement);
    if (e.key === "ArrowDown" && i > -1) {
      e.preventDefault();
      (buttons[i + 1] || buttons[0]).focus();
    }
    if (e.key === "ArrowUp" && i > -1) {
      e.preventDefault();
      (buttons[i - 1] || buttons.at(-1)).focus();
    }
    if ((e.key === "Enter" || e.key === " ") && i > -1) {
      e.preventDefault();
      buttons[i].click();
    }
  });
}

export function setActiveMetric(container, metric) {
  container.querySelectorAll("button[data-metric]").forEach((btn) => {
    const isActive = btn.dataset.metric === metric;
    btn.className = classes(isActive);
    btn.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

export function renderLegend(panel, legend) {
  panel.innerHTML = `
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
