

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/map/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true
};
export const universal_id = "src/routes/map/+page.ts";
export const imports = ["_app/immutable/nodes/5.16s5TvYc.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CqJAwCt_.js","_app/immutable/chunks/CthTPqsi.js","_app/immutable/chunks/SMSclcs1.js","_app/immutable/chunks/CNYzTQXq.js","_app/immutable/chunks/BkQ9GEEK.js","_app/immutable/chunks/DLeCJMEp.js","_app/immutable/chunks/CCVHFpir.js","_app/immutable/chunks/DeAsnCzY.js","_app/immutable/chunks/Y1ZwfwKz.js","_app/immutable/chunks/5_-TE14Q.js","_app/immutable/chunks/Dl0ZW1w2.js"];
export const stylesheets = ["_app/immutable/assets/5.CF1J4gj_.css"];
export const fonts = [];
