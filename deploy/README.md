# Deploying farm-website

This is the reference. New to GitHub Actions or releasing? Start with [docs/deploying.md](../docs/deploying.md), a step-by-step walkthrough. Branches and PRs are covered in [docs/git-workflow.md](../docs/git-workflow.md).

Production runs the image `ghcr.io/greenhillth/farm-website:<tag>` on the on-site Ubuntu server, published on `127.0.0.1:$HOST_PORT` and exposed through cloudflared at https://farm.greenhill.net.au. Everything lives in `/opt/farm-website`: `compose.yml`, `.env`, `deploy.sh` and `deploy.log`.

## How it fits together on the server

```
browser → Cloudflare Access (Microsoft Entra) → cloudflared tunnel
  → nginx 10.0.0.100:4000 (/etc/nginx/conf.d/cloudflared.conf)
      /      → 127.0.0.1:3000  this container (HOST_PORT=3000)
      /api/  → 127.0.0.1:8000  gbros-api, directly
```

- **nginx sits in front.** cloudflared targets nginx on :4000, not this container. The container's port is set in nginx's `upstream sveltekit_app`. The server's LAN IP `10.0.0.100` is reserved as static on the router, because the tunnel route uses it.
- **Browser `/api/` requests skip this container.** nginx sends them straight to gbros-api. So for uploads the limits that apply are nginx's `client_max_body_size 50m` and the API's own 10 MB, not `BODY_SIZE_LIMIT`. `ORIGIN` still matters for anything SvelteKit handles itself.
- **Server-side fetches** in load functions use `BACKEND_ORIGIN=http://gbros-api:8000` over the `farmstack` network.
- gbros-api's runbook is its `CLAUDE.md` (Deployment) and `scripts/deploy.sh`.
- **Before 2026-09-27** the site ran from a hand-built checkout: the `farm-website.service` systemd unit ran `node build/index.js` on :4173 from `/home/tom/projects/farm-website`. To go back to it, set `upstream sveltekit_app` to `127.0.0.1:4173`, then `sudo nginx -t && sudo systemctl reload nginx`. That only works while the unit is still enabled. Once `v1.0.0` has run cleanly for a few days, retire it with `sudo systemctl disable --now farm-website`. Nothing is deleted.

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

The container joins gbros-api's Docker network `farmstack` and reaches the API as `http://gbros-api:8000`. gbros-api's `scripts/deploy.sh` creates that network, so deploy the API first (`docker network ls` should list `farmstack`).

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

| Key               | Value                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `IMAGE_TAG`       | Managed by `deploy.sh`; don't edit                                                                      |
| `HOST_PORT`       | Port the container is published on, 127.0.0.1 only. Production: `3000`, behind nginx on :4000           |
| `ORIGIN`          | `https://farm.greenhill.net.au`. Must be the public URL, or uploads fail with 403                       |
| `BACKEND_ORIGIN`  | `http://gbros-api:8000`: gbros-api's container on the `farmstack` network, as a bare origin (no `/api`) |
| `BODY_SIZE_LIMIT` | `25M`. Max request body, which caps CSV upload size                                                     |
| `BACKEND_NETWORK` | Optional. The external network to join; defaults to `farmstack`                                         |

## Troubleshooting

| Symptom                                                          | Fix                                                                                                                                                                                                    |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pull failed` with `denied` / `unauthorized`                     | The GHCR package is private. Make it public (GitHub → Packages → farm-website → Package settings → Change visibility), or `docker login ghcr.io -u greenhillth` with a token that has `read:packages`. |
| `did not become healthy`, and it rolled back                     | Read the logs `deploy.sh` printed, or `docker compose logs web`. Try the image locally with `scripts/smoke-test.sh --image ghcr.io/greenhillth/farm-website:<tag>`.                                    |
| CSV upload returns **403**                                       | `ORIGIN` in `.env` doesn't match the URL in the browser.                                                                                                                                               |
| CSV upload returns **413**                                       | The file is bigger than `BODY_SIZE_LIMIT`.                                                                                                                                                             |
| API calls return **502**                                         | The backend isn't reachable. Check it's running (`docker ps`) and test from the container: `docker compose exec web wget -qO- http://gbros-api:8000/api/health`.                                       |
| `network farmstack declared as external, but could not be found` | gbros-api hasn't been deployed on this server yet. Run its `scripts/deploy.sh` (or `docker network create farmstack`), then deploy again.                                                              |
| `HOST_PORT must be set` / `port is already allocated`            | Set `HOST_PORT` in `.env`, or stop whatever holds that port (`sudo ss -ltnp \| grep :<port>`).                                                                                                         |
