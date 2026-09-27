<script lang="ts">
	import { pageList, type PageSlice } from '$lib/soil-tests/filters';

	type Props = { slice: PageSlice<unknown>; onchange: (page: number) => void };

	let { slice, onchange }: Props = $props();

	const pages = $derived(pageList(slice.page, slice.pageCount));
	const button =
		'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border px-3 text-sm disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
</script>

{#if slice.total > 0}
	<nav aria-label="Pages" class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-muted" aria-live="polite">
			Showing {slice.start}–{slice.end} of {slice.total}
		</p>
		<div class="flex flex-wrap items-center gap-1">
			<button
				type="button"
				class={[button, 'text-text hover:bg-white/5']}
				disabled={slice.page <= 1}
				onclick={() => onchange(slice.page - 1)}
			>
				Previous
			</button>
			{#each pages as number, index (index)}
				{#if number === null}
					<span class="px-1 text-muted" aria-hidden="true">…</span>
				{:else}
					<button
						type="button"
						aria-label="Page {number}"
						aria-current={number === slice.page ? 'page' : undefined}
						class={[
							button,
							number === slice.page
								? 'border-accent bg-accent/15 text-text'
								: 'text-muted hover:bg-white/5'
						]}
						onclick={() => onchange(number)}
					>
						{number}
					</button>
				{/if}
			{/each}
			<button
				type="button"
				class={[button, 'text-text hover:bg-white/5']}
				disabled={slice.page >= slice.pageCount}
				onclick={() => onchange(slice.page + 1)}
			>
				Next
			</button>
		</div>
	</nav>
{/if}
