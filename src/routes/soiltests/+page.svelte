<script lang="ts">
  import { onMount } from 'svelte';
  import Panel from '$lib/components/Panel.svelte';
  import CONFIG from '$lib/config';

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
    client: '',
  };

  let manualMetrics: Record<MetricKey, string> = {
    P: '',
    K: '',
    Ca: '',
    Mg: '',
    S: '',
    Na: '',
    pH: '',
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
    pH: 'e.g. 5.9',
  };

  const uploadEndpoints = {
    /**
     * POST /api/tests/manual
     * Body JSON schema suggestion:
     * {
     *   "fieldId": string,
     *   "sampleName": string,
     *   "sampleId"?: string,
     *   "sampleDate": string (ISO 8601),
     *   "client"?: string,
     *   "metrics": { "P"?: number, "K"?: number, "Ca"?: number, "Mg"?: number, "S"?: number, "Na"?: number, "pH"?: number }
     * }
     */
    manual: '/api/tests/manual',
    /**
     * POST /api/tests/import
     * Multipart form-data with field `file` containing a CSV.
     * Optional query params: ?onDuplicate=skip|replace etc.
     */
    csv: '/api/tests/import',
  } as const;

  const numberFormat = new Intl.NumberFormat('en-AU', {
    maximumFractionDigits: 2,
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
      day: 'numeric',
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
      client: '',
    };
    manualMetrics = {
      P: '',
      K: '',
      Ca: '',
      Mg: '',
      S: '',
      Na: '',
      pH: '',
    };
  }

  function openUploader(mode: 'manual' | 'csv' = 'manual') {
    if (!showUploader && mode === 'manual') resetManualForm();
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
  }

  function closeUploader() {
    showUploader = false;
    submitting = false;
    uploadError = null;
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
        metrics: preparedMetrics,
      };

      console.info('POST to', uploadEndpoints.manual, payload);
      await fetch(uploadEndpoints.manual, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    const data = new FormData(form);
    const file = data.get('file');
    if (!(file instanceof File) || !file.size) {
      uploadError = 'Please choose a CSV file to upload.';
      return;
    }

    submitting = true;
    uploadError = null;
    try {
      console.info('POST to', uploadEndpoints.csv, 'with file', file.name);
      // TODO: await fetch(uploadEndpoints.csv, { method: 'POST', body: data });
      closeUploader();
      form.reset();
    } catch (err) {
      uploadError = err instanceof Error ? err.message : 'Failed to upload CSV';
    } finally {
      submitting = false;
    }
  }

  onMount(async () => {
    loading = true;
    try {
      const [testsRes, paddocksRes] = await Promise.all([
        fetch(CONFIG.data.tests),
        fetch(CONFIG.data.farm),
      ]);

      if (!testsRes.ok) throw new Error(`Tests request failed (${testsRes.status})`);
      if (!paddocksRes.ok)
        throw new Error(`Paddock lookup failed (${paddocksRes.status})`);

      const [testsJson, paddocksJson] = await Promise.all([
        testsRes.json(),
        paddocksRes.json(),
      ]);

      const paddockLookup = new Map<string, { name: string; farm?: string }>();
      for (const feature of paddocksJson?.features ?? []) {
        const props = feature?.properties ?? {};
        const id = normalisePaddockId(
          props.fieldID ?? props.ADSFLDID ?? props.FIELDID ?? props.id
        );
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
            pH: toNumber(row.ph_water ?? row.pH ?? row.PH),
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
            metrics,
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

  $: filtered = q
    ? tests.filter((test) => {
        const haystack = `${test.paddockName} ${test.fieldId} ${test.sampleName ?? ''} ${
          test.sampleId ?? ''
        } ${test.farm ?? ''}`.toLowerCase();
        return haystack.includes(q.toLowerCase());
      })
    : tests;
</script>

<header class="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
  <a href="/" class="text-sm text-muted hover:text-white">&larr; Back to home</a>
  <div class="text-xs text-muted">Soil Tests</div>
</header>

<main class="container mx-auto px-4 pb-8 space-y-5">
  <Panel title="Soil tests">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
      <input
        placeholder="Search by paddock or sample…"
        bind:value={q}
        class="w-full sm:max-w-md rounded-md border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
      />
      <div class="flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>Showing {filtered.length} of {tests.length} samples</span>
        <button type="button" on:click={() => openUploader('manual')}
          class="rounded-md border border-border bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-accent/40">
          Add soil test
        </button>
      </div>
    </div>

    {#if loading}
      <div class="text-sm text-muted">Loading soil tests…</div>
    {:else if error}
      <div class="text-sm text-red-400">{error}</div>
    {:else}
      {#if filtered.length === 0}
        <div class="text-sm text-muted">No samples match your search.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-muted border-b border-border/60">
              <tr>
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
                <tr class="border-b border-border/40 hover:bg-white/5">
                  <td class="py-2 pr-4">
                    <div class="flex flex-col text-sm">
                      <span class="font-medium text-white">{test.sampleName ?? 'Unnamed sample'}</span>
                      {#if test.sampleId}
                        <span class="text-xs text-muted">Sample ID {test.sampleId}</span>
                      {/if}
                    </div>
                  </td>
                  <td class="py-2 pr-4">
                    <div class="flex flex-col">
                      <span>{test.paddockName}</span>
                      <span class="text-xs text-muted">Field ID {test.fieldId}</span>
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
        <button type="button"
          class={`modal__tab ${uploadMode === 'manual' ? 'active' : ''}`}
          on:click={() => changeUploadMode('manual')}
        >Manual entry</button>
        <button type="button"
          class={`modal__tab ${uploadMode === 'csv' ? 'active' : ''}`}
          on:click={() => changeUploadMode('csv')}
        >Upload CSV</button>
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
            <p class="modal__hint">Enter at least one metric value (currently {manualMetricCount} selected).</p>
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
        <form class="modal__body" on:submit={handleCsvSubmit}>
          <p class="text-sm text-muted">
            Upload a CSV exported from the lab. Expected headers include <code>fieldID</code>,
            <code>name_sample</code>, <code>sample_date</code>, and metric columns such as
            <code>P</code>, <code>K</code>, <code>Ca</code>, <code>Mg</code>, <code>S</code>, <code>Na</code>, <code>ph_water</code>.
          </p>
          <p class="text-xs text-muted">
            The file will be POSTed to <code>{uploadEndpoints.csv}</code> as <code>multipart/form-data</code> with the file field named <code>file</code>.
          </p>
          <label class="modal__dropzone">
            <input type="file" accept=".csv" name="file" required />
            <span>Choose CSV file</span>
          </label>
          {#if uploadError}
            <div class="modal__error">{uploadError}</div>
          {/if}
          <footer class="modal__footer">
            <button type="button" on:click={closeUploader} class="modal__secondary">Cancel</button>
            <button type="submit" class="modal__primary" disabled={submitting}>
              {submitting ? 'Uploading…' : 'Upload CSV'}
            </button>
          </footer>
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
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
