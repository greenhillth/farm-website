import { a as attr } from "../../../chunks/index2.js";
import { P as Panel } from "../../../chunks/Panel.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let searchTerm;
    let paddocks = [];
    let q = "";
    searchTerm = q.trim().toLowerCase();
    searchTerm ? paddocks.filter((p) => `${p.name} ${p.id} ${p.crop ?? ""}`.toLowerCase().includes(searchTerm)) : paddocks;
    $$renderer2.push(`<header class="container mx-auto flex items-center justify-between gap-4 px-4 py-4"><a href="/" class="text-muted text-sm hover:text-white">← Back to home</a> <div class="text-muted text-xs">Paddock Manager</div></header> <main class="container mx-auto space-y-5 px-4 pb-8">`);
    Panel($$renderer2, {
      title: "Paddocks",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="mb-3 flex items-center gap-3"><input placeholder="Search by name or ID…"${attr("value", q)} class="border-border focus:ring-accent/40 w-full max-w-md rounded-md border bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2"/> <a href="/map" class="text-muted text-sm hover:text-white">Open map →</a></div> `);
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<div class="text-muted text-sm">Loading paddocks…</div>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">`);
    Panel($$renderer2, {
      title: "Recent Notes",
      children: ($$renderer3) => {
        $$renderer3.push(`<ul class="text-muted list-disc space-y-1 pl-5 text-sm"><li>South paddock: inspect fence line</li> <li>North ridge: soil sampling next week</li> <li>Creek paddock: spot spray blackberry regrowth</li></ul>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Panel($$renderer2, {
      title: "Upcoming Tasks",
      children: ($$renderer3) => {
        $$renderer3.push(`<ul class="text-muted list-disc space-y-1 pl-5 text-sm"><li>Fertilize OM trial plots (Friday)</li> <li>Check troughs in Top Flat</li></ul>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div></main>`);
  });
}
export {
  _page as default
};
