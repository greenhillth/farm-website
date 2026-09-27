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
