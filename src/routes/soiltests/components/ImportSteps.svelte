<script lang="ts">
	type Props = { current: 1 | 2 | 3 | 4 | 5 };

	let { current }: Props = $props();

	const steps = ['Choose file', 'Check', 'Duplicates', 'Importing', 'Done'];
</script>

<ol aria-label="Import steps" class="flex flex-wrap gap-x-4 gap-y-2 text-sm">
	{#each steps as label, index (label)}
		{@const number = index + 1}
		<li
			aria-current={number === current ? 'step' : undefined}
			class={[
				'flex items-center gap-2',
				number === current
					? 'font-semibold text-text'
					: number < current
						? 'text-accent'
						: 'text-muted'
			]}
		>
			<span
				class={[
					'inline-flex size-6 items-center justify-center rounded-full border text-xs tabular-nums',
					number === current ? 'border-accent bg-accent/20' : 'border-border'
				]}
			>
				{number}
			</span>
			{label}
		</li>
	{/each}
</ol>
