# Deploying farm-website

This is the reference. New to GitHub Actions or releasing? Start with [docs/deploying.md](../docs/deploying.md), a step-by-step walkthrough. Branches and PRs are covered in [docs/git-workflow.md](../docs/git-workflow.md).

Production runs the image `ghcr.io/greenhillth/farm-website:<tag>` on the on-site Ubuntu server, published on `127.0.0.1:$HOST_PORT` and exposed through cloudflared at https://farm.greenhill.net.au. Everything lives in `/opt/farm-website`: `compose.yml`, `.env`, `deploy.sh` and `deploy.log`.

## Releasing a new version

Releases are `vX.Y.Z` tags on `main`. Merging to `main` never deploys.

```sh
git switch -c release/v1.2.0 origin/main
npm version 1.2.0 --no-git-tag-version
git commit -am "Release v1.2.0"
gh pr create --fill          # merge once CI (checks, container, deploy-tests) is green
git fetch origin
git tag v1.2.0 origin/main
scripts/check-release.sh v1.2.0 origin/main   # must print "v1.2.0 OK"; if not, `git tag -d v1.2.0`
git push origin v1.2.0       # runs the release workflow
gh run watch                 # image appears at ghcr.io/greenhillth/farm-website:v1.2.0
```

The release workflow refuses tags that aren't on `main` or don't match `package.json`. Pushed `v*` tags can't be moved or deleted (a GitHub ruleset), so check before pushing. A bad pushed tag is fixed with the next version number.

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

The server needs Docker Engine 25 or newer with the Compose plugin (check with `docker version` and `docker compose version`); the image's healthcheck uses `--start-interval`, which older engines reject.

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
