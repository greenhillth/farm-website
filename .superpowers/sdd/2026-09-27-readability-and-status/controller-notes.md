# Controller notes (apply to every task)

- Worktree: /home/tom/gbros/farm-website/.claude/worktrees/readability-and-status, branch feat/readability-and-status (already created from origin/staging; `npm ci` already run). Don't switch branches, don't push.
- ESLint baseline recorded by the controller: 81 errors. Don't add to it.
- The skill `frontend-design:frontend-design` may not be available to you; if not, read docs/superpowers/specs/2026-09-27-ui-direction.md instead (the plan says it wins anyway).
- Between Task 2 and Task 8, `npm run check` may report type errors in the weather pages and the home page test fixture (they don't pass `mockFields` yet); later tasks fix those. That is accepted. Anything else failing is not.
- Put screenshots and temp files under /home/tom/.claude/jobs/c1ce1627/tmp, not /tmp.
- Run git as plain `git ...` commands from the worktree directory (no `cd x && git`, no `git -C`): a guard hook rejects compound forms.
- A PostToolUse hook in .claude/ may auto-format files you edit; that's fine.
