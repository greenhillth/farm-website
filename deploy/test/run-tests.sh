#!/usr/bin/env bash
# Integration tests for deploy/deploy.sh against a throwaway local registry. Needs Docker.
#   deploy/test/run-tests.sh
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
DEPLOY_DIR=$(dirname "$HERE")
REG_PORT=${REG_PORT:-5055}
TEST_PORT=${TEST_PORT:-4987}
REPO=localhost:$REG_PORT/farm-deploy-test
REG_NAME=farm-deploy-test-registry
export HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-20}
WORK=$(mktemp -d)
FAILED=0

pass() { echo "ok   $*"; }
fail() {
	echo "FAIL $*"
	FAILED=1
}

cleanup() {
	local d ref
	for d in "$WORK"/*/; do
		if [ -f "$d/compose.yml" ]; then (cd "$d" && docker compose down --remove-orphans >/dev/null 2>&1) || true; fi
	done
	docker rm -f "$REG_NAME" >/dev/null 2>&1 || true
	for ref in $(docker images "$REPO" --format '{{.Repository}}:{{.Tag}}'); do
		docker rmi "$ref" >/dev/null 2>&1 || true
	done
	rm -rf "$WORK"
}
trap cleanup EXIT

new_site() { # new_site NAME -> prints the path of a fresh deploy dir with an empty IMAGE_TAG
	local dir="$WORK/$1"
	mkdir -p "$dir"
	cp "$DEPLOY_DIR/compose.yml" "$DEPLOY_DIR/deploy.sh" "$dir/"
	cat >"$dir/.env" <<EOF
COMPOSE_PROJECT_NAME=farmdeploytest-$1
IMAGE_REPO=$REPO
IMAGE_TAG=
HOST_PORT=$TEST_PORT
EOF
	echo "$dir"
}

env_val() { grep "^$2=" "$1/.env" | cut -d= -f2-; }
served() { curl -fsS "http://127.0.0.1:$TEST_PORT/" 2>/dev/null || echo "(nothing)"; }

echo "--- building fixtures"
docker run -d --name "$REG_NAME" -p "127.0.0.1:$REG_PORT:5000" registry:2 >/dev/null
for _ in $(seq 1 20); do
	if curl -fs "http://127.0.0.1:$REG_PORT/v2/" >/dev/null; then break; fi
	sleep 1
done
for v in v1.0.0 v1.0.1 v1.0.3 v1.0.4 v1.0.5; do
	docker build -q --build-arg VERSION=$v -t "$REPO:$v" -f "$HERE/fixture.Dockerfile" "$HERE" >/dev/null
done
printf 'FROM %s\nCMD ["false"]\n' "$REPO:v1.0.1" | docker build -q -t "$REPO:v1.0.2" - >/dev/null
# v1.0.6 can't even start (missing entrypoint), so `docker compose up` itself fails.
printf 'FROM %s\nENTRYPOINT ["/nonexistent"]\n' "$REPO:v1.0.1" | docker build -q -t "$REPO:v1.0.6" - >/dev/null
for v in v1.0.0 v1.0.1 v1.0.2 v1.0.3 v1.0.4 v1.0.5 v1.0.6; do
	docker push -q "$REPO:$v" >/dev/null
	docker rmi "$REPO:$v" >/dev/null # deploy.sh must pull from the registry
done

A=$(new_site a)

echo "--- 1: malformed tags are rejected before any pull"
for bad in 1.0.1 v1.0 latest; do
	if out=$("$A/deploy.sh" "$bad" 2>&1); then
		fail "accepted '$bad'"
	elif echo "$out" | grep -q "not a release tag" && ! echo "$out" | grep -q Pulling; then
		pass "rejected '$bad' before pulling"
	else
		fail "'$bad' not rejected by the tag check: $out"
	fi
done
if [ -z "$(env_val "$A" IMAGE_TAG)" ]; then pass ".env untouched"; else fail ".env IMAGE_TAG changed"; fi
if [ ! -f "$A/deploy.log" ]; then pass "nothing logged"; else fail "deploy.log: $(cat "$A/deploy.log")"; fi

echo "--- 2: first deploy, run by absolute path from another directory"
if (cd / && "$A/deploy.sh" v1.0.0); then pass "deployed v1.0.0"; else fail "deploy v1.0.0 exited non-zero"; fi
if [ "$(served)" = v1.0.0 ]; then pass "serving v1.0.0"; else fail "serving $(served), want v1.0.0"; fi
if grep -q "none -> v1.0.0 ok" "$A/deploy.log"; then pass "logged first deploy"; else fail "deploy.log: $(cat "$A/deploy.log" 2>/dev/null)"; fi

echo "--- 3: upgrade"
if "$A/deploy.sh" v1.0.1 >/dev/null && [ "$(served)" = v1.0.1 ]; then pass "upgraded to v1.0.1"; else fail "upgrade: serving $(served)"; fi

echo "--- 4: missing tag changes nothing"
if "$A/deploy.sh" v9.9.9 >/dev/null 2>&1; then fail "v9.9.9 reported success"; else pass "v9.9.9 failed"; fi
if [ "$(served)" = v1.0.1 ] && [ "$(env_val "$A" IMAGE_TAG)" = v1.0.1 ]; then pass "still on v1.0.1"; else fail "after missing tag: serving $(served), .env $(env_val "$A" IMAGE_TAG)"; fi

echo "--- 5: broken image rolls back"
if "$A/deploy.sh" v1.0.2 >/dev/null 2>&1; then fail "broken v1.0.2 reported success"; else pass "broken v1.0.2 failed"; fi
if [ "$(served)" = v1.0.1 ] && [ "$(env_val "$A" IMAGE_TAG)" = v1.0.1 ]; then pass "rolled back to v1.0.1"; else fail "after rollback: serving $(served), .env $(env_val "$A" IMAGE_TAG)"; fi
if grep -q "v1.0.1 -> v1.0.2 FAILED, rolled back to v1.0.1" "$A/deploy.log"; then pass "logged rollback"; else fail "deploy.log: $(cat "$A/deploy.log")"; fi

echo "--- 6: redeploying the running tag"
if "$A/deploy.sh" v1.0.1 >/dev/null && [ "$(served)" = v1.0.1 ]; then pass "redeployed v1.0.1"; else fail "redeploy v1.0.1: serving $(served)"; fi

echo "--- 7: keeps only the newest 3 images"
for v in v1.0.3 v1.0.4 v1.0.5; do "$A/deploy.sh" "$v" >/dev/null || fail "deploy $v"; done
tags=$(docker images "$REPO" --format '{{.Tag}}' | sort -V | tr '\n' ' ')
if [ "$tags" = "v1.0.3 v1.0.4 v1.0.5 " ]; then pass "kept $tags"; else fail "images left: $tags"; fi

echo "--- 8: status"
status=$("$A/deploy.sh" --status)
if echo "$status" | grep -q "running: v1.0.5 (healthy)"; then pass "status shows v1.0.5 healthy"; else fail "status: $status"; fi
(cd "$A" && docker compose down >/dev/null 2>&1)

echo "--- 9: failed first deploy leaves nothing running"
B=$(new_site b)
if "$B/deploy.sh" v1.0.2 >/dev/null 2>&1; then fail "broken first deploy reported success"; else pass "broken first deploy failed"; fi
state=$(cd "$B" && docker inspect -f '{{.State.Status}}' "$(docker compose ps -a -q web)" 2>/dev/null || echo missing)
if [ "$state" != running ] && [ "$state" != restarting ]; then pass "nothing running ($state)"; else fail "container is $state"; fi
if [ -z "$(env_val "$B" IMAGE_TAG)" ]; then pass ".env IMAGE_TAG cleared"; else fail ".env IMAGE_TAG is $(env_val "$B" IMAGE_TAG), want empty"; fi
if grep -q "none -> v1.0.2 FAILED, no previous release; stopped" "$B/deploy.log"; then pass "logged failed first deploy"; else fail "deploy.log: $(cat "$B/deploy.log" 2>/dev/null)"; fi
(cd "$B" && docker compose down >/dev/null 2>&1)

echo "--- 10: failed compose up rolls back"
C=$(new_site c)
"$C/deploy.sh" v1.0.5 >/dev/null || fail "deploy v1.0.5"
if "$C/deploy.sh" v1.0.6 >/dev/null 2>&1; then fail "unstartable v1.0.6 reported success"; else pass "unstartable v1.0.6 failed"; fi
if [ "$(served)" = v1.0.5 ] && [ "$(env_val "$C" IMAGE_TAG)" = v1.0.5 ]; then pass "rolled back to v1.0.5"; else fail "after failed up: serving $(served), .env $(env_val "$C" IMAGE_TAG)"; fi
if grep -q "v1.0.5 -> v1.0.6 FAILED, rolled back to v1.0.5" "$C/deploy.log"; then pass "logged rollback"; else fail "deploy.log: $(cat "$C/deploy.log" 2>/dev/null)"; fi

if [ "$FAILED" -ne 0 ]; then
	echo "deploy tests FAILED"
	exit 1
fi
echo "deploy tests passed"
