<script lang="ts">
  import { onMount } from 'svelte';
  let img: HTMLImageElement;
  let vid: HTMLVideoElement;
  let overlay: HTMLButtonElement;

  onMount(() => {
    setTimeout(async () => {
      try {
        img.classList.add("opacity-0");
        setTimeout(() => {
          img.classList.add("hidden");
          vid.classList.remove("hidden");
        }, 220);

        vid.muted = false;
        vid.currentTime = 0;
        await vid.play();
      } catch (err) {
        try {
          vid.muted = true;
          await vid.play();
        } catch (e) { /* ignore */ }
        overlay.classList.remove("hidden");
        const unlock = async () => {
          try {
            vid.muted = false;
            await vid.play();
            overlay.classList.add("hidden");
          } catch (e) {}
        };
        document.addEventListener("pointerdown", unlock, { once: true });
        document.addEventListener("keydown", unlock, { once: true });
      }
    }, 3000);
  });
</script>

<header class="container flex items-center justify-between gap-4">
  <a href="/map" class="text-sm text-muted hover:text-white">&larr; Back to map</a>
  <h1 class="text-lg font-semibold">shmalenks 👹👹👹</h1>
  <span></span>
</header>

<main class="container">
  <section class="bg-panel border border-border rounded-xl p-4 md:p-6 shadow-sm">
    <div class="relative w-full max-w-[960px] mx-auto">
      <img bind:this={img} src="/img/tom-and-alex.jpg" alt="A very normal toastie"
        class="block w-full h-auto rounded-lg border border-border transition-opacity duration-500 ease-in-out opacity-100 select-none"/>
      <video bind:this={vid} class="hidden w-full h-auto rounded-lg border border-border"
        preload="auto" playsinline controls poster="/img/tom-and-alex.jpg">
        <source src="/video/pysn.mp4" type="video/mp4"/>
        Sorry, your browser can’t play this video.
      </video>
      <button bind:this={overlay}
        class="hidden absolute inset-0 m-auto h-12 w-56 rounded-full bg-white/10 hover:bg-white/20 text-white border border-border backdrop-blur-sm shadow focus:outline-none focus:ring-2 focus:ring-accent/50">
        ▶ Play with sound
      </button>
    </div>
    <p class="text-sm text-muted mt-3">nothing to see here!</p>
  </section>
</main>
