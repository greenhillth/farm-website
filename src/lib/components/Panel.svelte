<script lang="ts">
	export let title: string;
	export let className = '';
</script>

<section class={`rounded-xl border border-border bg-panel shadow-sm ${className}`}>
	<header
		class="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3 md:px-5 md:py-4"
	>
		<h3 class="text-sm font-semibold md:text-base">{title}</h3>
		<slot name="actions" />
	</header>
	<div class="p-4 md:p-5">
		<slot />
	</div>
	<slot name="footer" />
</section>
