import { w as head, x as attr } from "../../chunks/index.js";
const favicon = "/_app/immutable/assets/favicon.DRH03K5g.svg";
function _layout($$payload, $$props) {
  let { children } = $$props;
  head($$payload, ($$payload2) => {
    $$payload2.out.push(`<link rel="icon"${attr("href", favicon)}/>`);
  });
  children?.($$payload);
  $$payload.out.push(`<!---->`);
}
export {
  _layout as default
};
