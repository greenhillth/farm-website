<script lang="ts">
	import { createEventDispatcher, tick } from 'svelte';

	const randomId = () => Math.random().toString(36).slice(2);

	export let open = false;
	export let title = '';
	export let confirmText = 'Confirm';
	export let cancelText = 'Cancel';
	export let loading = false;
	export let disableConfirm = false;

	const dispatch = createEventDispatcher<{ confirm: void; cancel: void }>();

	let dialog: HTMLDivElement | null = null;
	let titleId = `confirm-modal-${randomId()}`;

	$: if (open) {
		titleId = `confirm-modal-${randomId()}`;
		tick().then(() => {
			dialog?.focus();
		});
	}

	function handleBackdropClick() {
		if (loading) return;
		dispatch('cancel');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!open || loading) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			dispatch('cancel');
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div class="confirm-backdrop" role="presentation" on:click|self={handleBackdropClick}>
		<div
			class="confirm-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			tabindex="-1"
			bind:this={dialog}
		>
			<h2 class="confirm-title" id={titleId}>{title}</h2>
			<div class="confirm-body">
				<slot />
			</div>
			<div class="confirm-actions">
				<button
					type="button"
					class="confirm-secondary"
					on:click={() => dispatch('cancel')}
					disabled={loading}
				>
					{cancelText}
				</button>
				<button
					type="button"
					class="confirm-primary"
					on:click={() => dispatch('confirm')}
					disabled={loading || disableConfirm}
				>
					{#if loading}
						<svg class="confirm-spinner" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
							<circle
								class="confirm-spinner-track"
								cx="12"
								cy="12"
								r="10"
								fill="none"
								stroke-width="4"
							/>
							<path
								class="confirm-spinner-head"
								d="M4 12a8 8 0 018-8"
								fill="none"
								stroke-linecap="round"
								stroke-width="4"
							/>
						</svg>
					{/if}
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.confirm-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.65);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		z-index: 2100;
	}

	.confirm-modal {
		background: rgba(15, 23, 42, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
		width: min(100%, 26rem);
		padding: 1.5rem;
		color: #f9fafb;
		box-shadow: 0 25px 60px rgba(15, 23, 42, 0.45);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.confirm-title {
		font-size: 1.1rem;
		font-weight: 600;
	}

	.confirm-body {
		font-size: 0.95rem;
		color: rgba(248, 250, 252, 0.85);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.confirm-secondary,
	.confirm-primary {
		border-radius: 0.5rem;
		padding: 0.55rem 1.15rem;
		font-size: 0.9rem;
		border: 1px solid transparent;
		cursor: pointer;
	}

	.confirm-secondary {
		background: transparent;
		border-color: rgba(255, 255, 255, 0.15);
		color: rgba(248, 250, 252, 0.85);
	}

	.confirm-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		background: rgba(248, 113, 113, 0.85);
		border-color: rgba(248, 113, 113, 0.85);
		color: #fff;
	}

	.confirm-primary:focus,
	.confirm-secondary:focus {
		outline: 2px solid rgba(248, 250, 252, 0.15);
		outline-offset: 2px;
	}

	.confirm-primary[disabled],
	.confirm-secondary[disabled] {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.confirm-spinner {
		width: 1rem;
		height: 1rem;
		animation: confirm-spin 0.9s linear infinite;
	}

	.confirm-spinner-track {
		stroke: rgba(255, 255, 255, 0.25);
	}

	.confirm-spinner-head {
		stroke: currentColor;
	}

	@keyframes confirm-spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
