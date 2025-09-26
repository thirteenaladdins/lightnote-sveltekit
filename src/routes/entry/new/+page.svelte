<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import EntryForm from '$lib/components/EntryForm.svelte';
	import { prompts } from '$lib/utils/prompts';

	let currentPrompt = '';
	let isSaving = false;
	let entryText = '';

	// Listen for state updates from EntryForm
	let stateUpdateHandler: (event: Event) => void;

	onMount(() => {
		stateUpdateHandler = (event: Event) => {
			const customEvent = event as CustomEvent;
			const {
				entryText: formEntryText,
				isSaving: formIsSaving,
				currentPrompt: formCurrentPrompt
			} = customEvent.detail;
			entryText = formEntryText;
			isSaving = formIsSaving;
			currentPrompt = formCurrentPrompt;
		};

		window.addEventListener('entryFormState', stateUpdateHandler);
	});

	onDestroy(() => {
		if (stateUpdateHandler) {
			window.removeEventListener('entryFormState', stateUpdateHandler);
		}
	});

	function pickPrompt() {
		// Dispatch event to EntryForm component
		const event = new CustomEvent('pickPrompt');
		window.dispatchEvent(event);
	}

	function handleSave(entryId?: string) {
		// After saving a new entry, redirect to the edit page to view the saved entry
		if (entryId) {
			goto(`/entry/${entryId}`);
		}
	}

	function handleCancel() {
		goto('/');
	}

	async function saveEntry() {
		// Trigger save in EntryForm component
		const event = new CustomEvent('saveEntry');
		window.dispatchEvent(event);
	}

	function cancelEntry() {
		// Trigger cancel in EntryForm component
		const event = new CustomEvent('cancelEntry');
		window.dispatchEvent(event);
	}
</script>

<svelte:head>
	<title>New Entry - Lightnote</title>
</svelte:head>

<div class="new-entry-page full-height-page">
	<div class="page-header">
		<h1>New Entry</h1>
		<div class="header-actions">
			<button class="secondary-button" on:click={pickPrompt} disabled={isSaving}>
				New Prompt
			</button>
			<button class="secondary-button" on:click={cancelEntry} disabled={isSaving}> Cancel </button>
			<button class="primary-button" on:click={saveEntry} disabled={isSaving || !entryText.trim()}>
				{#if isSaving}
					Saving...
				{:else}
					Save
				{/if}
			</button>
		</div>
	</div>

	<EntryForm entry={null} onSave={handleSave} onCancel={handleCancel} />
</div>

<style>
	.new-entry-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
	}

	.full-height-page {
		height: calc(100vh - 80px); /* Subtract navbar height */
		height: calc(100dvh - 80px); /* Use dynamic viewport height for mobile */
		overflow: hidden;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.header-actions {
		display: flex;
		gap: 12px;
		align-items: center;
	}

	.secondary-button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: var(--bg);
		color: var(--text);
		padding: 8px 16px;
		border-radius: 6px;
		border: 1px solid var(--border);
		text-decoration: none;
		font-weight: 500;
		font-size: 0.9rem;
		transition: all 0.2s ease;
		cursor: pointer;
		white-space: nowrap;
	}

	.secondary-button:hover:not(:disabled) {
		background: var(--panel);
		border-color: var(--accent);
	}

	.secondary-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.primary-button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: var(--accent);
		color: white;
		padding: 8px 16px;
		border-radius: 6px;
		border: none;
		text-decoration: none;
		font-weight: 500;
		font-size: 0.9rem;
		transition: all 0.2s ease;
		cursor: pointer;
		white-space: nowrap;
	}

	.primary-button:hover:not(:disabled) {
		background: var(--accent-dark);
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.primary-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.page-header h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 600;
	}

	@media (max-width: 768px) {
		.new-entry-page {
			padding: 16px;
		}

		.page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 16px;
		}
	}

	@media (max-width: 480px) {
		.page-header h1 {
			font-size: 1.5rem;
		}
	}
</style>
