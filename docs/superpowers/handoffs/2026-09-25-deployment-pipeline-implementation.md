# Handoff: implement the deployment pipeline

Paste the prompt below into a fresh Claude Code session started in the `farm-website/` repo.

---

Implement the farm-website deployment pipeline using **/superpowers:subagent-driven-development**.

- **Plan:** `docs/superpowers/plans/2026-09-25-deployment-pipeline.md` (execute it task by task).
- **Spec:** `docs/superpowers/specs/2026-09-25-deployment-pipeline-design.md` (the plan argues from it, so read both).
- **Project context:** `CLAUDE.md`.

**Where things stand**

- Work on branch `feat/deploy-pipeline`, which should already be checked out. It's 7 commits ahead of `development`: the dependency upgrade (`chore/upgrade-deps`), Tailwind and colour fixes, small fixes, CLAUDE.md, the spec, and the plan. Nothing is pushed yet.
- `development` is the real production code. `main` is a stale static-HTML site and gets reset in Task 8.
- The working tree shows modified and deleted files under `build/` and `.svelte-kit/`. They're rebuilt output that Task 1 untracks with `git rm -r --cached`, so don't commit or restore them separately.
- All design decisions are settled and approved: GHCR images from `vX.Y.Z` tags, `deploy.sh` on the server with health check and automatic rollback, `main` as the production branch, Node 24 LTS, and TypeScript pinned to `~6.0`. Don't reopen them.

**Before Task 1, verify the prerequisites.** If any are missing, stop and tell Tom:

```bash
docker version --format '{{.Server.Version}}' && docker compose version \
  && shellcheck --version | head -2 && actionlint -version | head -1
lsof -iTCP -sTCP:LISTEN | grep -E ':(4310|8099|4987|5055) ' || echo PORTS_FREE
```

Tom installed Docker Desktop and restarted VS Code so the Docker runtime connects. `shellcheck` and `actionlint` come from `brew install shellcheck actionlint`, which may not have been run yet. If they're missing, ask Tom before installing.

**How to execute**

- **Tasks 1–7** go to subagents, one fresh implementer and one reviewer per task, in order. Each task builds on the previous one's interfaces (listed under **Interfaces** in each task). Give each subagent the plan's Global Constraints and Review Focus along with its task.
- **Subagents must never** push, tag, force-push, run `gh` commands that change GitHub state, or touch the server. The plan's Global Constraints say this too, so repeat it in every subagent prompt.
- **Tasks 8–9 are controller-only.** Run them yourself, and get Tom's explicit go-ahead before _each_ step marked "(confirm)": the archive tag, the force-push that resets `main`, pushing branches, creating and merging PRs, branch protection, deleting `development`, and pushing the `v1.0.0` tag. Steps marked "(Tom …)" happen on the server or in the GitHub UI. Give Tom the exact commands from the plan and wait for his results.
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

**Things to watch for**

- Task 2's smoke test must **fail before** the `/api` proxy change, with the path arriving as `/weather/current`, and pass after it. That red-to-green is the evidence the prefix fix works.
- Task 4's `deploy/test/run-tests.sh` takes about 1–2 minutes, because the two broken-image cases each wait out `HEALTH_TIMEOUT=20`.
- The whole pipeline must work on the Ubuntu server (GNU tools) as well as on the Mac (bash 3.2, BSD tools). Reviewers should reject `sed -i`, `xargs -r`, `readlink -f`, `mapfile` and other bash 4 features.
- `npx prettier --check .` runs in CI and also covers `.md` and `.yml` files. Format new files before committing.
- In Task 9 step 4, Tom reports the old container's env (`BACKEND_ORIGIN`, `ORIGIN`) and cloudflared's target port. `HOST_PORT` must equal that target port. If the old `BACKEND_ORIGIN` ends in `/api`, that's expected: the proxy used to strip the prefix. The new value is the bare `http://host.docker.internal:8000`.

**When done:** summarise for Tom what shipped, the CI run results, the stale-branch report from Task 8 step 8, and anything left open. For example: removing the old container after a week, and gbros-api's port 8000 being exposed on the LAN (see the spec's "Noted, not addressed here").
