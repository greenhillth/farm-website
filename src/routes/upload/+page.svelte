<script lang="ts">
	let file: File | null = null;
	let docType = 'timesheet';
	let previewImg = '/img/sample-timesheet.png';
	let message = '';

	function onTypeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		docType = target.value;
		previewImg = `/img/sample-${docType}.png`;
	}

	async function submit() {
		if (!file) {
			message = 'Please select a file.';
			return;
		}
		const formData = new FormData();
		formData.append('file', file);
		formData.append('type', docType);
		try {
			const res = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});
			message = res.ok ? 'Upload successful.' : 'Upload failed.';
		} catch {
			message = 'Upload failed.';
		}
	}
</script>

<main class="container mx-auto space-y-4 p-4">
	<h1 class="text-xl font-semibold">Data Upload</h1>
	<div class="max-w-md space-y-4">
		<div>
			<label for="docType" class="mb-1 block text-sm">Document type</label>
			<select
				id="docType"
				class="bg-panel border-border w-full rounded border p-2"
				bind:value={docType}
				on:change={onTypeChange}
			>
				<option value="timesheet">Timesheet Logs</option>
				<option value="soiltest">Soil Test Results</option>
			</select>
		</div>
		<div>
			<label for="csvFile" class="mb-1 block text-sm">CSV file</label>
			<input
				id="csvFile"
				type="file"
				accept=".csv"
				class="w-full"
				on:change={(e) => (file = e.currentTarget.files?.[0] ?? null)}
			/>
		</div>
		{#if previewImg}
			<div>
				<img src={previewImg} alt="Sample" class="border-border border" />
			</div>
		{/if}
		<button class="bg-accent rounded px-4 py-2 text-white" on:click={submit}>Upload</button>
		{#if message}
			<p class="text-sm">{message}</p>
		{/if}
	</div>
</main>
