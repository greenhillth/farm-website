#!/usr/bin/env bash
# Deploy a farm-website release on this server.
#
#   ./deploy.sh vX.Y.Z    pull that image, switch to it, roll back if it isn't healthy
#   ./deploy.sh --status  show the running tag, its health and recent deploys
#
# Reads and updates .env next to this script (IMAGE_TAG, HOST_PORT, optional IMAGE_REPO).
# Env: HEALTH_TIMEOUT seconds to wait for a healthy container (default 60).
set -euo pipefail
cd "$(dirname "$0")"

DEFAULT_REPO=ghcr.io/greenhillth/farm-website
HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-60}
KEEP_IMAGES=3
LOG=deploy.log

die() {
	echo "deploy: $*" >&2
	exit 1
}

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >>"$LOG"; }

env_get() { # env_get KEY: value of KEY in .env, empty if unset
	[ -f .env ] || return 0
	awk -v k="$1" 'index($0, k "=") == 1 { v = substr($0, length(k) + 2); sub(/\r$/, "", v) } END { print v }' .env
}

env_set() { # env_set KEY VALUE: replace or append KEY=VALUE in .env
	local tmp
	tmp=$(mktemp .env.XXXXXX)
	awk -v k="$1" 'index($0, k "=") != 1' .env >"$tmp"
	printf '%s=%s\n' "$1" "$2" >>"$tmp"
	mv "$tmp" .env
}

container_state() { # healthy | unhealthy | starting | running | restarting | exited | missing
	local cid
	cid=$(docker compose ps -a -q web 2>/dev/null || true)
	if [ -z "$cid" ]; then
		echo missing
		return
	fi
	docker inspect -f '{{if eq .State.Status "running"}}{{if .State.Health}}{{.State.Health.Status}}{{else}}running{{end}}{{else}}{{.State.Status}}{{end}}' "$cid"
}

wait_healthy() { # wait_healthy PORT: 0 once the container is healthy and / answers 200
	local waited=0 state
	while [ "$waited" -lt "$HEALTH_TIMEOUT" ]; do
		state=$(container_state)
		if [ "$state" = healthy ] && curl -fsS -o /dev/null "http://127.0.0.1:$1/"; then
			return 0
		fi
		if [ "$state" = unhealthy ]; then return 1; fi
		sleep 2
		waited=$((waited + 2))
	done
	return 1
}

switch_to() { # switch_to TAG
	env_set IMAGE_TAG "$1"
	docker compose up -d --remove-orphans
}

prune_images() { # prune_images REPO KEEP_A KEEP_B: keep the newest KEEP_IMAGES tags plus KEEP_A and KEEP_B
	local n=0 tag
	docker images "$1" --format '{{.Tag}}' | { grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' || true; } | sort -V -r |
		while read -r tag; do
			n=$((n + 1))
			if [ "$n" -le "$KEEP_IMAGES" ] || [ "$tag" = "$2" ] || [ "$tag" = "$3" ]; then continue; fi
			docker rmi "$1:$tag" >/dev/null 2>&1 || true
		done
}

status() {
	echo "running: $(env_get IMAGE_TAG) ($(container_state))"
	if [ -f "$LOG" ]; then
		echo "recent deploys:"
		tail -n 5 "$LOG"
	fi
}

case "${1:-}" in
--status)
	status
	exit 0
	;;
"") die "usage: $0 vX.Y.Z | --status" ;;
esac

TAG=$1
echo "$TAG" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$' || die "not a release tag: '$TAG' (expected vX.Y.Z)"
[ -f .env ] || die ".env not found in $(pwd); copy .env.example to .env first"
PORT=$(env_get HOST_PORT)
[ -n "$PORT" ] || die "HOST_PORT is not set in .env"
REPO=$(env_get IMAGE_REPO)
REPO=${REPO:-$DEFAULT_REPO}
PREVIOUS=$(env_get IMAGE_TAG)

echo "Pulling $REPO:$TAG"
docker pull "$REPO:$TAG" || die "pull failed; nothing changed (still on ${PREVIOUS:-nothing})"

echo "Switching ${PREVIOUS:-nothing} -> $TAG"
switch_to "$TAG"
if wait_healthy "$PORT"; then
	log "${PREVIOUS:-none} -> $TAG ok"
	prune_images "$REPO" "$TAG" "$PREVIOUS"
	echo "Deployed $TAG"
	exit 0
fi

echo "$TAG did not become healthy within ${HEALTH_TIMEOUT}s. Last logs:" >&2
docker compose logs --tail 30 web >&2 || true

if [ -z "$PREVIOUS" ]; then
	docker compose stop web || true
	log "none -> $TAG FAILED, no previous release; stopped"
	die "no previous release to roll back to; container stopped"
fi
if [ "$PREVIOUS" = "$TAG" ]; then
	log "$PREVIOUS -> $TAG FAILED, nothing to roll back to"
	die "$TAG is unhealthy and was already the running release"
fi

echo "Rolling back to $PREVIOUS" >&2
switch_to "$PREVIOUS"
if wait_healthy "$PORT"; then
	log "$PREVIOUS -> $TAG FAILED, rolled back to $PREVIOUS"
	die "rolled back to $PREVIOUS"
fi
log "$PREVIOUS -> $TAG FAILED, rollback to $PREVIOUS ALSO unhealthy"
die "rollback to $PREVIOUS is unhealthy too; check 'docker compose logs web'"
