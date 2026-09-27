---
name: preflight
description: Run the same checks as CI's `checks` job (svelte-check, vitest, prettier, build, smoke test, shellcheck, release-check test, ESLint count) before pushing a farm-website branch. Use before every push or PR, or when Tom says "preflight", "run CI locally" or "is this ready to push".
---

# Preflight

CLAUDE.md says: don't push while any CI check fails. This runs them all in one go, from the current checkout (usually a worktree), and keeps going after a failure so you see everything at once.

```sh
.claude/skills/preflight/run.sh          # everything the `checks` job runs
.claude/skills/preflight/run.sh --quick  # skip build + smoke test (docs, config or test-only changes)
```

It runs `npm ci` first if the worktree has no `node_modules`. If that fails with `Tsconfig not found .../.svelte-kit/tsconfig.json`, run `npx svelte-kit sync` in the main checkout and retry.

Browser tests need Chromium once per machine: `npx playwright install chromium`.

## Reading the result

- Every step `ok`: safe to push.
- A step `FAIL`: the last 25 lines are printed and the full log path is shown. Fix and rerun. Don't push.
- `prettier --check` failing on files you didn't touch means the branch isn't based on current `origin/staging`. Rebase before you reformat anything.
- ESLint is non-blocking in CI. Compare the count with `staging`: new code must not add to it.

Not covered here: the `container` job (`docker build` + `scripts/smoke-test.sh --image`) and `deploy-tests` (`deploy/test/run-tests.sh`). Both need Docker and take a while. Run them only if you touched the `Dockerfile`, `deploy/` or the smoke test.
