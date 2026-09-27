<script lang="ts">
	import type { BaseLayerConfig } from '../helpers';

	type Props = {
		baseLayers: BaseLayerConfig[];
		activeBaseLayer: string;
		onbasechange: (id: string) => void;
		showBoundaries: boolean;
		showLabels: boolean;
		showTitles: boolean;
		showLabelToggle: boolean;
		titles: { loading: boolean; error: string | null; count: number };
		onretrytitles: () => void;
		onreset: () => void;
	};

	let {
		baseLayers,
		activeBaseLayer,
		onbasechange,
		showBoundaries = $bindable(),
		showLabels = $bindable(),
		showTitles = $bindable(),
		showLabelToggle,
		titles,
		onretrytitles,
		onreset
	}: Props = $props();

	const activeBase = $derived(baseLayers.find((layer) => layer.id === activeBaseLayer));
	const toggleRow =
		'flex min-h-11 items-center gap-3 rounded-lg border border-border bg-white/5 px-3 text-sm text-text focus-within:border-accent';
</script>

<div class="space-y-6">
	<section class="space-y-3">
		<h3 class="text-sm font-semibold text-text">Base map</h3>
		<div class="flex flex-wrap gap-2">
			{#each baseLayers as layer (layer.id)}
				<button
					type="button"
					aria-pressed={activeBaseLayer === layer.id}
					onclick={() => onbasechange(layer.id)}
					class={[
						'inline-flex min-h-11 items-center rounded-lg border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
						activeBaseLayer === layer.id
							? 'border-accent bg-accent/20 text-text'
							: 'border-border bg-white/5 text-muted hover:text-text'
					]}
				>
					{layer.label}
				</button>
			{/each}
		</div>
		{#if activeBase}
			<p class="text-xs text-muted">{activeBase.description}</p>
		{/if}
	</section>

	<section class="space-y-2">
		<h3 class="text-sm font-semibold text-text">Display</h3>
		<label class={toggleRow}>
			<input type="checkbox" class="size-5 accent-accent" bind:checked={showBoundaries} />
			Show field boundaries
		</label>
		{#if showLabelToggle}
			<label class={toggleRow}>
				<input
					type="checkbox"
					class="size-5 accent-accent disabled:opacity-50"
					bind:checked={showLabels}
					disabled={!showBoundaries}
				/>
				Show paddock labels
			</label>
		{/if}
		<label class={toggleRow}>
			<input type="checkbox" class="size-5 accent-accent" bind:checked={showTitles} />
			Show title boundaries
		</label>
		{#if showTitles}
			<div class="pl-1 text-xs text-muted">
				{#if titles.loading}
					<p>Loading title boundaries…</p>
				{:else if titles.error}
					<p class="text-danger">{titles.error}</p>
					<button
						type="button"
						onclick={onretrytitles}
						class="mt-2 inline-flex min-h-11 items-center rounded-lg border border-danger/40 bg-danger/10 px-4 text-sm text-text hover:bg-danger/20"
					>
						Retry
					</button>
				{:else if titles.count > 0}
					<p>{titles.count} title boundaries loaded. Tap one for details.</p>
				{/if}
			</div>
		{/if}
	</section>

	<button
		type="button"
		onclick={onreset}
		class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white/5 px-4 text-sm text-text hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			class="size-5"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
			/>
		</svg>
		Reset view
	</button>
</div>
