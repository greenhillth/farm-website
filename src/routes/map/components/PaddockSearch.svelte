<script lang="ts">
	import type { PaddockOption } from './types';

	type Props = { paddocks: readonly PaddockOption[]; onselect: (id: number) => void };

	let { paddocks, onselect }: Props = $props();

	const uid = $props.id();
	let query = $state('');
	let open = $state(false);
	let activeIndex = $state(-1);

	const term = $derived(query.trim().toLowerCase());
	const matches = $derived(
		term === ''
			? []
			: paddocks
					.filter(
						(paddock) =>
							paddock.name.toLowerCase().includes(term) ||
							paddock.displayId.toLowerCase().includes(term)
					)
					.slice(0, 8)
	);
	const expanded = $derived(open && matches.length > 0);

	function choose(paddock: PaddockOption) {
		onselect(paddock.id);
		query = paddock.name;
		open = false;
		activeIndex = -1;
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			open = true;
			activeIndex = Math.min(matches.length - 1, activeIndex + 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			activeIndex = Math.max(0, activeIndex - 1);
		} else if (event.key === 'Enter') {
			const pick = matches[activeIndex] ?? (matches.length === 1 ? matches[0] : undefined);
			if (pick) {
				event.preventDefault();
				choose(pick);
			}
		} else if (event.key === 'Escape' && expanded) {
			// Only close the suggestions; the sheet around this search closes on a second Escape.
			event.stopPropagation();
			open = false;
			activeIndex = -1;
		}
	}
</script>

<div class="relative">
	<label for="{uid}-input" class="mb-1 block text-sm text-muted">Find a paddock</label>
	<input
		id="{uid}-input"
		type="search"
		role="combobox"
		autocomplete="off"
		placeholder="Name or ID"
		aria-expanded={expanded}
		aria-controls="{uid}-list"
		aria-autocomplete="list"
		aria-activedescendant={expanded && activeIndex >= 0
			? `${uid}-option-${activeIndex}`
			: undefined}
		bind:value={query}
		oninput={() => {
			open = true;
			activeIndex = -1;
		}}
		onblur={() => (open = false)}
		{onkeydown}
		class="min-h-11 w-full rounded-lg border border-border bg-white/5 px-3 text-base text-text placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
	/>
	{#if expanded}
		<ul
			id="{uid}-list"
			role="listbox"
			aria-label="Matching paddocks"
			class="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-panel p-1 shadow-lg"
		>
			{#each matches as paddock, index (paddock.id)}
				<li
					id="{uid}-option-{index}"
					role="option"
					aria-selected={index === activeIndex}
					tabindex="-1"
					onmousedown={(event) => event.preventDefault()}
					onclick={() => choose(paddock)}
					onkeydown={(event) => {
						if (event.key === 'Enter') choose(paddock);
					}}
					class={[
						'flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md px-3',
						index === activeIndex ? 'bg-accent/15 text-text' : 'text-text hover:bg-white/5'
					]}
				>
					<span>{paddock.name}</span>
					<span class="text-sm text-muted">ID {paddock.displayId}</span>
				</li>
			{/each}
		</ul>
	{:else if open && term !== ''}
		<p class="mt-2 text-sm text-muted">No paddock matches “{query.trim()}”.</p>
	{/if}
</div>
