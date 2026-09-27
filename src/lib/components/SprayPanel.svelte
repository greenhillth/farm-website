<script lang="ts">
	import { SPRAY_LABELS, SPRAY_TONES, type SprayResult } from '$lib/spray';
	import Panel from './Panel.svelte';

	type Props = { result: SprayResult };

	let { result }: Props = $props();
</script>

<Panel title="Spraying now">
	<p class={['flex items-center gap-2 text-2xl font-semibold', SPRAY_TONES[result.verdict]]}>
		<span class="size-3 shrink-0 rounded-full bg-current" aria-hidden="true"></span>
		{SPRAY_LABELS[result.verdict]}
	</p>
	<ul class="mt-3 space-y-1">
		{#each result.reasons as reason (reason)}
			<li>{reason}</li>
		{/each}
	</ul>
</Panel>
