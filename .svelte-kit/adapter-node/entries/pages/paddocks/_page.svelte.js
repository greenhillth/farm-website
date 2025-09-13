import { v as pop, t as push, x as attr } from "../../../chunks/index.js";
import { P as Panel } from "../../../chunks/Panel.js";
function _page($$payload, $$props) {
  push();
  let q = "";
  $$payload.out.push(`<header class="container mx-auto px-4 py-4 flex items-center justify-between gap-4"><a href="/" class="text-sm text-muted hover:text-white">← Back to home</a> <div class="text-xs text-muted">Paddock Manager</div></header> <main class="container mx-auto px-4 pb-8 space-y-5">`);
  Panel($$payload, {
    title: "Paddocks",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="flex items-center gap-3 mb-3"><input placeholder="Search by name or farm…"${attr("value", q)} class="w-full max-w-md rounded-md border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"/> <a href="/map" class="text-sm text-muted hover:text-white">Open map →</a></div> `);
      {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="text-sm text-muted">Loading paddocks…</div>`);
      }
      $$payload2.out.push(`<!--]-->`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">`);
  Panel($$payload, {
    title: "Recent Notes",
    children: ($$payload2) => {
      $$payload2.out.push(`<ul class="list-disc pl-5 text-sm text-muted space-y-1"><li>South paddock: inspect fence line</li> <li>North ridge: soil sampling next week</li> <li>Creek paddock: spot spray blackberry regrowth</li></ul>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Panel($$payload, {
    title: "Upcoming Tasks",
    children: ($$payload2) => {
      $$payload2.out.push(`<ul class="list-disc pl-5 text-sm text-muted space-y-1"><li>Fertilize OM trial plots (Friday)</li> <li>Check troughs in Top Flat</li></ul>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></div></main>`);
  pop();
}
export {
  _page as default
};
