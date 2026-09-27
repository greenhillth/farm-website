<script lang="ts">
	import { asset } from '$app/paths';
	import { parseCsv } from '$lib/soil-tests/csv';
	import { CSV_REQUIRED_HEADERS } from '$lib/soil-tests/schema';
	import { validateCsv, type CsvCheck } from '$lib/soil-tests/validate';
	import type { ImportJob, OnDuplicate } from '../import-job.svelte';
	import ImportSteps from './ImportSteps.svelte';

	type Props = {
		job: ImportJob;
		knownPaddockIds: ReadonlySet<number>;
		existingSamples: ReadonlySet<string>;
		ondone: (result: { inserted: number; skipped: number }) => void;
	};

	let { job, knownPaddockIds, existingSamples, ondone }: Props = $props();

	type Step = 'choose' | 'check' | 'duplicates' | 'importing';
	const MAX_LISTED = 50;
	const STEP_NUMBER = { choose: 1, check: 2, duplicates: 3, importing: 4 } as const;

	let step = $state<Step>('choose');
	let file = $state.raw<File | null>(null);
	let check = $state.raw<CsvCheck | null>(null);
	let onDuplicate = $state<OnDuplicate>('skip');

	const done = $derived(step === 'importing' && job.stage === 'complete');
	const failed = $derived(step === 'importing' && job.stage === 'error');
	const current = $derived(done ? 5 : STEP_NUMBER[step]);
	const button = 'inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm';
	const primary =
		'inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-bg disabled:opacity-50';

	async function choose(event: Event & { currentTarget: HTMLInputElement }) {
		const [chosen] = event.currentTarget.files ?? [];
		event.currentTarget.value = '';
		if (!chosen) return;
		file = chosen;
		try {
			check = validateCsv(parseCsv(await chosen.text()), { knownPaddockIds, existingSamples });
		} catch {
			check = {
				rowCount: 0,
				preview: { headers: [], rows: [] },
				errors: [
					{
						row: null,
						column: null,
						message: 'Couldn’t read this file as text. Save it as CSV (UTF-8) and try again.'
					}
				],
				warnings: [],
				duplicateSampleIds: []
			};
		}
		step = 'check';
	}

	function startImport() {
		if (!file) return;
		step = 'importing';
		void job.start(file, onDuplicate);
	}

	function continueFromCheck() {
		if (!check || check.errors.length > 0) return;
		if (check.duplicateSampleIds.length > 0) step = 'duplicates';
		else startImport();
	}

	function backToCheck() {
		job.reset();
		step = 'check';
	}

	function chooseAnother() {
		job.reset();
		file = null;
		check = null;
		onDuplicate = 'skip';
		step = 'choose';
	}
</script>

