### Task 4: Sample data chip, spray panel and offline banner

**Files:**

- Create: `src/lib/components/SampleDataChip.svelte`
- Create: `src/lib/components/SprayPanel.svelte`
- Create: `src/lib/components/SprayPanel.svelte.test.ts`
- Create: `src/routes/weather/components/OfflineBanner.svelte`
- Create: `src/routes/weather/components/OfflineBanner.svelte.test.ts`

**Interfaces:**

- Consumes: `SprayResult`, `SPRAY_LABELS`, `SPRAY_TONES` (Task 3); `Panel`.
- Produces:
  - `SampleDataChip` (no props): the "Sample data" pill.
  - `SprayPanel` props `{ result: SprayResult }`: a `Panel` titled "Spraying now" with the verdict word and one line per reason.
  - `OfflineBanner` props `{ source: 'ecowitt' | 'mock' }`: renders only for `'mock'`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/components/SprayPanel.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import SprayPanel from './SprayPanel.svelte';

describe('SprayPanel.svelte', () => {
	it.each([
		['good', 'Good'],
		['marginal', 'Marginal'],
		['not-suitable', 'Not suitable']
	] as const)('shows %s as a word with its reasons', async (verdict, label) => {
		render(SprayPanel, {
			result: {
				verdict,
				reasons: ['Wind 9 km/h', 'No rain in the last hour'],
				summary: 'Wind 9 km/h'
			}
		});

		await expect.element(page.getByRole('heading', { name: 'Spraying now' })).toBeVisible();
		await expect.element(page.getByText(label, { exact: true })).toBeVisible();
		await expect.element(page.getByText('No rain in the last hour')).toBeVisible();
	});

	it('explains why it can’t tell', async () => {
		const reason = 'Can’t tell — the station isn’t reporting wind speed.';
		render(SprayPanel, { result: { verdict: 'unknown', reasons: [reason], summary: reason } });

		await expect.element(page.getByText('Can’t tell', { exact: true })).toBeVisible();
		await expect.element(page.getByText(reason)).toBeVisible();
	});
});
```

Create `src/routes/weather/components/OfflineBanner.svelte.test.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import OfflineBanner from './OfflineBanner.svelte';

describe('OfflineBanner.svelte', () => {
	it('warns when the numbers are sample data', async () => {
		render(OfflineBanner, { source: 'mock' });

		await expect.element(page.getByText('Weather station offline.')).toBeVisible();
		await expect
			.element(page.getByText('These are sample numbers — don’t use them for decisions.'))
			.toBeVisible();
	});

	it('stays hidden for live readings', async () => {
		render(OfflineBanner, { source: 'ecowitt' });

		expect(page.getByText('Weather station offline.').elements()).toHaveLength(0);
	});
});
```

Run: `npx vitest run --project client src/lib/components/SprayPanel.svelte.test.ts src/routes/weather/components/OfflineBanner.svelte.test.ts`
Expected: FAIL (the components don't exist).

- [ ] **Step 2: Create `src/lib/components/SampleDataChip.svelte`**

```svelte
<span
	class="inline-flex items-center gap-1.5 rounded-full bg-warn/15 px-2 py-0.5 text-xs font-semibold text-warn"
>
	<span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
	Sample data
</span>
```

- [ ] **Step 3: Create `src/lib/components/SprayPanel.svelte`**

```svelte
<script lang="ts">
	import { SPRAY_LABELS, SPRAY_TONES, type SprayResult } from '$lib/spray';
	import Panel from './Panel.svelte';

	type Props = { result: SprayResult };

	let { result }: Props = $props();
</script>

<Panel title="Spraying now">
	<p class={['flex items-center gap-2 text-2xl font-semibold', SPRAY_TONES[result.verdict]]}>
		<span class="size-3 shrink-0 rounded-full bg-current" aria-hidden="true"></span>
		{SPRAY_LABELS[result.verdict]}
	</p>
	<ul class="mt-3 space-y-1">
		{#each result.reasons as reason (reason)}
			<li>{reason}</li>
		{/each}
	</ul>
</Panel>
```

- [ ] **Step 4: Create `src/routes/weather/components/OfflineBanner.svelte`**

```svelte
<script lang="ts">
	type Props = { source: 'ecowitt' | 'mock' };

	let { source }: Props = $props();
</script>

{#if source === 'mock'}
	<div role="status" class="rounded-xl border border-warn/60 bg-warn/10 px-4 py-3">
		<p class="font-semibold text-warn">Weather station offline.</p>
		<p>These are sample numbers — don’t use them for decisions.</p>
	</div>
{/if}
```

Run the autofixer on all three components, then the tests. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/SampleDataChip.svelte src/lib/components/SprayPanel.svelte src/lib/components/SprayPanel.svelte.test.ts src/routes/weather/components/OfflineBanner.svelte src/routes/weather/components/OfflineBanner.svelte.test.ts
git commit -m "Add the sample data chip, spray panel and offline banner"
```

---

