import { K as fallback, E as attr, G as escape_html, T as slot, N as bind_props, B as pop, z as push, M as ensure_array_like, Q as attr_class } from "../../../chunks/index2.js";
import { t as tick, o as onDestroy } from "../../../chunks/index-server.js";
import { P as Panel } from "../../../chunks/Panel.js";
function ConfirmModal($$payload, $$props) {
  push();
  const randomId = () => Math.random().toString(36).slice(2);
  let open = fallback($$props["open"], false);
  let title = fallback($$props["title"], "");
  let confirmText = fallback($$props["confirmText"], "Confirm");
  let cancelText = fallback($$props["cancelText"], "Cancel");
  let loading = fallback($$props["loading"], false);
  let disableConfirm = fallback($$props["disableConfirm"], false);
  let titleId = `confirm-modal-${randomId()}`;
  if (open) {
    titleId = `confirm-modal-${randomId()}`;
    tick().then(() => {
    });
  }
  if (open) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="confirm-backdrop svelte-1idilmb" role="presentation"><div class="confirm-modal svelte-1idilmb" role="dialog" aria-modal="true"${attr("aria-labelledby", titleId)} tabindex="-1"><h2 class="confirm-title svelte-1idilmb"${attr("id", titleId)}>${escape_html(title)}</h2> <div class="confirm-body svelte-1idilmb"><!---->`);
    slot($$payload, $$props, "default", {});
    $$payload.out.push(`<!----></div> <div class="confirm-actions svelte-1idilmb"><button type="button" class="confirm-secondary svelte-1idilmb"${attr("disabled", loading, true)}>${escape_html(cancelText)}</button> <button type="button" class="confirm-primary svelte-1idilmb"${attr("disabled", loading || disableConfirm, true)}>`);
    if (loading) {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<svg class="confirm-spinner svelte-1idilmb" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle class="confirm-spinner-track svelte-1idilmb" cx="12" cy="12" r="10" fill="none" stroke-width="4"></circle><path class="confirm-spinner-head svelte-1idilmb" d="M4 12a8 8 0 018-8" fill="none" stroke-linecap="round" stroke-width="4"></path></svg>`);
    } else {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--> ${escape_html(confirmText)}</button></div></div></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, {
    open,
    title,
    confirmText,
    cancelText,
    loading,
    disableConfirm
  });
  pop();
}
function _page($$payload, $$props) {
  push();
  let filtered;
  const metricColumns = [
    { key: "P", label: "P" },
    { key: "K", label: "K" },
    { key: "Ca", label: "Ca" },
    { key: "Mg", label: "Mg" },
    { key: "S", label: "S" },
    { key: "Na", label: "Na" },
    { key: "pH", label: "pH (H2O)" }
  ];
  let tests = [];
  let q = "";
  let isEditMode = false;
  let showDeleteConfirm = false;
  let deletingTests = false;
  let selectedIds = /* @__PURE__ */ new Set();
  let selectedCount = 0;
  let toasts = [];
  const toastTimeouts = /* @__PURE__ */ new Map();
  const toastClassByVariant = {
    success: "border-green-400/40 bg-green-500/10 text-green-100",
    warning: "border-amber-400/40 bg-amber-500/15 text-amber-100",
    error: "border-red-500/50 bg-red-500/15 text-red-100"
  };
  onDestroy(() => {
    toastTimeouts.forEach((timeout) => clearTimeout(timeout));
    toastTimeouts.clear();
  });
  let manualMetrics = { P: "", K: "", Ca: "", Mg: "", S: "", Na: "", pH: "" };
  selectedCount = selectedIds.size;
  metricColumns.reduce(
    (count, { key }) => {
      const value = manualMetrics[key];
      return value && value.trim() ? count + 1 : count;
    },
    0
  );
  filtered = tests;
  if (toasts.length) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(toasts);
    $$payload.out.push(`<div class="pointer-events-none fixed top-4 right-4 z-[2100] flex max-w-sm flex-col gap-2" aria-live="polite"><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let toast = each_array[$$index];
      $$payload.out.push(`<div${attr_class(`pointer-events-auto flex items-start gap-3 rounded-md border px-3 py-2 text-sm shadow-lg backdrop-blur-sm ${toastClassByVariant[toast.variant]}`, "svelte-11gibzh")}${attr("role", toast.variant === "error" ? "alert" : "status")}><span class="flex-1 svelte-11gibzh">${escape_html(toast.message)}</span> <button class="ml-2 text-xs text-current opacity-70 transition hover:opacity-100 focus:ring-2 focus:ring-current/40 focus:outline-none" type="button" aria-label="Dismiss notification">×</button></div>`);
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <header class="container mx-auto flex items-center justify-between gap-4 px-4 py-4"><a href="/" class="text-muted text-sm hover:text-white">← Back to home</a> <div class="text-muted text-xs">Soil Tests</div></header> <main class="container mx-auto space-y-5 px-4 pb-8">`);
  Panel($$payload, {
    title: "Soil tests",
    children: ($$payload2) => {
      $$payload2.out.push(`<div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><input placeholder="Search by paddock or sample…"${attr("value", q)} class="border-border focus:ring-accent/40 w-full rounded-md border bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 sm:max-w-md"/> <div class="text-muted flex flex-wrap items-center gap-3 text-xs"><span>Showing ${escape_html(filtered.length)} of ${escape_html(tests.length)} samples</span> <div class="flex items-center gap-2"><button type="button" class="border-border focus:ring-accent/40 rounded-md border bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 focus:ring-2 focus:outline-none">Add soil test</button> <button type="button" class="border-border focus:ring-accent/40 rounded-md border bg-red-500/20 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/30 focus:ring-2 focus:outline-none"${attr("aria-pressed", isEditMode)}>${escape_html("Edit tests")}</button></div></div></div> `);
      {
        $$payload2.out.push("<!--[!-->");
      }
      $$payload2.out.push(`<!--]--> `);
      {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="text-muted text-sm">Loading soil tests…</div>`);
      }
      $$payload2.out.push(`<!--]-->`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></main> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  ConfirmModal($$payload, {
    open: showDeleteConfirm,
    title: "Delete soil test records?",
    confirmText: "Delete",
    cancelText: "Cancel",
    loading: deletingTests,
    disableConfirm: selectedCount === 0,
    children: ($$payload2) => {
      $$payload2.out.push(`<p class="text-sm text-slate-200">You are about to delete ${escape_html(selectedCount)} test record${escape_html(selectedCount === 1 ? "" : "s")}. Are you
		sure?</p> <p class="text-sm font-semibold text-red-300">This action cannot be undone.</p>`);
    },
    $$slots: { default: true }
  });
  $$payload.out.push(`<!---->`);
  pop();
}
export {
  _page as default
};
