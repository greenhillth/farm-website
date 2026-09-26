# Deploying, step by step

A beginner's guide to getting a change onto https://farm.greenhill.net.au. It assumes you've never used GitHub Actions. For the server reference (`.env` keys, `deploy.sh` options, troubleshooting table), see [deploy/README.md](../deploy/README.md). For branches and PRs, see [Git workflow](git-workflow.md).

## The big picture

Getting code to production has three stages. GitHub does the first two by itself; you trigger the second and do the third.

| Stage              | What happens                                                                                                                                               | Who starts it                                                   | Where to look                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **1. CI** (checks) | Type-checks, tests, lint, builds the app and the Docker image, and tests `deploy.sh`. Nothing is published.                                                | Automatic, on every PR and every merge into `staging` or `main` | The PR page (bottom), or the **Actions** tab                              |
| **2. Release**     | Builds the Docker image and publishes it to GitHub's container registry as `ghcr.io/greenhillth/farm-website:vX.Y.Z`. Creates a GitHub Release with notes. | You, by pushing a `vX.Y.Z` tag                                  | **Actions** tab, then **Releases** and **Packages** on the repo home page |
| **3. Deploy**      | The server downloads that image and switches to it. If it isn't healthy within 60 seconds, the server switches back to the previous version.               | You, on the server                                              | The server terminal and `/opt/farm-website/deploy.log`                    |

Nothing reaches production by accident. Merging a PR runs CI but deploys nothing, and pushing a tag publishes an image but doesn't run it. Only `deploy.sh` changes what the site serves.

## GitHub Actions in five minutes

- **GitHub Actions** is GitHub running scripts for you on a fresh Linux machine each time something happens in the repo.
- A **workflow** is one of those scripts, a YAML file in `.github/workflows/`. This repo has two:
  - `ci.yml` runs on every pull request and every push to `staging` or `main`.
  - `release.yml` runs when a tag like `v1.3.0` is pushed.
- A **job** is one part of a workflow that runs on its own machine. `ci.yml` has three jobs:
  - **`checks`**: `npm run check`, the tests (including Chromium component tests), Prettier, the build, a smoke test of the built app, and shell-script checks. ESLint also runs but is non-blocking until its backlog is cleared.
  - **`container`**: builds the production Docker image and smoke-tests it.
  - **`deploy-tests`**: tests `deploy/deploy.sh`, including its automatic rollback.
- A **run** is one execution of a workflow. Every run has a page with a log for each job.
- A **check** is how a job's result shows up on a PR: a green tick, a red cross, or a yellow dot while it runs. The rules on `main` require all three to be green before you can merge.

To see runs, open the repo on GitHub and click **Actions**. Click a run to see its jobs, then a job to see its log. A red step is where it failed. From the terminal, `gh run list` and `gh run view --log-failed` show the same.

## One-time setup: the first release

Do this once. After that, every release is the short recipe in the next section.

