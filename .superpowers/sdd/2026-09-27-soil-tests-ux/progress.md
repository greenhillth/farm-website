# SDD ledger — plan: docs/superpowers/plans/2026-09-27-soil-tests-ux.md

Worktree: .claude/worktrees/soil-tests-ux, branch feat/soil-tests-ux from origin/staging 5eeccd1.
ESLint baseline (npx eslint src): 81 errors.
Specs: docs/superpowers/specs/2026-09-27-soil-tests-ux-design.md, docs/superpowers/specs/2026-09-27-ui-direction.md.
Staging moved since plan (PR #23 mobile map) but none of the consumed files (soil-tests, soil-status, components, utils, app.css) changed.

## Pre-flight scan

| Pair / task | Produces vs consumes | Finding |
| --- | --- | --- |
| T1→T2 | ParsedCsv, parseCsv | match |
| T1,T2→T7 | parseCsv, validateCsv, CsvCheck | match |
| T2→T6,T8 | sampleKey | match |
| T3 (schema.ts, utils.ts modify) → T5,T8 | SoilTest.organicMatter, filters/sort/status API | match; T8 multi-line import of filters (line 3115) |
| T4→T5,T7,T8 | Toaster, ImportJob, OnDuplicate | match |
| T5→T8 | Pagination, Toolbar, Table, Card, BulkDeleteBar, Toasts props | match |
| T6→T8 | UploadDialog, ManualEntryForm | match |
| T7→T8 | CsvImportWizard, ImportSteps | match |
| T8 rewrites +page.svelte; nothing else touches it | — | ok |
| T1..T8 self-consistency | tests import names each task creates | ok (import scan) |
| T8 note (line 3471) | replaceState flagged by no-navigation-without-resolve | plan expects 1 new lint error; baseline rule is count ≤ 81, old page's errors go away |
| T9 | verification + PR | no Files section; controller does it |

Scan clean; no rulings needed.

## Progress
Task 1: dispatched (base 5eeccd1, implementer a0f0d3b31765270cd, haiku)
Task 1: minor (deferred): csv.ts stray `"` mid-field is taken literally (same as plan's reference code)
Task 1: complete (commits 5eeccd1..cfba3f1, review clean)
Task 2: dispatched (base cfba3f1, haiku)
Task 2: fix round 1/5 (1 addressed, 0 open — straight vs typographic quotes in messages; commits 3471237..25ada96)
Task 2: complete (commits cfba3f1..25ada96, review clean)
Note: implementers' commits carry their own model in Co-Authored-By (Haiku 4.5) rather than Opus 5.5.
Ruling: implementers for Tasks 3+ run on sonnet, not haiku — haiku dropped the plan's typographic quotes in Task 2 and later tasks are copy-heavy — costs more tokens per task if wrong.
Task 3: dispatched (base 25ada96, sonnet)
Task 3: complete (commits 25ada96..a60becb, review clean)
Task 4: dispatched (base a60becb, sonnet)
Task 4: implementer done, commit 01ab85e; first review lost when the session dropped (connection outage).
Ruling: to cut usage (Tom asked), the controller runs brief-vs-code.py before each review; files identical to the brief get a narrow haiku review (scope, the task's Review Focus risks, plan defects), and only deviations get a sonnet review — costs a missed subtle defect in plan-verbatim code, which the final opus whole-branch review still covers.
Task 4: complete (commits a60becb..01ab85e, review clean — narrow haiku review)
Ruling: Tasks 5–8 implementers run on haiku and write files with extract-code.py (exact bytes from the brief) instead of retyping — this removes the retyping failure behind the Task 2 ruling — costs a stalled implementer if a brief's code doesn't work as-is.
Task 5: dispatched (base 01ab85e, haiku)
Task 5: minor (deferred, plan-mandated): selection checkboxes are size-5 (20px), below the 44px control constraint (SoilTestsTable.svelte:92, SoilTestCard.svelte:54)
Task 5: complete (commits 01ab85e..59c57ac, review clean — narrow haiku review)
Task 6: dispatched (base 59c57ac, haiku)
Task 6: fix round 1/5 (1 addressed, 0 open — implementer had swapped ’ for ' in two ManualEntryForm messages; commits 1b68be1..0d7e889; verified by brief-vs-code.py = identical, in place of a re-review subagent)
Task 6: complete (commits 59c57ac..0d7e889, review clean — narrow haiku review)
Task 7: dispatched (base 0d7e889, haiku)
Task 7: complete (commits 0d7e889..2657fe3, review clean — narrow haiku review)
Ruling: Task 8 implementer (haiku) does Steps 1–4 and 6; Step 5 (browser check + real import) runs afterwards as a separate sonnet dispatch — it needs design judgment a transcription model lacks — costs one extra dispatch.
Task 8: dispatched (base 2657fe3, haiku)
Task 8: implementer done 376dea3 → amended message only to eed99bf (trailer was on the subject line); brief-vs-code identical; eslint 64 (baseline 81); constraint grep clean; one <h1>.
Ruling: Task 8 review and Step 5 browser check run as ONE sonnet dispatch that reports only (no code edits), including the plan-mandated real import of static/samples/soil-tests.csv into the local dev backend on :8000 — the plan requires it and it's local — costs duplicate sample rows in Tom's local DB if that's unwanted.
Task 8: minor (deferred): 390px list is ~8 screens at PAGE_SIZE 25 (plan: 'a few screens')
Task 8: minor (deferred): wizard Done 'Close' button and dialog icon 'Close' share an accessible name
Task 8: note: browser check imported 1 sample row into the local dev backend (second run skipped the duplicate)
Task 8: complete (commits 2657fe3..eed99bf, review clean + browser check PASS)
Final review (opus): 2 Important + 9 Minor; triage says fix checkboxes before merge.
Ruling: fix wave covers I1, I2, 44px checkboxes, Minors 3, 4, 6; Minors 5, 7–11 deferred to PR follow-ups — cheap, clear bugs first — costs those edge cases staying open until a follow-up.
Ruling: serial-date range 18264–109574 (1950–2199) for isImportableDate — rejects 2024-as-1905 and overflow — costs rejecting genuine pre-1950 serials (none expected for soil tests).
Final fix wave: dispatched (base eed99bf, sonnet)
