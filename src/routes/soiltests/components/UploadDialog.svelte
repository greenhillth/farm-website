<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';

	type Mode = 'manual' | 'csv';
	type Props = {
		mode: Mode;
		onmodechange: (mode: Mode) => void;
		running: boolean;
		onclose: () => void;
		manual: Snippet;
		csv: Snippet;
	};

	let { mode, onmodechange, running, onclose, manual, csv }: Props = $props();

	const titleId = $props.id();
	const modes: { value: Mode; label: string }[] = [
		{ value: 'csv', label: 'Import a CSV' },
		{ value: 'manual', label: 'Enter one test' }
	];
	let confirmingClose = $state(false);

	// Set while the component closes the dialog itself, so handleClose ignores that close.
	let unmounting = false;

	// The dialog exists only while open; showModal gives focus trapping and Escape for free.
	const openModal: Attachment<HTMLDialogElement> = (node) => {
		node.showModal();
		return () => {
			unmounting = true;
			node.close();
		};
	};

	function requestClose() {
		if (running) confirmingClose = true;
		else onclose();
	}

	function handleCancel(event: Event) {
		// A cancel the browser won't let us stop (e.g. a second Escape) is followed by close.
		if (!event.cancelable) return;
		event.preventDefault();
		requestClose();
	}

	// The browser closed the dialog on its own: reopen it while importing, otherwise tell the page.
	function handleClose(event: Event) {
		if (unmounting) return;
		if (running) {
			(event.currentTarget as HTMLDialogElement).showModal();
			confirmingClose = true;
		} else onclose();
	}
</script>

<dialog
	{@attach openModal}
	aria-labelledby={titleId}
	oncancel={handleCancel}
	onclose={handleClose}
	class="upload-dialog m-auto flex max-h-[min(92dvh,60rem)] w-[min(100%-2rem,48rem)] flex-col rounded-2xl border border-border bg-panel p-0 text-text shadow-2xl"
>
	<header class="flex items-center gap-3 border-b border-border py-2 pr-2 pl-5">
		<h2 id={titleId} class="flex-1 text-lg font-semibold">Add soil tests</h2>
		<button
			type="button"
			aria-label="Close"
			onclick={requestClose}
			class="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-white/10 hover:text-text"
		>
			<svg
				viewBox="0 0 24 24"
				class="size-5"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" />
			</svg>
		</button>
	</header>

	<div class="flex gap-2 px-5 pt-4" role="group" aria-label="How to add tests">
		{#each modes as option (option.value)}
			<button
				type="button"
				aria-pressed={mode === option.value}
				disabled={running}
				onclick={() => onmodechange(option.value)}
				class={[
					'inline-flex min-h-11 flex-1 items-center justify-center rounded-full border px-4 text-sm disabled:opacity-50',
					mode === option.value
						? 'border-accent bg-accent/15 text-text'
						: 'border-border text-muted hover:text-text'
				]}
			>
				{option.label}
			</button>
		{/each}
	</div>

	{#if confirmingClose}
		<div role="alert" class="mx-5 mt-4 rounded-lg border border-warn/50 bg-warn/10 p-4">
			<p class="font-semibold">Stop the import?</p>
			<p class="text-sm text-muted">Tests the server has already saved will stay saved.</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<button
					type="button"
					onclick={() => (confirmingClose = false)}
					class="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm"
				>
					Keep importing
				</button>
				<button
					type="button"
					onclick={() => {
						confirmingClose = false;
						onclose();
					}}
					class="inline-flex min-h-11 items-center rounded-lg border border-danger/60 bg-danger/20 px-4 text-sm font-semibold"
				>
					Stop import
				</button>
			</div>
		</div>
	{/if}

	<div class="overflow-y-auto px-5 py-4">
		{#if mode === 'csv'}
			{@render csv()}
		{:else}
			{@render manual()}
		{/if}
	</div>
</dialog>

<style>
	.upload-dialog::backdrop {
		background: rgb(0 0 0 / 0.6);
	}
</style>
