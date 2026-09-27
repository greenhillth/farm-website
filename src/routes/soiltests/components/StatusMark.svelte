<script lang="ts">
	import { STATUS_LABELS, type MetricStatus } from '$lib/soil-status';

	type Props = { status: MetricStatus };

	let { status }: Props = $props();

	const marks: Partial<Record<MetricStatus, { symbol: string; tone: string }>> = {
		low: { symbol: '↓', tone: 'text-status-low' },
		optimal: { symbol: '✓', tone: 'text-accent' },
		high: { symbol: '↑', tone: 'text-status-high' }
	};
	const mark = $derived(marks[status]);
</script>

{#if mark}
	<span
		class={['ml-1 inline-block w-3 text-center font-semibold', mark.tone]}
		title={STATUS_LABELS[status]}
	>
		<span aria-hidden="true">{mark.symbol}</span>
		<span class="sr-only">{STATUS_LABELS[status]}</span>
	</span>
{/if}
