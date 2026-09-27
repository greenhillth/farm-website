<script lang="ts">
	import { onDestroy } from 'svelte';

	import type { LocateFix } from './types';

	type Props = {
		onposition: (fix: LocateFix) => void;
		onerror: (message: string) => void;
		onstop: () => void;
		geolocation?: Geolocation;
		secure?: boolean;
	};

	let {
		onposition,
		onerror,
		onstop,
		geolocation = typeof navigator === 'undefined' ? undefined : navigator.geolocation,
		secure = typeof window !== 'undefined' && window.isSecureContext
	}: Props = $props();

	let watchId: number | null = $state(null);

	function start() {
		if (!geolocation) return;
		watchId = geolocation.watchPosition(
			(position) =>
				onposition({
					lat: position.coords.latitude,
					lon: position.coords.longitude,
					accuracy: position.coords.accuracy
				}),
			(error) => {
				if (error.code === error.PERMISSION_DENIED) {
					onerror('Location is turned off for this site.');
					stop();
				} else {
					onerror("Couldn't find your location.");
				}
			},
			{ enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
		);
	}

	function stop() {
		if (watchId !== null) geolocation?.clearWatch(watchId);
		watchId = null;
		onstop();
	}

	onDestroy(() => {
		if (watchId !== null) geolocation?.clearWatch(watchId);
	});
</script>

{#if secure && geolocation}
	<button
		type="button"
		aria-pressed={watchId !== null}
		aria-label={watchId !== null ? 'Stop showing my location' : 'Show my location'}
		onclick={() => (watchId !== null ? stop() : start())}
		class={[
			'inline-flex size-11 items-center justify-center rounded-full border shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
			watchId !== null
				? 'border-status-high bg-status-high/20 text-status-high'
				: 'border-border bg-panel/95 text-text'
		]}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			class="size-6"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4" />
			<path stroke-linecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
		</svg>
	</button>
{/if}
