---
name: branch-cleanup
description: After a PR merges, remove its worktree and local branch safely (checks that the branch is merged into origin/staging or origin/main and never forces). Also lists stale worktrees and branches. Use when a PR has merged, when Tom asks to tidy up branches or worktrees, or at the end of a finished task.
---

# Clean up merged work

CLAUDE.md says not to leave finished worktrees or branches behind. It also warns that plain `git branch -d` refuses branches that are only in `staging`. This script checks for merges against `origin/staging` and `origin/main` and uses `-D` only after that check passes.

```sh
.claude/skills/branch-cleanup/cleanup.sh              # report only: what's safe to remove and why not
.claude/skills/branch-cleanup/cleanup.sh <branch>     # remove one branch and its worktree
.claude/skills/branch-cleanup/cleanup.sh --merged     # remove everything that's merged and clean
```

Run it from any checkout of the repo. It works from the main checkout itself. It fetches with `--prune` first and finishes with `git worktree prune`.

## When it won't remove something

- `dirty`: the worktree has uncommitted changes. Tell Tom what they are (`git -C <path> status`). Don't discard them.
- `locked`: a Claude session holds the worktree. If it's this session's worktree, leave it with `ExitWorktree` (`action: "remove"`) instead. Otherwise it may belong to another live session, so ask Tom.
- `keep ... not merged`: the PR hasn't merged, or it was closed without merging. Deleting a branch like that loses work, so ask Tom.

The script never touches `main` or `staging`, and never touches whatever branch the main checkout has checked out.
