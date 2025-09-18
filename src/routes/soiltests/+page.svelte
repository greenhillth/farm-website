<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Panel from '$lib/components/Panel.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import CONFIG from '$lib/config';
	import { uploadEndpoint } from '$lib/utils';

	const metricColumns = [
		{ key: 'P', label: 'P' },
		{ key: 'K', label: 'K' },
		{ key: 'Ca', label: 'Ca' },
		{ key: 'Mg', label: 'Mg' },
		{ key: 'S', label: 'S' },
		{ key: 'Na', label: 'Na' },
		{ key: 'pH', label: 'pH (H2O)' }
	] as const;

	type MetricKey = (typeof metricColumns)[number]['key'];

	type SoilTest = {
		id: number;
		fieldId: string;
		paddockName: string;
		farm?: string;
		sampleId?: string | null;
		sampleName?: string | null;
		sampleDate?: string | null;
		client?: string | null;
		metrics: Partial<Record<MetricKey, number>>;
	};

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

	type ToastVariant = 'success' | 'error' | 'warning';
	type Toast = { id: number; message: string; variant: ToastVariant };

	let toasts: Toast[] = [];
	let toastCounter = 0;
	const toastTimeouts = new Map<number, ReturnType<typeof setTimeout>>();
	const toastClassByVariant: Record<ToastVariant, string> = {
		success: 'border-green-400/40 bg-green-500/10 text-green-100',
		warning: 'border-amber-400/40 bg-amber-500/15 text-amber-100',
		error: 'border-red-500/50 bg-red-500/15 text-red-100'
	};

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

	type BulkDeleteResponse = {
		deleted?: number;
		ids?: SoilTest['id'][];
		failedIds?: SoilTest['id'][];
	};

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

	type CsvProgressStage =
		| 'idle'
		| 'uploading'
		| 'queued'
		| 'parsing'
		| 'importing'
		| 'complete'
		| 'error';

	type CsvProgressState = {
		visible: boolean;
		stage: CsvProgressStage;
		percent: number;
		message: string;
		detail?: string | null;
	};

	type CsvProgressUpdate = {
		jobId?: string;
		stage: CsvProgressStage;
		percent?: number;
		message?: string;
		detail?: string | null;
	};

	const CSV_PROGRESS_EVENT_NAME = 'farm:csv-import-progress';

	const csvStageDefaults: Record<CsvProgressStage, { label: string; percent: number }> = {
		idle: { label: 'Waiting to upload CSV', percent: 0 },
		uploading: { label: 'Uploading CSV file…', percent: 10 },
		queued: { label: 'Queued for processing…', percent: 25 },
		parsing: { label: 'Parsing CSV data…', percent: 50 },
		importing: { label: 'Importing soil tests…', percent: 75 },
		complete: { label: 'Import complete', percent: 100 },
		error: { label: 'Import failed', percent: 100 }
	};

	let csvProgress: CsvProgressState = {
		visible: false,
		stage: 'idle',
		percent: csvStageDefaults.idle.percent,
		message: csvStageDefaults.idle.label,
		detail: null
	};

	let csvProgressPercent = csvStageDefaults.idle.percent;
	$: csvProgressPercent = Math.min(100, Math.max(0, csvProgress.percent));

	let activeCsvJobId: string | null = null;

	type ManualForm = {
		fieldId: string;
		sampleName: string;
		sampleId: string;
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

	let manualMetrics: Record<MetricKey, string> = {
		P: '',
		K: '',
		Ca: '',
		Mg: '',
		S: '',
		Na: '',
		pH: ''
	};

	let manualMetricCount = 0;

	$: manualMetricCount = metricColumns.reduce((count, { key }) => {
		const value = manualMetrics[key];
		return value && value.trim() ? count + 1 : count;
	}, 0);

	const metricPlaceholders: Record<MetricKey, string> = {
		P: 'e.g. 56.7',
		K: 'e.g. 562.8',
		Ca: 'e.g. 2595.7',
		Mg: 'e.g. 305',
		S: 'e.g. 26.3',
		Na: 'e.g. 98.5',
		pH: 'e.g. 5.9'
	};

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

	function handleCsvProgressUpdate(update: CsvProgressUpdate) {
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
		}
	}

	/**
	 * CSV import progress events are expected to be dispatched by the backend.
	 * Once the POST /api/soil-tests/import endpoint returns a tracking ID, open an
	 * SSE or WebSocket connection and dispatch CustomEvents named
	 * `farm:csv-import-progress` with a {@link CsvProgressUpdate} payload.
	 *
	 * Example (while backend integration is pending):
	 * `window.dispatchEvent(new CustomEvent(CSV_PROGRESS_EVENT_NAME, { detail: { jobId, stage: 'parsing', percent: 50 } }))`
	 */
	function onCsvProgressEvent(event: Event) {
		const customEvent = event as CustomEvent<CsvProgressUpdate>;
		if (!customEvent.detail) return;
		handleCsvProgressUpdate(customEvent.detail);
	}

	const numberFormat = new Intl.NumberFormat('en-AU', {
		maximumFractionDigits: 2
	});

	const toNumber = (value: unknown) => {
		const num = Number(value);
		return Number.isFinite(num) ? num : undefined;
	};

	function formatNumber(value: number | undefined) {
		return value === undefined ? '-' : numberFormat.format(value);
	}

	function formatDate(value: string | null | undefined) {
		if (!value) return '-';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return date.toLocaleDateString('en-AU', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function normalisePaddockId(value: unknown) {
		return value ? String(value) : '';
	}

	function resetManualForm() {
		manualForm = {
			fieldId: '',
			sampleName: '',
			sampleId: '',
			sampleDate: '',
			client: ''
		};
		manualMetrics = {
			P: '',
			K: '',
			Ca: '',
			Mg: '',
			S: '',
			Na: '',
			pH: ''
		};
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

	async function handleManualSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		uploadError = null;
		try {
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
				fieldId: manualForm.fieldId.trim(),
				sampleName: manualForm.sampleName.trim(),
				sampleId: manualForm.sampleId.trim() || undefined,
				sampleDate: manualForm.sampleDate,
				client: manualForm.client.trim() || undefined,
				metrics: preparedMetrics
			};
			const endpoint = uploadEndpoint('manual');

			console.info('POST to', endpoint, payload);
			await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			closeUploader();
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
			handleCsvProgressUpdate({ stage: 'error', message, detail: message, jobId });
		}
	}

	onMount(async () => {
		loading = true;
		try {
			const [testsRes, paddocksRes] = await Promise.all([
				fetch(CONFIG.backend.latestTest),
				fetch(CONFIG.backend.farm)
			]);

			if (!testsRes.ok) throw new Error(`Tests request failed (${testsRes.status})`);
			if (!paddocksRes.ok) throw new Error(`Paddock lookup failed (${paddocksRes.status})`);

			const [testsJson, paddocksJson] = await Promise.all([testsRes.json(), paddocksRes.json()]);

			const paddockLookup = new Map<string, { name: string; farm?: string }>();
			for (const feature of paddocksJson?.features ?? []) {
				const props = feature?.properties ?? {};
				const id = normalisePaddockId(props.fieldID ?? props.ADSFLDID ?? props.FIELDID ?? props.id);
				if (!id) continue;
				const name = String(props.fieldName ?? props.FIELDNAME ?? 'Unnamed paddock');
				const farm = props.FARM ? String(props.FARM) : undefined;
				paddockLookup.set(id, { name, farm });
			}

			tests = (testsJson ?? [])
				.map((row: any) => {
					const fieldId = normalisePaddockId(row.fieldID);
					const paddock = paddockLookup.get(fieldId);
					const metrics: SoilTest['metrics'] = {
						P: toNumber(row.P ?? row.p),
						K: toNumber(row.K ?? row.k),
						Ca: toNumber(row.Ca ?? row.CA),
						Mg: toNumber(row.Mg ?? row.MG),
						S: toNumber(row.S ?? row.s),
						Na: toNumber(row.Na ?? row.NA ?? row.sodium),
						pH: toNumber(row.ph_water ?? row.pH ?? row.PH)
					};

					return {
						id: Number(row.id ?? 0),
						fieldId,
						paddockName: paddock?.name ?? 'Unknown paddock',
						farm: paddock?.farm ?? (row.farm ? String(row.farm) : undefined),
						sampleId: row.id_sample ?? null,
						sampleName: row.name_sample ?? null,
						sampleDate: row.sample_date ?? null,
						client: row.client ?? null,
						metrics
					} satisfies SoilTest;
				})
				.sort((a: SoilTest, b: SoilTest) => {
					const aDate = a.sampleDate ? new Date(a.sampleDate).getTime() : 0;
					const bDate = b.sampleDate ? new Date(b.sampleDate).getTime() : 0;
					return bDate - aDate;
				});
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed loading soil tests';
		} finally {
			loading = false;
		}
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
				const haystack = `${test.paddockName} ${test.fieldId} ${test.sampleName ?? ''} ${
					test.sampleId ?? ''
				} ${test.farm ?? ''}`.toLowerCase();
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
								bind:value={manualForm.fieldId}
								required
								class="modal__input"
								placeholder="e.g. 4251583"
							/>
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
							<span>Sample ID</span>
							<input
								type="text"
								bind:value={manualForm.sampleId}
								class="modal__input"
								placeholder="Lab ref (optional)"
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
						Upload a CSV exported from the lab. Expected headers include <code>fieldID</code>,
						<code>name_sample</code>, <code>sample_date</code>, and metric columns such as
						<code>P</code>, <code>K</code>, <code>Ca</code>, <code>Mg</code>, <code>S</code>,
						<code>Na</code>, <code>ph_water</code>.
					</p>
					<p class="text-muted text-xs">
						The file will be POSTed to <code>{uploadEndpoint('import')}</code> as
						<code>multipart/form-data</code>
						with the file field named <code>file</code>.
					</p>
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
		max-height: min(90dvh, 46rem);
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

	.modal__hint {
		font-size: 0.75rem;
		color: rgba(248, 250, 252, 0.6);
		margin-bottom: 0.5rem;
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
