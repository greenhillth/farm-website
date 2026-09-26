# Git workflow

How changes get from your editor to production. The short version:

1. `main` is always production-ready. Nobody pushes to it directly.
2. Every change starts on a short-lived branch cut from the latest `main`.
3. The branch goes into `main` through a pull request (PR). CI must pass before it can merge.
4. A release is a `vX.Y.Z` tag on `main`. The tag builds the Docker image, and you deploy that tag on the server.

```
feat/soil-chart ──┐
fix/login-typo ───┼──► PR ──► CI green ──► merge into main ──► tag v1.3.0 ──► deploy.sh v1.3.0
docs/readme ──────┘
```

There is no `development` branch. `main` plus short-lived branches is the whole model.

For a start-to-finish walkthrough of a feature or bug fix, by hand or with Claude Code, and for using worktrees to run several pieces of work side by side, see [Branches, worktrees and the everyday flow](branches-and-worktrees.md).

## What GitHub enforces

These are GitHub rulesets (Settings → Rules → Rulesets), so you can't break them by accident:

| Rule                                                                  | What it means for you                                                                         |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| No direct pushes to `main`                                            | `git push origin main` is rejected. Open a PR instead.                                        |
| PRs into `main` need `checks`, `container` and `deploy-tests` to pass | The merge button stays grey until CI is green.                                                |
| Merge commits only                                                    | The only merge option is "Create a merge commit". Your branch's commits are kept as they are. |
| `main` can't be deleted or force-pushed                               | History on `main` never gets rewritten.                                                       |
| `v*` tags can't be moved or deleted                                   | Once `v1.3.0` is pushed, it means that commit forever. A mistake gets a new version number.   |
| Merged branches are deleted on GitHub automatically                   | You don't have to clean up the remote. Delete your local copy yourself (see below).           |

As the repo admin you can still merge a PR whose checks failed (the "bypass" option). Only do that in an emergency.

## Branch names

| Prefix     | Use it for                                                      | Example                |
| ---------- | --------------------------------------------------------------- | ---------------------- |
| `feat/`    | New features or behaviour                                       | `feat/paddock-history` |
| `fix/`     | Bug fixes, including urgent production fixes                    | `fix/csv-date-offset`  |
| `docs/`    | Documentation only                                              | `docs/deploy-guide`    |
| `chore/`   | Dependencies, tooling, config, refactors with no visible change | `chore/upgrade-vite`   |
| `release/` | The version bump before a release                               | `release/v1.3.0`       |

Keep names short, lowercase, words joined with `-`.

## The everyday loop

```sh
git switch main
git pull                                  # start from the latest main
git switch -c feat/paddock-history        # new branch

# ...edit, then check locally...
npm run check
npm test
npx prettier --check .                    # or `npm run format` to fix formatting

git add -A
git commit -m "Show soil test history per paddock"
git push -u origin feat/paddock-history   # first push; afterwards just `git push`

gh pr create --fill                       # or use the "Compare & pull request" button on GitHub
gh pr checks --watch                      # wait for CI
gh pr merge --merge                       # or the green button on the PR page, once it's enabled
```

Then clean up locally:

```sh
git switch main
git pull
git branch -d feat/paddock-history        # -d refuses if the branch isn't merged, which is what you want
git fetch --prune                         # forget remote branches GitHub has deleted
```

Merging into `main` does **not** deploy anything. Shipping is a separate, deliberate step: see [Deploying](deploying.md).

## When to do what

| Situation                                       | What to do                                                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Starting any change, however small              | New branch from a freshly pulled `main`. A typo fix is still a branch and a PR; the PR is quick, and CI still checks it.                                                 |
| Two unrelated changes                           | Two branches, two PRs. Small PRs are easier to review, revert and release.                                                                                               |
| You committed on `main` by mistake (not pushed) | `git switch -c fix/whatever` keeps the commit on a new branch. Then `git switch main` and `git reset --hard origin/main` to put `main` back.                             |
| CI fails on your PR                             | Open the failed check, read the log, fix it on the same branch and `git push`. CI reruns by itself. See [When something goes red](deploying.md#when-something-goes-red). |
| CI failed for a flaky reason (network, runner)  | On the PR, open the check and click "Re-run jobs".                                                                                                                       |
| `main` moved on while your PR was open          | Nothing to do unless GitHub reports a conflict. If it does: `git fetch origin` then `git merge origin/main` on your branch, fix the conflicts, commit, push.             |
| You want to redo your branch's last commit      | Only on your own branch that nobody else uses: `git commit --amend`, then `git push --force-with-lease`. Never on `main`.                                                |
| Work you've abandoned                           | Close the PR without merging and delete the branch.                                                                                                                      |
| Dependabot opens a PR (monthly)                 | Let CI run. Green and a minor or patch update: merge it. Major updates: read the changelog first. TypeScript majors are ignored on purpose (see CLAUDE.md).              |
| Ready to ship what's on `main`                  | Make a release (see [Deploying](deploying.md)). Batch several merged PRs into one release if you like.                                                                   |
| Production is broken                            | Roll back first (`deploy.sh <previous tag>` on the server), then fix on a `fix/` branch and release a patch version.                                                     |

## Things not to do

- Don't commit secrets or `.env` files. Runtime config lives only in the server's `.env`.
- Don't tag a commit that isn't on `main`, or tag before the release PR has merged. The release workflow rejects it, and the tag can't be deleted afterwards.
- Don't reuse or move a version number. If `v1.3.0` was wrong, release `v1.3.1`.
- Don't use `git push --force` on `main` (it's blocked anyway) or on a branch someone else is working on.
- Don't run `npm audit fix --force` (see CLAUDE.md).
