<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Panel from '$lib/components/Panel.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import CONFIG from '$lib/config';
	import { uploadEndpoint } from '$lib/utils';
	import {
		metricColumns,
		metricPlaceholders,
		optionalColumns,
		type BulkDeleteResponse,
		type MetricKey,
		type PaddockSummary,
		type SoilTest
	} from '$lib/soil-tests/schema';
	import {
		CSV_PROGRESS_EVENT_NAME,
		csvStageDefaults,
		type CsvProgressStage,
		type CsvProgressState,
		type CsvProgressUpdate
	} from '$lib/soil-tests/progress';
	import { fetchSoilTests, formatDate, formatNumber } from '$lib/soil-tests/utils';

	type ToastVariant = 'success' | 'error' | 'warning';
	type Toast = { id: number; message: string; variant: ToastVariant };

	let tests: SoilTest[] = [];
	let q = '';
	let loading = true;
	let error: string | null = null;
	let showUploader = false;
	let uploadMode: 'manual' | 'csv' = 'manual';
	let uploadError: string | null = null;
	let submitting = false;
	let isEditMode = false;
	let showDeleteConfirm = false;
	let deletingTests = false;
	let selectedIds: Set<SoilTest['id']> = new Set();
	let selectedCount = 0;
	$: selectedCount = selectedIds.size;

	let toasts: Toast[] = [];
	let toastCounter = 0;
	const toastTimeouts = new Map<number, ReturnType<typeof setTimeout>>();
	const toastClassByVariant: Record<ToastVariant, string> = {
		success: 'border-green-400/40 bg-green-500/10 text-green-100',
		warning: 'border-amber-400/40 bg-amber-500/15 text-amber-100',
		error: 'border-red-500/50 bg-red-500/15 text-red-100'
	};

	const sampleCsvDownloadPath = '/samples/soil-tests.csv';
	const sampleCsvDownloadName = 'soil-tests-sample.csv';

	function dismissToast(id: number) {
		const timeout = toastTimeouts.get(id);
		if (timeout) {
			clearTimeout(timeout);
			toastTimeouts.delete(id);
		}
		toasts = toasts.filter((toast) => toast.id !== id);
	}

	function showToast(message: string, variant: ToastVariant = 'success') {
		const id = ++toastCounter;
		toasts = [...toasts, { id, message, variant }];
		const timeout = setTimeout(() => dismissToast(id), 4000);
		toastTimeouts.set(id, timeout);
	}

	onDestroy(() => {
		toastTimeouts.forEach((timeout) => clearTimeout(timeout));
		toastTimeouts.clear();
	});

	function clearSelection() {
		selectedIds = new Set();
	}

	function enterEditMode() {
		if (isEditMode) return;
		isEditMode = true;
		clearSelection();
	}

	function exitEditMode() {
		if (!isEditMode) return;
		isEditMode = false;
		showDeleteConfirm = false;
		clearSelection();
	}

	function toggleEditMode() {
		if (isEditMode) {
			exitEditMode();
		} else {
			enterEditMode();
		}
	}

	function handleSelectionChange(id: SoilTest['id'], checked: boolean) {
		const next = new Set(selectedIds);
		if (checked) {
			next.add(id);
		} else {
			next.delete(id);
		}
		selectedIds = next;
	}

	function getSelectionLabel(test: SoilTest) {
		if (test.sampleDate) {
			const labelDate = formatDate(test.sampleDate);
			if (labelDate && labelDate !== '-') {
				return `Select soil test ${labelDate}`;
			}
		}
		return `Select soil test ${test.id}`;
	}

	function confirmDelete() {
		if (selectedCount === 0) return;
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		if (deletingTests) return;
		showDeleteConfirm = false;
	}

	function removeTestsById(ids: SoilTest['id'][]) {
		if (!ids.length) return;
		const removalSet = new Set(ids);
		tests = tests.filter((test) => !removalSet.has(test.id));
	}

	function handleGlobalKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		if (showDeleteConfirm) return;
		if (showUploader) return;
		if (isEditMode) {
			exitEditMode();
		}
	}

	async function doBulkDelete() {
		if (selectedCount === 0 || deletingTests) return;
		deletingTests = true;
		const ids = Array.from(selectedIds);
		try {
			const response = await fetch(CONFIG.backend.bulkDelete, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids })
			});

			let result: BulkDeleteResponse | null = null;
			const contentType = response.headers.get('content-type') ?? '';
			if (contentType.includes('application/json')) {
				result = (await response.json()) as BulkDeleteResponse;
			}

			if (!response.ok && response.status !== 207) {
				throw new Error(
					result && 'message' in result
						? String((result as Record<string, unknown>).message)
						: `Delete failed (${response.status})`
				);
			}

			const failedSet = new Set<SoilTest['id']>(
				Array.isArray(result?.failedIds)
					? ((result.failedIds as SoilTest['id'][] | undefined) ?? [])
					: []
			);

			if (response.status === 207 && failedSet.size === 0) {
				const deletedCount = typeof result?.deleted === 'number' ? result.deleted : undefined;
				if (deletedCount !== undefined && deletedCount < ids.length) {
					ids.forEach((id) => failedSet.add(id));
				}
			}

			const responseIds = Array.isArray(result?.ids) ? (result.ids as SoilTest['id'][]) : ids;
			const successfulIds = responseIds.filter((id) => !failedSet.has(id));

			if (successfulIds.length > 0) {
				removeTestsById(successfulIds);
				showToast(
					`Deleted ${successfulIds.length} test record${successfulIds.length === 1 ? '' : 's'}.`,
					'success'
				);
			}

			if (failedSet.size > 0) {
				showToast(
					`Failed to delete ${failedSet.size} test record${failedSet.size === 1 ? '' : 's'}.`,
					'warning'
				);
				selectedIds = new Set(failedSet);
				showDeleteConfirm = false;
				return;
			}

			clearSelection();
			showDeleteConfirm = false;
		} catch (err) {
			console.error('Bulk delete failed', err);
			showToast("Couldn't delete tests. Please try again.", 'error');
		} finally {
			deletingTests = false;
		}
	}

	let csvFile: File | null = null;
	let csvFileName: string | null = null;
	let csvFileInput: HTMLInputElement | null = null;
	let csvUploadForm: HTMLFormElement | null = null;

	let csvProgress: CsvProgressState = {
		visible: false,
		stage: 'idle',
		percent: csvStageDefaults.idle.percent,
		message: csvStageDefaults.idle.label,
		detail: null
	};

	let csvProgressPercent = csvStageDefaults.idle.percent;
	$: csvProgressPercent = Math.min(100, Math.max(0, csvProgress.percent));

	type CsvColumnInfo = {
		headings: string[];
		required?: boolean;
		datatype: string;
		description: string;
	};

	type CsvSection = {
		id: string;
		title: string;
		rows: CsvColumnInfo[];
		note?: string;
		tone?: 'metrics' | 'optional';
		defaultOpen?: boolean;
	};

