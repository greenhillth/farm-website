## API contracts

### `POST /api/tests/import`

- **Purpose**: accept the CSV and enqueue a background import job.
- **Request**:
  - `multipart/form-data` with field `file` containing the CSV upload.
  - Optional query parameters: `onDuplicate=skip|replace` (default `skip`).
- **Response**: `202 Accepted`
  ```json
  {
  	"jobId": "5d6c902f-a5c0-4f3e-9651-968db4974fc5",
  	"stage": "queued",
  	"percent": 10,
  	"message": "Upload received. Waiting to start parsing…",
  	"detail": null,
  	"inserted": 0,
  	"skipped": 0,
  	"totalRows": null,
  	"processedRows": 0,
  	"pollAfterMs": 2000
  }
  ```
- **Error responses**:
  - `400` – invalid/missing CSV, bad option value, CSV too large.
  - `413` – file exceeds limit.
  - `500` – storage or job queue failure (include `detail`).

### `GET /api/tests/import/{jobId}/status`

- **Purpose**: return the latest import progress snapshot for the requested job.
- **Response**: `200 OK`
  ```json
  {
  	"jobId": "5d6c902f-a5c0-4f3e-9651-968db4974fc5",
  	"stage": "parsing",
  	"percent": 55,
  	"message": "Parsing CSV rows…",
  	"detail": "Read 220 / 400 rows",
  	"inserted": 150,
  	"skipped": 5,
  	"totalRows": 400,
  	"processedRows": 220,
  	"lastUpdated": "2024-03-31T12:42:10Z"
  }
  ```
- **Error responses**:
  - `404` – unknown jobId or the job expired from the cache.
  - `410` – job record has been purged; advise the UI to stop polling.
- **Headers**: optional `Cache-Control: no-store` and `Retry-After: {pollAfterMs}` to hint the polling cadence.

### `DELETE /api/tests/import/{jobId}` (optional)

- **Purpose**: cancel a running import if the user closes the dialog.
- **Response**: `202 Accepted` when the cancellation was requested, `404` for unknown job, `409` when job already finished.

## Progress state schema

Store the status in a durable cache (Redis, database table, or in-process map guarded by locks if only one worker) keyed by `jobId`. Each record must contain:

| Field           | Type            | Description                                                                                                                                                  |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `jobId`         | string          | Unique identifier returned to the client.                                                                                                                    |
| `stage`         | enum            | One of `uploading`, `queued`, `parsing`, `importing`, `complete`, `error`. Mirrors the frontend expectations.【F:src/routes/soiltests/+page.svelte†L30-L43】 |
| `percent`       | integer         | 0–100. Use defaults from the frontend map when a finer percentage is unavailable.【F:src/routes/soiltests/+page.svelte†L45-L62】                             |
| `message`       | string          | Short label for the current stage.                                                                                                                           |
| `detail`        | string \| null  | Optional longer description (e.g., “Read 220 / 400 rows”).                                                                                                   |
| `inserted`      | integer         | Number of rows inserted so far.                                                                                                                              |
| `skipped`       | integer         | Number of rows skipped/failed so far.                                                                                                                        |
| `totalRows`     | integer \| null | Total rows detected after CSV header parse.                                                                                                                  |
| `processedRows` | integer         | Rows processed (parsed + validated).                                                                                                                         |
| `startedAt`     | ISO timestamp   | When processing began.                                                                                                                                       |
| `lastUpdated`   | ISO timestamp   | When the status was last refreshed.                                                                                                                          |
| `error`         | object \| null  | Optional structure `{ code, message }` for terminal failures.                                                                                                |

## Backend processing checkpoints

1. **Uploading** – set once the request body starts streaming; update percent ~10%.【F:src/routes/soiltests/+page.svelte†L45-L62】
2. **Queued** – job persisted and ready for the worker; percent ~25%.
3. **Parsing** – CSV rows being read/validated; update `processedRows` and compute percent via `processedRows / totalRows` when known.
4. **Importing** – writing to the database; percent ~75% unless computed precisely.
5. **Complete** – job done; fill `inserted`, `skipped`, `totalRows`, and optionally include a summary file path.
6. **Error** – set `stage` to `error`, populate `detail`/`error`, and leave `percent` at 100 so the frontend shows a full red bar.【F:src/routes/soiltests/+page.svelte†L45-L62】

## Frontend integration notes

- `handleCsvSubmit` already generates a `jobId`, sets the stage to `uploading`, and expects progress updates delivered through `handleCsvProgressUpdate` (which accepts `{ jobId, stage, percent, message, detail }`).【F:src/routes/soiltests/+page.svelte†L118-L170】【F:src/routes/soiltests/+page.svelte†L181-L221】
- After the `POST` response arrives, replace the TODO section with code that:
  1. Reads `jobId` from the response (fall back to the locally generated ID if the server omits it).
  2. Immediately calls `handleCsvProgressUpdate` with the payload.
  3. Starts `pollProgress(jobId)` which fetches `GET /api/tests/import/{jobId}/status` every `pollAfterMs` (default 2000ms).
  4. Pipes each response into `handleCsvProgressUpdate`. Stop polling when the stage is `complete` or `error`.
- When `complete`, trigger a soil test list refresh (re-run the existing `fetch(CONFIG.data.tests)` logic) so the new data appears automatically.【F:src/routes/soiltests/+page.svelte†L222-L321】

## Operational considerations

- Persist job status for at least 15 minutes after completion to allow the frontend to fetch the final summary even if the dialog closes.
- Enforce a per-tenant/job concurrency limit so multiple uploads do not exhaust memory.
- Log transitions with jobId and userId for auditing.
- Implement a background sweeper that purges expired job records and any orphaned temp files to prevent disk bloat.
