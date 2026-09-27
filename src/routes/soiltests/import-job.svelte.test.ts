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
