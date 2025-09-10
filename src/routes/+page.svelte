<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import { resolve } from '$app/paths';

	type Item = {
		href: string;
		title: string;
		description?: string;
		tags?: string[];
		image?: string | null;
		imageAlt?: string;
		badge?: string | null;
	};

	const items: Item[] = [
		{
			href: '/map',
			title: 'Interactive Farm Map',
			description: 'Explore fields, soil metrics and optimal ranges.',
			tags: ['map', 'leaflet'],
			image: '/img/logo.png',
			imageAlt: 'Farm logo',
			badge: 'Featured'
		},
		{
			href: '/weather',
			title: 'Weather Station',
			description: 'Live outdoor/indoor, wind, rainfall, solar and more.',
			tags: ['weather'],
			image: null,
			badge: 'Dashboard'
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
			href: '/map?metric=OM',
			title: 'Soil Organic Matter',
			description: 'Visualize OM across the farm.',
			tags: ['soil', 'OM'],
			image: null,
			badge: 'Analytics'
		},
		{
			href: '/map?metric=K',
			title: 'Potassium (K)',
			description: 'Check optimal ranges and hotspots.',
			tags: ['soil', 'K'],
			image: null
		},
		{
			href: '/paddock',
			title: 'Paddock Manager',
			description: 'View stats for an individual paddock.',
			tags: ['paddock'],
			image: null
		},
		{
			href: '/upload',
			title: 'Data Upload Tool',
			description: 'Upload CSV files for processing.',
			tags: ['data'],
			image: null
		},
		{
			href: '#',
			title: 'Placeholder',
			description: 'More tools coming soon.',
			image: null,
			badge: 'Coming soon'
		},
		{
			href: '#',
			title: 'Placeholder',
			description: 'More tools coming soon.',
			image: null,
			badge: 'Coming soon'
		}
	];
</script>

<main class="container mx-auto px-4 py-8">
	<header class="mb-6 flex items-center justify-between gap-4">
		<h1 class="text-xl font-semibold md:text-2xl">Greenhill Bros Farm</h1>
		<a href={resolve('/map')} class="text-muted text-sm hover:text-white">Open map →</a>
	</header>

	<section class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		{#each items as i (i.href)}
			<Card {...i} />
		{/each}
	</section>
</main>
