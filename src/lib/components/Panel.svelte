<script lang="ts">
  export let title: string;
  export let className = '';
</script>

<section class={`bg-panel border border-border rounded-xl shadow-sm ${className}`}>
  <header class="flex items-center justify-between gap-2 px-4 py-3 md:px-5 md:py-4 border-b border-border/60">
    <h3 class="text-sm md:text-base font-semibold">{title}</h3>
    <slot name="actions" />
  </header>
  <div class="p-4 md:p-5">
    <slot />
  </div>
  <slot name="footer" />
</section>

