<script lang="ts">
	type Props = {
		href: string;
		title: string;
		description?: string;
		tags?: string[];
		image?: string | null;
		imageAlt?: string;
		badge?: string | null;
	};

	let {
		href,
		title,
		description = '',
		tags = [],
		image = null,
		imageAlt = '',
		badge = null
	}: Props = $props();

	// A keyed each throws on duplicate keys, so each tag is shown once.
	const uniqueTags = $derived([...new Set(tags)]);
</script>

<a class="group block" {href} aria-label={title}>
	<article
		class="relative overflow-hidden rounded-xl border border-border bg-panel shadow-sm transition duration-200 ease-out will-change-transform group-hover:scale-[1.02] group-hover:border-accent group-focus-visible:border-accent"
	>
		<!-- Hero -->
		{#if image}
			<div class="aspect-[16/9] overflow-hidden">
				<img
					src={image}
					alt={imageAlt}
					loading="lazy"
					decoding="async"
					class="h-full w-full object-cover transition-transform duration-200 ease-out select-none group-hover:scale-105"
				/>
			</div>
		{:else}
			<div
				class="aspect-[16/9] bg-gradient-to-br from-accent/20 via-transparent to-border/40"
			></div>
		{/if}

		<!-- Content -->
		<div class="p-4 md:p-5">
			{#if badge}
				<div
					class="mb-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs"
				>
					{badge}
				</div>
			{/if}
			<h3 class="leading-snug font-semibold text-white">{title}</h3>
			{#if description}
				<p class="mt-1 text-sm text-muted">{description}</p>
			{/if}

			{#if uniqueTags.length}
				<div class="mt-3 flex flex-wrap gap-2">
					{#each uniqueTags as tag (tag)}
						<span
							class="inline-flex items-center rounded-full border border-border bg-white/5 px-2 py-0.5 text-xs text-muted"
						>
							#{tag}
						</span>
					{/each}
				</div>
			{/if}
		</div>
	</article>
</a>
