<script lang="ts">
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import type { MetricKey, SoilTest } from '$lib/soil-tests/schema';
	import { testMetricStatus } from '$lib/soil-tests/status';
	import { formatDate, formatNumber } from '$lib/soil-tests/utils';

	type Props = {
		test: SoilTest;
		editing: boolean;
		selected: boolean;
		ontoggle: (id: number, checked: boolean) => void;
	};

	let { test, editing, selected, ontoggle }: Props = $props();

	const headline = $derived(
		(
			[
				{ key: 'ph_water', label: 'pH', value: test.metrics.ph_water },
				{ key: 'P', label: 'Phosphorus', value: test.metrics.P },
				{ key: 'K', label: 'Potassium', value: test.metrics.K },
				{ key: 'OM', label: 'Organic matter', value: test.organicMatter }
			] as { key: MetricKey | 'OM'; label: string; value: number | undefined }[]
		).map((metric) => ({ ...metric, status: testMetricStatus(metric.key, metric.value) }))
	);
	const rest = $derived(
		(
			[
				{ key: 'Ca', label: 'Calcium' },
				{ key: 'Mg', label: 'Magnesium' },
				{ key: 'S', label: 'Sulphur' },
				{ key: 'Na', label: 'Sodium' }
			] as { key: MetricKey; label: string }[]
		).map((metric) => ({
			...metric,
			value: test.metrics[metric.key],
			status: testMetricStatus(metric.key, test.metrics[metric.key])
		}))
	);
	const showsStatus = (status: string) =>
		status === 'low' || status === 'optimal' || status === 'high';
</script>

<article
	class={[
		'rounded-xl border bg-panel p-4',
		selected ? 'border-danger/60 bg-danger/10' : 'border-border'
	]}
>
	<header class="flex items-start gap-3">
		{#if editing}
			<label class="inline-flex size-11 items-center justify-center">
				<input
					type="checkbox"
					class="size-5 accent-danger"
					checked={selected}
					onchange={(event) => ontoggle(test.id, event.currentTarget.checked)}
					aria-label="Select {test.sampleName ?? 'test'} from {formatDate(test.sampleDate)}"
				/>
			</label>
		{/if}
		<div class="min-w-0 flex-1">
			<h2 class="text-lg font-semibold">{test.paddockName}</h2>
			<p class="text-sm text-muted">
				{test.sampleName ?? 'Unnamed sample'}, {formatDate(test.sampleDate)}
			</p>
		</div>
	</header>

	<dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
		{#each headline as metric (metric.key)}
			<div>
				<dt class="text-xs text-muted">{metric.label}</dt>
				<dd class="flex flex-wrap items-center gap-x-2">
					<span class="text-base tabular-nums">{formatNumber(metric.value)}</span>
					{#if showsStatus(metric.status)}<StatusBadge status={metric.status} />{/if}
				</dd>
			</div>
		{/each}
	</dl>

	<details class="mt-3">
		<summary class="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-accent">
			All results
		</summary>
		<dl class="grid grid-cols-2 gap-x-4 gap-y-3 pt-2">
			{#each rest as metric (metric.key)}
				<div>
					<dt class="text-xs text-muted">{metric.label}</dt>
					<dd class="flex flex-wrap items-center gap-x-2">
						<span class="tabular-nums">{formatNumber(metric.value)}</span>
						{#if showsStatus(metric.status)}<StatusBadge status={metric.status} />{/if}
					</dd>
				</div>
			{/each}
			<div>
				<dt class="text-xs text-muted">Field ID</dt>
				<dd>{test.fieldId}</dd>
			</div>
			<div>
				<dt class="text-xs text-muted">Sample ID</dt>
				<dd>{test.sampleId}</dd>
			</div>
			<div>
				<dt class="text-xs text-muted">Farm</dt>
				<dd>{test.farm ?? '-'}</dd>
			</div>
			<div>
				<dt class="text-xs text-muted">Client</dt>
				<dd>{test.client ?? '-'}</dd>
			</div>
		</dl>
	</details>
</article>
