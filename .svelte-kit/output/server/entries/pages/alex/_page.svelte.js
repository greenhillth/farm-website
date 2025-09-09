import "clsx";
import { v as pop, t as push } from "../../../chunks/index.js";
function _page($$payload, $$props) {
  push();
  $$payload.out.push(`<header class="container flex items-center justify-between gap-4"><a href="/map" class="text-sm text-muted hover:text-white">← Back to map</a> <h1 class="text-lg font-semibold">shmalenks 👹👹👹</h1> <span></span></header> <main class="container"><section class="bg-panel border border-border rounded-xl p-4 md:p-6 shadow-sm"><div class="relative w-full max-w-[960px] mx-auto"><img src="/img/tom-and-alex.jpg" alt="A very normal toastie" class="block w-full h-auto rounded-lg border border-border transition-opacity duration-500 ease-in-out opacity-100 select-none"/> <video class="hidden w-full h-auto rounded-lg border border-border" preload="auto" playsinline controls poster="/img/tom-and-alex.jpg"><source src="/video/pysn.mp4" type="video/mp4"/> Sorry, your browser can’t play this video.</video> <button class="hidden absolute inset-0 m-auto h-12 w-56 rounded-full bg-white/10 hover:bg-white/20 text-white border border-border backdrop-blur-sm shadow focus:outline-none focus:ring-2 focus:ring-accent/50">▶ Play with sound</button></div> <p class="text-sm text-muted mt-3">nothing to see here!</p></section></main>`);
  pop();
}
export {
  _page as default
};
