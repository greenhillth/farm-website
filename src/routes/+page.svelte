<script lang="ts">
	import Card from '$lib/components/Card.svelte';

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
			image: '/img/aerial-map.jpg',
			imageAlt: 'Aerial view of farm map',
			badge: 'Featured'
		},
		{
			href: '/paddocks',
			title: 'Paddock Manager',
			description: 'Manage paddocks, notes, and field tasks.',
			tags: ['paddocks'],
			image: '/img/tractor-1.jpg',
			badge: 'New'
		},
		{
			href: '/soiltests',
			title: 'Soil Tests',
			description: 'Manage soil tests and analysis.',
			tags: ['soil', 'tests'],
			image: 'img/soil.jpg',
			badge: 'New'
		},
		{
			href: 'https://greenhillbros.sharepoint.com/sites/Draft/Shared%20Documents/Forms/AllItems.aspx',
			title: 'Sharepoint Invoices',
			description: 'Sharepoint Invoices Site',
			tags: ['instructions', 'manual'],
			image: '/img/sharepoint.jpg',
			badge: 'Sharepoint'
		},
		{
			href: 'https://greenhillbros.sharepoint.com/sites/Draft/SitePages/CollabHome.aspx',
			title: 'Sharepoint Home',
			description: 'Greenhill Bros Sharepoint Home',
			tags: ['instructions', 'manual'],
			image: '/img/sharepoint.jpg',
			badge: 'Sharepoint'
		},
		{
			href: '/timesheet',
			title: 'Timesheets',
			description: 'Log hours and activities across the farm.',
			tags: ['timesheet'],
			image: null,
			badge: 'New'
		},
		{
			href: '/weather',
			title: 'Weather Station',
			description: 'Live outdoor/indoor, wind, rainfall, solar and more.',
			tags: ['weather'],
			image: 'img/weather-station.webp',
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
			href: '/manual',
			title: 'Operation Instructions',
			description: 'Instructions for the less technically-savvy.',
			tags: ['instructions', 'manual'],
			image: 'img/confused-dad-1.jpg',
			badge: 'Help'
		}
	];
</script>

<div class="home-shell">
	<div class="home-shell__bg" aria-hidden="true"></div>
	<main class="relative container mx-auto px-4 py-8">
		<header class="mb-6 flex items-center justify-between gap-4">
			<h1 class="text-xl font-semibold md:text-2xl">Greenhill Bros Farm</h1>
			<a href="/map" class="text-muted text-sm hover:text-white">Open map →</a>
		</header>

		<section class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each items as i}
				<Card {...i} />
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
