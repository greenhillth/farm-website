import { z as escape_html, G as ensure_array_like } from './index-B80co9zT.js';
import { P as Panel } from './Panel-BFf1JTr8.js';
import './utils2-Bl_acQ9N.js';

function _page($$payload) {
  const entries = [
    {
      date: "2025-09-08",
      person: "Tom",
      hours: 4,
      activity: "Fencing – replace posts"
    },
    {
      date: "2025-09-08",
      person: "Alex",
      hours: 6,
      activity: "Spraying – blackberry"
    },
    {
      date: "2025-09-09",
      person: "Tom",
      hours: 3,
      activity: "Irrigation checks"
    }
  ];
  const total = entries.reduce((s, e) => s + e.hours, 0);
  $$payload.out.push(`<header class="container mx-auto px-4 py-4 flex items-center justify-between gap-4"><a href="/" class="text-sm text-muted hover:text-white">← Back to home</a> <div class="text-xs text-muted">Timesheets</div></header> <main class="container mx-auto px-4 pb-8 space-y-5"><div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">`);
  Panel($$payload, {
    title: "Recent Entries",
    children: ($$payload2) => {
      const each_array = ensure_array_like(entries);
      $$payload2.out.push(`<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="text-left text-muted border-b border-border/60"><tr><th class="py-2 pr-4">Date</th><th class="py-2 pr-4">Person</th><th class="py-2 pr-4">Activity</th><th class="py-2 text-right">Hours</th></tr></thead><tbody><!--[-->`);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let e = each_array[$$index];
        $$payload2.out.push(`<tr class="border-b border-border/40"><td class="py-2 pr-4 whitespace-nowrap">${escape_html(e.date)}</td><td class="py-2 pr-4">${escape_html(e.person)}</td><td class="py-2 pr-4">${escape_html(e.activity)}</td><td class="py-2 text-right">${escape_html(e.hours.toFixed(1))}</td></tr>`);
      }
      $$payload2.out.push(`<!--]--></tbody></table></div>`);
    },
    $$slots: {
      default: true,
      footer: ($$payload2) => {
        {
          $$payload2.out.push(`<div class="flex items-center justify-between gap-2 px-4 py-3 md:px-5 border-t border-border/60 text-sm"><div class="text-muted">Total</div> <div class="font-semibold">${escape_html(total.toFixed(1))} hours</div></div>`);
        }
      }
    }
  });
  $$payload.out.push(`<!----> `);
  Panel($$payload, {
    title: "Quick Add",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="text-sm text-muted">This is a placeholder for a quick-entry form (date, person, hours, activity).</div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></div></main>`);
}

export { _page as default };
//# sourceMappingURL=_page.svelte-Cu1_WAFc.js.map
