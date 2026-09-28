<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';

	type Props = { title: string; subtitle?: string; onclose: () => void; children: Snippet };

	let { title, subtitle, onclose, children }: Props = $props();

	const titleId = $props.id();

	// Focus moves in when the sheet opens and back to where it was when the sheet closes.
	// preventScroll: on phones the sheet opens mid slide-up, still below the map shell, and a
	// scrolling focus would scroll that overflow-hidden shell to reveal it, throwing the sheet to
	// the top of the screen until the animation ends.
	const focusIn: Attachment<HTMLElement> = (node) => {
		const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		node.focus({ preventScroll: true });
		return () => {
			if (previous?.isConnected) previous.focus();
		};
	};

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.stopPropagation();
			onclose();
		}
	}
</script>

<div
	role="dialog"
	aria-labelledby={titleId}
	tabindex="-1"
	{onkeydown}
	{@attach focusIn}
	class="detail-sheet absolute inset-x-0 bottom-0 z-[1100] flex max-h-[70%] flex-col rounded-t-2xl border border-border bg-panel/95 text-text shadow-2xl backdrop-blur outline-none md:inset-x-auto md:right-20 md:bottom-6 md:max-h-[calc(100%-3rem)] md:w-96 md:rounded-2xl"
>
	<header class="flex items-start gap-3 border-b border-border py-2 pr-2 pl-4">
		<div class="min-w-0 flex-1 py-1">
			<h2 id={titleId} class="text-lg font-semibold">{title}</h2>
			{#if subtitle}
				<p class="text-sm text-muted">{subtitle}</p>
			{/if}
		</div>
		<button
			type="button"
			onclick={onclose}
			aria-label="Close"
			class="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="size-5"
				aria-hidden="true"
			>
				<path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" />
			</svg>
		</button>
	</header>
	<div class="overflow-y-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
		{@render children()}
	</div>
</div>

<style>
	@media (prefers-reduced-motion: no-preference) and (max-width: 47.999rem) {
		.detail-sheet {
			animation: sheet-up 180ms ease-out;
		}
	}

	@keyframes sheet-up {
		from {
			transform: translateY(100%);
		}
	}
</style>
