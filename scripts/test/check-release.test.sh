#!/usr/bin/env bash
# Tests for scripts/check-release.sh using a throwaway git repo.
set -euo pipefail
CHECK=$(cd "$(dirname "$0")/.." && pwd)/check-release.sh
REPO=$(mktemp -d)
trap 'rm -rf "$REPO"' EXIT
FAILED=0

expect() { # expect pass|fail DESCRIPTION -- command...
	local want=$1 desc=$2
	shift 3
	if "$@" >/dev/null 2>&1; then got=pass; else got=fail; fi
	if [ "$got" = "$want" ]; then echo "ok   $desc"; else
		echo "FAIL $desc (got $got)"
		FAILED=1
	fi
}

cd "$REPO"
git init -q -b main
git config user.email test@example.com
git config user.name test
echo '{"name":"x","version":"1.0.0"}' >package.json
git add package.json && git commit -qm one
git tag v1.0.0
git tag v1.0.1
git switch -qc feature
echo '{"name":"x","version":"1.1.0"}' >package.json
git commit -qam two
git tag v1.1.0
git switch -q main

expect pass "tag on main with matching version" -- "$CHECK" v1.0.0 main
expect fail "version mismatch" -- "$CHECK" v1.0.1 main
expect fail "tag not on main" -- "$CHECK" v1.1.0 main
expect fail "malformed tag" -- "$CHECK" 1.0.0 main
expect fail "unknown tag" -- "$CHECK" v9.9.9 main

if [ "$FAILED" -ne 0 ]; then exit 1; fi
echo "check-release tests passed"