1. **Make release `v1.0.0`.** Follow [Every release](#every-release) with version `1.0.0`.
2. **Make the image public.** The first release creates a package called `farm-website`, and GitHub makes new packages private. The server can't download a private image without a login. The repo is public, so make the package public too:
   1. Go to https://github.com/greenhillth?tab=packages and click **farm-website**.
   2. Click **Package settings** (right-hand side).
   3. Under **Danger Zone**, click **Change visibility** and choose **Public**.

   The alternative is to keep it private and log the server in with `docker login ghcr.io -u greenhillth`, using a personal access token with `read:packages`.

3. **Set up the server.** Follow [One-time server setup](../deploy/README.md#one-time-server-setup) in `deploy/README.md`, then fill in `.env` using the table below it.
4. **Deploy it:** `/opt/farm-website/deploy.sh v1.0.0` on the server (see [Deploying on the server](#deploying-on-the-server)).

## Every release

Pick the version number first. Versions are `MAJOR.MINOR.PATCH`:

- **Patch** (`1.2.0` → `1.2.1`): bug fixes only.
- **Minor** (`1.2.1` → `1.3.0`): new features. The usual choice.
- **Major** (`1.3.0` → `2.0.0`): something big or breaking, like a redesign or a change that needs a new backend.

The latest version is on the repo's **Releases** page, or run `git tag --list 'v*' --sort=-v:refname | head -1`.

### 1. Bump the version in a release PR, then promote `staging`

```sh
git switch staging
git pull
git switch -c release/v1.3.0
npm version 1.3.0 --no-git-tag-version   # changes "version" in package.json and package-lock.json
git commit -am "Release v1.3.0"
git push -u origin release/v1.3.0
gh pr create --fill --base staging
gh pr checks --watch                     # wait for green
gh pr merge --merge

# Promote everything on staging, including the bump, to main
gh pr create --base main --head staging --title "Release v1.3.0"
gh pr checks --watch
gh pr merge --merge
```

Check that `staging` still exists afterwards (`git ls-remote --heads origin staging`). If the automatic deletion of merged branches removed it, click **Restore branch** on the promotion PR.

### 2. Tag `main` and push the tag

```sh
git switch main
git pull
git tag v1.3.0                              # local only so far
scripts/check-release.sh v1.3.0 origin/main # must print "v1.3.0 OK"
git push origin v1.3.0                      # this starts the release
```

Run `scripts/check-release.sh` every time, before pushing. It runs the same checks as the release workflow: the tag is `vX.Y.Z`, it's on `main`, and `package.json` has the same version. If it fails, `git tag -d v1.3.0` deletes the local tag and you can try again. Once a tag is pushed, it can't be deleted or moved, so a bad pushed tag is stuck and the fix is the next version number.

### 3. Watch the release build

```sh
gh run watch        # pick the "release" run; takes a few minutes
```

Or open **Actions** on GitHub and click the `release` run. When it's green:

- **Releases** on the repo home page lists `v1.3.0` with notes generated from the merged PRs.
- The image `ghcr.io/greenhillth/farm-website:v1.3.0` exists (click **Packages** → **farm-website**).

Nothing has changed on the website yet.

## Deploying on the server

Log in to the server, then:

```sh
/opt/farm-website/deploy.sh v1.3.0
```

You'll see `Pulling ...`, `Switching v1.2.0 -> v1.3.0`, and finally `Deployed v1.3.0`. Behind the scenes it:

1. Downloads the image. If that fails, nothing changes.
2. Switches the running container to the new image.
3. Waits up to 60 seconds for the container to report healthy and for the site to answer.
4. If that doesn't happen, switches back to the previous version and exits with an error.

Then check:

- Open https://farm.greenhill.net.au and try the page you changed.
- `/opt/farm-website/deploy.sh --status` shows the running tag, its health and recent deploys.

### Rolling back

If the new version deployed fine but has a bug you only noticed afterwards, go back to the previous version:

```sh
/opt/farm-website/deploy.sh v1.2.0
```

The last three images are kept on the server, so this is quick and needs no download. Then fix the bug on a `fix/` branch and release a patch version.

## When something goes red

### On a pull request

Scroll to the checks at the bottom of the PR, click **Details** next to the red one, and find the red step in the log. The step name tells you which command failed; run the same command locally.

| Failed step                               | Usual cause                                     | Fix                                                                                              |
| ----------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run check`                           | Type error                                      | Run `npm run check` locally and fix what it reports.                                             |
| `npm test`                                | A test failed                                   | Run `npm test` locally. The log names the test and shows expected against actual.                |
| `npx prettier --check .`                  | Formatting                                      | `npm run format`, commit, push.                                                                  |
| `npm run build` or `smoke-test.sh`        | The production build or the built app is broken | `npm run build`, then `scripts/smoke-test.sh --local`.                                           |
| `shellcheck`                              | A shell script problem                          | Run `shellcheck <file>` on the script it names.                                                  |
| `container` job                           | The Docker image doesn't build or doesn't start | `docker build -t farm-website:local .`, then `scripts/smoke-test.sh --image farm-website:local`. |
| `deploy-tests` job                        | `deploy/deploy.sh` changed and broke            | `deploy/test/run-tests.sh` (needs Docker, about a minute).                                       |
| Anything, with a network or timeout error | GitHub's machine had a bad moment               | Click **Re-run jobs** on the run page.                                                           |

Push the fix to the same branch. The checks rerun by themselves.

### On a release

| Message in the `release` run              | Meaning                                                       | Fix                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `vX.Y.Z is not on origin/main`            | The tag was made on a branch, or before the release PR merged | You can't delete the tag. Merge the release properly and use the next patch version. |
| `package.json version ... does not match` | The version bump was forgotten or wrong                       | Same: fix it in a new release PR with the next version number.                       |
| Docker build or push step fails           | Build problem, or a GitHub hiccup                             | If CI was green on `main`, it's usually a hiccup: click **Re-run jobs**.             |

Running `scripts/check-release.sh` on the local tag before pushing it catches the first two.

### On the server

See the [troubleshooting table](../deploy/README.md#troubleshooting) in `deploy/README.md`: download denied, not healthy, 403/413 uploads, 502 from the API.
