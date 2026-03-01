import { f as fallback, j as attr_class, e as escape_html, ag as slot, c as bind_props } from "./index2.js";
function Panel($$renderer, $$props) {
  let title = $$props["title"];
  let className = fallback($$props["className"], "");
  $$renderer.push(`<section${attr_class(`bg-panel border border-border rounded-xl shadow-sm ${className}`)}><header class="flex items-center justify-between gap-2 px-4 py-3 md:px-5 md:py-4 border-b border-border/60"><h3 class="text-sm md:text-base font-semibold">${escape_html(title)}</h3> <!--[-->`);
  slot($$renderer, $$props, "actions", {});
  $$renderer.push(`<!--]--></header> <div class="p-4 md:p-5"><!--[-->`);
  slot($$renderer, $$props, "default", {});
  $$renderer.push(`<!--]--></div> <!--[-->`);
  slot($$renderer, $$props, "footer", {});
  $$renderer.push(`<!--]--></section>`);
  bind_props($$props, { title, className });
}
export {
  Panel as P
};
