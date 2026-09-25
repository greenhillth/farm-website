# Deployment Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship farm-website as a CI-tested Docker image built from `vX.Y.Z` tags and pushed to GHCR. Tom deploys it on the on-site server with `deploy.sh`, which health-checks the new release and rolls back automatically if it's unhealthy.

**Architecture:** GitHub Actions `ci.yml` checks every PR, including smoke tests against a stub backend for both `node build` and the image. `release.yml` validates a version tag and pushes `ghcr.io/greenhillth/farm-website:<tag>`. The server runs a single-service Compose project in `/opt/farm-website`, driven by `deploy/deploy.sh`.

**Tech Stack:** SvelteKit 2 on adapter-node, Node 24 LTS, Docker (multi-stage `node:24-alpine`), Docker Compose v2, GitHub Actions, GHCR, and bash scripts that are 3.2-compatible (macOS) and also run on Ubuntu.

**Spec:** `docs/superpowers/specs/2026-09-25-deployment-pipeline-design.md`

**Branch:** all work happens on `feat/deploy-pipeline`, which already contains the `chore/upgrade-deps` commits and the spec.

### Deviations from the spec (found while planning, already reflected in the spec)

1. **The `/api` proxy must keep the `/api` prefix.** gbros-api's routes are `/api/...`, and `hooks.server.ts` and the Vite dev proxy both keep the prefix. Only `src/routes/api/[...path]/+server.ts` strips it. Task 2 fixes that, so `BACKEND_ORIGIN=http://host.docker.internal:8000` is correct everywhere.
2. **`BODY_SIZE_LIMIT=25M`.** adapter-node rejects request bodies over 512 KB by default, which would break larger CSV uploads through `/api`.
3. **The smoke test uses a stub backend** (`scripts/stub-backend.mjs`) instead of asserting a 502. That lets it prove prefix handling, query forwarding, `ORIGIN`/CSRF and the body limit end to end. CI runs it against both `node build` and the image.
4. **The local test registry uses port 5055**, because macOS AirPlay occupies 5000.

## Prerequisites (Tom, before Task 1)

- [ ] Install and start **Docker Desktop**, then check that `docker version` and `docker compose version` both work.
- [ ] `brew install shellcheck actionlint`
- [ ] Check that ports 4310, 8099, 4987 and 5055 are free: `lsof -iTCP -sTCP:LISTEN | grep -E ':(4310|8099|4987|5055) '` should print nothing.

## Global Constraints

- Node: **24 LTS**. Use `.nvmrc` = `24`, `package.json` `engines.node` = `>=24`, and `node:24-alpine` for Docker.
- Image repository: `ghcr.io/greenhillth/farm-website`. Tags must match `^v[0-9]+\.[0-9]+\.[0-9]+$`. **Never** push a `latest` tag.
- The container listens on `3000`. The server publishes it only on `127.0.0.1:${HOST_PORT}`.
- Production runtime env: `ORIGIN=https://farm.greenhill.net.au`, `BACKEND_ORIGIN=http://host.docker.internal:8000`, `BODY_SIZE_LIMIT=25M`. These go in the server `.env`, never in the image.
- The Compose project name is `farm-website`, with one service called `web`.
- Shell scripts start with `#!/usr/bin/env bash` and `set -euo pipefail`, and must pass `shellcheck`. They must run under **bash 3.2** (no `mapfile`, associative arrays or `${var,,}`) and avoid GNU-only flags (no `sed -i`, `xargs -r` or `readlink -f`).
- GitHub Actions versions: `actions/checkout@v7`, `actions/setup-node@v7`, `docker/setup-buildx-action@v4`, `docker/build-push-action@v7`, `docker/login-action@v4`.
- Run `npx prettier --write` on every new or changed `.md`, `.yml`, `.ts`, `.js`, `.mjs` and `.json` file before committing. CI runs `prettier --check .`. Prettier ignores `.sh`, `Dockerfile` and `.nvmrc`.
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Subagents must never** push, create tags, force-push, call `gh` commands that change GitHub state, or touch the server. Tasks 8 and 9 are for the controller and Tom only.

## Review Focus

1. **CSV uploads over 512 KB, or with a foreign `Origin`.** A 1 MB same-origin upload must reach the backend. A cross-site one must get a 403. Tested in Task 2 by `scripts/smoke-test.sh`.
2. **`deploy.sh` run by absolute path from another directory** (for example over SSH, `/opt/farm-website/deploy.sh v1.2.0`). It must behave exactly as if run from its own directory. Tested in Task 4, test 2.
3. **Redeploying the tag that's already running.** It must succeed and stay on that tag, not attempt a rollback. Tested in Task 4, test 6.
4. **Typo'd tags** (`1.0.1`, `v1.0`). They must be rejected before any pull, with `.env` untouched. Tested in Task 4, test 1.
5. **A first deploy that fails with no previous release.** Nothing may be left crash-looping on the cloudflared port. Tested in Task 4, test 9.

---

### Task 1: Repo hygiene: lockfile, build output and Node pin

**Files:**

