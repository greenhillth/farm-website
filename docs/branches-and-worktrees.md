# Branches, worktrees and the everyday flow

How to work on a feature or a bug fix from start to finish, by hand or with Claude Code, and how branches and worktrees keep separate pieces of work from getting in each other's way. It builds on [Git workflow](git-workflow.md), which covers the rules GitHub enforces. Releasing and deploying are in [Deploying](deploying.md).

## Two ideas

A **branch** is a name for a line of work. `main` is production. `staging` collects finished work until it's promoted to `main`. `feat/paddock-history` is one feature on its way into `staging`. Creating a branch is instant, and deleting one after it merges costs nothing.

A **worktree** is an extra folder with a different branch checked out. It doesn't replace branches: every worktree has a branch in it. Working with plain branches in one folder is fine when nothing else is using that folder. All the folders share one repository: the same history, remote and branches. A commit made in one folder shows up in `git log` in the others straight away. The difference is that each folder has its own files, its own checked-out branch and its own `node_modules`.

Without worktrees, one folder can only have one branch checked out. Switching means committing or stashing first. And anything else using that folder switches with you: your editor, a running dev server, an AI agent in the middle of a task. With worktrees, each piece of work gets its own folder and nothing moves under anyone.

This isn't hypothetical. On 2026-09-26, VS Code switched the main checkout to `main` while Claude was editing files there for a docs branch, and the commit landed on `main`. A worktree for Claude's work would have prevented it.

## Rules of thumb

These match what trunk-based development teams and the Claude Code docs recommend:

