<script lang="ts">
  export let href: string;
  export let title: string;
  export let description: string = '';
  export let tags: string[] = [];
  export let image: string | null = null;
  export let imageAlt: string = '';
  export let badge: string | null = null;
</script>

<a class="group block" href={href} aria-label={title}>
  <article
    class="relative overflow-hidden rounded-xl bg-panel border border-border shadow-sm transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.02]">
    <!-- Hero -->
    {#if image}
      <div class="aspect-[16/9] overflow-hidden">
        <img src={image} alt={imageAlt}
          class="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-105 select-none" />
      </div>
    {:else}
      <div class="aspect-[16/9] bg-gradient-to-br from-accent/20 via-transparent to-border/40"></div>
    {/if}

    <!-- Content -->
    <div class="p-4 md:p-5">
      {#if badge}
        <div class="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs mb-2">
          {badge}
        </div>
      {/if}
      <h3 class="text-white font-semibold leading-snug">{title}</h3>
      {#if description}
        <p class="mt-1 text-sm text-muted">{description}</p>
      {/if}

      {#if tags.length}
        <div class="mt-3 flex flex-wrap gap-2">
          {#each tags as t}
            <span class="inline-flex items-center rounded-full border border-border bg-white/5 px-2 py-0.5 text-xs text-muted">
              #{t}
            </span>
          {/each}
        </div>
      {/if}
    </div>
  </article>
</a>