- Modify: `.gitignore` (remove the `package-lock.json` line)
- Create: `.nvmrc`
- Modify: `package.json` (add `engines`)
- Untrack: `build/`, `.svelte-kit/`
- Add: `package-lock.json`
- Modify: `CLAUDE.md` (Commands block and the Conventions bullet about build output)

**Interfaces:**

- Produces: a committed `package-lock.json` (Tasks 3 and 5 rely on `npm ci`) and `.nvmrc` (Task 5's `setup-node` reads `node-version-file: .nvmrc`).

- [ ] **Step 1: Write the check that must pass at the end of this task and run it (it fails now).**

```bash
test "$(git ls-files build .svelte-kit | wc -l | tr -d ' ')" = 0 \
  && git ls-files --error-unmatch package-lock.json .nvmrc >/dev/null \
  && node -p 'require("./package.json").engines.node' | grep -qx '>=24' \
  && echo HYGIENE_OK
```

Expected now: no `HYGIENE_OK` (build files are still tracked).

- [ ] **Step 2: Remove `package-lock.json` from `.gitignore`.** Delete the single line `package-lock.json` (line 3). Leave all other lines unchanged.

- [ ] **Step 3: Create `.nvmrc`** with exactly one line:

```
24
```

- [ ] **Step 4: Add `engines` to `package.json`.**

```bash
npm pkg set engines.node='>=24'
```

- [ ] **Step 5: Regenerate and verify the lockfile, then untrack build output.**

```bash
npm install            # refreshes package-lock.json for the engines field
npm ci                 # must succeed from the lockfile alone
git rm -r -q --cached build .svelte-kit
```

- [ ] **Step 6: Update `CLAUDE.md`.**
  - In the Commands block, replace `npm install            # package-lock.json is gitignored` with:
    ```
    npm ci                 # install from the committed lockfile (Node 24, see .nvmrc)
    ```
  - In Conventions, replace the bullet that begins ``- `build/` and `.svelte-kit/` are committed`` with:
    ```
    - `build/` and `.svelte-kit/` are gitignored build output and aren't tracked. `package-lock.json` is committed: change dependencies with `npm install <pkg>` and commit the lockfile.
    ```

- [ ] **Step 7: Run the check from Step 1 and the build.**

```bash
npm run build >/dev/null && git status --short build .svelte-kit | wc -l   # expect 0
```

Then rerun the Step 1 command. Expected: `HYGIENE_OK`.

- [ ] **Step 8: Commit.**

```bash
npx prettier --write CLAUDE.md package.json
git add .gitignore .nvmrc package.json package-lock.json CLAUDE.md
git commit -m "Commit lockfile, pin Node 24, stop tracking build output

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(The `git rm --cached` deletions are already staged and go into this commit.)

---

### Task 2: Stub backend, smoke test, and the `/api` prefix fix

**Files:**

- Create: `scripts/stub-backend.mjs`
- Create: `scripts/smoke-test.sh` (executable)
- Modify: `src/routes/api/[...path]/+server.ts` (full replacement below)
- Modify: `CLAUDE.md` (the "no tests" paragraph and wiring bullet 2)

**Interfaces:**

- Produces: `scripts/smoke-test.sh --local` (after `npm run build`) and `scripts/smoke-test.sh --image <ref>`. It exits 0 on pass and 1 on failure, and reads the env vars `APP_PORT` (default 4310) and `STUB_PORT` (default 8099). Task 3 runs `--image`, and Task 5 runs both modes in CI.
- Produces: `scripts/stub-backend.mjs`, which reads the env vars `STUB_HOST` (default `127.0.0.1`) and `STUB_PORT` (default 8099). It replies to any request with JSON `{"method","path","bytes"}` in that key order.

- [ ] **Step 1: Create `scripts/stub-backend.mjs`.**

```js
// Minimal stand-in for gbros-api used by scripts/smoke-test.sh: echoes what it received.
import { createServer } from 'node:http';

const port = Number(process.env.STUB_PORT ?? 8099);
const host = process.env.STUB_HOST ?? '127.0.0.1';

createServer((req, res) => {
	let bytes = 0;
	req.on('data', (chunk) => (bytes += chunk.length));
	req.on('end', () => {
		res.setHeader('content-type', 'application/json');
		res.end(JSON.stringify({ method: req.method, path: req.url, bytes }));
	});
}).listen(port, host, () => console.log(`stub backend on ${host}:${port}`));
```

- [ ] **Step 2: Create `scripts/smoke-test.sh`** and `chmod +x` it.

```bash
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

if [ "$FAILED" -ne 0 ]; then
	if [ -f "$TMP/app.log" ]; then cat "$TMP/app.log"; fi
	if [ -n "$CID" ]; then docker logs "$CID"; fi
	exit 1
fi
echo "smoke test passed"
```

- [ ] **Step 3: Run it against the current code to confirm it fails for the right reasons.**

```bash
shellcheck scripts/smoke-test.sh
npm run build && scripts/smoke-test.sh --local
```

Expected: the page checks show `ok`. It exits 1 with `FAIL GET keeps the /api prefix` (the path arrives as `/weather/current`), `FAIL query string forwarded`, and `FAIL upload reaches backend as POST` (the path is `/soil-tests/import`). The cross-site check reports `ok`.

- [ ] **Step 4: Replace `src/routes/api/[...path]/+server.ts` with:**

```ts
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

// Forwards /api/* to the backend with the path unchanged (gbros-api's routes include /api),
// matching the dev proxy in vite.config.ts and handleFetch in hooks.server.ts.
const backendBase = () =>
	(env.BACKEND_ORIGIN ?? `http://localhost:${env.BACKEND_PORT ?? '8000'}`).replace(/\/+$/, '');

const proxy: RequestHandler = async ({ request, fetch, url }) => {
	const targetUrl = `${backendBase()}${url.pathname}${url.search}`;
	const headers = new Headers(request.headers);
	headers.delete('host');

	const init: RequestInit = {
		method: request.method,
		headers
	};

	if (!['GET', 'HEAD'].includes(request.method)) {
		const body = await request.arrayBuffer();
		init.body = body;
	}

	let response: Response;
	try {
		response = await fetch(targetUrl, init);
	} catch (err) {
		console.error(`[api proxy] ${request.method} ${targetUrl} failed`, err);
		return new Response('Backend unavailable', { status: 502 });
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});
};

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
```

- [ ] **Step 5: Rerun it. Everything should pass.**

```bash
npm run check && npm run build && scripts/smoke-test.sh --local
```

Expected: `svelte-check` reports 0 errors, every line is `ok`, and the last line is `smoke test passed`.

- [ ] **Step 6: Update `CLAUDE.md`.**
  - Replace the paragraph `There are no tests. Check UI changes by running the dev server with the backend up and viewing the page in a browser.` with:
    ```
    There's no unit test suite. `scripts/smoke-test.sh --local` (after `npm run build`) starts the built app against a stub backend (`scripts/stub-backend.mjs`) and checks the pages, `/api` proxying, CSRF and the upload size limit. `--image <ref>` does the same for a Docker image. Check UI changes in a browser as well.
    ```
  - Replace wiring bullet 2 (it begins `2. **Production (node build), browser requests**`) with:
    ```
    2. **Production (node build), browser requests**: `src/routes/api/[...path]/+server.ts` is a catch-all proxy for all methods. It forwards `/api/<path>?<query>` unchanged to `BACKEND_ORIGIN` (default `http://localhost:${BACKEND_PORT ?? 8000}`), so `BACKEND_ORIGIN` is a bare origin with no `/api` suffix. It returns 502 if the backend is unreachable. Request bodies are capped by adapter-node's `BODY_SIZE_LIMIT` (the default 512K is too small for CSV imports, so production sets 25M).
    ```

- [ ] **Step 7: Commit.**

```bash
npx prettier --write scripts/stub-backend.mjs 'src/routes/api/[...path]/+server.ts' CLAUDE.md
git add scripts/stub-backend.mjs scripts/smoke-test.sh 'src/routes/api/[...path]/+server.ts' CLAUDE.md
git commit -m "Keep /api prefix in the production proxy; add smoke test with stub backend

