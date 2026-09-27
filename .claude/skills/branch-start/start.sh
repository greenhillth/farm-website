#!/usr/bin/env bash
# Put a worktree on a fresh <prefix>/<name> branch from origin/staging and install deps.
#
#   start.sh feat/paddock-history            base: origin/staging
#   start.sh fix/csv-dates --from main       urgent production fix only (Tom must ask for it)
#
# Run inside a worktree Claude just made with EnterWorktree (branch `worktree-*`): it switches
# that worktree to the new branch and deletes the `worktree-*` branch.
# Run from the main checkout: it creates .claude/worktrees/<name> itself and prints the path
# to pass to EnterWorktree.
set -euo pipefail

branch=${1:?usage: start.sh <prefix>/<name> [--from main]}
base=origin/staging
[ "${2:-}" = "--from" ] && base="origin/${3:?--from needs a branch}"

case "$branch" in
feat/* | fix/* | docs/* | chore/* | release/v*) ;;
*)
	echo "branch must start with feat/ fix/ docs/ chore/ or release/vX.Y.Z (got: $branch)" >&2
	exit 1
	;;
esac

top=$(git rev-parse --show-toplevel)
common=$(git rev-parse --path-format=absolute --git-common-dir)
main_checkout=$(dirname "$common")

git fetch --quiet origin
if git show-ref --quiet "refs/heads/$branch" || git show-ref --quiet "refs/remotes/origin/$branch"; then
	echo "branch $branch already exists; pick another name or reuse its worktree (git worktree list)" >&2
	exit 1
fi

if [ "$top" = "$main_checkout" ]; then
	name=${branch#*/}
	dir="$main_checkout/.claude/worktrees/$name"
	[ -e "$dir" ] && { echo "$dir already exists" >&2; exit 1; }
	git worktree add --quiet --no-track -b "$branch" "$dir" "$base"
	cd "$dir"
else
	old=$(git branch --show-current)
	if [ -n "$(git status --porcelain)" ]; then
		echo "worktree has uncommitted changes; commit or move them before switching" >&2
		exit 1
	fi
	git switch --quiet --no-track -c "$branch" "$base"
	case "$old" in worktree-*) git branch --quiet -D "$old" ;; esac
	dir=$top
fi

echo "branch $branch from $base in $dir"

# Dependencies: each worktree has its own.
if [ -f package-lock.json ]; then
	echo "npm ci ..."
	if ! npm ci --silent; then
		echo "npm ci failed. If it says 'Tsconfig not found .../.svelte-kit/tsconfig.json', run" >&2
		echo "  (cd $main_checkout && npx svelte-kit sync)  and rerun npm ci here." >&2
		exit 1
	fi
elif [ -f pyproject.toml ]; then
	echo "uv venv + pip install -e . pytest ..."
	uv venv --quiet --python 3.12 .venv
	uv pip install --quiet --python .venv/bin/python -e . pytest
fi

[ "$top" = "$main_checkout" ] && echo "next: EnterWorktree with path $dir"
echo "done. Open the PR with: gh pr create --base ${base#origin/}"
