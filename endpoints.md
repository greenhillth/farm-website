# Soil Test Upload Backend Endpoints

The frontend soil test uploader expects two POST endpoints. Both live under the same base API path the frontend already uses (`/api`) but you can mount them anywhere that makes sense for your FastAPI app.

## 1. Manual Entry Endpoint – `POST /api/soil-tests/manual`

### Purpose
Persist a single soil test that the user entered through the manual form. The frontend already validates mandatory fields (field id, sample name, sample ID, sample date) and ensures at least one metric value is provided, but the backend must still repeat validation.

### Request
* **Method**: `POST`
* **Content type**: `application/json`
* **Body schema**:

```json
{
  "fieldId": 4251583,             // integer, required
  "sampleName": "Cemetery core", // string, required
  "sampleId": 14005725,           // integer, required
  "sampleDate": "2014-07-23",    // string (ISO-8601 date), required
  "client": "Botanical Resources", // string, optional
  "metrics": {                      // object, at least one key must be present
    "P": 56.72,                     // number, optional
    "K": 562.81,                    // number, optional
    "Ca": 2595.7,                   // number, optional
    "Mg": 304.95,                   // number, optional
    "S": 26.32,                     // number, optional
    "Na": 98.47,                    // number, optional
    "pH": 5.89                      // number, optional
  }
}
```

### Validation Rules
1. `fieldId`, `sampleName`, `sampleId`, and `sampleDate` are required; trim whitespace on the string fields.
2. `fieldId` and `sampleId` must be integers. Reject non-numeric or fractional values.
3. `sampleDate` must parse cleanly to a `date` (UTC) or `datetime.date`.
4. `metrics` must contain at least one of the supported metric keys (`P`, `K`, `Ca`, `Mg`, `S`, `Na`, `pH`). Reject payloads with no metrics or non-numeric values.
5. Values should be stored in consistent units; the frontend passes raw lab values.
6. Optionally, use the `fieldId` to join with the paddock table and confirm the field exists; return 404 if it doesn’t, or 400 with a helpful message.

### Suggested Pydantic Models

```python
from datetime import date
from typing import Optional
from pydantic import BaseModel, Field, validator

METRIC_KEYS = {"P", "K", "Ca", "Mg", "S", "Na", "pH"}

class MetricsPayload(BaseModel):
    P: Optional[float] = None
    K: Optional[float] = None
    Ca: Optional[float] = Field(None, alias="Ca")
    Mg: Optional[float] = Field(None, alias="Mg")
    S: Optional[float] = None
    Na: Optional[float] = None
    pH: Optional[float] = Field(None, alias="pH")

    @validator("P", "K", "Ca", "Mg", "S", "Na", "pH", pre=True)
    def allow_empty(cls, v):
        if v in (None, "", "null"):
            return None
        return float(v)

    def has_any(self) -> bool:
        return any(getattr(self, key) is not None for key in METRIC_KEYS)

class ManualTestPayload(BaseModel):
    field_id: int = Field(..., alias="fieldId")
    sample_name: str = Field(..., alias="sampleName")
    sample_id: int = Field(..., alias="sampleId")
    sample_date: date = Field(..., alias="sampleDate")
    client: Optional[str] = None
    metrics: MetricsPayload

    @validator("sample_name", pre=True)
    def non_empty(cls, v):
        if isinstance(v, str) and not v.strip():
            raise ValueError("must not be empty")
        return v

    @validator("metrics")
    def ensure_metrics(cls, v: MetricsPayload):
        if not v.has_any():
            raise ValueError("at least one metric required")
        return v
```

### Side Effects
* Persist to your soil tests table (`tests` or equivalent).
* Suggested columns (derived from sample JSON): `field_id`, `sample_id`, `sample_name`, `sample_date`, `client`, metrics columns (`P`, `K`, etc.), plus audit fields (created_at, updated_at, created_by).
* Return `201 Created` with the stored object (or `204` if you prefer empty response). Example success payload:

```json
{
  "id": 123,
  "fieldId": 4251583,
  "sampleName": "Cemetery core",
  "sampleDate": "2014-07-23",
  "client": "Botanical Resources",
  "metrics": { "P": 56.72, "K": 562.81, "pH": 5.89 }
}
```

### Error Responses
* `400 Bad Request` – invalid JSON, missing required fields, no metrics, invalid metric value, unknown fieldId.
* `409 Conflict` – existing sample with same `sampleId` and `fieldId`; decide whether to allow duplicates or enforce uniqueness.

## 2. CSV Upload Endpoint – `POST /api/soil-tests/import`

### Purpose
Accept a CSV file exported from the lab, parse every row into soil test records, and insert them. The frontend sends the file in a multipart form with field name `file`.

