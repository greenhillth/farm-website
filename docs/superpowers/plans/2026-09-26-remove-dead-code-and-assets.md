# Remove dead code and slim home-page assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Before editing any `.svelte` file, load the `svelte:svelte-code-writer` skill and run its autofixer on every `.svelte` file you change.

**Goal:** The home page loads about 100 KB thumbnails instead of multi-megabyte photos, its image paths are absolute, and unused modules and static files are gone.

**Architecture:** The home page's card list moves from `src/routes/+page.svelte` into `src/lib/home-items.ts`, so a node test can check every image path against `static/` and against a size budget. The existing 800px `*-card.webp` files are the same photos as the large JPGs the cards use now (checked on 2026-09-26), so the cards switch to them and the originals are deleted along with other unreferenced files. Unused pre-Svelte helpers and the unused direct Ecowitt provider are removed, and CLAUDE.md is updated to match.

**Tech Stack:** SvelteKit 2, Svelte 5, TypeScript ~6.0, Vitest 5 (`server` project, node).

**Spec:** Item 3 of the 2026-09-26 repository review ("Remove dead code" and "Home page images"), plus the home-page relative image path from item 1.

## Global Constraints

- Work only in your own worktree under `.claude/worktrees/`. Never edit or switch branches in the main checkout.
- After `npm ci`, and before changing anything, record the ESLint baseline for the paths listed in the final task: `npx eslint <paths> 2>&1 | tail -3`. Later checks compare against it.
- Run `npm ci` first in the worktree. If it fails with `Tsconfig not found .../.svelte-kit/tsconfig.json`, run `npx svelte-kit sync` in the main checkout (`/Users/tomgreenhill/Projects/farm-website/farm-website`), then retry.
- Before your first commit, move off the `worktree-<name>` branch you started on: `git fetch origin`, `git switch --no-track -c chore/remove-dead-code-and-assets origin/staging`, then `git branch -d <the worktree-… branch>`. The branch is based on `staging`, not `main`.
- First commit: copy this plan to `docs/superpowers/plans/2026-09-26-remove-dead-code-and-assets.md` and run `npx prettier --write` on it (CI checks Markdown formatting).
- Delete files with `git rm` so the deletions are staged. Before deleting anything, confirm with `git grep` that nothing references it (commands are given in each task).
- Keep `linearGradientCSS` and `uploadEndpoint` in `src/lib/utils.ts`: `src/lib/layers.ts` and `src/routes/soiltests/+page.svelte` use them. Keep `static/img/tom-and-alex.jpg`, `static/video/pysn.mp4` and `static/img/logo.png`, which are still used.
- Prettier: tabs, single quotes, no trailing commas, width 100. Run `npx prettier --write` on the files you touch.
- Don't add ESLint errors. The count for touched files should drop.
- Don't touch files outside this plan's **Files** lists. Parallel branches own the rest. In particular, don't edit `src/lib/components/`, `src/lib/weather.ts`, `src/lib/providers/backend.ts`, `src/lib/layers.ts` or `src/routes/map/`.
- Before pushing, all of these must pass: `npm run check`, `npm test`, `npx prettier --check .`, `npm run build`, `scripts/smoke-test.sh --local`.
- Push the branch and open a PR into `staging` (`--base staging`). Don't merge it. Leave the worktree in place: it gets deleted after the PR merges.

## Review Focus

1. A card image path without a leading `/` → it breaks on any page other than `/` and when the app runs under a sub-path. Every local image must be absolute (test in Task 1).
2. A card image that doesn't exist in `static/` → a broken image on the home page (test in Task 1).
3. A card image added later as a full-size phone photo → a multi-megabyte home page again. Every card image must stay under 150 KB (test in Task 1).
4. Two cards with the same title → the home page's keyed `{#each}` throws. Titles must be unique (test in Task 1).
5. A deleted file still referenced from code, CSS, the Dockerfile or docs → a 404 in production. `git grep` must show no references before deletion, and `npm run build` plus the smoke test must pass after it (Tasks 2 and 3).

---

### Task 1: Home items in a tested module, using the thumbnails

**Files:**

- Create: `src/lib/home-items.ts`
- Test: `src/lib/home-items.test.ts` (create)
- Modify: `src/routes/+page.svelte` (script: the `Item` type and `items` array, lines ~4–97; markup: the `{#each}` at line ~110)

