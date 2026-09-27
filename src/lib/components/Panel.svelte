<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	type Props = {
		title: string;
		class?: ClassValue;
		children?: Snippet;
		actions?: Snippet;
		footer?: Snippet;
	};

	let { title, class: className, children, actions, footer }: Props = $props();
</script>

<section class={['rounded-xl border border-border bg-panel shadow-sm', className]}>
	<header
		class="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3 md:px-5 md:py-4"
	>
		<h3 class="text-sm font-semibold md:text-base">{title}</h3>
		{@render actions?.()}
	</header>
	<div class="p-4 md:p-5">
		{@render children?.()}
	</div>
	{@render footer?.()}
</section>
