# Deployment Pipeline: Tasks 5–7 Handoff

**Status:** Tasks 1–4 complete and reviewed. Ready to dispatch Tasks 5–7 (CI workflow, release workflow, runbook).

**Branch:** `feat/deploy-pipeline`  
**Ledger:** `.superpowers/sdd/2026-09-25-deployment-pipeline/progress.md`  
**Plan:** `docs/superpowers/plans/2026-09-25-deployment-pipeline.md`  
**Spec:** `docs/superpowers/specs/2026-09-25-deployment-pipeline-design.md`

---

## Completed Context (Tasks 1–4)

✅ **Task 1:** Lockfile committed, Node 24 pinned, build output untracked  
✅ **Task 2:** Smoke test, stub backend, `/api` proxy (deviation justified: `headers.delete('expect')`)  
✅ **Task 3:** Dockerfile multi-stage, .dockerignore, image builds and tests pass (278 MB acceptable)  
✅ **Task 4:** deploy.sh with health checks and rollback, 9 integration tests all passing

---

## SDD Tooling: Friction Reduction

**Before:** Subagents spent 10–15% of context on environment setup questions.  
**After:** Pre-configured context blocks eliminate setup friction.

**Invoke before every dispatch:**

```bash
bash .superpowers/sdd-tooling/sdd-dispatch-context
```

Paste all three blocks (environment, commands, conventions) into your dispatch.

---

## Resume Instructions

### Using the Handover Prompt

Copy and invoke this to continue:

```
/superpowers:subagent-driven-development

Resume deployment pipeline: Tasks 5–7 of 9.

**State:**
- Plan: `/Users/tomgreenhill/Projects/farm-website/farm-website/docs/superpowers/plans/2026-09-25-deployment-pipeline.md`
- Completed: Tasks 1–4 (last commit: deploy.sh + tests, commit hash visible in ledger)
- Ledger: `.superpowers/sdd/2026-09-25-deployment-pipeline/progress.md`
- Ready: Task briefs 5–7 prepared in workspace

**Use SDD tooling for friction reduction:**

Every implementer dispatch must include these three context blocks (paste output of `bash .superpowers/sdd-tooling/sdd-dispatch-context`):

1. **Environment block** — Node 24, no nvm, direct commands
2. **Command execution block** — run directly, no wrapper scripts
3. **Project conventions block** — commit trailer, Prettier, Node 24

**Execute continuously without pausing.** Only stop for: (1) irreversible destructive ops, (2) security actions, (3) shared-branch side effects, (4) plan defects.

**Task 5:** CI workflow (GitHub Actions, fully specified)
**Task 6:** Release workflow, checks, Dependabot (YAML + bash)
**Task 7:** Runbook (markdown), CLAUDE.md + README updates

Proceed to Task 5 implementer dispatch.
```

### Dispatch Template

For Task N implementer, use this template with SDD tooling baked in:

```
You are implementing Task N of the deployment pipeline for farm-website.

**Your task:** Read the brief at `/Users/tomgreenhill/Projects/farm-website/farm-website/.superpowers/sdd/2026-09-25-deployment-pipeline/task-N-brief.md` — it contains your exact requirements.

**Context from completed tasks:**
[Task N brief will reference what it needs; no need to repeat here]

**Global constraints (from the plan):**
- Node: **24 LTS** pinned everywhere
- Shell scripts: `#!/usr/bin/env bash`, `set -euo pipefail`, pass `shellcheck`, bash 3.2 compatible
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Run `npx prettier --write` on all new/changed `.md`, `.yml`, `.json` files

[PASTE OUTPUT FROM: bash .superpowers/sdd-tooling/sdd-dispatch-context]

**Report:** Write your full report to `/Users/tomgreenhill/Projects/farm-website/farm-website/.superpowers/sdd/2026-09-25-deployment-pipeline/task-N-report.md`. Return **only**:
- `DONE` if all steps passed
- `DONE_WITH_CONCERNS` + concerns
- `NEEDS_CONTEXT` + missing info
- `BLOCKED` + blocker

Do not dispatch any subagents. Work only on this task.

**Working directory:** `/Users/tomgreenhill/Projects/farm-website/farm-website`
```

---

## Next Steps

1. Invoke the handover prompt above (use `/superpowers:subagent-driven-development`)
2. Controller continues executing Tasks 5–7 with friction-reduction tooling
3. Final whole-branch review after Task 7
4. Use `/superpowers:finishing-a-development-branch` to finalize and merge

---

## Tooling Reference

**SDD Dispatch Context Tool:**

- Location: `.superpowers/sdd-tooling/sdd-dispatch-context`
- Use: `bash .superpowers/sdd-tooling/sdd-dispatch-context [--env|--commands|--conventions]`
- Purpose: Eliminate subagent setup questions, standardize test execution
- Token savings: ~10–15% per task

**Skill Documentation:**

- Location: `.superpowers/sdd-tooling/SKILL.md`
- Reference: describes all three blocks, dispatch template, common mistakes
