#!/usr/bin/env bash
# Smoke-test a built farm-website against a stub backend (scripts/stub-backend.mjs).
#
#   scripts/smoke-test.sh --local          test `node build` (run `npm run build` first)
#   scripts/smoke-test.sh --image <ref>    test a Docker image
#
# Env: APP_PORT (4310), STUB_PORT (8099).
set -euo pipefail
cd "$(dirname "$0")/.."

MODE=${1:-}
IMAGE=${2:-}
APP_PORT=${APP_PORT:-4310}
STUB_PORT=${STUB_PORT:-8099}
APP="http://127.0.0.1:$APP_PORT"
TMP=$(mktemp -d)
FAILED=0
STUB_PID=
APP_PID=
CID=

cleanup() {
	if [ -n "$APP_PID" ]; then kill "$APP_PID" 2>/dev/null || true; fi
	if [ -n "$STUB_PID" ]; then kill "$STUB_PID" 2>/dev/null || true; fi
	if [ -n "$CID" ]; then docker rm -f "$CID" >/dev/null 2>&1 || true; fi
	rm -rf "$TMP"
}
trap cleanup EXIT

pass() { echo "ok   $*"; }
fail() {
	echo "FAIL $*"
	FAILED=1
}

wait_for() { # wait_for URL SECONDS
	local i
	# shellcheck disable=SC2034 # loop counter, only used to bound retries
	for i in $(seq 1 "$2"); do
		if curl -s -o /dev/null "$1"; then return 0; fi
		sleep 1
	done
	echo "nothing answered at $1 after $2s" >&2
	return 1
}

expect_status() { # expect_status PATH CODE
	local code
	code=$(curl -s -o /dev/null -w '%{http_code}' "$APP$1")
	if [ "$code" = "$2" ]; then pass "GET $1 -> $code"; else fail "GET $1 -> $code (want $2)"; fi
}

expect_body() { # expect_body LABEL FILE NEEDLE
	if grep -qF -- "$3" "$2"; then pass "$1"; else fail "$1: '$3' not in $(cat "$2")"; fi
}

case "$MODE" in
--local)
	[ -f build/index.js ] || {
		echo "run npm run build first" >&2
		exit 2
	}
	STUB_HOST=127.0.0.1 STUB_PORT=$STUB_PORT node scripts/stub-backend.mjs &
	STUB_PID=$!
	HOST=127.0.0.1 PORT=$APP_PORT ORIGIN=$APP BACKEND_ORIGIN="http://127.0.0.1:$STUB_PORT" \
		BODY_SIZE_LIMIT=25M node build >"$TMP/app.log" 2>&1 &
	APP_PID=$!
	;;
--image)
	[ -n "$IMAGE" ] || {
		echo "usage: $0 --image <ref>" >&2
		exit 2
	}
	# 0.0.0.0 so the container can reach the stub through the Docker host gateway
	STUB_HOST=0.0.0.0 STUB_PORT=$STUB_PORT node scripts/stub-backend.mjs &
	STUB_PID=$!
	CID=$(docker run -d -p "127.0.0.1:$APP_PORT:3000" \
		--add-host host.docker.internal:host-gateway \
		-e ORIGIN="$APP" -e BACKEND_ORIGIN="http://host.docker.internal:$STUB_PORT" \
		-e BODY_SIZE_LIMIT=25M "$IMAGE")
	;;
*)
	echo "usage: $0 --local | --image <ref>" >&2
	exit 2
	;;
esac

wait_for "http://127.0.0.1:$STUB_PORT/" 10
wait_for "$APP/" 60

if [ -n "$CID" ]; then
	health=starting
	for _ in $(seq 1 30); do
		health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$CID")
		if [ "$health" = healthy ]; then break; fi
		sleep 1
	done
	if [ "$health" = healthy ]; then pass "container healthy"; else fail "container health: $health"; fi
	user=$(docker inspect -f '{{.Config.User}}' "$CID")
	if [ "$user" = node ]; then pass "runs as node"; else fail "runs as '$user' (want node)"; fi
fi

for p in / /map /soiltests /weather /weather/outdoor; do expect_status "$p" 200; done

curl -s "$APP/api/weather/current" >"$TMP/get.json"
expect_body "GET keeps the /api prefix" "$TMP/get.json" '"method":"GET","path":"/api/weather/current"'

curl -s "$APP/api/weather/history?from=1&to=2" >"$TMP/query.json"
expect_body "query string forwarded" "$TMP/query.json" '"path":"/api/weather/history?from=1&to=2"'

head -c 1048576 /dev/zero | tr '\0' 'a' >"$TMP/big.csv"
code=$(curl -s -o "$TMP/post.json" -w '%{http_code}' -H "Origin: $APP" \
	-F "file=@$TMP/big.csv;type=text/csv" "$APP/api/soil-tests/import")
if [ "$code" = 200 ]; then pass "1 MB same-origin upload -> 200"; else fail "1 MB same-origin upload -> $code: $(cat "$TMP/post.json")"; fi
expect_body "upload reaches backend as POST" "$TMP/post.json" '"method":"POST","path":"/api/soil-tests/import"'

code=$(curl -s -o /dev/null -w '%{http_code}' -H "Origin: https://evil.example" \
	-F "file=@$TMP/big.csv;type=text/csv" "$APP/api/soil-tests/import")
if [ "$code" = 403 ]; then pass "cross-site upload -> 403"; else fail "cross-site upload -> $code (want 403)"; fi

code=$(curl -s -o "$TMP/chunked.json" -w '%{http_code}' -H "Origin: $APP" \
	-H 'Transfer-Encoding: chunked' --data-binary "@$TMP/big.csv" "$APP/api/soil-tests/import")
if [ "$code" = 200 ]; then pass "chunked upload -> 200"; else fail "chunked upload -> $code: $(cat "$TMP/chunked.json")"; fi

if [ "$FAILED" -ne 0 ]; then
	if [ -f "$TMP/app.log" ]; then cat "$TMP/app.log"; fi
	if [ -n "$CID" ]; then docker logs "$CID"; fi
	exit 1
fi
echo "smoke test passed"