<div class="space-y-5">
	<ImportSteps {current} />

	{#if step === 'choose'}
		<div class="space-y-3">
			<p>
				Choose the CSV file from the lab. Its first row needs these columns:
				{#each CSV_REQUIRED_HEADERS as name, index (name)}<code class="rounded bg-white/10 px-1"
						>{name}</code
					>{index < CSV_REQUIRED_HEADERS.length - 1 ? ', ' : ''}{/each}, and at least one result
				column such as <code class="rounded bg-white/10 px-1">P</code> or
				<code class="rounded bg-white/10 px-1">ph_water</code>.
			</p>
			<p class="text-sm text-muted">Dates can be YYYY-MM-DD or the date numbers Excel uses.</p>
			<label
				class="flex min-h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border text-base font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent hover:border-accent"
			>
				<input type="file" accept=".csv,text/csv" class="sr-only" onchange={choose} />
				Choose CSV file
			</label>
			<a
				href={asset('/samples/soil-tests.csv')}
				download="soil-tests-sample.csv"
				class="inline-flex min-h-11 items-center text-sm text-accent underline-offset-4 hover:underline"
			>
				Download a sample CSV
			</a>
		</div>
	{:else if step === 'check' && check}
		<p>
			<span class="font-semibold">{file?.name}</span>: {check.rowCount} row{check.rowCount === 1
				? ''
				: 's'}
		</p>

		{#if check.preview.rows.length > 0}
			<div class="overflow-x-auto rounded-lg border border-border">
				<table class="text-sm">
					<caption class="sr-only">The first {check.preview.rows.length} rows of the file</caption>
					<thead class="bg-white/5 text-left text-muted">
						<tr>
							{#each check.preview.headers as heading, index (index)}
								<th class="px-3 py-2 whitespace-nowrap">{heading}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each check.preview.rows as cells, rowIndex (rowIndex)}
							<tr class="border-t border-border/60">
								{#each cells as value, cellIndex (cellIndex)}
									<td class="px-3 py-2 whitespace-nowrap">{value}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		{#if check.errors.length > 0}
			<section
				aria-labelledby="csv-errors"
				class="rounded-lg border border-danger/50 bg-danger/10 p-4"
			>
				<h3 id="csv-errors" class="font-semibold">
					{check.errors.length} problem{check.errors.length === 1 ? '' : 's'} to fix before importing
				</h3>
				<ul class="mt-2 list-disc space-y-1 pl-5 text-sm">
					{#each check.errors.slice(0, MAX_LISTED) as issue, index (index)}
						<li>{issue.message}</li>
					{/each}
				</ul>
				{#if check.errors.length > MAX_LISTED}
					<p class="mt-2 text-sm">And {check.errors.length - MAX_LISTED} more.</p>
				{/if}
			</section>
		{:else}
			<p class="font-semibold text-accent">No problems found.</p>
		{/if}

		{#if check.warnings.length > 0}
			<section
				aria-labelledby="csv-warnings"
				class="rounded-lg border border-warn/50 bg-warn/10 p-4"
			>
				<h3 id="csv-warnings" class="font-semibold">Worth knowing</h3>
				<ul class="mt-2 list-disc space-y-1 pl-5 text-sm">
					{#each check.warnings.slice(0, MAX_LISTED) as issue, index (index)}
						<li>{issue.message}</li>
					{/each}
				</ul>
			</section>
		{/if}

		<div class="flex flex-wrap justify-end gap-2">
			<button type="button" class={button} onclick={chooseAnother}>Choose another file</button>
			<button
				type="button"
				class={primary}
				disabled={check.errors.length > 0}
				onclick={continueFromCheck}
			>
				Continue
			</button>
		</div>
	{:else if step === 'duplicates' && check}
		{@const count = check.duplicateSampleIds.length}
		<fieldset class="space-y-2">
			<legend class="mb-2 font-semibold">
				{count} sample{count === 1 ? ' is' : 's are'} already in the system
			</legend>
			<label class="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3">
				<input
					type="radio"
					name="on-duplicate"
					value="skip"
					bind:group={onDuplicate}
					class="size-5 accent-accent"
				/>
				<span>Skip them <span class="text-sm text-muted">(keep the tests already saved)</span></span
				>
			</label>
			<label class="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3">
				<input
					type="radio"
					name="on-duplicate"
					value="replace"
					bind:group={onDuplicate}
					class="size-5 accent-accent"
				/>
				<span
					>Replace them <span class="text-sm text-muted">(use the results in this file)</span></span
				>
			</label>
		</fieldset>
		<div class="flex flex-wrap justify-end gap-2">
			<button type="button" class={button} onclick={() => (step = 'check')}>Back</button>
			<button type="button" class={primary} onclick={startImport}>Import tests</button>
		</div>
	{:else if step === 'importing'}
		{#if done}
			<div role="status">
				<p class="text-lg font-semibold">
					Imported {job.inserted} test{job.inserted === 1 ? '' : 's'}
				</p>
				{#if job.skipped > 0}
					<p class="text-muted">
						Skipped {job.skipped}: already in the system, or without any results.
					</p>
				{/if}
			</div>
			<div class="flex justify-end">
				<button
					type="button"
					class={primary}
					onclick={() => ondone({ inserted: job.inserted, skipped: job.skipped })}
				>
					Close
				</button>
			</div>
		{:else if failed}
			<div role="alert" class="rounded-lg border border-danger/50 bg-danger/10 p-4">
				<p class="font-semibold">The import didn’t finish</p>
				<p class="text-sm">{job.error}</p>
			</div>
			<div class="flex justify-end">
				<button type="button" class={button} onclick={backToCheck}>Back to check</button>
			</div>
		{:else}
			<div role="status" aria-live="polite" class="space-y-2">
				<p class="font-semibold">Importing…</p>
				<div
					role="progressbar"
					aria-label="Import progress"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={job.percent}
					class="h-2 overflow-hidden rounded-full bg-white/10"
				>
					<div
						class="h-full bg-accent transition-[width] motion-reduce:transition-none"
						style:width="{job.percent}%"
					></div>
				</div>
				<p class="text-sm text-muted">{job.detail ?? job.message}</p>
			</div>
		{/if}
	{/if}
</div>