The catch-all route stripped /api, unlike the dev proxy and handleFetch,
while gbros-api's routes all start with /api.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Production Docker image

**Files:**

- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**

- Consumes: `package-lock.json` and `.nvmrc` (Task 1), and `scripts/smoke-test.sh --image <ref>` (Task 2).
- Produces: an image that runs as `node` on port 3000, with a Docker `HEALTHCHECK`. Task 4's fixtures mimic its health behaviour, and Tasks 5 and 6 build it with `docker/build-push-action` using `context: .`.

- [ ] **Step 1: Confirm the smoke test fails without an image.**

```bash
scripts/smoke-test.sh --image farm-website:local
```

Expected: it exits non-zero with `Unable to find image 'farm-website:local'` / `pull access denied`.

- [ ] **Step 2: Resolve the base image digest.**

```bash
docker buildx imagetools inspect node:24-alpine | awk '/^Digest:/ {print $2; exit}'
```

Use the printed `sha256:...` value as `<DIGEST>` in Step 3, in both `FROM` lines.

- [ ] **Step 3: Create `Dockerfile`**, replacing `<DIGEST>` with the value from Step 2.

```dockerfile
# Production image for the farm-website SvelteKit app (adapter-node).
# Runtime config (ORIGIN, BACKEND_ORIGIN, BODY_SIZE_LIMIT) comes from the environment, never the image.
FROM node:24-alpine@<DIGEST> AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine@<DIGEST>
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/build ./build
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --start-interval=1s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "build"]
```

- [ ] **Step 4: Create `.dockerignore`.**

```
node_modules
build
.svelte-kit
.git
.github
.claude
.env
.env.*
docs
deploy
eg
*.md
```

- [ ] **Step 5: Build and run the smoke test.**

```bash
docker build -t farm-website:local .
scripts/smoke-test.sh --image farm-website:local
```

Expected: `ok container healthy`, `ok runs as node`, every route and proxy check `ok`, then `smoke test passed`.

