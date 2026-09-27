<script lang="ts">
	import { STATUS_LABELS, type MetricStatus } from '$lib/soil-status';

	type Props = { status: MetricStatus; label?: string };

	let { status, label }: Props = $props();

	const tone = $derived(
		status === 'low'
			? 'text-status-low'
			: status === 'optimal'
				? 'text-accent'
				: status === 'high'
					? 'text-status-high'
					: 'text-muted'
	);
</script>

<span class={['inline-flex items-center gap-1.5 text-xs font-semibold', tone]}>
	<span class="size-2 shrink-0 rounded-full bg-current" aria-hidden="true"></span>
	{label ?? STATUS_LABELS[status]}
</span>
