<script lang="ts">
	import { onMount } from 'svelte';
	let img: HTMLImageElement;
	let vid: HTMLVideoElement;
	let overlay: HTMLButtonElement;

	onMount(() => {
		setTimeout(async () => {
			try {
				img.classList.add('opacity-0');
				setTimeout(() => {
					img.classList.add('hidden');
					vid.classList.remove('hidden');
				}, 220);

				vid.muted = false;
				vid.currentTime = 0;
				await vid.play();
			} catch (err) {
				try {
					vid.muted = true;
					await vid.play();
				} catch (e) {
					/* ignore */
				}
				overlay.classList.remove('hidden');
				const unlock = async () => {
					try {
						vid.muted = false;
						await vid.play();
						overlay.classList.add('hidden');
					} catch (e) {}
				};
				document.addEventListener('pointerdown', unlock, { once: true });
				document.addEventListener('keydown', unlock, { once: true });
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
	<section class="rounded-xl border border-border bg-panel p-4 shadow-sm md:p-6">
		<div class="relative mx-auto w-full max-w-[960px]">
			<img
				bind:this={img}
				src="/img/tom-and-alex.jpg"
				alt="A very normal toastie"
				class="block h-auto w-full rounded-lg border border-border opacity-100 transition-opacity duration-500 ease-in-out select-none"
			/>
			<video
				bind:this={vid}
				class="hidden h-auto w-full rounded-lg border border-border"
				preload="auto"
				playsinline
				controls
				poster="/img/tom-and-alex.jpg"
			>
				<source src="/video/pysn.mp4" type="video/mp4" />
				Sorry, your browser can’t play this video.
			</video>
			<button
				bind:this={overlay}
				class="absolute inset-0 m-auto hidden h-12 w-56 rounded-full border border-border bg-white/10 text-white shadow backdrop-blur-sm hover:bg-white/20 focus:ring-2 focus:ring-accent/50 focus:outline-none"
			>
				▶ Play with sound
			</button>
		</div>
		<p class="mt-3 text-sm text-muted">nothing to see here!</p>
	</section>
</main>
