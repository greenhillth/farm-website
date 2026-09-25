# Deployment pipeline — farm-website

Date: 2026-09-25 · Status: approved design, pending implementation plan

## Goal

Replace the ad-hoc, hand-built Docker deployment of the farm-website frontend with a reproducible pipeline where:

- every change is checked by CI before it reaches `main`
- a release is one deliberate action by Tom, never automatic
- the server runs exactly the artefact CI tested
- a bad release rolls back automatically, and a manual rollback takes seconds

**Scope:** the frontend only (`greenhillth/farm-website`). The `gbros-api` pipeline, cloudflared configuration (beyond confirming its target port) and auto-deploy are out of scope.

## Context

- SvelteKit app built with `@sveltejs/adapter-node`, served by `node build`. It proxies `/api/*` to the gbros-api backend (`BACKEND_ORIGIN`).
- The server is self-hosted on-site Ubuntu, reachable publicly only through cloudflared (`farm.greenhill.net.au`). GitHub cannot reach it inbound.
- The frontend currently runs as a Docker container that was built by hand on the server. There's no Dockerfile on the production branch. An old one exists on `origin/codex/modify-weather-station-page-features`.
- The repo is **public**. That rules out self-hosted GitHub runners on the server, because fork PRs could run code on it.
- The `main` branch holds an outdated static-HTML site. Production code is on `development`.

## Decisions

| Decision             | Choice                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Approach             | GitHub Actions builds a CI-tested image on version tags and pushes it to GHCR. Tom runs `deploy.sh <tag>` on the server to pull it and restart. |
| Production branch    | `main` (reset to the current production code)                                                                                                   |
| Release trigger      | Pushing a `vX.Y.Z` tag on `main` builds the image. Running `deploy.sh` on the server deploys it.                                                |
| Image tags           | Immutable version tags only. There's no `latest`.                                                                                               |
| Node version         | 24 LTS, pinned in `.nvmrc`, `package.json` `engines`, CI and the Dockerfile                                                                     |
| Backend reachability | `host.docker.internal` (host-gateway) to the host's published port 8000                                                                         |

## 1. Branches, releases and repo hygiene

- **Archive and reset `main`:** tag the current `main` as `archive/static-site` and push the tag. Then move `main` to the production code (a force-push, confirmed with Tom when it happens). `main` stays GitHub's default branch. `development` is deleted once `main` has taken over from it.
- **Workflow:** feature branches, then a PR into `main`. Branch protection on `main` requires the `ci` workflow's blocking jobs to pass. No reviews are required, and Tom can merge his own PRs.
- **Releases:** bump `version` in `package.json`, merge, then tag `vX.Y.Z` on `main`. Merging alone never deploys.
- **Lockfile:** remove `package-lock.json` from `.gitignore` and commit it. CI and Docker install with `npm ci`.
- **Build output:** remove `build/` and `.svelte-kit/` from git (`git rm -r --cached`). They're already in `.gitignore`. This is safe because the server runs an image, not a checkout.
- **Stale branches:** list unmerged commits for `balls`, `codex/*`, `map-updates-2`, `updating-map`, `soil-upload-updates` and `local-dev-setup`. Tom picks what to delete. Nothing is deleted automatically.

## 2. GitHub workflows

### `.github/workflows/ci.yml`

Triggers: `pull_request`, and `push` to `main`.

1. Check out, set up Node from `.nvmrc` with npm cache, run `npm ci`.
2. **Blocking:** `npm run check`, `npx prettier --check .`, `npm run build`.
3. **Non-blocking:** `npx eslint .` with `continue-on-error: true`. It writes the error count to the job summary. Once the backlog reaches 0, removing `continue-on-error` makes it blocking.
4. **Blocking:** `shellcheck deploy/deploy.sh`.
5. **Blocking container smoke test:** `docker build` the image, run it with `ORIGIN=http://localhost:3000` and an unreachable `BACKEND_ORIGIN`, and wait for the healthcheck. Then assert that `/`, `/map`, `/soiltests` and `/weather` return 200, and `/api/farm` returns 502.

### `.github/workflows/release.yml`

Trigger: `push` of tags matching `v*.*.*`. Permissions: `contents: write` and `packages: write`.

1. Fail unless the tagged commit is an ancestor of `origin/main`.
2. Fail unless the tag (without the `v`) equals `package.json` `version`.
3. Build and push `ghcr.io/greenhillth/farm-website:<tag>` using `docker/build-push-action`, with OCI labels for source, revision and version.
4. Create a GitHub Release with auto-generated notes.

The GHCR package is public, matching the repo. Runtime secrets are never baked into the image.

### `.github/dependabot.yml`

Monthly and grouped (one PR per ecosystem) for `npm`, `github-actions` and `docker` (the Dockerfile base-image digest).

## 3. Image and server runtime

### `Dockerfile` (repo root) and `.dockerignore`

