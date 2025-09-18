import { t as push, v as pop, y as attr, z as escape_html } from './index-B80co9zT.js';
import { P as Panel } from './Panel-BFf1JTr8.js';
import './utils2-Bl_acQ9N.js';

function _page($$payload, $$props) {
  push();
  let filtered;
  const metricColumns = [
    { key: "P", label: "P" },
    { key: "K", label: "K" },
    { key: "Ca", label: "Ca" },
    { key: "Mg", label: "Mg" },
    { key: "S", label: "S" },
    { key: "Na", label: "Na" },
    { key: "pH", label: "pH (H2O)" }
  ];
  let tests = [];
  let q = "";
  let manualMetrics = { P: "", K: "", Ca: "", Mg: "", S: "", Na: "", pH: "" };
  metricColumns.reduce(
    (count, { key }) => {
      const value = manualMetrics[key];
      return value && value.trim() ? count + 1 : count;
    },
    0
  );
  filtered = tests;
  $$payload.out.push(`<header class="container mx-auto px-4 py-4 flex items-center justify-between gap-4"><a href="/" class="text-sm text-muted hover:text-white">← Back to home</a> <div class="text-xs text-muted">Soil Tests</div></header> <main class="container mx-auto px-4 pb-8 space-y-5">`);
  Panel($$payload, {
    title: "Soil tests",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3"><input placeholder="Search by paddock or sample…"${attr("value", q)} class="w-full sm:max-w-md rounded-md border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"/> <div class="flex flex-wrap items-center gap-3 text-xs text-muted"><span>Showing ${escape_html(filtered.length)} of ${escape_html(tests.length)} samples</span> <button type="button" class="rounded-md border border-border bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-accent/40">Add soil test</button></div></div> `);
      {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="text-sm text-muted">Loading soil tests…</div>`);
      }
      $$payload2.out.push(`<!--]-->`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></main> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DbSUv-Yy.js.map
