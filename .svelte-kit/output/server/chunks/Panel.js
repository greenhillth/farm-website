import { K as attr_class, z as escape_html, N as slot, G as bind_props } from "./index.js";
import { j as fallback } from "./utils2.js";
function Panel($$payload, $$props) {
  let title = $$props["title"];
  let className = fallback($$props["className"], "");
  $$payload.out.push(`<section${attr_class(`bg-panel border border-border rounded-xl shadow-sm ${className}`)}><header class="flex items-center justify-between gap-2 px-4 py-3 md:px-5 md:py-4 border-b border-border/60"><h3 class="text-sm md:text-base font-semibold">${escape_html(title)}</h3> <!---->`);
  slot($$payload, $$props, "actions", {});
  $$payload.out.push(`<!----></header> <div class="p-4 md:p-5"><!---->`);
  slot($$payload, $$props, "default", {});
  $$payload.out.push(`<!----></div> <!---->`);
  slot($$payload, $$props, "footer", {});
  $$payload.out.push(`<!----></section>`);
  bind_props($$props, { title, className });
}
export {
  Panel as P
};
