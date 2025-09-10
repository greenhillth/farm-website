<script lang="ts">
  import Panel from '$lib/components/Panel.svelte';

  type Entry = { date: string; person: string; hours: number; activity: string };
  const entries: Entry[] = [
    { date: '2025-09-08', person: 'Tom', hours: 4, activity: 'Fencing – replace posts' },
    { date: '2025-09-08', person: 'Alex', hours: 6, activity: 'Spraying – blackberry' },
    { date: '2025-09-09', person: 'Tom', hours: 3, activity: 'Irrigation checks' }
  ];
  const total = entries.reduce((s, e) => s + e.hours, 0);
</script>

<header class="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
  <a href="/" class="text-sm text-muted hover:text-white">&larr; Back to home</a>
  <div class="text-xs text-muted">Timesheets</div>
</header>

<main class="container mx-auto px-4 pb-8 space-y-5">
  <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
    <Panel title="Recent Entries">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-muted border-b border-border/60">
            <tr>
              <th class="py-2 pr-4">Date</th>
              <th class="py-2 pr-4">Person</th>
              <th class="py-2 pr-4">Activity</th>
              <th class="py-2 text-right">Hours</th>
            </tr>
          </thead>
          <tbody>
            {#each entries as e}
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 whitespace-nowrap">{e.date}</td>
                <td class="py-2 pr-4">{e.person}</td>
                <td class="py-2 pr-4">{e.activity}</td>
                <td class="py-2 text-right">{e.hours.toFixed(1)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <svelte:fragment slot="footer">
        <div class="flex items-center justify-between gap-2 px-4 py-3 md:px-5 border-t border-border/60 text-sm">
          <div class="text-muted">Total</div>
          <div class="font-semibold">{total.toFixed(1)} hours</div>
        </div>
      </svelte:fragment>
    </Panel>

    <Panel title="Quick Add">
      <div class="text-sm text-muted">This is a placeholder for a quick-entry form (date, person, hours, activity).</div>
    </Panel>
  </div>
</main>
