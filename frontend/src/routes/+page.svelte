<script lang="ts">
  import { goto } from '$app/navigation';
  // Immediately redirect to /map on mount
  import { onMount } from 'svelte';
  onMount(() => goto('/map'));
</script>

<p>Redirecting to <a href="/map">map</a>…</p>
