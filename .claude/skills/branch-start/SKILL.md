---
name: branch-start
description: Start a change the way CLAUDE.md requires, in its own worktree on a new feat/, fix/, docs/, chore/ or release/ branch taken from an up-to-date origin/staging, with dependencies installed. Use at the start of any file-changing task in this repo, before the first edit.
---

# Start a branch

The rules this follows are in CLAUDE.md under "Rules for agents": work only in a worktree, branch from `origin/staging`, use one topic per branch, and use the prefixes `feat/ fix/ docs/ chore/ release/vX.Y.Z`.

## Usual flow (Claude session)

1. `EnterWorktree` with a short `name`. This gives you a `worktree-<name>` branch taken from `origin/main`.
2. Inside the worktree, run:
   ```sh
   .claude/skills/branch-start/start.sh <prefix>/<name>
   ```
   It fetches, switches to `<prefix>/<name>` from `origin/staging`, deletes the `worktree-<name>` branch and installs dependencies (`npm ci`, or a `.venv` for gbros-api).

If you started from the main checkout without `EnterWorktree`, running the same command there creates `.claude/worktrees/<name>` and prints its path. Then call `EnterWorktree` with that `path`.

## Urgent production fix

Use this only when Tom explicitly asks for a fix to go straight to `main`:

```sh
.claude/skills/branch-start/start.sh fix/<name> --from main
```

Open the PR with `--base main`. After it merges, open a PR from `main` into `staging`.

## Afterwards

When the work is ready, run `/preflight` (farm-website) or `pytest` (gbros-api), push the branch and open the PR with `--base staging`. Once it merges, run `/branch-cleanup`.
