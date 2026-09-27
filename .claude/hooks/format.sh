#!/usr/bin/env bash
# PostToolUse: run Prettier on a file Claude just edited, so `prettier --check .` in CI stays green.
# Works in the main checkout and in worktrees (falls back to the main checkout's Prettier
# when the worktree has no node_modules yet). Never blocks: formatting failures are ignored.
set -uo pipefail

f=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
[ -f "$f" ] || exit 0

root=$(git -C "$(dirname "$f")" rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -f "$root/.prettierrc" ] || exit 0

prettier="$root/node_modules/.bin/prettier"
[ -x "$prettier" ] || prettier="${CLAUDE_PROJECT_DIR:-}/node_modules/.bin/prettier"
[ -x "$prettier" ] || exit 0

cd "$root" && "$prettier" --write --ignore-unknown --log-level warn "$f" >/dev/null 2>&1
exit 0
