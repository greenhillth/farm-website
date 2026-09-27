<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/atkinson-hyperlegible-next';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import AppShell from '$lib/components/AppShell.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<AppShell pathname={page.url.pathname}>
	{@render children()}
</AppShell>
