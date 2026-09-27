### Task 4: Import job and toasts as classes

**Files:**

- Create: `src/routes/soiltests/import-job.svelte.ts`
- Create: `src/routes/soiltests/import-job.svelte.test.ts`
- Create: `src/routes/soiltests/toasts.svelte.ts`

**Interfaces:**

- Consumes: `CONFIG.backend.upload.test.import`, `.status(jobId)`, `.cancel(jobId)`; `csvStageDefaults`, `CsvProgressUpdate` from `$lib/soil-tests/progress`.
- Produces (`import-job.svelte.ts`):
  - `type OnDuplicate = 'skip' | 'replace'`
  - `class ImportJob` with `$state` fields `stage: string`, `percent: number`, `message: string`, `detail: string | null`, `inserted: number`, `skipped: number`, `error: string | null`, `jobId: string | null`; getter `running: boolean` (uploading, queued, parsing or importing); methods `start(file: File, onDuplicate?: OnDuplicate): Promise<void>`, `apply(update: StatusPayload | null): void`, `cancel(): Promise<void>`, `stop(): void`, `reset(): void`. Constructor options `{ fetch?: typeof fetch; minDelayMs?: number; defaultDelayMs?: number }` (tests pass 0 delays).
- Produces (`toasts.svelte.ts`): `type ToastVariant = 'success' | 'error' | 'warning'`, `type Toast = { id: number; message: string; variant: ToastVariant }`, `class Toaster` with `items: Toast[]` (`$state`), `show(message, variant?)`, `dismiss(id)`, `destroy()`.

- [ ] **Step 1: Write the failing tests**

Create `src/routes/soiltests/import-job.svelte.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { ImportJob } from './import-job.svelte';

const file = new File(['id_sample\n1'], 'tests.csv', { type: 'text/csv' });

function stubFetch(responses: Record<string, (() => Response)[]>) {
	return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		const key = `${init?.method ?? 'GET'} ${url.split('?')[0]}`;
		const next = responses[key]?.shift();
		if (!next) throw new Error(`Unexpected request: ${key}`);
		return next();
	});
}

const newJob = (fetch: typeof globalThis.fetch) =>
	new ImportJob({ fetch, minDelayMs: 0, defaultDelayMs: 0 });

describe('ImportJob', () => {
	it('uploads with the duplicate choice and polls until complete', async () => {
		const fetch = stubFetch({
			'POST /api/soil-tests/import': [
				() => Response.json({ jobId: 'j1', stage: 'queued' }, { status: 202 })
			],
			'GET /api/soil-tests/import/j1/status': [
				() => Response.json({ jobId: 'j1', stage: 'parsing', percent: 50 }),
				() => Response.json({ jobId: 'j1', stage: 'complete', inserted: 46, skipped: 2 })
			]
		});
		const job = newJob(fetch);

		await job.start(file, 'replace');
		await vi.waitFor(() => expect(job.stage).toBe('complete'));

		expect(String(fetch.mock.calls[0][0])).toBe('/api/soil-tests/import?onDuplicate=replace');
		expect(job.inserted).toBe(46);
		expect(job.skipped).toBe(2);
		expect(job.running).toBe(false);
	});

	it('shows the backend’s reason when the upload is refused', async () => {
		const job = newJob(
			stubFetch({
				'POST /api/soil-tests/import': [
					() => Response.json({ detail: "CSV missing 'fieldID' column" }, { status: 400 })
				]
			})
		);

		await job.start(file);
		expect(job.stage).toBe('error');
		expect(job.error).toBe("CSV missing 'fieldID' column");
	});

	it('stops polling and explains when the job disappears', async () => {
		const fetch = stubFetch({
			'POST /api/soil-tests/import': [() => Response.json({ jobId: 'j2', stage: 'queued' })],
			'GET /api/soil-tests/import/j2/status': [() => new Response('gone', { status: 404 })]
		});
		const job = newJob(fetch);

		await job.start(file);
		await vi.waitFor(() => expect(job.stage).toBe('error'));
		expect(job.error).toBe('The import job was not found. It may have expired.');
		await new Promise((done) => setTimeout(done, 20));
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it('reports a job that ends in error with its message', async () => {
		const job = newJob(
			stubFetch({
				'POST /api/soil-tests/import': [() => Response.json({ jobId: 'j3', stage: 'queued' })],
				'GET /api/soil-tests/import/j3/status': [
					() =>
						Response.json({
							jobId: 'j3',
							stage: 'error',
							detail: 'Row 5: unknown fieldID',
							error: { code: 'invalid', message: 'Row 5: unknown fieldID' }
						})
				]
			})
		);

		await job.start(file);
		await vi.waitFor(() => expect(job.error).toBe('Row 5: unknown fieldID'));
	});

	it('cancels a running job on the server', async () => {
		const fetch = stubFetch({
			'POST /api/soil-tests/import': [() => Response.json({ jobId: 'j4', stage: 'queued' })],
			'GET /api/soil-tests/import/j4/status': Array.from(
				{ length: 50 },
				() => () => Response.json({ jobId: 'j4', stage: 'importing' })
			),
			'DELETE /api/soil-tests/import/j4': [
				() => Response.json({ cancelled: true }, { status: 202 })
			]
		});
		const job = newJob(fetch);

		await job.start(file);
		expect(job.running).toBe(true);
		await job.cancel();

		expect(fetch.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true);
		expect(job.stage).toBe('idle');
	});
});
```

