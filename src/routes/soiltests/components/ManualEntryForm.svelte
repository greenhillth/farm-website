<script lang="ts">
	import {
		metricColumns,
		metricPlaceholders,
		type MetricKey,
		type PaddockSummary
	} from '$lib/soil-tests/schema';
	import { sampleKey } from '$lib/soil-tests/validate';
	import { uploadEndpoint } from '$lib/utils';

	type Props = {
		paddocks: readonly PaddockSummary[];
		existingSamples: ReadonlySet<string>;
		onsaved: () => void;
		oncancel: () => void;
	};

	let { paddocks, existingSamples, onsaved, oncancel }: Props = $props();

	const uid = $props.id();
	let fieldId = $state('');
	let sampleName = $state('');
	let sampleId = $state('');
	let sampleDate = $state('');
	let client = $state('');
	let results = $state(
		Object.fromEntries(metricColumns.map((column) => [column.key, ''])) as Record<MetricKey, string>
	);
	let error = $state<string | null>(null);
	let submitting = $state(false);

	const resultCount = $derived(
		metricColumns.filter((column) => results[column.key].trim() !== '').length
	);
	const input =
		'min-h-11 w-full rounded-lg border border-border bg-white/5 px-3 text-base text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

	function fail(message: string) {
		error = message;
		submitting = false;
	}

	async function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		submitting = true;

		const parsedFieldId = Number(fieldId.trim());
		if (!fieldId.trim() || !Number.isInteger(parsedFieldId))
			return fail('Field ID must be a whole number.');
		const parsedSampleId = Number(sampleId.trim());
		if (!sampleId.trim() || !Number.isInteger(parsedSampleId)) {
			return fail('Sample ID must be a whole number.');
		}
		if (existingSamples.has(sampleKey(parsedFieldId, parsedSampleId))) {
			return fail('A soil test with this field ID and sample ID already exists.');
		}

		const metrics: Partial<Record<MetricKey, number>> = {};
		for (const { key, label } of metricColumns) {
			const raw = results[key].trim();
			if (!raw) continue;
			const value = Number(raw);
			if (!Number.isFinite(value)) return fail(`${label} must be a number.`);
			metrics[key] = value;
		}
		if (Object.keys(metrics).length === 0) return fail('Enter at least one result.');

		try {
			const response = await fetch(uploadEndpoint('manual'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fieldId: parsedFieldId,
					sampleName: sampleName.trim(),
					sampleId: parsedSampleId,
					sampleDate,
					client: client.trim() || undefined,
					metrics
				})
			});
			if (!response.ok) {
				let message = `Couldn’t save the test (${response.status}).`;
				try {
					const problem = (await response.json()) as { message?: unknown; detail?: unknown };
					const reason = problem.message ?? problem.detail;
					if (typeof reason === 'string') message = reason;
				} catch {
					// Keep the fallback message.
				}
				return fail(message);
			}
			submitting = false;
			onsaved();
		} catch {
			fail('Couldn’t save the test. Check the connection and try again.');
		}
	}
</script>

<form {onsubmit} class="space-y-5">
	<div class="grid gap-4 md:grid-cols-2">
		<div>
			<label for="{uid}-field" class="mb-1 block text-sm">Field ID</label>
			<input
				id="{uid}-field"
				type="text"
				inputmode="numeric"
				required
				list="{uid}-paddocks"
				placeholder="e.g. 4251583"
				bind:value={fieldId}
				class={input}
			/>
			<datalist id="{uid}-paddocks">
				{#each paddocks as paddock (paddock.id)}
					<option value={String(paddock.id)}>{paddock.name}</option>
				{/each}
			</datalist>
		</div>
		<div>
			<label for="{uid}-name" class="mb-1 block text-sm">Sample name</label>
			<input
				id="{uid}-name"
				type="text"
				required
				placeholder="e.g. ES30"
				bind:value={sampleName}
				class={input}
			/>
		</div>
		<div>
			<label for="{uid}-sample" class="mb-1 block text-sm">Sample ID</label>
			<input
				id="{uid}-sample"
				type="text"
				inputmode="numeric"
				required
				placeholder="e.g. 100021"
				bind:value={sampleId}
				class={input}
			/>
		</div>
		<div>
			<label for="{uid}-date" class="mb-1 block text-sm">Sample date</label>
			<input id="{uid}-date" type="date" required bind:value={sampleDate} class={input} />
		</div>
		<div class="md:col-span-2">
			<label for="{uid}-client" class="mb-1 block text-sm"
				>Client <span class="text-muted">(optional)</span></label
			>
			<input
				id="{uid}-client"
				type="text"
				placeholder="e.g. Botanical Resources"
				bind:value={client}
				class={input}
			/>
		</div>
	</div>

	<fieldset class="rounded-xl border border-border p-4">
		<legend class="px-1 font-semibold">Results</legend>
		<p class="mb-3 text-sm text-muted">Enter at least one. Leave the rest blank.</p>
		<div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
			{#each metricColumns as column (column.key)}
				<div>
					<label for="{uid}-{column.key}" class="mb-1 block text-sm">{column.label}</label>
					<input
						id="{uid}-{column.key}"
						type="text"
						inputmode="decimal"
						placeholder={metricPlaceholders[column.key]}
						bind:value={results[column.key]}
						class={input}
					/>
				</div>
			{/each}
		</div>
	</fieldset>

	{#if error}
		<p role="alert" class="rounded-lg border border-danger/50 bg-danger/10 px-4 py-3 text-sm">
			{error}
		</p>
	{/if}

	<div class="flex flex-wrap justify-end gap-2">
		<button
			type="button"
			onclick={oncancel}
			class="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm"
		>
			Cancel
		</button>
		<button
			type="submit"
			disabled={submitting || resultCount === 0}
			class="inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-bg disabled:opacity-50"
		>
			{submitting ? 'Saving…' : 'Save test'}
		</button>
	</div>
</form>