- [ ] **Step 6: Check the image size is sensible** (so the runtime stage didn't pick up dev dependencies).

```bash
docker image ls farm-website:local --format '{{.Size}}'
```

Expected: under 250 MB. If it's larger, check that the runtime stage used `--omit=dev`.

- [ ] **Step 7: Commit.**

```bash
git add Dockerfile .dockerignore
git commit -m "Add production Dockerfile (node 24 alpine, non-root, healthcheck)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Server compose file and `deploy.sh`, with integration tests

**Files:**

- Create: `deploy/compose.yml`
- Create: `deploy/.env.example`
- Create: `deploy/deploy.sh` (executable)
- Create: `deploy/test/fixture.Dockerfile`
- Create: `deploy/test/run-tests.sh` (executable)

**Interfaces:**

- Produces: `deploy/deploy.sh vX.Y.Z` (exit 0 = deployed and healthy; 1 = failed, see stderr) and `deploy/deploy.sh --status` (prints `running: <tag> (<state>)` plus recent log lines). It reads `.env` next to itself: `IMAGE_TAG`, `HOST_PORT` and the optional `IMAGE_REPO`. The env var `HEALTH_TIMEOUT` defaults to 60 seconds. It appends lines to `deploy.log` next to itself.
- Log line formats (Tasks 7 and 9 quote these): `<ISO time> <prev|none> -> <tag> ok`, `<ISO time> <prev> -> <tag> FAILED, rolled back to <prev>`, `<ISO time> none -> <tag> FAILED, no previous release; stopped`, and `<ISO time> <prev> -> <tag> FAILED, rollback to <prev> ALSO unhealthy`.
- Produces: `deploy/test/run-tests.sh`. Task 5 shellchecks it, and the controller runs it before Task 9.

- [ ] **Step 1: Create `deploy/compose.yml`.**

```yaml
# farm-website on the production server. deploy.sh manages IMAGE_TAG in .env.
name: farm-website
services:
  web:
    image: ${IMAGE_REPO:-ghcr.io/greenhillth/farm-website}:${IMAGE_TAG:-unset}
    env_file: .env
    ports:
      - '127.0.0.1:${HOST_PORT:?HOST_PORT must be set in .env}:3000'
    extra_hosts:
      - 'host.docker.internal:host-gateway'
    restart: unless-stopped
```

- [ ] **Step 2: Create `deploy/.env.example`.**

```
# Copy to .env next to compose.yml and deploy.sh. deploy.sh manages IMAGE_TAG.
IMAGE_TAG=
# Host port cloudflared forwards to (bound to 127.0.0.1 only).
HOST_PORT=4000
ORIGIN=https://farm.greenhill.net.au
BACKEND_ORIGIN=http://host.docker.internal:8000
BODY_SIZE_LIMIT=25M
```

- [ ] **Step 3: Create the test fixture `deploy/test/fixture.Dockerfile`.**

```dockerfile
# Tiny stand-in image for deploy.sh tests: serves its VERSION and has a healthcheck like the real image.
FROM node:24-alpine
ARG VERSION
ENV VERSION=$VERSION
HEALTHCHECK --interval=2s --timeout=2s --start-period=1s --retries=2 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "-e", "require('http').createServer((q, s) => s.end(process.env.VERSION)).listen(3000)"]
```

- [ ] **Step 4: Create `deploy/test/run-tests.sh`** (the failing tests), and `chmod +x` it.

```bash
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
for v in v1.0.0 v1.0.1 v1.0.2 v1.0.3 v1.0.4 v1.0.5; do
	docker push -q "$REPO:$v" >/dev/null
	docker rmi "$REPO:$v" >/dev/null # deploy.sh must pull from the registry
done

A=$(new_site a)

echo "--- 1: malformed tags are rejected before any pull"
for bad in 1.0.1 v1.0 latest; do
	if "$A/deploy.sh" "$bad" >/dev/null 2>&1; then fail "accepted '$bad'"; else pass "rejected '$bad'"; fi
done
if [ -z "$(env_val "$A" IMAGE_TAG)" ]; then pass ".env untouched"; else fail ".env IMAGE_TAG changed"; fi

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

if [ "$FAILED" -ne 0 ]; then
	echo "deploy tests FAILED"
	exit 1
fi
echo "deploy tests passed"
```

- [ ] **Step 5: Run the tests to confirm they fail** (there's no `deploy.sh` yet).

```bash
shellcheck deploy/test/run-tests.sh
deploy/test/run-tests.sh
```

Expected: the fixtures build, then `cp` fails on `deploy.sh: No such file or directory` and the script exits non-zero.

- [ ] **Step 6: Create `deploy/deploy.sh`** and `chmod +x` it.

```bash
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
```

- [ ] **Step 7: Run shellcheck and the tests. All should pass.**

```bash
shellcheck deploy/deploy.sh deploy/test/run-tests.sh
docker compose -f deploy/compose.yml --env-file deploy/.env.example config >/dev/null && echo COMPOSE_OK
deploy/test/run-tests.sh
```

Expected: shellcheck prints nothing, then `COMPOSE_OK`, and every test line is `ok`, ending with `deploy tests passed`. The run takes about 1–2 minutes because the two broken-image cases each wait out `HEALTH_TIMEOUT=20`.

- [ ] **Step 8: Commit.**

```bash
npx prettier --write deploy/compose.yml
git add deploy/compose.yml deploy/.env.example deploy/deploy.sh deploy/test/fixture.Dockerfile deploy/test/run-tests.sh
git commit -m "Add server compose file and deploy.sh with health check and rollback

