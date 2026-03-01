import { f as fallback, a as attr, e as escape_html, b as ensure_array_like, c as bind_props, d as spread_props } from "../../chunks/index2.js";
function Card($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let href = $$props["href"];
    let title = $$props["title"];
    let description = fallback($$props["description"], "");
    let tags = fallback($$props["tags"], () => [], true);
    let image = fallback($$props["image"], null);
    let imageAlt = fallback($$props["imageAlt"], "");
    let badge = fallback($$props["badge"], null);
    $$renderer2.push(`<a class="group block"${attr("href", href)}${attr("aria-label", title)}><article class="relative overflow-hidden rounded-xl bg-panel border border-border shadow-sm transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.02]">`);
    if (image) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="aspect-[16/9] overflow-hidden"><img${attr("src", image)}${attr("alt", imageAlt)} class="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-105 select-none"/></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="aspect-[16/9] bg-gradient-to-br from-accent/20 via-transparent to-border/40"></div>`);
    }
    $$renderer2.push(`<!--]--> <div class="p-4 md:p-5">`);
    if (badge) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs mb-2">${escape_html(badge)}</div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <h3 class="text-white font-semibold leading-snug">${escape_html(title)}</h3> `);
    if (description) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="mt-1 text-sm text-muted">${escape_html(description)}</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (tags.length) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-3 flex flex-wrap gap-2"><!--[-->`);
      const each_array = ensure_array_like(tags);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let t = each_array[$$index];
        $$renderer2.push(`<span class="inline-flex items-center rounded-full border border-border bg-white/5 px-2 py-0.5 text-xs text-muted">#${escape_html(t)}</span>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></article></a>`);
    bind_props($$props, { href, title, description, tags, image, imageAlt, badge });
  });
}
function _page($$renderer) {
  const items = [
    {
      href: "/map",
      title: "Interactive Farm Map",
      description: "Explore fields, soil metrics and optimal ranges.",
      tags: ["map", "leaflet"],
      image: "/img/aerial-map.jpg",
      imageAlt: "Aerial view of farm map",
      badge: "Featured"
    },
    {
      href: "/paddocks",
      title: "Paddock Manager",
      description: "Manage paddocks, notes, and field tasks.",
      tags: ["paddocks"],
      image: "/img/tractor-1.jpg",
      badge: "New"
    },
    {
      href: "/soiltests",
      title: "Soil Tests",
      description: "Manage soil tests and analysis.",
      tags: ["soil", "tests"],
      image: "img/soil.jpg",
      badge: "New"
    },
    {
      href: "https://greenhillbros.sharepoint.com/sites/Draft/Shared%20Documents/Forms/AllItems.aspx",
      title: "Sharepoint Invoices",
      description: "Sharepoint Invoices Site",
      tags: ["instructions", "manual"],
      image: "/img/sharepoint.jpg",
      badge: "Sharepoint"
    },
    {
      href: "https://greenhillbros.sharepoint.com/sites/Draft/SitePages/CollabHome.aspx",
      title: "Sharepoint Home",
      description: "Greenhill Bros Sharepoint Home",
      tags: ["instructions", "manual"],
      image: "/img/sharepoint.jpg",
      badge: "Sharepoint"
    },
    {
      href: "/timesheet",
      title: "Timesheets",
      description: "Log hours and activities across the farm.",
      tags: ["timesheet"],
      image: null,
      badge: "New"
    },
    {
      href: "/weather",
      title: "Weather Station",
      description: "Live outdoor/indoor, wind, rainfall, solar and more.",
      tags: ["weather"],
      image: "img/weather-station.webp",
      badge: "Dashboard"
    },
    // {
    //   href: '/alex',
    //   title: 'Media Lab',
    //   description: 'Video + image experiments for the site.',
    //   tags: ['media'],
    //   image: '/img/tom-and-alex.jpg',
    //   imageAlt: 'Tom and Alex'
    // },
    {
      href: "/map?metric=OM",
      title: "Soil Organic Matter",
      description: "Visualize OM across the farm.",
      tags: ["soil", "OM"],
      image: null,
      badge: "Analytics"
    },
    {
      href: "/manual",
      title: "Operation Instructions",
      description: "Instructions for the less technically-savvy.",
      tags: ["instructions", "manual"],
      image: "img/confused-dad-1.jpg",
      badge: "Help"
    }
  ];
  $$renderer.push(`<div class="home-shell svelte-1uha8ag"><div class="home-shell__bg svelte-1uha8ag" aria-hidden="true"></div> <main class="relative container mx-auto px-4 py-8 svelte-1uha8ag"><header class="mb-6 flex items-center justify-between gap-4"><h1 class="text-xl font-semibold md:text-2xl">Greenhill Bros Farm</h1> <a href="/map" class="text-muted text-sm hover:text-white">Open map →</a></header> <section class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"><!--[-->`);
  const each_array = ensure_array_like(items);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let i = each_array[$$index];
    Card($$renderer, spread_props([i]));
  }
  $$renderer.push(`<!--]--></section></main></div>`);
}
export {
  _page as default
};
