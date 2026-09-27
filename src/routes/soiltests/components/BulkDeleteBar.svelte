<script lang="ts">
	type Props = { count: number; ondelete: () => void; ondone: () => void };

	let { count, ondelete, ondone }: Props = $props();
</script>

<div
	class="flex flex-wrap items-center gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-2"
	role="region"
	aria-label="Delete tests"
>
	<p class="flex-1 text-sm" aria-live="polite">
		{count === 0
			? 'Select the tests to delete.'
			: `${count} test${count === 1 ? '' : 's'} selected`}
	</p>
	<button
		type="button"
		onclick={ondone}
		class="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm text-text hover:bg-white/5"
	>
		Done
	</button>
	<button
		type="button"
		onclick={ondelete}
		disabled={count === 0}
		class="inline-flex min-h-11 items-center rounded-lg border border-danger/60 bg-danger/20 px-4 text-sm font-semibold text-text hover:bg-danger/30 disabled:opacity-40"
	>
		Delete {count > 0 ? count : ''}
	</button>
</div>
