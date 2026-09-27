<script lang="ts">
	type Props = { source: 'ecowitt' | 'mock' };

	let { source }: Props = $props();
</script>

{#if source === 'mock'}
	<div role="status" class="rounded-xl border border-warn/60 bg-warn/10 px-4 py-3">
		<p class="font-semibold text-warn">Weather station offline.</p>
		<p>These are sample numbers — don’t use them for decisions.</p>
	</div>
{/if}
