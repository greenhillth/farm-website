import { x as head, G as ensure_array_like, y as attr, z as escape_html } from './index-B80co9zT.js';
import { P as Panel } from './Panel-BFf1JTr8.js';
import './utils2-Bl_acQ9N.js';

function _page($$payload) {
  const quickLinks = [
    {
      label: "Farm dashboard",
      description: "Return to the home grid of tools.",
      href: "/",
      cta: "Back to home →"
    },
    {
      label: "Interactive farm map",
      description: "See paddock boundaries and soil layers.",
      href: "/map",
      cta: "Open map →"
    },
    {
      label: "Soil tests",
      description: "Review and add laboratory results.",
      href: "/soiltests",
      cta: "Manage samples →"
    },
    {
      label: "Weather station",
      description: "Check live on-farm conditions.",
      href: "/weather",
      cta: "View weather →"
    }
  ];
  const navigationSteps = [
    {
      title: "Start from the home tiles",
      detail: "The homepage lists each tool as a card. Click a card to open that section in-place."
    },
    {
      title: "Use the top back links",
      detail: "Every feature page has a “← Back to home” (or map) link in the header so you are never stuck."
    },
    {
      title: "Look for panels and actions",
      detail: "Information is grouped inside dark panels. Buttons for actions such as “Add soil test” sit in the panel header."
    },
    {
      title: "Search when lists feel long",
      detail: "Tables for paddocks, soil tests and timesheets filter instantly as you type in the search box."
    }
  ];
  const features = [
    {
      title: "Interactive Farm Map",
      summary: "Pan and zoom around the property with overlays for soil metrics and paddock notes.",
      href: "/map",
      tips: [
        "Use the metric selector on the left rail to swap between available overlays like K or pH (more coming soon).",
        "Hover over a paddock to see its name and ID, then use Reset view if you need to zoom back out."
      ]
    },
    {
      title: "Paddock Manager",
      summary: "Searchable directory of every paddock, including recent soil readings and farm grouping.",
      href: "/paddocks",
      tips: [
        "Filter by name or farm in the search box above the table.",
        "Use the “View on map” link next to a paddock to centre it on the interactive map."
      ]
    },
    {
      title: "Soil Tests",
      summary: "Central place to review laboratory results, capture new samples and export data (coming soon).",
      href: "/soiltests",
      tips: [
        "Use the counter in the header to see how many samples match your search.",
        "Choose “Add soil test” to open the uploader for manual entry or CSV import."
      ]
    },
    {
      title: "Weather Station",
      summary: "Live dashboard for temperature, rainfall, solar and wind direct from the farm station.",
      href: "/weather",
      tips: [
        "Values update automatically; watch the “Reported … ago” label under each sensor block.",
        "Scroll to see indoor, outdoor and solar panels arranged in the same panel layout."
      ]
    },
    {
      title: "Timesheets",
      summary: "Lightweight log of work completed on the farm, ready for more automation later.",
      href: "/timesheet",
      tips: [
        "Totals appear in the summary strip below the Recent Entries table.",
        "The Quick Add panel shows the fields the future entry form will collect."
      ]
    }
  ];
  const manualSteps = [
    "Open the Soil tests page and select “Add soil test” in the top-right of the panel.",
    "Stay on the default “Manual entry” tab.",
    "Fill in the required Field ID, Sample name and Sample date fields. Add Sample ID or Client details if you have them.",
    "Enter at least one metric (P, K, Ca, Mg, S, Na or pH (H₂O)). The placeholders show the typical format from the lab.",
    "Press “Save test”. The modal closes and the new sample appears at the top of the table."
  ];
  const csvSteps = [
    "Prepare a CSV file using the same column headings shown in the uploader (e.g. fieldID, name_sample, sample_id, sample_date, client, P, K, Ca, Mg, S, Na, ph_water).",
    "From the Soil tests page choose “Add soil test” → “Upload CSV” and pick your file.",
    "Keep dates in YYYY-MM-DD format and leave any metric blank if you do not have a value. The importer skips empty cells.",
    "Submit the form to upload. Large files may take a few seconds — stay on the page until the modal closes."
  ];
  const csvHeaders = [
    {
      label: "fieldID",
      description: "Required. Matches the Field ID displayed under each paddock name."
    },
    {
      label: "name_sample",
      description: "Required. Friendly sample name such as ES30 or “North Flats 2024”."
    },
    {
      label: "sample_id / sampleId",
      description: "Optional lab reference. Use either style; leave blank if the lab did not supply one."
    },
    {
      label: "sample_date",
      description: "Required. Use the ISO format YYYY-MM-DD (e.g. 2024-03-14)."
    },
    {
      label: "client",
      description: "Optional. Who requested the test — helpful when sharing data."
    },
    {
      label: "P, K, Ca, Mg, S, Na, pH/ph_water",
      description: "Metric columns. Supply as many as you have results for."
    }
  ];
  const supportTips = [
    {
      title: "Search & filters",
      description: "Every major table has a search box. Type a paddock, person or sample and results filter instantly."
    },
    {
      title: "Stay oriented on the map",
      description: "Metric toggles sit on the left edge of the interactive map. Use them to change layers and the “Reset view” button to jump back to the whole farm."
    },
    {
      title: "Need a hand?",
      description: "If something looks off, note it in the paddock tasks panel or message Tom at the Coding Sweatshop directly so he can follow up."
    }
  ];
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Operations manual | Greenhill Bros Farm</title>`;
  });
  $$payload.out.push(`<header class="container mx-auto flex items-center justify-between gap-4 px-4 py-4"><a href="/" class="text-muted text-sm hover:text-white">← Back to home</a> <div class="text-muted text-xs">Operations manual</div></header> <main class="container mx-auto space-y-5 px-4 pb-12">`);
  Panel($$payload, {
    title: "Welcome to the farm manual",
    children: ($$payload2) => {
      const each_array = ensure_array_like(quickLinks);
      $$payload2.out.push(`<div class="text-muted space-y-4 text-sm leading-relaxed"><p>This guide walks through the key screens in the farm webapp and how to keep soil data up to
				date. Dip in whenever you need a refresher or a quick pointer for someone new on the team.</p> <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><!--[-->`);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let link = each_array[$$index];
        $$payload2.out.push(`<a${attr("href", link.href)} class="group border-border/50 hover:border-accent/60 flex flex-col gap-1 rounded-lg border bg-white/5 px-4 py-3 transition hover:bg-white/10"><span class="text-sm font-semibold text-white">${escape_html(link.label)}</span> <span class="text-muted text-xs group-hover:text-white/80">${escape_html(link.description)}</span> <span class="text-muted mt-1 text-xs group-hover:text-white">${escape_html(link.cta)}</span></a>`);
      }
      $$payload2.out.push(`<!--]--></div> <p class="text-muted text-xs">Tip: the manual mirrors the layout you already know—headers at the top, panels for content
				and accent buttons for actions.</p></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Panel($$payload, {
    title: "Getting around the webapp",
    children: ($$payload2) => {
      const each_array_1 = ensure_array_like(navigationSteps);
      $$payload2.out.push(`<div class="space-y-4"><p class="text-muted text-sm leading-relaxed">Every feature follows the same structure, so once you are comfortable in one page you can
				move through the others with confidence.</p> <ol class="text-muted list-decimal space-y-3 pl-5 text-sm leading-relaxed"><!--[-->`);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let step = each_array_1[$$index_1];
        $$payload2.out.push(`<li class="space-y-1"><div class="font-medium text-white">${escape_html(step.title)}</div> <p>${escape_html(step.detail)}</p></li>`);
      }
      $$payload2.out.push(`<!--]--></ol> <div class="border-border/40 text-muted rounded-lg border bg-white/5 px-4 py-3 text-xs">Shortcut: right-click or press Ctrl/Cmd + click on any card or link to open it in a new tab
				without losing your place.</div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Panel($$payload, {
    title: "Available tools at a glance",
    children: ($$payload2) => {
      const each_array_2 = ensure_array_like(features);
      $$payload2.out.push(`<div class="space-y-4"><p class="text-muted text-sm leading-relaxed">These are the core tools in the app today. Each one lives behind a card on the home screen
				and uses the same panel styling you see here.</p> <div class="grid gap-3 md:grid-cols-2"><!--[-->`);
      for (let $$index_3 = 0, $$length = each_array_2.length; $$index_3 < $$length; $$index_3++) {
        let feature = each_array_2[$$index_3];
        const each_array_3 = ensure_array_like(feature.tips);
        $$payload2.out.push(`<article class="border-border/40 rounded-lg border bg-white/5 p-4"><div class="flex items-center justify-between gap-3"><h3 class="text-sm font-semibold text-white">${escape_html(feature.title)}</h3> <a${attr("href", feature.href)} class="text-muted text-xs hover:text-white">Open →</a></div> <p class="text-muted mt-2 text-sm leading-relaxed">${escape_html(feature.summary)}</p> <ul class="text-muted mt-3 list-disc space-y-2 pl-5 text-xs"><!--[-->`);
        for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
          let tip = each_array_3[$$index_2];
          $$payload2.out.push(`<li>${escape_html(tip)}</li>`);
        }
        $$payload2.out.push(`<!--]--></ul></article>`);
      }
      $$payload2.out.push(`<!--]--></div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Panel($$payload, {
    title: "Uploading soil test data",
    children: ($$payload2) => {
      const each_array_4 = ensure_array_like(manualSteps);
      const each_array_5 = ensure_array_like(csvSteps);
      const each_array_6 = ensure_array_like(csvHeaders);
      $$payload2.out.push(`<div class="space-y-4"><p class="text-muted text-sm leading-relaxed">Keep the Soil tests table current by either entering single samples manually or importing a
				batch from a CSV file exported by the lab.</p> <div class="grid gap-4 lg:grid-cols-2"><section class="border-border/40 rounded-lg border bg-white/5 p-4"><h4 class="text-sm font-semibold text-white">Manual entry</h4> <ol class="text-muted mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed"><!--[-->`);
      for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
        let step = each_array_4[$$index_4];
        $$payload2.out.push(`<li>${escape_html(step)}</li>`);
      }
      $$payload2.out.push(`<!--]--></ol></section> <section class="border-border/40 rounded-lg border bg-white/5 p-4"><h4 class="text-sm font-semibold text-white">CSV import</h4> <ol class="text-muted mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed"><!--[-->`);
      for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
        let step = each_array_5[$$index_5];
        $$payload2.out.push(`<li>${escape_html(step)}</li>`);
      }
      $$payload2.out.push(`<!--]--></ol></section></div> <div class="border-border/40 text-muted rounded-lg border bg-white/5 p-4 text-xs leading-relaxed"><h5 class="text-sm font-semibold text-white">CSV column checklist</h5> <p class="mt-1">Match your column names to the uploader and include as many metric columns as you have
					results for:</p> <ul class="mt-3 space-y-2"><!--[-->`);
      for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
        let header = each_array_6[$$index_6];
        $$payload2.out.push(`<li><span class="font-medium text-white">${escape_html(header.label)}</span> <span class="text-muted ml-1 block sm:ml-2 sm:inline">${escape_html(header.description)}</span></li>`);
      }
      $$payload2.out.push(`<!--]--></ul> <div class="border-border/30 bg-panel/70 text-muted mt-3 overflow-x-auto rounded-md border px-3 py-2 font-mono text-[11px]">fieldID,name_sample,sample_id,sample_date,client,P,K,Ca,Mg,S,Na,ph_water <br/> 4251583,ES30,LAB-129,2024-03-14,Greenhill Bros,56.7,562,2595,305,26.3,98.5,5.9</div></div></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Panel($$payload, {
    title: "Need more help?",
    children: ($$payload2) => {
      const each_array_7 = ensure_array_like(supportTips);
      $$payload2.out.push(`<div class="grid gap-3 md:grid-cols-3"><!--[-->`);
      for (let $$index_7 = 0, $$length = each_array_7.length; $$index_7 < $$length; $$index_7++) {
        let tip = each_array_7[$$index_7];
        $$payload2.out.push(`<article class="border-border/40 text-muted rounded-lg border bg-white/5 p-4 text-sm leading-relaxed"><h4 class="text-sm font-semibold text-white">${escape_html(tip.title)}</h4> <p class="mt-2">${escape_html(tip.description)}</p></article>`);
      }
      $$payload2.out.push(`<!--]--></div>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></main>`);
}

export { _page as default };
//# sourceMappingURL=_page.svelte-BLPK9Yva.js.map
