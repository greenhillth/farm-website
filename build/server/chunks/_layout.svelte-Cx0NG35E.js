import { E as head, F as attr } from './index2-BeMJ0Pb9.js';

const favicon = "/_app/immutable/assets/favicon.BoR511CM.svg";
function _layout($$payload, $$props) {
  let { children } = $$props;
  head($$payload, ($$payload2) => {
    $$payload2.out.push(`<link rel="icon"${attr("href", favicon)}/>`);
  });
  children?.($$payload);
  $$payload.out.push(`<!---->`);
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-Cx0NG35E.js.map
