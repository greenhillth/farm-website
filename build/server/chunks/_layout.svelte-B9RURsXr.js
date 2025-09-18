import { E as head, F as attr } from './index2-BvO_nZdM.js';

const favicon = "/_app/immutable/assets/favicon.DRH03K5g.svg";
function _layout($$payload, $$props) {
  let { children } = $$props;
  head($$payload, ($$payload2) => {
    $$payload2.out.push(`<link rel="icon"${attr("href", favicon)}/>`);
  });
  children?.($$payload);
  $$payload.out.push(`<!---->`);
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-B9RURsXr.js.map
