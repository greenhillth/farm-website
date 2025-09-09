import { x as attr, z as escape_html, F as ensure_array_like, G as bind_props, v as pop, t as push, J as spread_props } from "../../chunks/index.js";
import { j as fallback } from "../../chunks/utils2.js";
function Card($$payload, $$props) {
  push();
  let href = $$props["href"];
  let title = $$props["title"];
  let description = fallback($$props["description"], "");
  let tags = fallback($$props["tags"], () => [], true);
  let image = fallback($$props["image"], null);
  let imageAlt = fallback($$props["imageAlt"], "");
  let badge = fallback($$props["badge"], null);
  $$payload.out.push(`<a class="group block"${attr("href", href)}${attr("aria-label", title)}><article class="relative overflow-hidden rounded-xl bg-panel border border-border shadow-sm transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.02]">`);
  if (image) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="aspect-[16/9] overflow-hidden"><img${attr("src", image)}${attr("alt", imageAlt)} class="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-105 select-none"/></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="aspect-[16/9] bg-gradient-to-br from-accent/20 via-transparent to-border/40"></div>`);
  }
  $$payload.out.push(`<!--]--> <div class="p-4 md:p-5">`);
  if (badge) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs mb-2">${escape_html(badge)}</div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <h3 class="text-white font-semibold leading-snug">${escape_html(title)}</h3> `);
  if (description) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<p class="mt-1 text-sm text-muted">${escape_html(description)}</p>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (tags.length) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(tags);
    $$payload.out.push(`<div class="mt-3 flex flex-wrap gap-2"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let t = each_array[$$index];
      $$payload.out.push(`<span class="inline-flex items-center rounded-full border border-border bg-white/5 px-2 py-0.5 text-xs text-muted">#${escape_html(t)}</span>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div></article></a>`);
  bind_props($$props, { href, title, description, tags, image, imageAlt, badge });
  pop();
}
function _page($$payload) {
  const items = [
    {
      href: "/map",
      title: "Interactive Farm Map",
      description: "Explore fields, soil metrics and optimal ranges.",
      tags: ["map", "leaflet"],
      image: "/img/logo.png",
      imageAlt: "Farm logo",
      badge: "Featured"
    },
    {
      href: "/weather",
      title: "Weather Station",
      description: "Live outdoor/indoor, wind, rainfall, solar and more.",
      tags: ["weather"],
      image: null,
      badge: "Dashboard"
    },
    {
      href: "/alex",
      title: "Media Lab",
      description: "Video + image experiments for the site.",
      tags: ["media"],
      image: "/img/tom-and-alex.jpg",
      imageAlt: "Tom and Alex"
    },
    {
      href: "/map?metric=OM",
      title: "Soil Organic Matter",
      description: "Visualize OM across the farm.",
      tags: ["soil", "OM"],
      image: null,
      badge: "Analytics"
    },
    {
      href: "/map?metric=K",
      title: "Potassium (K)",
      description: "Check optimal ranges and hotspots.",
      tags: ["soil", "K"],
      image: null
    }
  ];
  const each_array = ensure_array_like(items);
  $$payload.out.push(`<main class="container mx-auto px-4 py-8"><header class="mb-6 flex items-center justify-between gap-4"><h1 class="text-xl md:text-2xl font-semibold">Greenhill Bros Farm</h1> <a href="/map" class="text-sm text-muted hover:text-white">Open map →</a></header> <section class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"><!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let i = each_array[$$index];
    Card($$payload, spread_props([i]));
  }
  $$payload.out.push(`<!--]--></section></main>`);
}
export {
  _page as default
};
