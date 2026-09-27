#!/usr/bin/env bash
# Run the CI `checks` job locally (see .github/workflows/ci.yml), without stopping at the
# first failure, and print a summary. Exit status is non-zero if any blocking step failed.
#   run.sh          all steps
#   run.sh --quick  skip build and smoke test (for changes that don't touch the app)
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

QUICK=0
[ "${1:-}" = "--quick" ] && QUICK=1
LOG=$(mktemp -d)
NAMES=()
RESULTS=()

step() {
	local name=$1
	shift
	local log="$LOG/${#NAMES[@]}.log"
	printf '%-28s ' "$name"
	if "$@" >"$log" 2>&1; then
		echo ok
		RESULTS+=(ok)
	else
		echo "FAIL  (log: $log)"
		tail -n 25 "$log" | sed 's/^/    /'
		RESULTS+=(FAIL)
	fi
	NAMES+=("$name")
}

[ -d node_modules ] || step "npm ci" npm ci
step "npm run check" npm run check
step "npm test" npm test
step "prettier --check" npx prettier --check .
if [ $QUICK -eq 0 ]; then
	step "npm run build" npm run build
	step "smoke-test --local" scripts/smoke-test.sh --local
fi
step "shellcheck" shellcheck scripts/*.sh scripts/test/*.sh deploy/deploy.sh deploy/test/run-tests.sh
step "check-release test" scripts/test/check-release.test.sh

# ESLint is non-blocking in CI while the backlog is cleared; report the count only.
if npx eslint . --format json --output-file "$LOG/eslint.json" >/dev/null 2>&1 || [ -s "$LOG/eslint.json" ]; then
	count=$(node -e "console.log(String(require('$LOG/eslint.json').reduce((n, f) => n + f.errorCount, 0)))" 2>/dev/null || echo '?')
	printf '%-28s %s errors (non-blocking; compare with staging)\n' "eslint" "$count"
fi

fails=0
for r in "${RESULTS[@]}"; do [ "$r" = FAIL ] && fails=$((fails + 1)); done
echo
if [ $fails -eq 0 ]; then echo "preflight: all ${#RESULTS[@]} steps passed"; else echo "preflight: $fails of ${#RESULTS[@]} steps FAILED"; fi
[ $fails -eq 0 ]
