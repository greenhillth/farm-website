#!/usr/bin/env bash
# Remove worktrees and local branches whose work has been integrated (CLAUDE.md "Delete
# worktrees once their work is integrated"). Run from any checkout of the repo.
#
#   cleanup.sh              list every worktree/branch and whether it's safe to remove
#   cleanup.sh <branch>     remove that branch's worktree (if any) and the branch
#   cleanup.sh --merged     remove every branch that is merged and has a clean, unlocked worktree
#
# Never forces: a worktree with uncommitted changes, or a locked one (a live Claude session),
# is reported and left alone.
set -uo pipefail

common=$(git rev-parse --path-format=absolute --git-common-dir)
main_checkout=$(dirname "$common")
cd "$main_checkout" || exit 1
git fetch --quiet --prune origin

protected='^(main|staging)$'

merged_into() {
	local b=$1 t pr
	# A branch with no commits of its own is an ancestor of staging too, so also require a
	# merged PR on GitHub for it before calling it integrated.
	pr=$(gh pr list --head "$b" --state merged --json number --jq '.[0].number' 2>/dev/null)
	[ -n "$pr" ] || return 1
	for t in origin/staging origin/main; do
		git show-ref --quiet "refs/remotes/$t" || continue
		if git merge-base --is-ancestor "$b" "$t" 2>/dev/null; then
			echo "${t#origin/}"
			return 0
		fi
	done
	return 1
}

worktree_of() { # prints "path locked?" for the worktree that has $1 checked out
	git worktree list --porcelain | awk -v b="refs/heads/$1" '
		function emit() { if (br == b) print p, (l ? "locked" : "unlocked"); br = "" }
		/^worktree / { p = substr($0, 10); l = 0; br = "" }
		/^branch / { br = $2 }
		/^locked/ { l = 1 }
		/^$/ { emit() }
		END { emit() }'
}

status_of() {
	local b=$1 into wt path lock
	into=$(merged_into "$b") || into=""
	wt=$(worktree_of "$b")
	path=${wt% *}
	lock=${wt##* }
	if [ -z "$into" ]; then
		echo "keep   $b: no merged PR, or not in origin/staging or origin/main"
	elif [ -n "$wt" ] && [ "$path" = "$main_checkout" ]; then
		echo "keep   $b: checked out in the main checkout"
	elif [ -n "$wt" ] && [ "$lock" = locked ]; then
		echo "locked $b: merged into $into, but $path is locked (a Claude session may still be using it)"
	elif [ -n "$wt" ] && [ -n "$(git -C "$path" status --porcelain 2>/dev/null)" ]; then
		echo "dirty  $b: merged into $into, but $path has uncommitted changes"
	else
		echo "remove $b: merged into $into${wt:+, worktree $path}"
	fi
}

remove() {
	local b=$1 s wt path
	s=$(status_of "$b")
	echo "$s"
	[ "${s%% *}" = remove ] || return 1
	wt=$(worktree_of "$b")
	path=${wt% *}
	if [ -n "$wt" ]; then
		git worktree remove "$path" || return 1
	fi
	git branch --quiet -D "$b" && echo "       deleted $b"
}

branches=$(git for-each-ref --format='%(refname:short)' refs/heads | grep -Ev "$protected")

case "${1:-}" in
"")
	for b in $branches; do status_of "$b"; done
	;;
--merged)
	for b in $branches; do
		[ "$(status_of "$b" | cut -d' ' -f1)" = remove ] && remove "$b"
	done
	;;
*)
	[[ $1 =~ $protected ]] && { echo "refusing to remove $1" >&2; exit 1; }
	git show-ref --quiet "refs/heads/$1" || { echo "no local branch $1" >&2; exit 1; }
	remove "$1" || exit 1
	;;
esac

git worktree prune
