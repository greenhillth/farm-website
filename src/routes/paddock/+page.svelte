<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<main class="container mx-auto p-4">
	<h1 class="mb-2 text-xl font-semibold">Paddock Manager</h1>
	<p>
		Select a paddock from the
		<a href={resolve('/map')} class="text-accent underline">farm map</a>
		to manage it.
	</p>
</main>
