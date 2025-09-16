**User Input:**
Fantastic. Can you also prevent the user from submitting a manual input reading if all the metric fields are left blank?

**Assistant Response:**
Manual entry now guards against submitting without any metrics.

- `frontend/src/routes/soiltests/+page.svelte:69` introduces `manualMetricCount`, recalculating whenever metric inputs change.
- Same file updates the hint to show how many metrics are filled and disables the “Save test” button (with tooltip) unless at least one metric is entered, while the existing backend check remains for safety.

No automated tests run (UI-only change).