Run: `npx vitest run --project client src/routes/soiltests/import-job.svelte.test.ts`
Expected: FAIL, cannot resolve `./import-job.svelte`.

- [ ] **Step 2: Create `src/routes/soiltests/import-job.svelte.ts`**

This is the old page's `handleCsvSubmit`, `pollImportJob`, `startProgressPolling`, `stopProgressPolling` and `handleCsvProgressUpdate` gathered into one class. It now sends `?onDuplicate=` and keeps the job's `inserted`/`skipped` counts.

```ts
import CONFIG from '$lib/config';
import {
	csvStageDefaults,
	type CsvProgressStage,
	type CsvProgressUpdate
} from '$lib/soil-tests/progress';

export type OnDuplicate = 'skip' | 'replace';

type StatusPayload = Partial<CsvProgressUpdate> & {
	stage?: string;
	pollAfterMs?: number;
	inserted?: number;
	skipped?: number;
	error?: { code?: string | null; message?: string | null } | null;
};

type Options = { fetch?: typeof fetch; minDelayMs?: number; defaultDelayMs?: number };

const RUNNING = new Set(['uploading', 'queued', 'parsing', 'importing']);

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
	try {
		const body = await response.json();
		return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

/** FastAPI puts its reason in `detail`; older endpoints use `message`. */
function reason(body: Record<string, unknown> | null): string | null {
	const value = body?.detail ?? body?.message;
	return typeof value === 'string' && value.trim() ? value : null;
}

export class ImportJob {
	stage = $state('idle');
	percent = $state(0);
	message = $state(csvStageDefaults.idle.label);
	detail = $state<string | null>(null);
	inserted = $state(0);
	skipped = $state(0);
	error = $state<string | null>(null);
	jobId = $state<string | null>(null);

	#fetch: typeof fetch;
	#minDelay: number;
	#defaultDelay: number;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#abort: AbortController | null = null;

	constructor({
		fetch: fetchFn = (...args) => fetch(...args),
		minDelayMs = 500,
		defaultDelayMs = 2000
	}: Options = {}) {
		this.#fetch = fetchFn;
		this.#minDelay = minDelayMs;
		this.#defaultDelay = defaultDelayMs;
	}

	get running(): boolean {
		return RUNNING.has(this.stage);
	}

	async start(file: File, onDuplicate: OnDuplicate = 'skip') {
		this.stop();
		this.reset();
		this.apply({ stage: 'uploading', message: `Uploading ${file.name}…` });
		const controller = new AbortController();
		this.#abort = controller;
		const body = new FormData();
		body.append('file', file);

		try {
			const response = await this.#fetch(
				`${CONFIG.backend.upload.test.import}?onDuplicate=${onDuplicate}`,
				{ method: 'POST', body, signal: controller.signal }
			);
			const payload = await readJson(response);
			if (!response.ok) throw new Error(reason(payload) ?? `Upload failed (${response.status}).`);
			this.jobId = typeof payload?.jobId === 'string' ? payload.jobId : null;
			if (!this.jobId) throw new Error('The server didn’t start an import job.');
			this.apply(payload as StatusPayload);
			if (this.running) this.#schedule(payload?.pollAfterMs);
		} catch (err) {
			if (!controller.signal.aborted) this.#fail(err);
		}
	}

	/** Applies a status update; the page's `farm:csv-import-progress` listener calls this too. */
	apply(update: StatusPayload | null) {
		if (!update) return;
		if (update.jobId && this.jobId && update.jobId !== this.jobId) return;
		const stage = update.stage ?? 'queued';
		const defaults = csvStageDefaults[stage as CsvProgressStage] ?? csvStageDefaults.queued;
		this.stage = stage;
		this.percent = Math.min(100, Math.max(0, update.percent ?? defaults.percent));
		this.message = update.message ?? defaults.label;
		this.detail = update.detail ?? null;
		if (typeof update.inserted === 'number') this.inserted = update.inserted;
		if (typeof update.skipped === 'number') this.skipped = update.skipped;
		if (stage === 'error') {
			this.error = update.error?.message ?? update.detail ?? update.message ?? 'The import failed.';
		}
		if (!this.running) this.#clearTimer();
	}

	async cancel() {
		const id = this.jobId;
		this.stop();
		if (id) {
			try {
				await this.#fetch(CONFIG.backend.upload.test.cancel(id), { method: 'DELETE' });
			} catch {
				// The job may already be finished or gone; there's nothing more to do.
			}
		}
		this.reset();
	}

	stop() {
		this.#clearTimer();
		this.#abort?.abort();
		this.#abort = null;
	}

	reset() {
		this.stop();
		this.stage = 'idle';
		this.percent = 0;
		this.message = csvStageDefaults.idle.label;
		this.detail = null;
		this.inserted = 0;
		this.skipped = 0;
		this.error = null;
		this.jobId = null;
	}

	async #poll() {
		const id = this.jobId;
		const controller = this.#abort;
		if (!id || !controller) return;
		try {
			const response = await this.#fetch(CONFIG.backend.upload.test.status(id), {
				signal: controller.signal
			});
			const payload = await readJson(response);
			if (!response.ok) {
				if (response.status === 404 || response.status === 410) {
					throw new Error('The import job was not found. It may have expired.');
				}
				throw new Error(reason(payload) ?? `Progress request failed (${response.status}).`);
			}
			this.apply(payload as StatusPayload);
			if (this.running) this.#schedule(payload?.pollAfterMs);
		} catch (err) {
			if (!controller.signal.aborted) this.#fail(err);
		}
	}

	#schedule(pollAfterMs: unknown) {
		this.#clearTimer();
		const delay =
			typeof pollAfterMs === 'number' ? Math.max(this.#minDelay, pollAfterMs) : this.#defaultDelay;
		this.#timer = setTimeout(() => void this.#poll(), delay);
	}

	#clearTimer() {
		clearTimeout(this.#timer);
		this.#timer = undefined;
	}

	#fail(err: unknown) {
		const message = err instanceof Error ? err.message : 'The import failed.';
		this.stop();
		this.apply({ stage: 'error', message, detail: message });
		this.error = message;
	}
}
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run --project client src/routes/soiltests/import-job.svelte.test.ts`
Expected: PASS.

- [ ] **Step 4: Create `src/routes/soiltests/toasts.svelte.ts`**

The old page's `showToast`/`dismissToast` as a class.

```ts
export type ToastVariant = 'success' | 'error' | 'warning';
export type Toast = { id: number; message: string; variant: ToastVariant };

export class Toaster {
	items = $state<Toast[]>([]);

	#next = 0;
	#timers: Record<number, ReturnType<typeof setTimeout>> = {};

	show(message: string, variant: ToastVariant = 'success') {
		const id = ++this.#next;
		this.items.push({ id, message, variant });
		this.#timers[id] = setTimeout(() => this.dismiss(id), 5000);
	}

	dismiss(id: number) {
		clearTimeout(this.#timers[id]);
		delete this.#timers[id];
		this.items = this.items.filter((toast) => toast.id !== id);
	}

	destroy() {
		for (const timer of Object.values(this.#timers)) clearTimeout(timer);
		this.#timers = {};
	}
}
```

Run `npm run check`. Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/soiltests/import-job.svelte.ts src/routes/soiltests/import-job.svelte.test.ts src/routes/soiltests/toasts.svelte.ts
git commit -m "Move CSV import polling and toasts into rune classes"
```

---

