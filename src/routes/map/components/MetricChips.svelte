<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { MetricId, MetricOption } from '$lib/config';

	type Props = {
		metrics: readonly MetricOption[];
		active: MetricId;
		onchange: (id: MetricId) => void;
		layout: 'row' | 'wrap';
	};

	let { metrics, active, onchange, layout }: Props = $props();

	// In the scrolling row, a metric picked off-screen (or from ?metric=) would otherwise look unselected.
	const reveal: Attachment<HTMLElement> = (node) => {
		node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	};
</script>

<div
	role="group"
	aria-label="Soil metric"
	class={['flex gap-2', layout === 'row' ? 'flex-nowrap' : 'flex-wrap']}
>
	{#each metrics as metric (metric.id)}
		{@const pressed = metric.id === active}
		<button
			type="button"
			aria-pressed={pressed}
			{@attach pressed && layout === 'row' ? reveal : null}
			onclick={() => {
				if (!pressed) onchange(metric.id);
			}}
			class={[
				'inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm whitespace-nowrap shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
				pressed
					? 'border-accent bg-accent/20 text-text'
					: 'border-border bg-panel/95 text-muted hover:text-text'
			]}
		>
			{metric.label}
		</button>
	{/each}
</div>
