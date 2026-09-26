<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import { homeItems } from '$lib/home-items';
</script>

<div class="home-shell">
	<div class="home-shell__bg" aria-hidden="true"></div>
	<main class="relative container mx-auto px-4 py-8">
		<header class="mb-6 flex items-center justify-between gap-4">
			<h1 class="text-xl font-semibold md:text-2xl">Greenhill Bros Farm</h1>
			<a href="/map" class="text-sm text-muted hover:text-white">Open map →</a>
		</header>

		<section class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each homeItems as item (item.title)}
				<Card {...item} />
			{/each}
		</section>
	</main>
</div>

<style>
	.home-shell {
		position: relative;
		min-height: 100dvh;
		overflow: hidden;
	}

	.home-shell__bg {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background-image:
			linear-gradient(
				to bottom,
				rgba(7, 11, 23, 0.2),
				rgba(7, 11, 23, 0.55) 65%,
				rgba(7, 11, 23, 0.8)
			),
			url('/img/background.webp');
		background-size: cover;
		background-position: center;
		opacity: 0.55;
		filter: saturate(90%);
	}

	.home-shell main {
		position: relative;
		z-index: 1;
	}
</style>