**Interfaces:**

- Produces: `export type HomeItem` and `export const homeItems: HomeItem[]` in `$lib/home-items`.

- [ ] **Step 1: Move the list without changing it**

Create `src/lib/home-items.ts` containing the `Item` type (renamed `HomeItem` and exported) and the `items` array (renamed `homeItems` and exported), copied from `src/routes/+page.svelte` exactly as they are, including the commented-out `/alex` entry. Then change the page's script to:

```svelte
<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import { homeItems } from '$lib/home-items';
</script>
```

and its loop to:

```svelte
{#each homeItems as item (item.title)}
	<Card {...item} />
{/each}
```

Run `npm run check` (0 errors). This step changes structure only.

- [ ] **Step 2: Write the failing test**

Create `src/lib/home-items.test.ts`:

```ts
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { homeItems } from './home-items';

const staticDir = fileURLToPath(new URL('../../static', import.meta.url));
const MAX_CARD_IMAGE_BYTES = 150_000;

const localImages = homeItems
	.map((item) => item.image)
	.filter((image): image is string => typeof image === 'string' && !/^https?:/.test(image));

describe('homeItems', () => {
	it.each(localImages)('%s is an absolute path to a file in static/', (image) => {
		expect(image.startsWith('/')).toBe(true);
		expect(existsSync(`${staticDir}${image}`)).toBe(true);
	});

	it.each(localImages)('%s is a thumbnail under 150 KB', (image) => {
		expect(statSync(`${staticDir}/${image.replace(/^\//, '')}`).size).toBeLessThan(
			MAX_CARD_IMAGE_BYTES
		);
	});

	it('has unique titles, which the home page uses as keys', () => {
		const titles = homeItems.map((item) => item.title);
		expect(new Set(titles).size).toBe(titles.length);
	});
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest --run --project server src/lib/home-items.test.ts`
Expected: FAIL for `img/soil.jpg`, `img/weather-station.webp` and `img/confused-dad-1.jpg` (not absolute), and for `/img/tractor-1.jpg` (3.5 MB), `/img/aerial-map.jpg` (370 KB) and `img/confused-dad-1.jpg` (1.2 MB) on size.

- [ ] **Step 4: Point the cards at the thumbnails**

In `src/lib/home-items.ts`, set these `image` values (match by `href`):

| `href`       | `image`                     |
| ------------ | --------------------------- |
| `/map`       | `/img/map-card.webp`        |
| `/paddocks`  | `/img/paddock-card.webp`    |
| `/soiltests` | `/img/soil-card.webp`       |
| `/weather`   | `/img/weather-station.webp` |
| `/manual`    | `/img/manual-card.webp`     |

Leave the SharePoint cards on `/img/sharepoint.jpg` (58 KB) and the commented `/alex` entry as it is.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest --run --project server src/lib/home-items.test.ts`
Expected: all passed.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/lib/home-items.ts src/lib/home-items.test.ts src/routes/+page.svelte
git add src/lib/home-items.ts src/lib/home-items.test.ts src/routes/+page.svelte
git commit -m "Move home cards to a tested module and use the webp thumbnails"
```

---

### Task 2: Delete unused static files

**Files:**

- Delete: `static/img/tractor-1.jpg`, `static/img/confused-dad-1.jpg`, `static/img/aerial-map.jpg`, `static/img/soil.jpg` (replaced in Task 1)
- Delete: `static/img/paddock-4.jpg`, `static/img/gbros.svg`, `static/img/gbros-rounded.svg`, `static/img/gbros.webp`, `static/img/logo-square.svg`, `static/img/sharepoint.svg` (never referenced)

**Interfaces:** none.

- [ ] **Step 1: Confirm nothing references them**

```bash
for f in tractor-1.jpg confused-dad-1.jpg aerial-map.jpg soil.jpg paddock-4.jpg gbros.svg gbros-rounded.svg gbros.webp logo-square.svg sharepoint.svg; do
	echo "== $f"; git grep -n -- "$f" -- . ':!docs/superpowers/plans'
