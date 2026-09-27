### Task 1: Type scale, 16px body and old CSS

**Files:**

- Modify: `src/app.css`
- Create: `src/app-css.test.ts`
- Modify: `src/lib/node-builtins.d.ts` (declare `readFileSync`)
- Modify: `src/routes/manual/+page.svelte` (the one `text-[11px]`)

**Interfaces:**

- Produces: Tailwind `text-lg` = 20px, `text-xl` = 25px, `text-2xl` = 31px (the direction document's scale); body text 16px with line height 1.5.

- [ ] **Step 1: Write the failing test**

Create `src/app-css.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Read from disk: Vitest's CSS handling turns `?raw` imports of CSS into an empty string.
const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8');

describe('app.css', () => {
	it('sets 16px body text with a 1.5 line height', () => {
		expect(css).toMatch(/font:\s*16px\/1\.5/);
	});

	it('uses the direction document’s type scale', () => {
		expect(css).toContain('--text-lg: 1.25rem;');
		expect(css).toContain('--text-xl: 1.5625rem;');
		expect(css).toContain('--text-2xl: 1.9375rem;');
	});

	it('has no rules left from the static site', () => {
		for (const selector of ['#app', '#sidebar', '#main', '#map', '.legend', 'label.field']) {
			expect(css).not.toContain(selector);
		}
	});
});
```

The project has no `@types/node`; `src/lib/node-builtins.d.ts` declares the few Node functions tests use. Add this line inside its `declare module 'node:fs'` block:

```ts
export function readFileSync(path: string | URL, encoding: 'utf8'): string;
```

Run: `npx vitest run --project server src/app-css.test.ts`
Expected: FAIL (14px body, old selectors present).

- [ ] **Step 2: Check the old selectors really are unused**

Run each of these; every one must print nothing (the `#app` hit in `src/app.d.ts` is a comment, if present):

```bash
grep -rn 'id="app"\|id="sidebar"\|id="main"\|id="map"' src
grep -rn 'class="[^"]*\blegend\b' src --include=*.svelte
grep -rn 'class="[^"]*\bfield\b' src --include=*.svelte | grep "<label"
```

If any prints a match, keep that rule and tell your reviewer.

- [ ] **Step 3: Replace `src/app.css`**

```css
@import 'tailwindcss';

/* Tailwind colour utilities (text-muted, bg-panel, border-border…) read the :root vars below */
@theme {
	--color-bg: rgb(var(--bg));
	--color-panel: rgb(var(--panel));
	--color-text: rgb(var(--text));
	--color-muted: rgb(var(--muted));
	--color-accent: rgb(var(--accent));
	--color-border: rgb(var(--border));
	--color-status-low: rgb(var(--status-low));
	--color-status-high: rgb(var(--status-high));
	--color-warn: rgb(var(--warn));
	--color-danger: rgb(var(--danger));
	--font-sans: 'Atkinson Hyperlegible Next Variable', system-ui, sans-serif;

	/* Type scale from the UI direction document (ratio 1.25); xs, sm and base keep Tailwind's sizes. */
	--text-lg: 1.25rem;
	--text-lg--line-height: 1.4;
	--text-xl: 1.5625rem;
	--text-xl--line-height: 1.3;
	--text-2xl: 1.9375rem;
	--text-2xl--line-height: 1.25;
}

/* Keep Leaflet typography consistent with the page. */
.leaflet-container {
	font: inherit;
}

:root {
	--bg: 11 17 23; /* #0b1117 */
	--panel: 15 23 34; /* #0f1722 */
	--text: 230 237 243; /* #e6edf3 */
	--muted: 159 179 200; /* #9fb3c8 */
	--accent: 114 228 156; /* #72e49c */
	--border: 31 42 55; /* #1f2a37 */
	--status-low: 242 179 91; /* #f2b35b */
	--status-high: 120 189 240; /* #78bdf0 */
	--warn: 242 179 91; /* #f2b35b */
	--danger: 248 113 113; /* #f87171 */
	/* Space the app shell takes; full-height pages subtract these. */
	--shell-top: 0px;
	--shell-bottom: calc(4rem + env(safe-area-inset-bottom));
}

@media (min-width: 48rem) {
	:root {
		--shell-top: 3.5rem;
		--shell-bottom: 0px;
	}
}

* {
	box-sizing: border-box;
}

html,
body {
	height: 100%;
	margin: 0;
}

body {
	font:
		16px/1.5 'Atkinson Hyperlegible Next Variable',
		system-ui,
		-apple-system,
		Segoe UI,
		Roboto,
		sans-serif;
	color: rgb(var(--text));
	background: rgb(var(--bg));
}

/* In the base layer so Tailwind colour utilities on links (text-muted, text-text…) win. */
@layer base {
	a {
		color: rgb(var(--accent));
		text-decoration: none;
	}
}

select,
input[type='checkbox'] {
	accent-color: rgb(var(--accent));
}
```

- [ ] **Step 4: Fix the manual's small text**

In `src/routes/manual/+page.svelte`, change `text-[11px]` (on the CSV header example block) to `text-xs`.

Run: `grep -rn "text-\[1[01]px\]" src/routes/manual src/routes/weather src/routes/+page.svelte`
Expected: no output.

- [ ] **Step 5: Run the tests and look**

Run: `npx vitest run --project server src/app-css.test.ts && npm run check && npm test`
Expected: PASS.

Start `npm run dev` and run `node scripts/screenshot.mjs /tmp/shots-type / /weather /manual /paddocks`. Check at 390px that body text is visibly larger than before, nothing overflows sideways (no `HORIZONTAL SCROLL` in the output), and headings step up in size (h1 25px, section headings 20px). Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/app.css src/app-css.test.ts src/lib/node-builtins.d.ts src/routes/manual/+page.svelte
git commit -m "Set 16px body text and the direction type scale; drop static-site CSS"
```

---

