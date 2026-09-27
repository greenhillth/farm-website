<script lang="ts">
	import type { Toaster } from '../toasts.svelte';

	type Props = { toaster: Toaster };

	let { toaster }: Props = $props();

	const tone = {
		success: 'border-accent/50 bg-panel text-text',
		warning: 'border-warn/60 bg-panel text-text',
		error: 'border-danger/60 bg-panel text-text'
	};
</script>

<div
	class="pointer-events-none fixed inset-x-4 top-4 z-[2100] flex flex-col items-end gap-2 md:top-[calc(var(--shell-top)+1rem)]"
	aria-live="polite"
>
	{#each toaster.items as toast (toast.id)}
		<div
			role={toast.variant === 'error' ? 'alert' : 'status'}
			class={[
				'pointer-events-auto flex max-w-sm items-center gap-2 rounded-lg border py-1 pr-1 pl-4 text-sm shadow-lg',
				tone[toast.variant]
			]}
		>
			<span class="flex-1">{toast.message}</span>
			<button
				type="button"
				onclick={() => toaster.dismiss(toast.id)}
				aria-label="Dismiss"
				class="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:text-text"
			>
				<svg
					viewBox="0 0 24 24"
					class="size-4"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" />
				</svg>
			</button>
		</div>
	{/each}
</div>
