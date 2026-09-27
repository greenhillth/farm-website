#!/usr/bin/env bash
# PreToolUse guard for the rules in CLAUDE.md that can't be undone.
#   deny: force-push, pushing to main, deleting main/staging, `npm audit fix --force`,
#         hand edits to .env files and package-lock.json
#   ask:  pushing tags, merging PRs, changing branch protection/rulesets, deploy scripts
# "ask" shows Tom a permission prompt, so a step he has approved can still go ahead.
set -uo pipefail

input=$(cat)
tool=$(jq -r '.tool_name // empty' <<<"$input")

decide() {
	jq -n --arg d "$1" --arg r "$2" \
		'{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: $d, permissionDecisionReason: $r}}'
	exit 0
}

case "$tool" in
Edit | Write | MultiEdit | NotebookEdit)
	f=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
	base=${f##*/}
	case "$base" in
	.env.example | .env.test) ;;
	.env | .env.*) decide deny "CLAUDE.md: runtime config and secrets live in .env, which isn't edited by hand. Ask Tom to change it." ;;
	package-lock.json) decide deny "CLAUDE.md: change dependencies with \`npm install <pkg>\` so the lockfile is regenerated, not edited." ;;
	esac
	exit 0
	;;
Bash) ;;
*) exit 0 ;;
esac

cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
# One line per simple command, so a match can't span `&&`, `;` or `|`.
segments=$(sed -E 's/(&&|\|\||;|\|)/\n/g' <<<"$cmd")

while IFS= read -r seg; do
	# Drop leading env assignments and whitespace.
	seg=$(sed -E 's/^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*//' <<<"$seg")
	[ -z "$seg" ] && continue
	read -ra w <<<"$seg"

	if [[ $seg =~ ^npm[[:space:]]+audit[[:space:]]+fix ]] && [[ $seg =~ --force ]]; then
		decide deny "CLAUDE.md: never run \`npm audit fix --force\`; it downgrades @sveltejs/kit to 0.0.x."
	fi

	if [[ $seg =~ ^git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push([[:space:]]|$) ]]; then
		for a in "${w[@]}"; do
			case "$a" in
			-f | --force | --force-with-lease* | --force-if-includes | +*)
				decide deny "CLAUDE.md: never force-push." ;;
			-d | --delete | :main | :staging)
				[[ $seg =~ (^|[[:space:]:])(main|staging)([[:space:]]|$) ]] &&
					decide deny "CLAUDE.md: main and staging are never deleted." ;;
			main | *:main | refs/heads/main | *:refs/heads/main)
				decide deny "CLAUDE.md: main only changes through PRs. Push your branch and open a PR instead." ;;
			--tags | --follow-tags | --mirror | v[0-9]* | refs/tags/* | *:refs/tags/*)
				decide ask "CLAUDE.md: pushed v* tags can't be moved or deleted. Needs Tom's explicit go-ahead (and scripts/check-release.sh first)." ;;
			esac
		done
	fi

	if [[ $seg =~ ^gh[[:space:]]+pr[[:space:]]+merge ]]; then
		decide ask "CLAUDE.md: merging a PR needs Tom's explicit go-ahead in this conversation."
	fi

	if [[ $seg =~ ^gh[[:space:]]+(api|ruleset) ]] && [[ $seg =~ (rulesets|protection|packages) ]] &&
		[[ $seg =~ (-X|--method)[[:space:]]*(POST|PUT|PATCH|DELETE)|[[:space:]](-f|-F|--field|--raw-field|--input)[[:space:]] ]]; then
		decide ask "CLAUDE.md: branch protection, rulesets and GHCR settings only change when Tom asks."
	fi

	if [[ $seg =~ ^((sudo|bash|sh)[[:space:]]+)*[^[:space:]]*deploy\.sh([[:space:]]|$) ]] || [[ $seg =~ ^ssh[[:space:]].*deploy\.sh ]]; then
		decide ask "CLAUDE.md: deploy scripts run on the production server and needs Tom's explicit go-ahead."
	fi
done <<<"$segments"

exit 0
