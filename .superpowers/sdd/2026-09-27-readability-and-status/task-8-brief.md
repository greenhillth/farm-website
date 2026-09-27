### Task 8: Spraying on the home page

**Files:**

- Modify: `src/routes/+page.svelte` (the weather tiles, the grid, and a new Spraying tile)
- Modify: `src/routes/home-page.svelte.test.ts`

**Interfaces:**

- Consumes: `sprayConditions`, `SPRAY_LABELS`, `SPRAY_TONES` (Task 3); `SampleDataChip` (Task 4); `CONFIG.spray`.

- [ ] **Step 1: Update the failing tests**

In `src/routes/home-page.svelte.test.ts`:

1. Change the imports and fixture to:

```ts
import { ALWAYS_SAMPLE_FIELDS, WEATHER_FIELDS, getMockWeather } from '$lib/weather';
```

```ts
const live = {
	weather: getMockWeather(),
	connected: true,
	source: 'ecowitt' as const,
	mockFields: [...ALWAYS_SAMPLE_FIELDS]
};
const offline = {
	...live,
	connected: false,
	source: 'mock' as const,
	mockFields: [...WEATHER_FIELDS]
};
```

2. In "labels every weather tile when the station is offline", render `{ weather: offline, soil }`.
3. Add:

```ts
it('says whether it’s a good time to spray, with the reason', async () => {
	renderHome({ weather: live, soil });

	const tile = page.getByRole('link').filter({ hasText: 'Spraying now' });
	// Mock wind is 8.6 m/s = 31 km/h.
	await expect.element(tile.getByText('Not suitable')).toBeVisible();
	await expect.element(tile.getByText('Wind 31 km/h: too strong')).toBeVisible();
});

it('can’t judge spraying from sample data', async () => {
	renderHome({ weather: offline, soil });

	await expect
		.element(
			page
				.getByRole('link')
				.filter({ hasText: 'Spraying now' })
				.getByText('Can’t tell', { exact: true })
		)
		.toBeVisible();
});

it('labels only the tile whose reading is sample data', async () => {
	renderHome({ weather: { ...live, mockFields: [...ALWAYS_SAMPLE_FIELDS, 'rain.daily'] }, soil });

	expect(page.getByText('Sample data').elements()).toHaveLength(1);
	await expect
		.element(page.getByRole('link').filter({ hasText: 'Rain today' }).getByText('Sample data'))
		.toBeVisible();
});
```

Run: `npx vitest run --project client src/routes/home-page.svelte.test.ts`
Expected: FAIL (no Spraying tile; chips follow `source`).

- [ ] **Step 2: Update `src/routes/+page.svelte`**

1. Add imports:

```ts
import SampleDataChip from '$lib/components/SampleDataChip.svelte';
import CONFIG from '$lib/config';
import { SPRAY_LABELS, SPRAY_TONES, sprayConditions } from '$lib/spray';
import type { WeatherField } from '$lib/weather';
```

2. Replace `const isSample = $derived(weather?.source === 'mock');` with:

```ts
const isSample = (field: WeatherField) => weather?.mockFields.includes(field) ?? false;
const spray = $derived(
	weather ? sprayConditions(weather.weather, weather.mockFields, CONFIG.spray) : null
);
```

3. Replace the `sampleChip` snippet with:

```svelte
{#snippet sampleChip()}
	<span class="mt-2 self-start"><SampleDataChip /></span>
{/snippet}
```

4. Change the three tile conditions: `{#if isSample}` becomes `{#if isSample('outdoor.temp')}` on the temperature tile, `{#if isSample('wind.speed')}` on the wind tile and `{#if isSample('rain.daily')}` on the rain tile.
5. Change the grid to `class="grid grid-cols-2 gap-3 lg:grid-cols-5"`, the unavailable message's `lg:col-span-3` to `lg:col-span-4`, and keep the soil tile's `col-span-2 … lg:col-span-1`.
6. After the rain tile's closing `</a>` and before `{:else}`, add the Spraying tile:

```svelte
{#if spray}
	<a
		href={resolve('/weather')}
		class="flex min-h-28 flex-col rounded-xl border border-border bg-panel p-4 text-text"
	>
		<span class="text-sm text-muted">Spraying now</span>
		<span class={['mt-1 text-2xl leading-tight font-semibold', SPRAY_TONES[spray.verdict]]}>
			{SPRAY_LABELS[spray.verdict]}
		</span>
		<span class="mt-2 text-sm text-muted">{spray.summary}</span>
	</a>
{/if}
```

Run the autofixer, then: `npx vitest run --project client src/routes/home-page.svelte.test.ts && npm run check`
Expected: PASS, no type errors anywhere now.

- [ ] **Step 3: Commit**

```bash
git add src/routes/+page.svelte src/routes/home-page.svelte.test.ts
git commit -m "Add a Spraying tile to the home strip and mark sample readings per tile"
```

---