const csvMetricHeadings: MetricKey[] = [];
for (const column of metricColumns) {
	csvMetricHeadings.push(column.key);
}

const optionalMetricHeadings = optionalColumns.map((column) => column.key);
const optionalQualifierHeadings = ['grower', 'crop'] as const;

	const csvSections: CsvSection[] = [
		{
			id: 'core-headings',
			title: 'Core headings',
			defaultOpen: true,
			rows: [
				{
					headings: ['fieldID'],
					required: true,
					datatype: 'Whole number (e.g. 101)',
					description: 'Matches the paddock Field ID shown in Soil tests. Numbers only.'
				},
				{
					headings: ['name_sample'],
					required: true,
					datatype: 'Text (e.g. "North Flats 2024")',
					description: 'Friendly lab sample name.'
				},
				{
					headings: ['id_sample', 'sample_id'],
					required: true,
					datatype: 'Whole number (e.g. 552301)',
					description: 'Lab reference number (either "id_sample" or "sample_id").'
				},
				{
					headings: ['sample_date'],
					required: true,
					datatype: 'Date in YYYY-MM-DD',
					description: 'ISO date. Format as text in spreadsheets to avoid auto changes.'
				},
				{
					headings: ['client'],
					datatype: 'Text (optional)',
					description: 'Requester name. Leave blank if none.'
				}
			]
		},
		{
			id: 'metric-headings',
			title: 'Metric headings',
			tone: 'metrics',
			defaultOpen: true,
			note: 'Include at least one metric column. Leave unused metric cells blank.',
			rows: [
				{
					headings: csvMetricHeadings,
					datatype: 'Decimal number (e.g. 56.7)',
					description: 'Soil nutrient metrics — include at least one column.'
				}
			]
		},
	{
		id: 'optional-metric-headings',
		title: 'Optional metric headings',
		tone: 'optional',
		defaultOpen: false,
		note: 'Extra numeric metrics exported by some labs. Include them when available; otherwise omit the columns.',
		rows: [
			{
				headings: optionalMetricHeadings,
				datatype: 'Numeric values (see lab units)',
				description: 'Supplementary lab metrics such as Cl, Cu, Fe, Mn, Zn, EC, buffer pH, and depth readings.'
			}
		]
	},
	{
		id: 'optional-qualifiers',
		title: 'Optional qualifiers',
		tone: 'optional',
		defaultOpen: false,
		note: 'Context columns that appear in some exports. Safe to omit if your lab does not provide them.',
		rows: [
			{
				headings: Array.from(optionalQualifierHeadings),
				datatype: 'Text',
				description: 'High-level context such as grower or crop.'
			}
		]
	}
];

	let csvSectionOpen: Record<string, boolean> = csvSections.reduce<Record<string, boolean>>(
		(accumulator, section) => {
			accumulator[section.id] = section.defaultOpen ?? true;
			return accumulator;
		},
		{}
	);

	const csvUploaderTips = [
		'Keep the first row exactly matching the headings shown below.',
		'Save the file as comma-separated values (CSV) encoded in UTF-8.',
		'Dates must stay in YYYY-MM-DD format and numbers should not include units or extra text.'
	];

	function toggleCsvSection(id: string) {
		csvSectionOpen = { ...csvSectionOpen, [id]: !csvSectionOpen[id] };
	}

	let activeCsvJobId: string | null = null;

	type ManualForm = {
		fieldId: string | number;
		sampleName: string;
		sampleId: string | number;
		sampleDate: string;
		client: string;
	};

	let manualForm: ManualForm = {
		fieldId: '',
		sampleName: '',
		sampleId: '',
		sampleDate: '',
		client: ''
	};

