<script lang="ts">
  import { onMount } from 'svelte';
  import Panel from '$lib/components/Panel.svelte';
  import CONFIG from '$lib/config';

  const metricKeys = ['OM','P1','K','MG','CA','PH'] as const;
  type MetricKey = (typeof metricKeys)[number];
  type Paddock = {
    id: string;
    name: string;
    farm?: string;
    year?: string;
    metrics: Partial<Record<MetricKey, number>>;
  };

  let paddocks: Paddock[] = [];
  let q = '';
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      const res = await fetch(CONFIG.data.geojson);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const gj = await res.json();
      paddocks = (gj.features ?? []).map((f: any) => {
        const p = f.properties ?? {};
        return {
          id: String(p.fieldID || p.ADSFLDID || p.FIELDID || crypto.randomUUID()),
          name: String(p.fieldName || p.FIELDNAME || 'Unnamed'),
          farm: p.FARM ?? undefined,
          year: p.ADSYEAR ?? undefined,
          metrics: {
            OM: p.OM ?? undefined,
            P1: p.P1 ?? undefined,
            K: p.K ?? undefined,
            MG: p.MG ?? undefined,
            CA: p.CA ?? undefined,
            PH: p.PH ?? undefined,
          }
        } as Paddock;
      }).sort((a: Paddock, b: Paddock) => a.name.localeCompare(b.name));
    } catch (e: any) {
      error = e?.message ?? 'Failed loading paddocks';
    } finally {
      loading = false;
    }
  });

  $: filtered = q
    ? paddocks.filter((p) =>
        (p.name + ' ' + (p.farm ?? '')).toLowerCase().includes(q.toLowerCase())
      )
    : paddocks;
</script>

<header class="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
  <a href="/" class="text-sm text-muted hover:text-white">&larr; Back to home</a>
  <div class="text-xs text-muted">Paddock Manager</div>
</header>

<main class="container mx-auto px-4 pb-8 space-y-5">
  <Panel title="Paddocks">
    <div class="flex items-center gap-3 mb-3">
      <input
        placeholder="Search by name or farm…"
        bind:value={q}
        class="w-full max-w-md rounded-md border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
      />
      <a href="/map" class="text-sm text-muted hover:text-white">Open map →</a>
    </div>

    {#if loading}
      <div class="text-sm text-muted">Loading paddocks…</div>
    {:else if error}
      <div class="text-sm text-red-400">{error}</div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted border-b border-border/60">
            <tr>
              <th class="py-2 pr-4">Name</th>
              <th class="py-2 pr-4">Farm</th>
              <th class="py-2 pr-4">Year</th>
              <th class="py-2 pr-2 text-right">OM</th>
              <th class="py-2 pr-2 text-right">P1</th>
              <th class="py-2 pr-2 text-right">K</th>
              <th class="py-2 pr-2 text-right">MG</th>
              <th class="py-2 pr-2 text-right">CA</th>
              <th class="py-2 pl-2 text-right">PH</th>
            </tr>
          </thead>
          <tbody>
            {#each filtered as p}
              <tr class="border-b border-border/40 hover:bg-white/5">
                <td class="py-2 pr-4">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-white">{p.name}</span>
                    <a class="text-xs text-muted hover:text-white underline" href={`/map?metric=OM#${encodeURIComponent(p.name)}`}>View on map</a>
                  </div>
                </td>
                <td class="py-2 pr-4">{p.farm ?? '-'}</td>
                <td class="py-2 pr-4">{p.year ?? '-'}</td>
                {#each metricKeys as m}
                  <td class="py-2 text-right">{p.metrics[m] ?? '-'}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Panel>

  <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
    <Panel title="Recent Notes">
      <ul class="list-disc pl-5 text-sm text-muted space-y-1">
        <li>South paddock: inspect fence line</li>
        <li>North ridge: soil sampling next week</li>
        <li>Creek paddock: spot spray blackberry regrowth</li>
      </ul>
    </Panel>

    <Panel title="Upcoming Tasks">
      <ul class="list-disc pl-5 text-sm text-muted space-y-1">
        <li>Fertilize OM trial plots (Friday)</li>
        <li>Check troughs in Top Flat</li>
      </ul>
    </Panel>
  </div>
</main>
