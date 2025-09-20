# Soil Test CSV Import Backend Guide

This document captures the complete backend requirements for the soil test CSV workflow. It covers the FastAPI request lifecycle, CSV parsing details (including the latest frontend expectations), progress reporting for the upload modal, and persistence into the SQLite database.

## 1. API surface

### `POST /api/soil-tests/import`
- **Purpose**: accept the CSV file, create an import job, and return the initial progress payload.
- **Request**: `multipart/form-data` containing a `file` field (CSV). Optional query `onDuplicate=skip|replace` (default `skip`).
- **Response**: `202 Accepted` with a JSON envelope:
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
- **Failure codes**: `400` (malformed CSV/params), `413` (file too large), `500` (storage or job queue failure).

### `GET /api/soil-tests/import/{jobId}/status`
- **Purpose**: expose the progress bar snapshot used by the frontend poller.
- **Response**: `200 OK` with the same shape as above plus `lastUpdated` (ISO timestamp). Return `404` for unknown IDs, or `410 Gone` if the job record has been purged.
- Optional headers: `Cache-Control: no-store` and `Retry-After: {pollAfterMs}` to guide polling cadence.

### `DELETE /api/soil-tests/import/{jobId}` *(optional)*
- Cancels an in-flight job. Reply with `202 Accepted` when the cancellation request is enqueued, `404` if the job is unknown, `409` when the job already completed.

## 2. CSV ingestion rules

### 2.1 Expected headers
The frontend now ships `static/samples/soil-tests.csv` as the canonical template:

```
id_sample,fieldID,sample_date,client,grower,crop,name_sample,P,olsen_P,K,Ca,Mg,S,Na,Cl,Cu,Fe,Mn,Zn,B,Al,EC,ph_water,ph_cacl2,buffer_pH,total_C,total_N,soil_depth_from,soil_depth_to
```

- **Required**: `fieldID`, `id_sample`, `name_sample`, `sample_date`.
- **Core metrics** (frontend displays these in the table): `P`, `K`, `Ca`, `Mg`, `S`, `Na`, `ph_water`.
- **Optional metrics** (import when present): `olsen_P`, `Cl`, `Cu`, `Fe`, `Mn`, `Zn`, `B`, `Al`, `EC`, `ph_cacl2`, `buffer_pH`, `total_C`, `total_N`, `soil_depth_from`, `soil_depth_to`.
- **Optional qualifiers**: `client`, `grower`, `crop` (safe to omit).

### 2.2 Date handling
- Accept both ISO strings and Excel serial day counts (e.g. `45888`).
- Conversion algorithm:
  ```python
  from datetime import datetime, timedelta

  EXCEL_EPOCH = datetime(1899, 12, 30)

  def normalise_sample_date(raw: str) -> datetime:
      raw = raw.strip()
      if raw.isdigit():
          serial = int(raw)
          if serial > 59:  # Excel 1900 leap-year bug
              serial -= 1
          return EXCEL_EPOCH + timedelta(days=serial)
      return datetime.fromisoformat(raw)
  ```
- Store dates as ISO `YYYY-MM-DD` strings in SQLite.

### 2.3 Validation checklist
1. Fail with `400` if the CSV has zero data rows.
2. Coerce `fieldID` and `id_sample` to integers; reject non-integers.
3. Trim text columns; treat empty strings as `NULL` for optional fields.
4. Convert numeric columns with `float()` (skip commas/units). Blank cells remain `NULL`.
5. Ensure at least one metric (core or optional) is non-null before persisting each row. Skipped rows should be reported in the progress summary.
6. Deduplicate according to `onDuplicate` policy: 
   - `skip` → ignore rows whose `(fieldID, id_sample)` already exist.
   - `replace` → overwrite by deleting matching rows before insert.

## 3. Job execution model

1. **Upload**: create a job record (see §4) when the request arrives. Store the temporary CSV path on disk.
2. **Background worker**: read the file, stream rows through the parser, and batch inserts into SQLite.
3. **Progress stages** (keep in sync with `csvStageDefaults` in the Svelte file):
   - `uploading` (10%) – file saved.
   - `queued` (25%) – job ready for the worker.
   - `parsing` – update `processedRows`, `totalRows`, and compute percent when possible.
   - `importing` (>=75%) – executing database writes.
   - `complete` – fill `inserted`, `skipped`, `totalRows`, and set `percent` to 100.
   - `error` – attach an `error` payload and freeze `percent` at 100.
4. **Cancellation**: if a DELETE arrives mid-run, mark the job as `error` with `detail='Cancelled by user'`, stop further inserts, and clean up temp files.
5. **Retention**: keep completed jobs for ~15 minutes so the frontend can fetch the final summary even if the modal closes.

## 4. SQLite persistence

### 4.1 Soil test table
Recommended columns (types use SQLite affinity):