- **build stage:** `node:24-alpine` pinned by `@sha256` digest (the current digest is resolved when the Dockerfile is written; Dependabot updates it afterwards), `npm ci`, copy the source, `npm run build`.
- **runtime stage:** same base. It copies `build/`, `package.json` and `package-lock.json`, runs `npm ci --omit=dev`, and sets `NODE_ENV=production`, `HOST=0.0.0.0` and `PORT=3000`. It runs as `USER node` with `EXPOSE 3000`.
- **HEALTHCHECK:** `wget -qO- http://127.0.0.1:3000/ >/dev/null` (interval 10s, 3 retries).
- `.dockerignore` excludes `node_modules`, `build`, `.svelte-kit`, `.git`, `.env*`, `docs` and `eg`.

### Server layout: `/opt/farm-website/`

These files are copied once from the repo's `deploy/` directory:

- `compose.yml` defines one service `web` with image `${IMAGE_REPO:-ghcr.io/greenhillth/farm-website}:${IMAGE_TAG}` and `env_file: .env`. It publishes on `127.0.0.1:${HOST_PORT}:3000`, adds `extra_hosts: ["host.docker.internal:host-gateway"]`, and sets `restart: unless-stopped`.
- `.env` (from `deploy/.env.example`, never committed):
  - `IMAGE_TAG` (managed by `deploy.sh`)
  - `IMAGE_REPO` (optional; defaults to `ghcr.io/greenhillth/farm-website`, and is only overridden for testing)
  - `HOST_PORT`, which must match cloudflared's target (confirmed during cutover)
  - `ORIGIN=https://farm.greenhill.net.au`. This is required: SvelteKit's CSRF check otherwise rejects multipart CSV uploads through `/api` with a 403.
  - `BACKEND_ORIGIN=http://host.docker.internal:8000`
- `deploy.sh` and `deploy.log`.

### `deploy/deploy.sh`

Usage: `deploy.sh <vX.Y.Z>` or `deploy.sh --status`.

1. Validate the argument format. Run from the script's own directory.
2. `docker pull` the tag. On failure, exit non-zero with nothing changed.
3. Read the current `IMAGE_TAG` from `.env` as `PREVIOUS`. Write the new tag, then run `docker compose up -d`.
4. Wait up to 60s for the container health status to be `healthy`, and for `curl http://127.0.0.1:$HOST_PORT/` to return 200.
5. On failure: write `PREVIOUS` back, `docker compose up -d`, wait for it to be healthy, log it, and exit 1 with a message saying the rollback happened. If there is no `PREVIOUS` (first deploy), stop the container and exit 1.
6. On success: append `timestamp from→to ok` to `deploy.log`, then remove farm-website images other than the 3 most recent tags.
7. `--status` prints the running tag, the container health and the last 5 log lines.

## 4. Cutover and testing

### Pre-cutover testing (local, needs Docker)

Start a throwaway local registry (`registry:2` on `localhost:5000`), push locally built test images to it, and run `deploy.sh` with `IMAGE_REPO=localhost:5000/farm-website`, covering:

- a good tag, which deploys and reports healthy
- a nonexistent tag, which fails at pull and leaves the running container untouched
- a deliberately broken image (for example `CMD ["false"]`), which triggers an automatic rollback to the previous tag

If Docker isn't available locally, run the same three cases on the server on a spare port before switching cloudflared.

### First release, v1.0.0

1. Merge `chore/upgrade-deps`, then the pipeline branch, into the reset `main` through PRs with green CI.
2. Set `package.json` `version` to `1.0.0`, merge, and tag `v1.0.0`. Confirm the image appears in GHCR.
3. On the server (Tom, following exact commands in the runbook):
   1. Record the current container's name and port, and cloudflared's target.
   2. Create `/opt/farm-website`, copy the `deploy/` files, and fill in `.env`.
   3. `docker stop <old>`. Stop it, don't remove it, so `docker start <old>` is the fallback.
   4. `./deploy.sh v1.0.0`.
   5. Verify through `https://farm.greenhill.net.au`: home, map, weather, and **a CSV upload on /soiltests**.
4. Remove the old container after roughly a week of clean running.

## 5. Documentation

- `deploy/README.md` is the runbook: one-time server setup, deploy, rollback, `--status` and logs, and troubleshooting (GHCR pull auth, a failed health check, a 403 on uploads meaning a wrong `ORIGIN`, a 502 meaning the backend isn't reachable).
- `CLAUDE.md` gets a "Deployment" section: releases are version tags on `main`, deploys are run by Tom on the server with `deploy.sh`, and Claude never deploys, pushes tags, or force-pushes without explicit instruction. It links to the runbook.
- The README's "Building and running" section mentions the Docker image and links to the runbook.

## Noted, not addressed here

- gbros-api's compose publishes port 8000 on all interfaces (`"${API_PORT:-8000}:8000"`), which exposes the backend to the LAN. Fix that in that repo by binding to `127.0.0.1`. **That change breaks this design's `BACKEND_ORIGIN`**: `host.docker.internal` resolves to the Docker bridge gateway, not the host's loopback. When it's made, the frontend should instead join the backend's Docker network and use `BACKEND_ORIGIN=http://gbros-api:8000`. Plan the two changes together.
