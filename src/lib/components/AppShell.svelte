<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { externalLinks, isActive, primaryNav, secondaryNav } from '$lib/nav';
	import NavIcon from './NavIcon.svelte';

	type Props = { pathname: string; logoSrc?: string; children: Snippet };

	let { pathname, logoSrc = '/img/logo.png', children }: Props = $props();

	let moreDialog: HTMLDialogElement | undefined = $state();

	const moreActive = $derived(secondaryNav.some((item) => isActive(item, pathname)));
	const desktopNav = $derived([...primaryNav.slice(1), ...secondaryNav]);

	function openMore() {
		moreDialog?.showModal();
	}

	function closeMore() {
		moreDialog?.close();
	}

	// A click on the dialog element itself (not its contents) is a click on the backdrop.
	function closeOnBackdrop(event: MouseEvent) {
		if (event.target === moreDialog) closeMore();
	}
</script>

<a
	href="#content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[2000] focus:rounded-lg focus:bg-panel focus:px-4 focus:py-3"
>
	Skip to content
</a>

<header class="fixed inset-x-0 top-0 z-[1500] hidden h-14 border-b border-border bg-panel md:block">
	<nav aria-label="Main" class="mx-auto flex h-full max-w-6xl items-center gap-6 px-4">
		<a href={resolve('/')} class="flex items-center gap-3 font-semibold text-text">
			<img src={logoSrc} alt="" class="size-8 rounded-md bg-white/10 p-0.5" />
			Greenhill Bros Farm
		</a>
		<ul class="flex items-center gap-1">
			{#each desktopNav as item (item.href)}
				{@const active = isActive(item, pathname)}
				<li>
					<a
						href={resolve(item.href)}
						aria-current={active ? 'page' : undefined}
						class={[
							'inline-flex min-h-11 items-center rounded-lg px-3 text-sm',
							active ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text'
						]}
					>
						{item.label}
					</a>
				</li>
			{/each}
		</ul>
		<details class="relative ml-auto">
			<summary
				class="inline-flex min-h-11 cursor-pointer list-none items-center rounded-lg px-3 text-sm text-muted hover:text-text"
			>
				Links
			</summary>
			<ul
				class="absolute top-full right-0 mt-1 w-64 rounded-xl border border-border bg-panel p-1 shadow-lg"
			>
				{#each externalLinks as link (link.href)}
					<li>
						<a
							href={link.href}
							target="_blank"
							rel="external noopener noreferrer"
							class="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-sm text-text hover:bg-white/5"
						>
							{link.label}
							<NavIcon name="external" size={16} />
							<span class="sr-only">(opens in a new tab)</span>
						</a>
					</li>
				{/each}
			</ul>
		</details>
	</nav>
</header>

<main id="content" class="pt-(--shell-top) pb-(--shell-bottom)">
	{@render children()}
</main>

<nav
	aria-label="Main"
	class="fixed inset-x-0 bottom-0 z-[1500] border-t border-border bg-panel pb-[env(safe-area-inset-bottom)] md:hidden"
>
	<ul class="grid h-16 grid-cols-5">
		{#each primaryNav as item (item.href)}
			{@const active = isActive(item, pathname)}
			<li>
				<a
					href={resolve(item.href)}
					aria-current={active ? 'page' : undefined}
					class={[
						'flex h-full flex-col items-center justify-center gap-1 text-xs',
						active ? 'text-accent' : 'text-muted'
					]}
				>
					<NavIcon name={item.icon} />
					{item.label}
				</a>
			</li>
		{/each}
		<li>
			<button
				type="button"
				aria-haspopup="dialog"
				onclick={openMore}
				class={[
					'flex h-full w-full flex-col items-center justify-center gap-1 text-xs',
					moreActive ? 'text-accent' : 'text-muted'
				]}
			>
				<NavIcon name="more" />
				More
			</button>
		</li>
	</ul>
</nav>

<dialog
	bind:this={moreDialog}
	onclick={closeOnBackdrop}
	aria-labelledby="more-title"
	class="more-sheet"
>
	<div class="p-4">
		<h2 id="more-title" class="mb-2 text-lg font-semibold">More</h2>
		<ul>
			{#each secondaryNav as item (item.href)}
				<li>
					<a
						href={resolve(item.href)}
						onclick={closeMore}
						aria-current={isActive(item, pathname) ? 'page' : undefined}
						class="flex min-h-12 items-center gap-3 rounded-lg px-3 text-text hover:bg-white/5"
					>
						<NavIcon name={item.icon} />
						{item.label}
					</a>
				</li>
			{/each}
		</ul>
		<h3 class="mt-4 mb-1 px-3 text-sm text-muted">Links</h3>
		<ul>
			{#each externalLinks as link (link.href)}
				<li>
					<a
						href={link.href}
						target="_blank"
						rel="external noopener noreferrer"
						onclick={closeMore}
						class="flex min-h-12 items-center gap-3 rounded-lg px-3 text-text hover:bg-white/5"
					>
						<NavIcon name="external" />
						{link.label}
						<span class="sr-only">(opens in a new tab)</span>
					</a>
				</li>
			{/each}
		</ul>
		<button
			type="button"
			onclick={closeMore}
			class="mt-4 min-h-11 w-full rounded-lg border border-border text-text"
		>
			Close
		</button>
	</div>
</dialog>

<style>
	.more-sheet {
		margin: auto 0 0;
		width: 100%;
		max-width: 100%;
		border: 1px solid rgb(var(--border));
		border-radius: 1rem 1rem 0 0;
		background: rgb(var(--panel));
		color: rgb(var(--text));
		padding: 0 0 env(safe-area-inset-bottom);
	}

	.more-sheet::backdrop {
		background: rgb(0 0 0 / 0.5);
	}

	@media (prefers-reduced-motion: no-preference) {
		.more-sheet[open] {
			animation: sheet-up 180ms ease-out;
		}
	}

	@keyframes sheet-up {
		from {
			transform: translateY(100%);
		}
	}
</style>