| Column              | Type    | Notes                                          |
| ------------------- | ------- | ---------------------------------------------- |
| `id`                | INTEGER | Primary key, autoincrement.                    |
| `field_id`          | INTEGER | References paddock table.                      |
| `sample_id`         | INTEGER | Lab ID (`id_sample`).                          |
| `sample_name`       | TEXT    | `name_sample`.                                 |
| `sample_date`       | TEXT    | ISO `YYYY-MM-DD`.                              |
| `client`            | TEXT    | Optional.                                      |
| `grower`            | TEXT    | Optional.                                      |
| `crop`              | TEXT    | Optional.                                      |
| `created_at`        | TEXT    | Timestamp inserted.                            |
| Metric columns      | REAL    | `P`, `K`, `Ca`, `Mg`, `S`, `Na`, `ph_water`, plus the optional metrics listed above.

Add a unique index on `(field_id, sample_id)` to back the duplicate policy.

### 4.2 Job status table (for progress bar)

```sql
CREATE TABLE IF NOT EXISTS soil_test_import_jobs (
    job_id TEXT PRIMARY KEY,
    user_id TEXT,
    stage TEXT NOT NULL,
    percent INTEGER NOT NULL,
    message TEXT NOT NULL,
    detail TEXT,
    inserted INTEGER DEFAULT 0,
    skipped INTEGER DEFAULT 0,
    total_rows INTEGER,
    processed_rows INTEGER DEFAULT 0,
    file_path TEXT,
    started_at TEXT NOT NULL,
    last_updated TEXT NOT NULL,
    error_code TEXT,
    error_message TEXT
);
```

- Update the row at every stage change.
- Expose `pollAfterMs` by storing the desired poll interval in-process or deriving it in the API response.
- Purge rows (and delete `file_path`) after retention expires.

## 5. FastAPI implementation sketch

```python
@router.post("/soil-tests/import", status_code=status.HTTP_202_ACCEPTED)
async def import_soil_tests(
    file: UploadFile = File(...),
    on_duplicate: str = Query("skip", regex="^(skip|replace)$"),
    user: User = Depends(get_current_user),
):
    job = create_job_record(user_id=user.id)
    temp_path = await save_upload(file, job.job_id)
    enqueue_import_job(job.job_id, temp_path, on_duplicate=on_duplicate)
    return job.to_response()


@router.get("/soil-tests/import/{job_id}/status")
async def import_status(job_id: str):
    job = job_repo.get(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return job.to_response()
```

Worker pseudocode:

```python
def process_job(job_id: str, path: Path, on_duplicate: str):
    repo.update(job_id, stage="parsing", percent=40, message="Parsing CSV rows…")
    rows = parse_csv(path)
    total = len(rows)
    repo.update(job_id, total_rows=total)

    inserted = skipped = processed = 0
    for row in rows:
        processed += 1
        try:
            payload = normalise_row(row)
            upsert_soil_test(payload, policy=on_duplicate)
            inserted += 1
        except DuplicateError:
            skipped += 1
        except Exception as exc:
            skipped += 1
            logging.exception("Import failed for row %s", row)

        repo.update(
            job_id,
            stage="parsing" if processed < total else "importing",
            percent=40 + int(processed / max(total, 1) * 35),
            processed_rows=processed,
            inserted=inserted,
            skipped=skipped,
        )

    repo.update(
        job_id,
        stage="complete",
        percent=100,
        message="Import complete",
        detail=f"Inserted {inserted} rows; skipped {skipped}",
        processed_rows=processed,
        inserted=inserted,
        skipped=skipped,
    )
```

On exceptions, set `stage="error"`, include `detail=str(exc)` and leave the file for debugging (or move it to a quarantine directory).

## 6. Frontend alignment summary

- Progress event shape: `{ jobId, stage, percent, message, detail, inserted?, skipped?, totalRows?, processedRows? }`.
- Stages must match `csvStageDefaults` so the percentages line up in the Svelte modal.
- When `stage === 'complete'`, the frontend automatically calls `loadTests()` to refresh the table.
- The downloadable sample CSV lives at `/samples/soil-tests.csv`; the backend should remain compatible with its headers.

## 7. Testing checklist

1. Upload the bundled sample CSV and confirm:
   - Dates normalise to `YYYY-MM-DD` (Excel value `45888` → `2025-09-18`).
   - Metric columns populate the correct fields (`ph_water` instead of legacy `pH`).
2. Repeat with a CSV missing optional columns (e.g., no `grower`)—job should still succeed.
3. Trigger duplicate handling with `onDuplicate=skip` and `onDuplicate=replace`.
4. Simulate an error (invalid numeric) to ensure the job moves to `error` and progress bar reflects the failure.
5. Verify job records purge after the retention window.

By following this guide you can align the FastAPI backend, SQLite storage, and progress updates with the latest frontend CSV workflow.