### Request
* **Method**: `POST`
* **Content type**: `multipart/form-data`
* **Form fields**:
  * `file`: the CSV file (required)
  * You can allow optional query parameters (e.g., `?onDuplicate=skip|replace`) to control duplicate handling.

### CSV Expectations
* UTF-8 encoded text CSV.
* Header row present. Recognised columns:
  * `id` (optional)
  * `fieldID` (required) – must map to paddock table.
  * `id_sample` (required, integer)
  * `name_sample` (required for readability)
  * `sample_date` (required) – parse to ISO date.
  * `client`, `grower`, `crop` (optional metadata)
  * Metric columns: `P`, `K`, `Ca`, `Mg`, `S`, `Na`, `Cl`, `Cu`, `Fe`, `Mn`, `Zn`, `B`, `Al`, `EC`, `ph_water`, `ph_cacl2`, `buffer_pH`, `total_C`, `total_N`, `soil_depth_from`, `soil_depth_to`, etc.

You don’t need to ingest every column; the frontend currently expects the metrics subset listed above plus whatever extra you want to store.

### Server-Side Steps
1. **Read and decode the file**.
   ```python
   import csv
   from io import StringIO

   async def import_tests(file: UploadFile):
       data = await file.read()
       text = data.decode('utf-8-sig')
       reader = csv.DictReader(StringIO(text))
       rows = list(reader)
   ```

2. **Basic validation**:
   * Fail with `400` if no rows.
   * Ensure `fieldID` and `sample_date` columns exist.
   * For each row, trim whitespace, convert numbers (use `float()`), and parse the date (prefer `datetime.strptime(value, '%Y-%m-%d')` but add fallback patterns).
   * If a row lacks metrics completely, either skip it with a warning, or treat as error depending on your policy.

3. **Duplicate handling**:
   * If you allow `onDuplicate=replace`, delete existing entries with same `fieldID` + `sample_date` + `sampleName` or `sampleId`.
   * Otherwise, skip duplicates and collect a summary for the response (skipped count).

4. **Database transaction**:
   * Wrap the insert in a transaction.
   * Use bulk insert for speed.
   * Consider writing to a staging table, validate, then upsert into production tables.

### Suggested FastAPI Endpoint Signature

```python
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Query

router = APIRouter(prefix="/api/tests", tags=["soil-tests"])

@router.post("/manual", status_code=status.HTTP_201_CREATED)
async def create_manual_test(payload: ManualTestPayload, db=Depends(get_session)):
    # validation occurs in Pydantic model
    paddock = db.query(Paddock).filter(Paddock.field_id == payload.field_id).first()
    if not paddock:
        raise HTTPException(status_code=400, detail="Unknown fieldId")
    test = SoilTest.from_payload(payload, paddock=paddock)
    db.add(test)
    db.commit()
    db.refresh(test)
    return test.to_api()

@router.post("/import")
async def import_tests(
    file: UploadFile = File(...),
    on_duplicate: str = Query("skip", pattern="^(skip|replace)$"),
    db=Depends(get_session),
):
    if not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="Upload a CSV file")
    rows = await parse_csv(file)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV is empty or invalid")
    result = await process_rows(rows, db, on_duplicate=on_duplicate)
    return {"inserted": result.inserted, "skipped": result.skipped}
```

### Response Examples
* Success: `200 OK` with `{ "inserted": 42, "skipped": 3 }`
* Error: `400` with `{ "detail": "Row 12 missing fieldID" }`
* The endpoint should never block; stream large files or enforce an upload size limit.

## Shared Considerations

* **Authorization** – The endpoints should be protected behind authentication/authorization because they modify critical data.
* **Audit logging** – Record user IDs, timestamps, source (manual vs CSV).
* **Paddock lookup** – For both manual and CSV paths, you likely need to resolve `fieldID` to a paddock (maybe `paddocks` table). Decide whether to reject unknown IDs or create placeholders.
* **File Storage** – If you want to keep the original CSV, store it in S3/local disk along with metadata for traceability.
* **Error reporting back to UI** – The frontend displays `uploadError`. Return clear messages (e.g., first failing row, missing headers). For bulk CSV upload, include partial success metrics.
* **Async vs sync** – If CSV processing is heavy, enqueue a background task (Celery, RQ) and return a job ID. The frontend currently assumes immediate feedback, so either keep the operation quick or extend the UI later.

By implementing the endpoints above and wiring them into your FastAPI router, the existing frontend upload dialog will integrate cleanly once you replace the TODO fetch calls with `fetch(uploadEndpoints.manual, ...)` and `fetch(uploadEndpoints.csv, ...)`.
