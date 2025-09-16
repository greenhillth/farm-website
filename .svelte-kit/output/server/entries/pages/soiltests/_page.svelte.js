import { v as pop, t as push, x as attr, z as escape_html } from "../../../chunks/index.js";
import { P as Panel } from "../../../chunks/Panel.js";
function _page($$payload, $$props) {
  push();
  let filtered;
  let tests = [];
  let q = "";
  filtered = tests;
  $$payload.out.push(`<header class="container mx-auto px-4 py-4 flex items-center justify-between gap-4"><a href="/" class="text-sm text-muted hover:text-white">← Back to home</a> <div class="text-xs text-muted">Soil Tests</div></header> <main class="container mx-auto px-4 pb-8 space-y-5">`);
  Panel($$payload, {
    title: "Soil tests",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3"><input placeholder="Search by paddock or sample…"${attr("value", q)} class="w-full sm:max-w-md rounded-md border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"/> <div class="text-xs text-muted">Showing ${escape_html(filtered.length)} of ${escape_html(tests.length)} samples</div></div> `);
      {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="text-sm text-muted">Loading soil tests…</div>`);
      }
      $$payload2.out.push(`<!--]-->`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></main>`);
  pop();
}
export {
  _page as default
};