1. **One task, one branch, one folder.** Don't mix a feature and an unrelated fix on one branch, and never have two people or agents editing in the same folder at once.
2. **Short-lived branches.** Aim to merge within a day or two. Long-running branches drift from `staging` and end in painful merges. If a feature is big, split it into several PRs that each leave `staging` working.
3. **Always branch from the latest `staging`.** `git fetch` first. For worktrees, create them from `origin/staging`. Only an urgent production fix starts from `origin/main` (see [Git workflow](git-workflow.md#when-to-do-what)).
4. **Small PRs, merged often.** They're quicker to check, easier to revert, and CI catches problems while they're still small.
5. **Promote `staging` regularly.** Don't let it collect weeks of work. Promote it to `main` whenever it holds something worth shipping.
6. **Clean up.** Once a branch has merged, delete it and remove its worktree. A stale worktree keeps its branch checked out, and git won't check out the same branch in two folders.

## Branch or worktree?

| Situation                                                                         | Use                                                          |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| You're doing one thing at a time                                                  | A branch in your main folder is fine.                        |
| You're mid-feature and a bug needs fixing now                                     | A worktree for the fix. Your feature stays exactly as it is. |
| You want to try out someone's PR, or an old version, without disturbing your work | A worktree (`claude --worktree "#12"` does this for a PR).   |
| Claude Code is doing a task while you keep working in VS Code                     | A worktree for Claude. Always.                               |
| Several Claude sessions working in parallel                                       | One worktree each.                                           |
| A quick question to Claude that changes no files                                  | Neither: ask in any folder.                                  |

## Worktrees by hand

### Where to put them

For worktrees you create yourself, put them **next to** the repo, not inside it:

```
~/Projects/farm-website/
├── farm-website/                      # main checkout, on main
├── farm-website-feat-paddock-history/ # worktree for a feature
└── farm-website-fix-csv-dates/        # worktree for a bug fix
```

The folder name says which branch is inside. Sibling folders also avoid a quirk of this repo: a worktree nested inside the main checkout can fail to build with `Tsconfig not found .../farm-website/.svelte-kit/tsconfig.json` (see [Troubleshooting](#troubleshooting)).

Claude Code puts its own worktrees under `.claude/worktrees/<name>/` inside the repo. That folder is git-ignored and skipped by Prettier and ESLint.

### Commands

```sh
cd ~/Projects/farm-website/farm-website
git fetch origin

# New branch in a new sibling folder, starting from the latest staging.
# --no-track stops the new branch tracking origin/staging, so a stray `git push` can't aim at staging.
git worktree add --no-track -b feat/paddock-history ../farm-website-feat-paddock-history origin/staging

# Existing branch (e.g. one you pushed from another machine)
git worktree add ../farm-website-fix-csv-dates fix/csv-dates

git worktree list                     # every folder and the branch it has checked out
git worktree remove ../farm-website-fix-csv-dates   # refuses if there are uncommitted changes
git worktree prune                    # forget folders you deleted by hand
```

### Setting one up

A new worktree has the code but none of the git-ignored files: no `node_modules`, no `.svelte-kit`, no build output. In the new folder:

```sh
npm ci                     # its own node_modules, matching the lockfile
npx svelte-kit sync        # generates .svelte-kit/tsconfig.json
code .                     # open it in its own VS Code window
```

Only one dev server can use port 4001 (it's fixed in `vite.config.ts`). Give a second one its own port: `npm run dev -- --port 4011`. Both still proxy `/api` to the backend on port 8000, so one backend serves every worktree.

Keep one VS Code window per folder. Don't switch branches in a window whose folder an agent is working in.

## The flow for a feature, by hand

1. **Start clean.**

   ```sh
   git fetch origin
   git worktree add --no-track -b feat/paddock-history ../farm-website-feat-paddock-history origin/staging
   cd ../farm-website-feat-paddock-history
   npm ci
   npx svelte-kit sync
   code .
   ```

   If you're not running anything else in parallel, `git switch staging && git pull && git switch -c feat/paddock-history` in the main folder is fine too.

2. **Build it in small commits.** Commit whenever a step works. Each commit message says what changed, in the imperative ("Show soil test history per paddock").
3. **Test as you go.** Add or update tests in `*.test.ts` (logic) or `*.svelte.test.ts` (components). Check UI changes in the browser (`npm run dev`).
4. **Check before pushing.** Run the same checks CI runs:

   ```sh
   npm run check
   npm test
   npx prettier --check .
   npm run build
   scripts/smoke-test.sh --local
   ```

5. **Push and open a PR.**

   ```sh
   git push -u origin feat/paddock-history
   gh pr create --fill --base staging
   ```

   Write in the PR description what changed and how you checked it.

6. **Wait for CI, read your own diff on GitHub, merge into `staging`.** The **Files changed** tab is a good last look.
7. **Clean up.** Do this as soon as the PR merges, so finished worktrees don't pile up.

   ```sh
   cd ~/Projects/farm-website/farm-website
   git worktree remove ../farm-website-feat-paddock-history
   git switch staging
   git pull
   git branch -d feat/paddock-history
   git fetch --prune
   ```

8. **Promote and release when you want it live.** Merging into `staging` doesn't deploy anything. When `staging` is ready, promote it to `main` and release (see [Deploying](deploying.md)).

## The flow for a bug fix, by hand

The same as a feature, with two changes: **reproduce first** and **pin the bug with a test**.

1. Create a worktree on `fix/<what-is-broken>` from `origin/staging`.
2. Reproduce the bug: in the browser, or with a failing command. Write down the steps.
3. Write a test that fails because of the bug. For logic, that's a `*.test.ts` next to the code. For example, `src/lib/soil-tests/utils.test.ts` pins two known date bugs with `it.fails`.
4. Fix the code until the test passes. If the bug was pinned with `it.fails`, change it to a plain `it`.
5. Run the checks, push, open a PR, merge, clean up: steps 4–7 above.
6. Promote `staging` and release a **patch** version (`1.3.0` → `1.3.1`).

**Production is broken right now?** Roll back first, fix second. On the server, `/opt/farm-website/deploy.sh <previous tag>` puts the last good version back in seconds. Then do the fix above without rushing, and release the patch. If `staging` holds work you don't want to ship yet, branch the fix from `origin/main` instead, PR it into `main`, release, then open a PR from `main` into `staging`.

## The flow with Claude Code

The same steps, with Claude doing the typing and you deciding. Two rules matter most: **Claude works in its own worktree**, and **Claude doesn't merge, tag or deploy without your say-so** (CLAUDE.md enforces the second).

### Starting a session

```sh
cd ~/Projects/farm-website/farm-website
claude --worktree paddock-history
```

Claude Code creates `.claude/worktrees/paddock-history/` on a new branch called `worktree-paddock-history`, from the latest `origin/main`. In a session that's already running, you can say "work in a worktree".

Two things to tell Claude up front:

- **The branch name you want on GitHub.** Claude's `worktree-<name>` branches start from `origin/main` and don't follow this repo's prefixes. CLAUDE.md tells Claude to move to a properly named branch from `origin/staging` before it starts. You can still name the branch in your brief: "use `feat/paddock-history`". Or create the worktree yourself as in [Worktrees by hand](#worktrees-by-hand) and start `claude` inside it.
- **Setup.** A fresh worktree has no `node_modules`. Ask Claude to run `npm ci` first. The main checkout also needs `npx svelte-kit sync` run once for nested worktrees to build (see [Troubleshooting](#troubleshooting)).

### Briefing the task

A good brief is specific and says how you'll judge it:

> Add a per-paddock soil-test history panel to the map popup. Use `fetchSoilTests` from `src/lib/soil-tests/`. Done means: the popup lists every test for that paddock, newest first; there's a component test; `npm run check`, `npm test` and `npx prettier --check .` pass. Use the branch `feat/paddock-history`, push it and open a PR into `staging`. Don't merge.

- **Bigger or unclear changes:** ask for a plan first (plan mode, Shift+Tab), agree on it, then let Claude build it.
- **Bugs:** ask Claude to reproduce the bug and write a failing test before fixing it, as in the manual flow.
- **UI changes:** ask Claude to check them in a browser. It can run the dev server on its own port and screenshot the page.

### Reviewing and merging

1. Claude reports what it changed and the check results. Read the diff: `git -C .claude/worktrees/paddock-history diff origin/staging`, or the PR's **Files changed** tab.
2. Ask for changes in the same session. Claude commits them and pushes again, and CI reruns.
3. When CI is green and you're happy, merge the PR yourself, or tell Claude "merge it". CLAUDE.md requires your explicit go-ahead for merges.
4. Once the PR has merged, delete the worktree. CLAUDE.md tells Claude to remove it and its local branch itself. If you exit the session first, Claude Code offers to remove it; choose remove. Keep a worktree only while its PR is still open. Kept worktrees are resumed with the `claude --worktree <name> --resume` command it prints.
5. Tidy up: `git worktree list` should show no finished worktrees, then `git fetch --prune`.

### Several sessions in parallel

Run separate tasks at the same time, each in its own terminal and its own worktree (`claude --worktree a`, `claude --worktree b`). `claude agents` shows them all on one screen. What makes it work:

- **Only truly independent tasks.** Different pages or modules. If two tasks would edit the same file, run them one after the other, or first make a small PR with the shared part (a type, a config entry, a helper) and start both from `staging` after it merges.
- **Keep it to a handful.** Anthropic suggests 3–5 parallel agents at most; beyond that, reviewing becomes the bottleneck.
- **Merge one PR at a time into `staging`.** After each merge, the other branches are behind `staging`. They only need updating if GitHub reports a conflict: ask that session to `git fetch origin` and `git merge origin/staging`, rerun the checks and push. Promote `staging` to `main` once they're all in.
- **Worktrees isolate files, not ideas.** They stop agents overwriting each other's edits, but not two designs that don't fit together. That's what planning first and reviewing each PR are for.

Inside one session, Claude can also start subagents in their own temporary worktrees. Ask it to "use worktrees for your agents", or add `isolation: worktree` to a custom agent in `.claude/agents/`.

### Git-ignored files in Claude's worktrees

A worktree gets only tracked files. If a task needs a git-ignored file such as a local `.env`, list it in a `.worktreeinclude` file at the repo root (same syntax as `.gitignore`), and Claude Code copies it into every worktree it creates. The frontend doesn't need one today.

## Cleaning up

Remove a worktree as soon as its PR has merged. Don't wait for a weekly tidy. Once a week, or whenever things feel cluttered, check for any that were missed:

```sh
git worktree list                      # anything finished? `git worktree remove <path>`
git worktree prune                     # forget folders deleted by hand
git fetch --prune                      # drop remote branches GitHub has deleted
git branch --merged origin/staging     # local branches already in staging: delete them
git branch --no-merged origin/staging  # unmerged work: finish it, or delete with -D if abandoned
```

`git branch -d` only counts a branch as merged if it's in the branch you have checked out, so run it with `staging` checked out, or use `-D` once `git branch --merged origin/staging` has listed the branch.

Claude Code also removes the worktrees it created for subagents and background sessions after a while, but only when they hold no unsaved work. Worktrees you made with `git worktree add` are yours to remove.

## Troubleshooting

| Symptom                                                                                                  | Cause                                                                                                           | Fix                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fatal: '<branch>' is already checked out at '<path>'`                                                   | A branch can only be checked out in one folder                                                                  | Use that folder, or remove the worktree holding it.                                                                                                           |
| `Tsconfig not found .../farm-website/.svelte-kit/tsconfig.json` in a worktree under `.claude/worktrees/` | Vite looks for a `tsconfig.json` up the folder tree and finds the main checkout's, which needs a generated file | Run `npx svelte-kit sync` once in the main checkout. Sibling worktrees don't have this problem.                                                               |
| `Port 4001 is already in use`                                                                            | Another worktree's dev server                                                                                   | `npm run dev -- --port 4011`                                                                                                                                  |
| Imports fail or the wrong versions load in a worktree                                                    | No `node_modules` of its own (Node falls back to the main checkout's)                                           | `npm ci` in the worktree.                                                                                                                                     |
| `git worktree remove` refuses                                                                            | Uncommitted changes, or the worktree is locked by a running Claude session                                      | Commit or discard the changes; `--force` discards them. Stop the session, or `git worktree unlock <path>`.                                                    |
| A commit landed on the wrong branch                                                                      | Something switched the folder's branch while you worked                                                         | If not pushed: `git branch <right-branch> <commit>` to save it, then `git reset --keep origin/<wrong-branch>` on the wrong branch. Use worktrees to avoid it. |

## Sources

- [Claude Code: Run parallel sessions with worktrees](https://code.claude.com/docs/en/worktrees) and [Run agents in parallel](https://code.claude.com/docs/en/agents)
- [Git: git-worktree reference](https://git-scm.com/docs/git-worktree)
- [Trunk Based Development: short-lived feature branches](https://trunkbaseddevelopment.com/short-lived-feature-branches/)
- [AWS DevOps Guidance: keep feature branches short-lived](https://docs.aws.amazon.com/wellarchitected/latest/devops-guidance/dl.scm.2-keep-feature-branches-short-lived.html)
- [Atlassian: trunk-based development](https://www.atlassian.com/continuous-delivery/continuous-integration/trunk-based-development)
