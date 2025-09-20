import { w as push, y as pop, F as attr } from './index2-BvO_nZdM.js';
import { P as Panel } from './Panel-By_HKIWB.js';

function _page($$payload, $$props) {
  push();
  let searchTerm;
  let paddocks = [];
  let q = "";
  searchTerm = q.trim().toLowerCase();
  searchTerm ? paddocks.filter((p) => `${p.name} ${p.id} ${p.crop ?? ""}`.toLowerCase().includes(searchTerm)) : paddocks;
  $$payload.out.push(`<header class="container mx-auto flex items-center justify-between gap-4 px-4 py-4"><a href="/" class="text-muted text-sm hover:text-white">← Back to home</a> <div class="text-muted text-xs">Paddock Manager</div></header> <main class="container mx-auto space-y-5 px-4 pb-8">`);
  Panel($$payload, {
    title: "Paddocks",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="mb-3 flex items-center gap-3"><input placeholder="Search by name or ID…"${attr("value", q)} class="border-border focus:ring-accent/40 w-full max-w-md rounded-md border bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2"/> <a href="/map" class="text-muted text-sm hover:text-white">Open map →</a></div> `);
      {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="text-muted text-sm">Loading paddocks…</div>`);
      }
      $$payload2.out.push(`<!--]-->`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">`);
  Panel($$payload, {
    title: "Recent Notes",
    children: ($$payload2) => {
      $$payload2.out.push(`<ul class="text-muted list-disc space-y-1 pl-5 text-sm"><li>South paddock: inspect fence line</li> <li>North ridge: soil sampling next week</li> <li>Creek paddock: spot spray blackberry regrowth</li></ul>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Panel($$payload, {
    title: "Upcoming Tasks",
    children: ($$payload2) => {
      $$payload2.out.push(`<ul class="text-muted list-disc space-y-1 pl-5 text-sm"><li>Fertilize OM trial plots (Friday)</li> <li>Check troughs in Top Flat</li></ul>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></div></main>`);
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DJqmBoBb.js.map
