# Soil test bulk edit backend requirements

## Scope and frontend expectations
- The soil tests page introduces an edit mode with checkbox selection and a destructive confirmation modal. The frontend owns the edit-mode state (`isEditMode`), the selection set (`selectedIds`), and the delete confirmation flow, so the backend only has to expose a bulk-deletion API that accepts a list of soil test identifiers and reports which rows were removed.【F:src/routes/soiltests/+page.svelte†L39-L156】
- The fetch helper currently targets `DELETE /api/soil-tests/bulk` with a JSON body shaped as `{ "ids": [...] }`. It sets `Content-Type: application/json` and is prepared to handle either a success payload, an error payload, or a partial-success payload surfaced through HTTP 207.【F:src/routes/soiltests/+page.svelte†L157-L213】
- Other soil-test write operations already live under `/api/soil-tests/...` (`manual` and `import` endpoints). To stay consistent while the frontend is stabilising, expose the canonical route at `/api/soil-tests/bulk-delete` and add `/api/soil-tests/bulk` as a temporary alias (or update the frontend constant once the backend path is finalised).【F:src/routes/soiltests/+page.svelte†L324-L343】【F:src/routes/soiltests/+page.svelte†L46-L166】

## API contract – `DELETE /api/soil-tests/bulk-delete`

### Purpose
Delete multiple soil test records in a single transaction, returning information the frontend needs to reconcile its local list and toast notifications.

### Request
- **Method & Path**: `DELETE /api/soil-tests/bulk-delete`
- **Headers**: `Content-Type: application/json`
- **Body schema**:
  ```json
  {
    "ids": [1, 2, 3]
  }
  ```
- **Validation rules**:
  1. `ids` must be provided as an array of unique identifiers (integers or UUID strings). Reject empty arrays with HTTP 400 and `{ "message": "ids must contain at least one value" }`.
  2. Reject requests whose payload exceeds the maximum supported selection count (recommend 200 IDs; tune for your DB limits). Return HTTP 413 with a descriptive message if exceeded.
  3. Coerce numeric strings, trim whitespace, and drop falsy entries before hitting the database. If any element cannot be parsed into a valid identifier, respond with HTTP 400 and flag the bad values.
  4. Authenticate the caller and confirm they have delete rights to the relevant tenant/farm.

### Success response – `200 OK`
Send when every requested ID was deleted successfully.
```json
{
  "deleted": 3,
  "ids": [1, 2, 3],
  "failedIds": []
}
```
- `deleted`: integer rowcount from the DELETE statement.
- `ids`: the subset that was actually removed (useful if the backend canonicalises/filters IDs).
- `failedIds`: include an empty array for consistency, or omit the field entirely.

### Partial success – `207 Multi-Status`
Return HTTP 207 when at least one ID failed to delete (foreign-key constraint, missing row, authorisation failure, etc.), but at least one ID succeeded. Shape the JSON to match the frontend expectations:
```json
{
  "deleted": 2,
  "ids": [1, 2, 3],
  "failedIds": [3]
}
```
- Populate `failedIds` with the identifiers that remain in the database. The frontend will keep those in its selection and show a warning toast.【F:src/routes/soiltests/+page.svelte†L182-L213】
- Ensure the response still lists all IDs that were processed in `ids` so the UI can infer which subset succeeded.【F:src/routes/soiltests/+page.svelte†L195-L205】

### Error responses
- `400 Bad Request` – missing/empty `ids`, malformed body, or identifiers that do not belong to the authenticated tenant.
- `401/403` – unauthorised or forbidden.
- `404 Not Found` – every ID was unknown; alternatively you can respond with HTTP 200 and `deleted: 0`, but align the behaviour with your global API conventions.
- `409 Conflict` – deletion blocked by foreign-key constraints (e.g., downstream recommendations referencing the soil test) when none of the requested rows could be removed.
- `413 Payload Too Large` – the `ids` array exceeds configured limits.
- `500 Internal Server Error` – unexpected database failure (return `{ "message": "..." }` so the frontend can display it when debugging).【F:src/routes/soiltests/+page.svelte†L168-L221】

### Headers & caching
- Respond with `Cache-Control: no-store`.
- If you support soft-deletion with asynchronous clean-up, include a `Retry-After` header to tell the UI when to re-fetch the list.

## Endpoint alias – `DELETE /api/soil-tests/bulk`
Keep this route wired to the same handler during the transition period so the existing frontend integration works without modification. Once both sides agree on the canonical path, remove the alias and update the frontend constant at the same time.【F:src/routes/soiltests/+page.svelte†L46-L218】

## Database & transactional behaviour
1. Enable foreign keys (`PRAGMA foreign_keys = ON`) before running the delete statement, matching the CSV import guidance.
2. Wrap the operation in a transaction to guarantee that either all eligible rows are deleted or the request fails cleanly. Commit only after computing success/failure sets.
3. Use a parameterised `DELETE FROM soil_tests WHERE id IN (:ids...) AND tenant_id = :tenant` statement (add tenant scoping columns as needed).
4. Collect the list of IDs that matched the WHERE clause (`SELECT id FROM soil_tests WHERE id IN (:ids...)`) before deleting to distinguish between "not found" and "delete failed" cases.
5. When referential integrity blocks a subset, roll back, split the IDs, and retry deleting only the independent subset so you can honour the partial success contract. Alternatively, attempt per-ID deletions inside the transaction while capturing failures.
6. Cascade-delete dependent rows (e.g., lab metric tables) or prevent deletion with a `409` depending on your data model. Document the policy alongside the handler.

## Concurrency, idempotency, and auditing
- Treat the endpoint as idempotent: deleting the same IDs twice should return `deleted: 0` and list `failedIds` equal to the attempted IDs if nothing remained.
- Serialise deletes per tenant or rely on row-level locking to avoid race conditions with other writers (imports, edits). If an ID disappears between validation and deletion, count it as a success (already gone) and include it in `ids`.
- Log each request with the user ID, tenant, and result counts for audit trails.
- Emit metrics (`soil_tests.delete.bulk.request`, `...success`, `...partial`, `...failure`) so operations can monitor error spikes.

## Testing checklist
1. **Unit tests** – cover happy path, empty `ids`, exceeding max selection size, unknown IDs, foreign-key violations, and mixed-success scenarios.
2. **Integration tests** – seed the database with at least five soil tests, delete a subset, and confirm the remaining rows are untouched.
3. **Authorisation tests** – ensure users cannot delete soil tests belonging to other tenants/farms.
4. **Performance tests** – benchmark deletes of 50, 100, 200 IDs to confirm latency stays within acceptable bounds (<500 ms recommended) so the frontend spinner duration feels responsive.
5. **Smoke test with frontend** – trigger the Svelte flow, verify the confirmation modal behaviour, toast messages, and list reconciliation when the backend returns 200, 207, and error status codes.【F:src/routes/soiltests/+page.svelte†L157-L223】

By following the contract above, the backend service will integrate seamlessly with the new edit-mode UX and mirror the message structures already used for CSV import progress and other soil test APIs.
