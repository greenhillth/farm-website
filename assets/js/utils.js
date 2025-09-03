export function linearGradientCSS(colors, stopsPct) {
  const parts = colors.map((c, i) => `${c} ${Math.round(stopsPct[i])}%`);
  return `linear-gradient(to right, ${parts.join(", ")})`;
}
export function $(sel, root = document) {
  return root.querySelector(sel);
}
export function fmt(n) {
  return Number.isFinite(n) ? String(Math.round(n)) : "–";
}