deploy/test/run-tests.sh covers first deploy, upgrade, missing tag,
broken image rollback, redeploy, image pruning, --status and a failed
first deploy, against a throwaway local registry.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: CI workflow

**Files:**

- Create: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: `.nvmrc` (Task 1), `scripts/smoke-test.sh` (Task 2), the `Dockerfile` (Task 3), and `deploy/deploy.sh` plus `deploy/test/run-tests.sh` (Task 4).
- Produces: two check contexts named **`checks`** and **`container`**. Task 8's branch protection requires exactly these names.

- [ ] **Step 1: Confirm actionlint reports the workflow as missing.**

```bash
actionlint .github/workflows/ci.yml
```

Expected: an error that the file doesn't exist.

- [ ] **Step 2: Create `.github/workflows/ci.yml`.**

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npx prettier --check .
      - run: npm run build
      - run: scripts/smoke-test.sh --local
      - run: shellcheck scripts/*.sh deploy/deploy.sh deploy/test/run-tests.sh
      - name: ESLint (non-blocking until the backlog is cleared)
        continue-on-error: true
        run: |
          npx eslint . --format json --output-file eslint.json || true
          count=$(node -p 'require("./eslint.json").reduce((n, f) => n + f.errorCount, 0)')
          echo "### ESLint: $count errors (non-blocking)" >> "$GITHUB_STEP_SUMMARY"
          test "$count" -eq 0

  container:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
      - uses: docker/setup-buildx-action@v4
      - uses: docker/build-push-action@v7
        with:
          context: .
          load: true
          tags: farm-website:ci
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - run: scripts/smoke-test.sh --image farm-website:ci
```

- [ ] **Step 3: Lint the workflow and formatting.**

```bash
npx prettier --write .github/workflows/ci.yml
actionlint .github/workflows/ci.yml && echo ACTIONLINT_OK
npx prettier --check . && echo PRETTIER_OK
```

Expected: `ACTIONLINT_OK` and `PRETTIER_OK`. (actionlint also shellchecks the `run:` blocks.)

- [ ] **Step 4: Run each blocking CI command locally, in order.**

```bash
npm ci && npm run check && npx prettier --check . && npm run build \
  && scripts/smoke-test.sh --local \
  && shellcheck scripts/*.sh deploy/deploy.sh deploy/test/run-tests.sh \
  && docker build -t farm-website:ci . && scripts/smoke-test.sh --image farm-website:ci \
  && echo CI_LOCAL_OK
```

Expected: `CI_LOCAL_OK`. (The real run on GitHub happens in Task 8.)

- [ ] **Step 5: Commit.**

```bash
git add .github/workflows/ci.yml
git commit -m "Add CI workflow: checks, smoke tests, container build

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Release workflow, release check and Dependabot

**Files:**

- Create: `scripts/check-release.sh` (executable)
- Create: `scripts/test/check-release.test.sh` (executable)
- Create: `.github/workflows/release.yml`
- Create: `.github/dependabot.yml`
- Modify: `.github/workflows/ci.yml` (add the new test to the `checks` job)

**Interfaces:**

- Produces: `scripts/check-release.sh <tag> [main-ref]`. The default `main-ref` is `origin/main`. It exits 0 and prints `<tag> OK` when the tag is `vX.Y.Z`, the tagged commit is an ancestor of `main-ref`, and `package.json` `version` at the tag equals the tag without the `v`. Otherwise it exits 1 with an `::error::` line.
- Produces: the `release` workflow, which pushes `ghcr.io/greenhillth/farm-website:<tag>` and creates a GitHub Release (Task 9).

- [ ] **Step 1: Create `scripts/test/check-release.test.sh`** (the failing test), and `chmod +x` it.

```bash
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
```

- [ ] **Step 2: Run it to confirm it fails.**

```bash
scripts/test/check-release.test.sh
```

Expected: `FAIL tag on main with matching version (got fail)`, because `check-release.sh` doesn't exist. The other cases show `ok`, since a missing script also "fails". It exits 1.

- [ ] **Step 3: Create `scripts/check-release.sh`** and `chmod +x` it.

```bash
#!/usr/bin/env bash
# Fail unless TAG is a vX.Y.Z tag on MAIN_REF whose package.json version matches.
#   scripts/check-release.sh v1.2.3 [origin/main]
set -euo pipefail
tag=${1:?usage: check-release.sh vX.Y.Z [main-ref]}
main_ref=${2:-origin/main}

if ! [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo "::error::$tag is not a vX.Y.Z tag" >&2
	exit 1
fi
if ! git merge-base --is-ancestor "$tag^{commit}" "$main_ref" 2>/dev/null; then
	echo "::error::$tag is not on $main_ref" >&2
	exit 1
fi
version=$(git show "$tag:package.json" | node -p 'JSON.parse(require("fs").readFileSync(0, "utf8")).version')
if [ "v$version" != "$tag" ]; then
	echo "::error::package.json version $version does not match $tag" >&2
	exit 1
fi
echo "$tag OK"
```

- [ ] **Step 4: Run the tests. All should pass.**

```bash
shellcheck scripts/check-release.sh scripts/test/check-release.test.sh
scripts/test/check-release.test.sh
```

Expected: 5 `ok` lines, then `check-release tests passed`.

- [ ] **Step 5: Create `.github/workflows/release.yml`.**

```yaml
name: release

on:
  push:
    tags: ['v*.*.*']

permissions:
  contents: write
  packages: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - name: Tag is on main and matches package.json
        run: scripts/check-release.sh "$GITHUB_REF_NAME" origin/main
      - uses: docker/setup-buildx-action@v4
      - uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: ghcr.io/greenhillth/farm-website:${{ github.ref_name }}
          labels: |
            org.opencontainers.image.source=https://github.com/greenhillth/farm-website
            org.opencontainers.image.revision=${{ github.sha }}
            org.opencontainers.image.version=${{ github.ref_name }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: GitHub Release
        run: gh release create "$GITHUB_REF_NAME" --verify-tag --generate-notes
        env:
          GH_TOKEN: ${{ github.token }}
```

- [ ] **Step 6: Create `.github/dependabot.yml`.**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: monthly
    groups:
      npm:
        patterns: ['*']
    ignore:
      # SvelteKit, svelte-check and typescript-eslint don't support TS 7 yet (see CLAUDE.md)
      - dependency-name: typescript
        update-types: ['version-update:semver-major']
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
    groups:
      actions:
        patterns: ['*']
  - package-ecosystem: docker
    directory: /
    schedule:
      interval: monthly
    ignore:
      # Node major upgrades (next LTS) are a deliberate choice, not a routine bump
      - dependency-name: node
        update-types: ['version-update:semver-major']
```

- [ ] **Step 7: Add the release-check test to CI.** In `.github/workflows/ci.yml` `checks` job, directly after the `shellcheck` step, add:

```yaml
- run: scripts/test/check-release.test.sh
```

- [ ] **Step 8: Lint.**

```bash
npx prettier --write .github
actionlint && echo ACTIONLINT_OK
shellcheck scripts/*.sh scripts/test/*.sh && echo SHELLCHECK_OK
npx prettier --check . && echo PRETTIER_OK
```

Expected: `ACTIONLINT_OK`, `SHELLCHECK_OK`, `PRETTIER_OK`. (`actionlint` with no arguments checks every workflow.) Then update the `shellcheck` line in `ci.yml` to `shellcheck scripts/*.sh scripts/test/*.sh deploy/deploy.sh deploy/test/run-tests.sh` and rerun `actionlint`.

- [ ] **Step 9: Commit.**

```bash
git add scripts/check-release.sh scripts/test/check-release.test.sh .github
git commit -m "Add tag-triggered release to GHCR, release checks, and Dependabot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Runbook and docs

**Files:**

- Create: `deploy/README.md`
- Modify: `CLAUDE.md` (add a Deployment section after Conventions)
- Modify: `README.md` (the "Building and running" section)

**Interfaces:**

- Consumes: `deploy.sh` usage and log formats (Task 4), `check-release.sh` rules (Task 6), and the job names `checks`/`container` (Task 5).

- [ ] **Step 1: Create `deploy/README.md`.**

````markdown
# Deploying farm-website

Production runs the image `ghcr.io/greenhillth/farm-website:<tag>` on the on-site Ubuntu server, published on `127.0.0.1:$HOST_PORT` and exposed through cloudflared at https://farm.greenhill.net.au. Everything lives in `/opt/farm-website`: `compose.yml`, `.env`, `deploy.sh` and `deploy.log`.

## Releasing a new version

Releases are `vX.Y.Z` tags on `main`. Merging to `main` never deploys.

```sh
git switch -c release/v1.2.0 origin/main
npm version 1.2.0 --no-git-tag-version
git commit -am "Release v1.2.0"
gh pr create --fill          # merge once CI (checks, container) is green
git fetch origin
git tag v1.2.0 origin/main
git push origin v1.2.0       # runs the release workflow
gh run watch                 # image appears at ghcr.io/greenhillth/farm-website:v1.2.0
```

The release workflow refuses tags that aren't on `main` or don't match `package.json`.

## Deploying (on the server)

```sh
/opt/farm-website/deploy.sh v1.2.0
```

It pulls the image, switches to it, and waits up to 60s for the container to be healthy and `/` to answer. If that fails, it switches back to the previous release and exits with an error. If the pull fails, nothing changes.

- **Roll back:** `deploy.sh <older tag>`. The three newest images are kept locally, so this doesn't download anything.
- **What's running:** `deploy.sh --status`
- **History:** `/opt/farm-website/deploy.log` (lines look like `2026-10-01T09:12:03Z v1.1.0 -> v1.2.0 ok`)
- **Container logs:** `cd /opt/farm-website && docker compose logs -f web`

## One-time server setup

```sh
sudo mkdir -p /opt/farm-website && sudo chown "$USER" /opt/farm-website
cd /opt/farm-website
for f in compose.yml deploy.sh .env.example; do
  curl -fsSLO "https://raw.githubusercontent.com/greenhillth/farm-website/v1.0.0/deploy/$f"
done
chmod +x deploy.sh
cp .env.example .env
nano .env    # set HOST_PORT to the port cloudflared forwards to
```

To update `compose.yml` or `deploy.sh` later, rerun the `curl` loop with the new tag. Don't overwrite `.env`.

## `.env`

| Key               | Value                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `IMAGE_TAG`       | Managed by `deploy.sh`; don't edit                                                           |
| `HOST_PORT`       | Port cloudflared forwards to; bound on 127.0.0.1 only                                        |
| `ORIGIN`          | `https://farm.greenhill.net.au`. Must be the public URL, or uploads fail with 403            |
| `BACKEND_ORIGIN`  | `http://host.docker.internal:8000`: gbros-api's published port, as a bare origin (no `/api`) |
| `BODY_SIZE_LIMIT` | `25M`. Max request body, which caps CSV upload size                                          |

## Troubleshooting

| Symptom                                               | Fix                                                                                                                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pull failed` with `denied` / `unauthorized`          | The GHCR package is private. Make it public (GitHub → Packages → farm-website → Package settings → Change visibility), or `docker login ghcr.io -u greenhillth` with a token that has `read:packages`. |
| `did not become healthy`, and it rolled back          | Read the logs `deploy.sh` printed, or `docker compose logs web`. Try the image locally with `scripts/smoke-test.sh --image ghcr.io/greenhillth/farm-website:<tag>`.                                    |
| CSV upload returns **403**                            | `ORIGIN` in `.env` doesn't match the URL in the browser.                                                                                                                                               |
| CSV upload returns **413**                            | The file is bigger than `BODY_SIZE_LIMIT`.                                                                                                                                                             |
| API calls return **502**                              | The backend isn't reachable. Check it's running (`docker ps`) and test from the container: `docker compose exec web wget -qO- http://host.docker.internal:8000/api/health`.                            |
| `HOST_PORT must be set` / `port is already allocated` | Set `HOST_PORT` in `.env`, or stop whatever holds that port (`sudo ss -ltnp \| grep :<port>`).                                                                                                         |
````

- [ ] **Step 2: Add a Deployment section to `CLAUDE.md`**, directly after the `## Conventions` section and before `## Dependencies`:

```markdown
## Deployment

Production runs the Docker image `ghcr.io/greenhillth/farm-website:<tag>` on the on-site Ubuntu server behind cloudflared. The runbook is `deploy/README.md`.

- Releases are `vX.Y.Z` tags on `main` whose `package.json` `version` matches (`scripts/check-release.sh`). The `release` workflow pushes the image and creates a GitHub Release. Merging to `main` never deploys.
- Tom deploys on the server with `/opt/farm-website/deploy.sh vX.Y.Z`, which health-checks and rolls back automatically. `deploy/test/run-tests.sh` tests it locally (needs Docker).
- **Never** push tags, force-push, change branch protection or GHCR settings, or run anything on the server unless Tom explicitly asks for that step in the current conversation.
- Runtime config (`ORIGIN`, `BACKEND_ORIGIN`, `BODY_SIZE_LIMIT`) belongs in the server's `.env`, never in the image or the repo.
- Work goes on feature branches and into `main` by PR. CI (`checks`, `container`) must pass.
```

- [ ] **Step 3: Update `README.md`.** Replace the whole `## Building and running` section (everything up to the next `##` heading) with:

````markdown
## Building and running

```sh
npm run build
scripts/smoke-test.sh --local   # built app vs a stub backend
npm start                       # node build; PORT defaults to 3000
```

Production runs as a Docker image built by CI from `vX.Y.Z` tags. See [deploy/README.md](deploy/README.md) for releasing, deploying and rolling back.
````

- [ ] **Step 4: Check the docs.**

```bash
npx prettier --write deploy/README.md CLAUDE.md README.md
npx prettier --check . && echo PRETTIER_OK
grep -c "deploy.sh" deploy/README.md CLAUDE.md README.md
```

Expected: `PRETTIER_OK`, and each file has a non-zero count.

- [ ] **Step 5: Commit.**

```bash
git add deploy/README.md CLAUDE.md README.md
git commit -m "Add deployment runbook and document the release process

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: GitHub cutover (CONTROLLER ONLY; Tom confirms each outward step)

Not for subagents. Every step that changes GitHub needs Tom's explicit go-ahead at the time.

- [ ] **Step 1: Final local verification of the branch.**

```bash
git switch feat/deploy-pipeline
npm ci && npm run check && npx prettier --check . && npm run build \
  && scripts/smoke-test.sh --local && scripts/test/check-release.test.sh \
  && docker build -t farm-website:ci . && scripts/smoke-test.sh --image farm-website:ci \
  && deploy/test/run-tests.sh && actionlint && echo ALL_OK
```

- [ ] **Step 2: Confirm the local and remote `development` match** (both were `5f4a2139` while planning).

```bash
git fetch origin && test "$(git rev-parse development)" = "$(git rev-parse origin/development)" && echo SAME
```

If they differ, stop and ask Tom.

- [ ] **Step 3 (confirm with Tom): Archive the old `main` and point it at production.**

```bash
git tag archive/static-site origin/main
git push origin archive/static-site
git push --force-with-lease=main:"$(git rev-parse origin/main)" origin origin/development:refs/heads/main
```

- [ ] **Step 4 (confirm): Push the branches and open PR 1.**

```bash
git push -u origin chore/upgrade-deps feat/deploy-pipeline
gh pr create --base main --head chore/upgrade-deps --title "Upgrade all dependencies" --body-file - <<'EOF'
Upgrades every dependency to latest (TypeScript held at 6.0), fixes the Tailwind v4 colour tokens and green hover borders, and adds CLAUDE.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

Merge with a **merge commit** (not squash, because the next PR builds on these commits): `gh pr merge --merge`.

- [ ] **Step 5 (confirm): Open PR 2, wait for CI, then merge.**

```bash
gh pr create --base main --head feat/deploy-pipeline --title "Deployment pipeline: CI, GHCR releases, deploy.sh" --body-file - <<'EOF'
Implements docs/superpowers/specs/2026-09-25-deployment-pipeline-design.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
gh pr checks --watch
```

Expected: `checks` and `container` both pass. Then run `gh pr merge --merge`.

- [ ] **Step 6 (confirm): Protect `main`.**

```bash
gh api -X PUT repos/greenhillth/farm-website/branches/main/protection --input - <<'EOF'
{"required_status_checks":{"strict":false,"contexts":["checks","container"]},"enforce_admins":false,"required_pull_request_reviews":null,"restrictions":null,"allow_force_pushes":false,"allow_deletions":false}
EOF
```

- [ ] **Step 7 (confirm): Retire `development`.**

```bash
git push origin --delete development
git switch main && git pull --ff-only && git branch -d development
```

- [ ] **Step 8: Report stale branches to Tom** without deleting anything.

```bash
for b in $(git for-each-ref --format='%(refname:lstrip=3)' refs/remotes/origin | grep -vE '^(HEAD|main)$'); do
  printf '%-45s %3s unmerged  last: %s\n' "$b" "$(git rev-list --count origin/main..origin/$b)" "$(git log -1 --format=%as origin/$b)"
done
```

Tom picks which to delete, and each deletion is `git push origin --delete <branch>`.

---

### Task 9: First release v1.0.0 and server cutover (CONTROLLER + TOM)

- [ ] **Step 1 (confirm): Release branch and version bump.**

```bash
git switch -c release/v1.0.0 origin/main
npm version 1.0.0 --no-git-tag-version
git commit -am "Release v1.0.0

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin release/v1.0.0
gh pr create --fill && gh pr checks --watch && gh pr merge --merge
```

- [ ] **Step 2 (confirm): Tag and release.**

```bash
git fetch origin && git tag v1.0.0 origin/main && git push origin v1.0.0
gh run watch "$(gh run list --workflow release --limit 1 --json databaseId --jq '.[0].databaseId')"
```

Expected: the workflow succeeds, and `gh release view v1.0.0` shows the notes.

- [ ] **Step 3 (Tom, GitHub UI): Make the package public.** Go to github.com → your profile → Packages → `farm-website` → Package settings → Change visibility → Public. Then check an anonymous pull from the Mac:

```bash
docker logout ghcr.io; docker pull ghcr.io/greenhillth/farm-website:v1.0.0 && echo PULL_OK
```

- [ ] **Step 4 (Tom, on the server): Record the current setup.**

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
docker inspect <old-frontend-container> --format '{{range .Config.Env}}{{println .}}{{end}}'
```

Note the old container's name and host port, and its `BACKEND_ORIGIN`/`ORIGIN` values if it has them. Find cloudflared's target port: `sudo cat /etc/cloudflared/config.yml`, or the tunnel's Public Hostname page in the Cloudflare Zero Trust dashboard. **Use that target port for `HOST_PORT`.**

- [ ] **Step 5 (Tom, on the server): Install.** Follow "One-time server setup" in `deploy/README.md` (tag `v1.0.0`). Set `HOST_PORT` in `.env`.

- [ ] **Step 6 (Tom, on the server): Switch over.**

```bash
docker update --restart=no <old-frontend-container>   # don't let it grab the port after a reboot
docker stop <old-frontend-container>                  # keep it: `docker start` it to go back
/opt/farm-website/deploy.sh v1.0.0
```

If `deploy.sh` fails, run `docker start <old-frontend-container>` to restore the old site, then use the troubleshooting table.

- [ ] **Step 7 (Tom): Check it through the public URL.**

```bash
/opt/farm-website/deploy.sh --status
cd /opt/farm-website && docker compose exec web wget -qO- http://host.docker.internal:8000/api/health
```

In a browser at https://farm.greenhill.net.au, check that the home page (green hover borders), `/map` (paddocks render), `/weather` (not showing mock data) and **a CSV upload on `/soiltests`** all work.

- [ ] **Step 8 (Tom, about a week later): Remove the old container.** `docker rm <old-frontend-container>`