done
```

Expected: no matches except `gbros.svg`, which may match `src/lib/assets/gbros.svg` by path (Task 3 deletes that). If anything else matches, stop and report it instead of deleting.

- [ ] **Step 2: Delete and verify**

```bash
git rm static/img/tractor-1.jpg static/img/confused-dad-1.jpg static/img/aerial-map.jpg static/img/soil.jpg static/img/paddock-4.jpg static/img/gbros.svg static/img/gbros-rounded.svg static/img/gbros.webp static/img/logo-square.svg static/img/sharepoint.svg
npx vitest --run --project server src/lib/home-items.test.ts
npm run build
```

Expected: tests pass and the build succeeds.

- [ ] **Step 3: Commit**

```bash
git commit -m "Remove unused and replaced images from static/img"
```

---

### Task 3: Delete unused modules and update CLAUDE.md

**Files:**

- Delete: `src/lib/ui.ts`, `src/lib/providers/ecowitt.ts`, `src/lib/index.ts`, `src/lib/assets/svelte.svg`, `src/lib/assets/gbros.svg`
- Modify: `src/lib/utils.ts` (remove `$` and `fmt`)
- Modify: `CLAUDE.md` (the `src/routes/weather/` bullet and the `src/lib/ui.ts` bullet in "Code layout")

**Interfaces:** `src/lib/utils.ts` keeps exporting `linearGradientCSS` and `uploadEndpoint` unchanged.

- [ ] **Step 1: Confirm nothing imports them**

```bash
git grep -n "lib/ui\|/ui'\|providers/ecowitt\|from '\$lib'\|lib/index\|svelte.svg\|assets/gbros" -- src
git grep -n "\bfmt\b\|import { \$" -- src ':!src/lib/ui.ts' ':!src/lib/utils.ts'
```

Expected: the first command prints nothing. The second may match a local `fmt` in `src/routes/weather/+page.svelte`, which is a separate function defined in that page, not an import from `utils`. Anything else means stop and report.

- [ ] **Step 2: Delete the modules and trim `utils.ts`**

```bash
git rm src/lib/ui.ts src/lib/providers/ecowitt.ts src/lib/index.ts src/lib/assets/svelte.svg src/lib/assets/gbros.svg
```

Replace `src/lib/utils.ts` with:

```ts
import CONFIG from './config';

export function linearGradientCSS(colors: string[], stopsPct: number[]): string {
	const parts = colors.map((c, i) => `${c} ${Math.round(stopsPct[i])}%`);
	return `linear-gradient(to right, ${parts.join(', ')})`;
}
export function uploadEndpoint(mode: 'manual' | 'import'): string {
	return CONFIG.backend.upload.test[mode];
}
```

- [ ] **Step 3: Update CLAUDE.md**

In the "Code layout" section, delete the sentence `` `providers/ecowitt.ts` (direct Ecowitt API) is currently unused.`` from the end of the `src/routes/weather/` bullet, and delete the whole bullet that starts `` - `src/lib/ui.ts` and `$` in `src/lib/utils.ts` ``. Change nothing else in CLAUDE.md.

- [ ] **Step 4: Verify**

Run: `npm run check` (0 errors), `npm test` (all pass), `npm run build` (succeeds).

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/lib/utils.ts CLAUDE.md
git add -A src/lib CLAUDE.md
git commit -m "Remove unused pre-Svelte helpers and the unused Ecowitt provider"
```

---

### Task 4: Full verification, check in the browser, and PR

- [ ] **Step 1: CI-equivalent checks**

Run each command, and don't continue while any of them fails:

```bash
npm run check
npm test
npx prettier --check .
npm run build
scripts/smoke-test.sh --local
npx eslint src/lib src/routes/+page.svelte
```

The ESLint error count must be lower than on `origin/staging` for these paths.

- [ ] **Step 2: Check in the browser**

Start the built app against the stub backend the way `scripts/smoke-test.sh --local` does (read the script for ports and env vars). With Playwright MCP browser tools, open `/`, check that every card shows its image with no broken images (`browser_network_requests`: no 404s under `/img/`), and take a screenshot. Report the total image bytes the home page transferred.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin chore/remove-dead-code-and-assets
gh pr create --base staging --title "Remove dead code and use thumbnail images on the home page" --body "<summary: files removed, image bytes before/after, tests added, verification run; end with the attribution lines from the session>"
```

Don't merge.
