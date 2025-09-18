

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/map/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true
};
export const universal_id = "src/routes/map/+page.ts";
export const imports = ["_app/immutable/nodes/5.BEFFXq4e.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/76m0y0zj.js","_app/immutable/chunks/Cy7NpJy3.js","_app/immutable/chunks/BN5QsEzf.js","_app/immutable/chunks/CuXKmgDK.js","_app/immutable/chunks/BWS38yz9.js","_app/immutable/chunks/CpGDwUWb.js","_app/immutable/chunks/C8Q-pcS8.js","_app/immutable/chunks/LLHKzi1v.js","_app/immutable/chunks/CxhXp5PL.js","_app/immutable/chunks/t2IKW1MP.js","_app/immutable/chunks/DCEniTkY.js","_app/immutable/chunks/AJ7s5tBs.js","_app/immutable/chunks/BNfZqJWD.js","_app/immutable/chunks/Bcbkfd4L.js","_app/immutable/chunks/BzYxXZdQ.js","_app/immutable/chunks/CR2IhISL.js"];
export const stylesheets = ["_app/immutable/assets/5._3FwJddv.css"];
export const fonts = [];
