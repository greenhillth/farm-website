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
      image: '/img/logo.png',
      imageAlt: 'Farm logo',
      badge: 'Featured'
    },
    {
      href: '/alex',
      title: 'Media Lab',
      description: 'Video + image experiments for the site.',
      tags: ['media'],
      image: '/img/tom-and-alex.jpg',
      imageAlt: 'Tom and Alex'
    },
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
    }
  ];
</script>

<main class="container mx-auto px-4 py-8">
  <header class="mb-6 flex items-center justify-between gap-4">
    <h1 class="text-xl md:text-2xl font-semibold">Greenhill Bros Farm</h1>
    <a href="/map" class="text-sm text-muted hover:text-white">Open map →</a>
  </header>

  <section class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {#each items as i}
      <Card {...i} />
    {/each}
  </section>
</main>