function createEmptyMetrics(): Record<MetricKey, string> {
	const empty = {} as Record<MetricKey, string>;
	for (const column of metricColumns) {
		empty[column.key] = '';
	}
	return empty;
}

	let manualMetrics: Record<MetricKey, string> = createEmptyMetrics();

	let manualMetricCount = 0;

	type PaddockOption = {
		id: number;
		name: string;
		farm?: string;
		label: string;
	};

	const MAX_PADDOCK_SUGGESTIONS = 50;
	let paddockOptions: PaddockOption[] = [];
	let fieldIdSuggestions: PaddockOption[] = [];

	$: fieldIdSuggestions = (() => {
		const value = manualForm.fieldId;
		const query = typeof value === 'number' ? value.toString() : value.trim();
		if (!query) {
			return paddockOptions.slice(0, MAX_PADDOCK_SUGGESTIONS);
		}
		const lowered = query.toLowerCase();
		return paddockOptions
			.filter((option) => {
				if (option.id.toString().includes(query)) return true;
				if (option.name.toLowerCase().includes(lowered)) return true;
				return option.farm ? option.farm.toLowerCase().includes(lowered) : false;
			})
			.slice(0, MAX_PADDOCK_SUGGESTIONS);
	})();

	$: {
		let count = 0;
		for (const column of metricColumns) {
			const value = manualMetrics[column.key];
			if (value && value.trim()) {
				count += 1;
			}
		}
		manualMetricCount = count;
	}

	function setCsvProgress(
		stage: CsvProgressStage,
		percent?: number,
		message?: string,
		detail?: string | null
	) {
		const defaults = csvStageDefaults[stage];
		const previousStage = csvProgress.stage;
		const previousDetail = csvProgress.detail ?? null;
		csvProgress = {
			visible: stage !== 'idle' || percent !== undefined || message !== undefined,
			stage,
			percent: Math.min(100, Math.max(0, percent ?? defaults.percent)),
			message: message ?? defaults.label,
			detail: detail === undefined ? (stage === previousStage ? previousDetail : null) : detail
		};
	}

	function resetCsvUploadState() {
		activeCsvJobId = null;
		csvFile = null;
		csvFileName = null;
		csvProgress = {
			visible: false,
			stage: 'idle',
			percent: csvStageDefaults.idle.percent,
			message: csvStageDefaults.idle.label,
			detail: null
		};
		if (csvFileInput) {
			csvFileInput.value = '';
		}
		if (csvUploadForm) {
			csvUploadForm.reset();
		}
		submitting = false;
	}

	function handleCsvFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const [file] = input.files ?? [];
		if (!file) {
			resetCsvUploadState();
			return;
		}
		csvFile = file;
		csvFileName = file.name;
		uploadError = null;
		setCsvProgress('idle', undefined, undefined, null);
	}

	function clearCsvFile() {
		if (submitting) return;
		resetCsvUploadState();
		uploadError = null;
	}

	async function handleCsvProgressUpdate(update: CsvProgressUpdate) {
		if (!update) return;
		if (update.jobId && activeCsvJobId && update.jobId !== activeCsvJobId) return;
		if (update.jobId && !activeCsvJobId) {
			activeCsvJobId = update.jobId;
		}

		setCsvProgress(update.stage, update.percent, update.message, update.detail);

		if (update.stage === 'error') {
			uploadError = update.detail ?? update.message ?? 'CSV import failed.';
		} else if (uploadError) {
			uploadError = null;
		}

		submitting = update.stage !== 'complete' && update.stage !== 'error';

		if (update.stage === 'complete') {
			// Allow selecting the same file again once the import is done.
			csvFile = null;
			if (csvFileInput) {
				csvFileInput.value = '';
			}

			const refreshed = await loadTests();
			showToast(
				refreshed ? 'Import complete.' : 'Import complete, but refreshing the list failed.',
				refreshed ? 'success' : 'warning'
			);
		}
	}

	function onCsvProgressEvent(event: Event) {
		const customEvent = event as CustomEvent<CsvProgressUpdate>;
		if (!customEvent.detail) return;
		void handleCsvProgressUpdate(customEvent.detail);
	}

	function openUploader(mode: 'manual' | 'csv' = 'manual') {
		if (!showUploader && mode === 'manual') resetManualForm();
		if (!showUploader && mode === 'csv') resetCsvUploadState();
		uploadMode = mode;
		uploadError = null;
		submitting = false;
		showUploader = true;
	}

	function changeUploadMode(mode: 'manual' | 'csv') {
		if (uploadMode === mode) return;
		uploadMode = mode;
		uploadError = null;
		submitting = false;
		if (mode === 'csv') {
			resetCsvUploadState();
		}
	}

	function closeUploader() {
		showUploader = false;
		submitting = false;
		uploadError = null;
		resetCsvUploadState();
	}

	function toPaddockOptions(values: PaddockSummary[]): PaddockOption[] {
		return values
			.map((value) => ({
				id: value.id,
				name: value.name,
				farm: value.farm,
				label: `${value.id} — ${value.name}${value.farm ? ` (${value.farm})` : ''}`
			}))
			.sort((a, b) => a.id - b.id);
	}

	async function loadTests({
		showSpinner = false
	}: { showSpinner?: boolean } = {}): Promise<boolean> {
		if (showSpinner) {
			loading = true;
		}
		error = null;
		try {
			const result = await fetchSoilTests();
			tests = result.tests;
			paddockOptions = toPaddockOptions(result.paddocks);
			return true;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed loading soil tests';
			return false;
		} finally {
			if (showSpinner) {
				loading = false;
			}
		}
	}

	function resetManualForm() {
		manualForm = {
			fieldId: '',
			sampleName: '',
			sampleId: '',
			sampleDate: '',
			client: ''
		};
		manualMetrics = createEmptyMetrics();
	}

	async function handleManualSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		uploadError = null;
		try {
			const fieldIdValue = manualForm.fieldId;
			const fieldIdString =
				typeof fieldIdValue === 'number' ? fieldIdValue.toString() : fieldIdValue.trim();
			if (!fieldIdString) {
				uploadError = 'Field ID is required.';
				submitting = false;
				return;
			}
			const parsedFieldId = Number(fieldIdString);
			if (!Number.isInteger(parsedFieldId)) {
				uploadError = 'Field ID must be an integer.';
				submitting = false;
				return;
			}

			const sampleIdValue = manualForm.sampleId;
			const sampleIdString =
				typeof sampleIdValue === 'number' ? sampleIdValue.toString() : sampleIdValue.trim();
			if (!sampleIdString) {
				uploadError = 'Sample ID is required.';
				submitting = false;
				return;
			}
			const parsedSampleId = Number(sampleIdString);
			if (!Number.isInteger(parsedSampleId)) {
				uploadError = 'Sample ID must be an integer.';
				submitting = false;
				return;
			}

			const duplicateSample = tests.some(
				(test) => test.fieldId === parsedFieldId && test.sampleId === parsedSampleId
			);
			if (duplicateSample) {
				uploadError = 'A soil test with this Field ID and Sample ID already exists.';
				submitting = false;
				return;
			}

			const preparedMetrics: Partial<Record<MetricKey, number>> = {};
			let metricCount = 0;
			for (const { key, label } of metricColumns) {
				const raw = manualMetrics[key].trim();
				if (!raw) continue;
				const value = Number(raw);
				if (!Number.isFinite(value)) {
					uploadError = `Invalid value for ${label}.`;
					submitting = false;
					return;
				}
				preparedMetrics[key] = value;
				metricCount += 1;
			}

			if (metricCount === 0) {
				uploadError = 'Please enter at least one metric value.';
				submitting = false;
				return;
			}

			const payload = {
				fieldId: parsedFieldId,
				sampleName: manualForm.sampleName.trim(),
				sampleId: parsedSampleId,
				sampleDate: manualForm.sampleDate,
				client: manualForm.client.trim() || undefined,
				metrics: preparedMetrics
			};
			const endpoint = uploadEndpoint('manual');

			console.info('POST to', endpoint, payload);
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				let message = `Failed to submit sample (${response.status})`;
				try {
					const problem = await response.json();
					if (problem && typeof problem === 'object' && 'message' in problem) {
						message = String((problem as Record<string, unknown>).message ?? message);
					}
				} catch {
					// ignore JSON parse errors and keep fallback message
				}
				throw new Error(message);
			}

			const refreshed = await loadTests();
			closeUploader();
			showToast(
				refreshed ? 'Soil test added.' : 'Soil test added, but refreshing the list failed.',
				refreshed ? 'success' : 'warning'
			);
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Failed to submit sample';
		} finally {
			submitting = false;
		}
	}

	async function handleCsvSubmit(event: SubmitEvent) {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		csvUploadForm = form;
		const data = new FormData(form);
		const file = data.get('file');
		if (!(file instanceof File) || !file.size) {
			uploadError = 'Please choose a CSV file to upload.';
			resetCsvUploadState();
			return;
		}

		csvFile = file;
		csvFileName = file.name;
		uploadError = null;
		submitting = true;

		const jobId =
			typeof crypto !== 'undefined' && 'randomUUID' in crypto
				? crypto.randomUUID()
				: `${Date.now()}`;

		activeCsvJobId = jobId;
		setCsvProgress(
			'uploading',
			undefined,
			`Uploading ${file.name}…`,
			'Upload started. Waiting for processing updates from the server…'
		);
		const endpoint: string = uploadEndpoint('import');
		console.info('POST to', endpoint, 'with file', file.name, 'tracking job', jobId);
		console.info(
			`Dispatch CSV progress updates with window.dispatchEvent(new CustomEvent('${CSV_PROGRESS_EVENT_NAME}', { detail: { jobId: '${jobId}', stage: 'parsing', percent: 50 } }))`
		);

		try {
			// TODO: Replace stub with real upload request and progress tracking.
			const response = await fetch(endpoint, { method: 'POST', body: data });
			if (!response.ok) throw new Error(`Upload failed (${response.status})`);
			const json = await response.json();
			if (json?.jobId) {
				activeCsvJobId = json.jobId;
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to upload CSV';
			await handleCsvProgressUpdate({ stage: 'error', message, detail: message, jobId });
		}
	}

	onMount(() => {
		void loadTests({ showSpinner: true });
	});

	onMount(() => {
		const handler = (event: Event) => onCsvProgressEvent(event);
		window.addEventListener(CSV_PROGRESS_EVENT_NAME, handler);
		return () => {
			window.removeEventListener(CSV_PROGRESS_EVENT_NAME, handler);
		};
	});

	$: filtered = q
		? tests.filter((test) => {
				const haystack =
					`${test.paddockName} ${test.fieldId} ${test.sampleName ?? ''} ${test.sampleId} ${test.farm ?? ''}`.toLowerCase();
				return haystack.includes(q.toLowerCase());
			})
		: tests;
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

{#if toasts.length}
	<div
		class="pointer-events-none fixed top-4 right-4 z-[2100] flex max-w-sm flex-col gap-2"
		aria-live="polite"
	>
		{#each toasts as toast (toast.id)}
			<div
				class={`pointer-events-auto flex items-start gap-3 rounded-md border px-3 py-2 text-sm shadow-lg backdrop-blur-sm ${toastClassByVariant[toast.variant]}`}
				role={toast.variant === 'error' ? 'alert' : 'status'}
			>
				<span class="flex-1">{toast.message}</span>
				<button
					class="ml-2 text-xs text-current opacity-70 transition hover:opacity-100 focus:ring-2 focus:ring-current/40 focus:outline-none"
					type="button"
					on:click={() => dismissToast(toast.id)}
					aria-label="Dismiss notification"
				>
					×
				</button>
			</div>
		{/each}
	</div>
{/if}

<header class="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
	<a href="/" class="text-muted text-sm hover:text-white">&larr; Back to home</a>
	<div class="text-muted text-xs">Soil Tests</div>
</header>

<main class="container mx-auto space-y-5 px-4 pb-8">
	<Panel title="Soil tests">
		<div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<input
				placeholder="Search by paddock or sample…"
				bind:value={q}
				class="border-border focus:ring-accent/40 w-full rounded-md border bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 sm:max-w-md"
			/>
			<div class="text-muted flex flex-wrap items-center gap-3 text-xs">
				<span>Showing {filtered.length} of {tests.length} samples</span>
				<div class="flex items-center gap-2">
					<button
						type="button"
						on:click={() => openUploader('manual')}
						class="border-border focus:ring-accent/40 rounded-md border bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 focus:ring-2 focus:outline-none"
					>
						Add soil test
					</button>
					<button
						type="button"
						class="border-border focus:ring-accent/40 rounded-md border bg-red-500/20 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/30 focus:ring-2 focus:outline-none"
						on:click={toggleEditMode}
						aria-pressed={isEditMode}
					>
						{isEditMode ? 'Done' : 'Edit tests'}
					</button>
				</div>
			</div>
		</div>

		{#if isEditMode}
			<div class="mb-4 flex flex-wrap items-center gap-2 text-sm">
				<button
					type="button"
					class="rounded-md border border-white/20 bg-transparent px-3 py-2 text-white/80 transition hover:bg-white/10 focus:ring-2 focus:ring-white/30 focus:outline-none"
					on:click={exitEditMode}
				>
					Exit
				</button>
				<button
					type="button"
					class="rounded-md border border-red-500/50 bg-red-500/20 px-3 py-2 text-red-200 transition hover:bg-red-500/30 focus:ring-2 focus:ring-red-400/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					on:click={confirmDelete}
					disabled={selectedCount === 0}
				>
					Delete ({selectedCount})
				</button>
			</div>
		{/if}

		{#if loading}
			<div class="text-muted text-sm">Loading soil tests…</div>
		{:else if error}
			<div class="text-sm text-red-400">{error}</div>
		{:else if filtered.length === 0}
			<div class="text-muted text-sm">No samples match your search.</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="text-muted border-border/60 border-b text-left">
						<tr>
							<th class="w-10 py-2 pr-2">
								{#if isEditMode}
									<span class="sr-only">Select soil test</span>
								{/if}
							</th>
							<th class="py-2 pr-4">Sample</th>
							<th class="py-2 pr-4">Paddock</th>
							<th class="py-2 pr-4">Farm</th>
							<th class="py-2 pr-4">Sample date</th>
							<th class="py-2 pr-4">Client</th>
							{#each metricColumns as column}
								<th class="py-2 pr-2 text-right">{column.label}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each filtered as test}
							<tr
								class="border-border/40 border-b transition-colors hover:bg-white/5"
								class:selected-row={selectedIds.has(test.id)}
							>
								<td class="w-10 py-2 pr-2 align-top">
									{#if isEditMode}
										<input
											type="checkbox"
											class="size-4 rounded-full border border-red-400/60 bg-transparent accent-red-500"
											checked={selectedIds.has(test.id)}
											on:change={(event) =>
												handleSelectionChange(
													test.id,
													(event.currentTarget as HTMLInputElement).checked
												)}
											aria-label={getSelectionLabel(test)}
										/>
									{/if}
								</td>
								<td class="py-2 pr-4">
									<div class="flex flex-col text-sm">
										<span class="font-medium text-white">{test.sampleName ?? 'Unnamed sample'}</span
										>
										{#if test.sampleId}
											<span class="text-muted text-xs">Sample ID {test.sampleId}</span>
										{/if}
									</div>
								</td>
								<td class="py-2 pr-4">
									<div class="flex flex-col">
										<span>{test.paddockName}</span>
										<span class="text-muted text-xs">Field ID {test.fieldId}</span>
									</div>
								</td>
								<td class="py-2 pr-4">{test.farm ?? '-'}</td>
								<td class="py-2 pr-4">{formatDate(test.sampleDate)}</td>
								<td class="py-2 pr-4">{test.client ?? '-'}</td>
								{#each metricColumns as column}
									<td class="py-2 text-right">{formatNumber(test.metrics[column.key])}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Panel>
</main>

{#if showUploader}
	<div class="modal-backdrop" role="presentation" on:click|self={closeUploader}>
		<div class="modal" role="dialog" aria-modal="true" aria-label="Soil test upload">
			<header class="modal__header">
				<h2 class="text-lg font-semibold">Add soil test</h2>
				<button type="button" class="modal__close" on:click={closeUploader} aria-label="Close">
					×
				</button>
			</header>
			<nav class="modal__tabs" aria-label="Upload mode">
				<button
					type="button"
					class={`modal__tab ${uploadMode === 'manual' ? 'active' : ''}`}
					on:click={() => changeUploadMode('manual')}>Manual entry</button
				>
				<button
					type="button"
					class={`modal__tab ${uploadMode === 'csv' ? 'active' : ''}`}
					on:click={() => changeUploadMode('csv')}>Upload CSV</button
				>
			</nav>

			{#if uploadMode === 'manual'}
				<form class="modal__body" on:submit={handleManualSubmit}>
					<div class="grid gap-3 md:grid-cols-2">
						<label class="modal__field">
							<span>Field ID <span class="required">(required)</span></span>
							<input
								type="text"
								inputmode="numeric"
								pattern="[0-9]*"
								bind:value={manualForm.fieldId}
								list="field-id-options"
								required
								class="modal__input"
								placeholder="e.g. 4251583"
							/>
							<datalist id="field-id-options">
								{#each fieldIdSuggestions as option (option.id)}
									<option value={option.id} label={option.label}>{option.label}</option>
								{/each}
							</datalist>
						</label>
						<label class="modal__field">
							<span>Sample name <span class="required">(required)</span></span>
							<input
								type="text"
								bind:value={manualForm.sampleName}
								required
								class="modal__input"
								placeholder="e.g. ES30"
							/>
						</label>
						<label class="modal__field">
							<span>Sample ID <span class="required">(required)</span></span>
							<input
								type="text"
								inputmode="numeric"
								pattern="[0-9]*"
								bind:value={manualForm.sampleId}
								required
								class="modal__input"
								placeholder="e.g. 100021"
							/>
						</label>
						<label class="modal__field">
							<span>Sample date <span class="required">(required)</span></span>
							<input type="date" bind:value={manualForm.sampleDate} required class="modal__input" />
						</label>
						<label class="modal__field md:col-span-2">
							<span>Client</span>
							<input
								type="text"
								bind:value={manualForm.client}
								class="modal__input"
								placeholder="e.g. Botanical Resources"
							/>
						</label>
					</div>

					<fieldset class="modal__fieldset">
						<legend>Metrics</legend>
						<p class="modal__hint">
							Enter at least one metric value (currently {manualMetricCount} selected).
						</p>
						<div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
							{#each metricColumns as column}
								<label class="modal__field">
									<span>{column.label}</span>
									<input
										type="number"
										step="any"
										value={manualMetrics[column.key]}
										on:input={(event) => {
											const value = event.currentTarget.value;
											manualMetrics = { ...manualMetrics, [column.key]: value };
										}}
										class="modal__input"
										placeholder={metricPlaceholders[column.key]}
									/>
								</label>
							{/each}
						</div>
					</fieldset>

					{#if uploadError}
						<div class="modal__error">{uploadError}</div>
					{/if}

					<footer class="modal__footer">
						<button type="button" on:click={closeUploader} class="modal__secondary">Cancel</button>
						<button
							type="submit"
							class="modal__primary"
							disabled={submitting || manualMetricCount === 0}
							title={manualMetricCount === 0 ? 'Add at least one metric to save' : undefined}
						>
							{submitting ? 'Saving…' : 'Save test'}
						</button>
					</footer>
				</form>
			{:else}
				<form class="modal__body" on:submit={handleCsvSubmit} bind:this={csvUploadForm}>
					<p class="text-muted text-sm">
						Upload a CSV exported from the lab and double-check the headings below match your file
						exactly.
					</p>
					<ul class="csv-guidance__tips">
						{#each csvUploaderTips as tip}
							<li>{tip}</li>
						{/each}
					</ul>
					<div class="csv-guidance">
						<div class="csv-guidance__table-wrapper">
							<table class="csv-guidance__table">
								<thead>
									<tr>
										<th scope="col">Heading</th>
										<th scope="col" class="csv-guidance__th-format">Format</th>
										<th scope="col">How it's used</th>
									</tr>
								</thead>
								{#each csvSections as section}
									<tbody
										class:csv-guidance__section--metrics={section.tone === 'metrics'}
										class:csv-guidance__section--optional={section.tone === 'optional'}
									>
										<tr class="csv-guidance__section-header">
											<th scope="row" colspan="3">
												<button
													type="button"
													class="csv-guidance__section-toggle"
													on:click={() => toggleCsvSection(section.id)}
													aria-expanded={csvSectionOpen[section.id] ? 'true' : 'false'}
												>
													<span>{section.title}</span>
													<span aria-hidden="true">{csvSectionOpen[section.id] ? '−' : '+'}</span>
												</button>
											</th>
										</tr>
										{#if csvSectionOpen[section.id]}
											{#if section.note}
												<tr class="csv-guidance__section-note">
													<td colspan="3">{section.note}</td>
												</tr>
											{/if}
											{#each section.rows as column}
												<tr>
													<td>
														<div class="csv-guidance__codes">
															{#each column.headings as heading}
																<code>{heading}</code>
															{/each}
														</div>
														{#if column.required}
															<span class="required csv-guidance__required-tag">required</span>
														{/if}
													</td>
													<td class="csv-guidance__format">{column.datatype}</td>
													<td>
														<div class="csv-guidance__description">{column.description}</div>
													</td>
												</tr>
											{/each}
										{/if}
									</tbody>
								{/each}
							</table>
						</div>
					</div>
					<div class="modal__csv-actions">
							<a
									class="modal__sample-link"
									href={sampleCsvDownloadPath}
									download={sampleCsvDownloadName}
							>
									<span aria-hidden="true">⬇</span>
									Download sample CSV
							</a>
							<p class="modal__csv-hint">
									The sample file includes the headings above and one example row you can
									replace with your data.
							</p>
					</div>
					<label class="modal__dropzone">
						<input
							type="file"
							accept=".csv"
							name="file"
							required
							on:change={handleCsvFileChange}
							bind:this={csvFileInput}
						/>
						<span>{csvFile ? 'Change CSV file' : 'Choose CSV file'}</span>
					</label>
					{#if csvFile || csvFileName}
						<div class="modal__selected-file" role="status" aria-live="polite">
							<div class="modal__selected-file-summary">
								<span class="modal__selected-file-label">
									{csvProgress.stage === 'complete' ? 'Last uploaded file' : 'Selected file'}
								</span>
								<span class="modal__selected-file-name">{csvFile?.name ?? csvFileName}</span>
							</div>
							{#if csvFile}
								<button
									type="button"
									class="modal__selected-file-clear"
									on:click={clearCsvFile}
									aria-label="Remove selected file"
									disabled={submitting}
								>
									×
								</button>
							{/if}
						</div>
					{/if}
					{#if csvProgress.visible}
						<div class="modal__progress" role="status" aria-live="polite">
							<div class="modal__progress-header">
								<span>{csvProgress.message}</span>
								<span>{Math.round(csvProgressPercent)}%</span>
							</div>
							<div class="modal__progress-bar" aria-hidden="true">
								<div class="modal__progress-value" style={`width: ${csvProgressPercent}%`}></div>
							</div>
							{#if csvProgress.detail}
								<div class="modal__progress-detail">{csvProgress.detail}</div>
							{/if}
						</div>
					{/if}
					{#if uploadError}
						<div class="modal__error">{uploadError}</div>
					{/if}
					<footer class="modal__footer">
						<button type="button" on:click={closeUploader} class="modal__secondary">Cancel</button>
						<button type="submit" class="modal__primary" disabled={submitting || !csvFile}>
							{submitting ? 'Uploading…' : 'Upload CSV'}
						</button>
					</footer>
				</form>
			{/if}
		</div>
	</div>
{/if}

<ConfirmModal
	open={showDeleteConfirm}
	title="Delete soil test records?"
	confirmText="Delete"
	cancelText="Cancel"
	loading={deletingTests}
	disableConfirm={selectedCount === 0}
	on:confirm={doBulkDelete}
	on:cancel={cancelDelete}
>
	<p class="text-sm text-slate-200">
		You are about to delete {selectedCount} test record{selectedCount === 1 ? '' : 's'}. Are you
		sure?
	</p>
	<p class="text-sm font-semibold text-red-300">This action cannot be undone.</p>
</ConfirmModal>

<style>
	tr.selected-row {
		background: rgba(248, 113, 113, 0.12);
	}

	tr.selected-row:hover {
		background: rgba(248, 113, 113, 0.18);
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.65);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		z-index: 2000;
	}

	.modal {
		background: rgba(15, 23, 42, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
		max-width: 42rem;
		width: min(100%, 42rem);
		box-shadow: 0 25px 60px rgba(15, 23, 42, 0.45);
		color: #f9fafb;
		display: flex;
		flex-direction: column;
	}

	.modal__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem 0.75rem;
	}

	.modal__close {
		border: none;
		background: rgba(255, 255, 255, 0.08);
		color: #f9fafb;
		width: 2rem;
		height: 2rem;
		border-radius: 999px;
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
	}

	.modal__tabs {
		display: flex;
		gap: 0.5rem;
		padding: 0 1.25rem 1rem;
	}

	.modal__tab {
		flex: 1;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		padding: 0.5rem 1rem;
		background: transparent;
		color: rgba(248, 250, 252, 0.75);
		cursor: pointer;
	}

	.modal__tab.active {
		background: rgba(59, 130, 246, 0.25);
		color: #fff;
		border-color: rgba(59, 130, 246, 0.5);
	}

	.modal__body {
		padding: 0 1.25rem 1.25rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.modal__field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.85rem;
	}

	.modal__input {
		background: rgba(15, 23, 42, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0.5rem;
		padding: 0.5rem 0.65rem;
		color: #f8fafc;
		outline: none;
	}

	.modal__fieldset {
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
		padding: 1rem;
	}

	.modal__fieldset legend {
		font-size: 0.9rem;
		padding: 0 0.35rem;
		opacity: 0.8;
	}

	.modal__csv-actions {
			display: flex;
			flex-wrap: wrap;
			gap: 0.75rem;
			align-items: center;
	}

	.modal__hint {
		font-size: 0.75rem;
		color: rgba(248, 250, 252, 0.6);
		margin-bottom: 0.5rem;
	}

	.modal__sample-link {
			display: inline-flex;
			align-items: center;
			gap: 0.45rem;
			border-radius: 0.5rem;
			border: 1px solid rgba(59, 130, 246, 0.5);
			background: rgba(59, 130, 246, 0.18);
			color: #f8fafc;
			font-size: 0.85rem;
			padding: 0.5rem 0.95rem;
			text-decoration: none;
			transition: border-color 160ms ease, background-color 160ms ease, transform 160ms ease;
	}

	.modal__sample-link:hover {
			border-color: rgba(59, 130, 246, 0.75);
			background: rgba(59, 130, 246, 0.28);
			transform: translateY(-1px);
	}
	
	.modal__sample-link span[aria-hidden='true'] {
			font-size: 1rem;
	}

	.modal__csv-hint {
			font-size: 0.75rem;
			color: rgba(248, 250, 252, 0.72);
	}


	.csv-guidance {
		border: 1px solid rgba(148, 163, 184, 0.2);
		border-radius: 0.75rem;
		background: rgba(15, 23, 42, 0.75);
		overflow: hidden;
	}

	.csv-guidance__table-wrapper {
		overflow-x: auto;
	}

	.csv-guidance__table {
		width: 100%;
		border-collapse: collapse;
	}

	.csv-guidance__table th,
	.csv-guidance__table td {
		padding: 0.65rem 0.85rem;
		font-size: 0.8rem;
		color: rgba(248, 250, 252, 0.85);
	}

	.csv-guidance__table th {
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-size: 0.7rem;
		color: rgba(248, 250, 252, 0.6);
		background: rgba(148, 163, 184, 0.15);
		border-bottom: 1px solid rgba(148, 163, 184, 0.2);
	}

	.csv-guidance__table td {
		border-top: 1px solid rgba(148, 163, 184, 0.18);
		vertical-align: top;
	}

	.csv-guidance__th-format {
		width: 24%;
	}

	.csv-guidance__table tbody tr:first-child td,
	.csv-guidance__section-header + tr td,
	.csv-guidance__section-note + tr td {
		border-top: none;
	}

	.csv-guidance__codes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.csv-guidance__codes code {
		background: rgba(15, 23, 42, 0.75);
		border: 1px solid rgba(148, 163, 184, 0.35);
		border-radius: 0.35rem;
		padding: 0.15rem 0.45rem;
		font-size: 0.75rem;
		color: rgba(226, 232, 240, 0.95);
	}

	.csv-guidance__required-tag {
		display: inline-flex;
		margin-top: 0.4rem;
	}

	.csv-guidance__format {
		font-size: 0.75rem;
		color: rgba(148, 163, 184, 0.85);
	}

	.csv-guidance__description {
		font-size: 0.8rem;
		color: rgba(226, 232, 240, 0.9);
		line-height: 1.5;
	}

	.csv-guidance__section-header th {
		padding: 0;
		border-top: 1px solid rgba(148, 163, 184, 0.2);
		background: rgba(148, 163, 184, 0.12);
	}

	.csv-guidance__table tbody:first-of-type .csv-guidance__section-header th {
		border-top: none;
	}

	.csv-guidance__section-toggle {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 0.85rem;
		background: transparent;
		border: none;
		color: rgba(226, 232, 240, 0.92);
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		cursor: pointer;
	}

	.csv-guidance__section-toggle span[aria-hidden='true'] {
		font-size: 1rem;
	}

	.csv-guidance__section-toggle:focus-visible {
		outline: 2px solid rgba(191, 219, 254, 0.8);
		outline-offset: 2px;
	}

	.csv-guidance__section-note td {
		font-size: 0.75rem;
		color: rgba(191, 219, 254, 0.92);
		background: rgba(59, 130, 246, 0.12);
		border-top: 1px solid rgba(59, 130, 246, 0.25);
	}

	.csv-guidance__section--metrics tr:not(.csv-guidance__section-header) td {
		background: rgba(59, 130, 246, 0.08);
	}

	.csv-guidance__section--optional tr:not(.csv-guidance__section-header) td {
		background: rgba(139, 92, 246, 0.08);
	}

	.csv-guidance__section--optional .csv-guidance__section-note td {
		background: rgba(139, 92, 246, 0.14);
		border-top-color: rgba(139, 92, 246, 0.28);
		color: rgba(224, 231, 255, 0.95);
	}

	.csv-guidance__tips {
		margin: 0;
		padding-left: 1.25rem;
		font-size: 0.75rem;
		color: rgba(226, 232, 240, 0.7);
	}

	.csv-guidance__tips li + li {
		margin-top: 0.35rem;
	}

	.csv-guidance__download {
		align-self: flex-start;
		margin-top: 0.5rem;
		background: rgba(59, 130, 246, 0.18);
		border: 1px solid rgba(59, 130, 246, 0.35);
		color: rgba(191, 219, 254, 0.95);
		border-radius: 0.5rem;
		padding: 0.45rem 0.85rem;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.csv-guidance__download:hover {
		background: rgba(59, 130, 246, 0.28);
		border-color: rgba(59, 130, 246, 0.55);
		color: #fff;
	}

	.csv-guidance__download:focus-visible {
		outline: 2px solid rgba(191, 219, 254, 0.8);
		outline-offset: 2px;
	}

	@media (max-width: 640px) {
		.csv-guidance__table th,
		.csv-guidance__table td {
			padding: 0.55rem 0.65rem;
		}
	}

	.modal__dropzone {
		margin-top: 0.5rem;
		border: 2px dashed rgba(255, 255, 255, 0.16);
		border-radius: 0.75rem;
		padding: 1.5rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: center;
		color: rgba(248, 250, 252, 0.85);
	}

	.modal__dropzone input[type='file'] {
		display: none;
	}

	.modal__dropzone span {
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.modal__selected-file {
		margin-top: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		border: 1px solid rgba(148, 163, 184, 0.25);
		background: rgba(148, 163, 184, 0.18);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.modal__selected-file-summary {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.modal__selected-file-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: rgba(248, 250, 252, 0.6);
	}

	.modal__selected-file-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: #f8fafc;
		word-break: break-all;
	}

	.modal__selected-file-clear {
		background: transparent;
		border: 1px solid rgba(248, 113, 113, 0.55);
		color: rgba(248, 113, 113, 0.9);
		border-radius: 999px;
		width: 1.75rem;
		height: 1.75rem;
		line-height: 1;
		font-size: 1rem;
		display: grid;
		place-items: center;
		cursor: pointer;
	}

	.modal__selected-file-clear[disabled] {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.modal__progress {
		margin-top: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		border: 1px solid rgba(59, 130, 246, 0.35);
		background: rgba(59, 130, 246, 0.12);
	}

	.modal__progress-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.8rem;
		color: rgba(248, 250, 252, 0.85);
	}

	.modal__progress-bar {
		position: relative;
		width: 100%;
		height: 0.5rem;
		border-radius: 999px;
		background: rgba(148, 163, 184, 0.25);
		overflow: hidden;
	}

	.modal__progress-value {
		height: 100%;
		width: 0;
		background: rgba(59, 130, 246, 0.9);
		transition: width 160ms ease;
	}

	.modal__progress-detail {
		font-size: 0.75rem;
		color: rgba(248, 250, 252, 0.7);
	}

	.modal__error {
		background: rgba(248, 113, 113, 0.15);
		border: 1px solid rgba(248, 113, 113, 0.35);
		color: #fecaca;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.85rem;
	}

	.modal__footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding-top: 0.25rem;
	}

	.modal__secondary,
	.modal__primary {
		border-radius: 0.5rem;
		padding: 0.55rem 1.15rem;
		font-size: 0.9rem;
		border: 1px solid transparent;
		cursor: pointer;
	}

	.modal__secondary {
		background: transparent;
		border-color: rgba(255, 255, 255, 0.18);
		color: rgba(248, 250, 252, 0.8);
	}

	.modal__primary {
		background: rgba(59, 130, 246, 0.9);
		border-color: rgba(59, 130, 246, 0.9);
		color: #fff;
	}

	.modal__primary[disabled] {
		opacity: 0.6;
		cursor: progress;
	}

	.required {
		color: rgba(248, 113, 113, 0.85);
		font-weight: 500;
		font-size: 0.75rem;
	}
</style>
