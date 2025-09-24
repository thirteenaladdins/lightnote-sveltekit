<script lang="ts">
	import { goto } from '$app/navigation';
	import EntryForm from '$lib/components/EntryForm.svelte';
	import { prompts } from '$lib/utils/prompts';

	let currentPrompt = '';
	let isSaving = false;

	function pickPrompt() {
		const idx = Math.floor(Math.random() * prompts.length);
		currentPrompt = prompts[idx];
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
</script>

<svelte:head>
	<title>New Entry - Lightnote</title>
</svelte:head>

<div class="new-entry-page">
	<div class="page-header">
		<h1>New Entry</h1>
	</div>

	<EntryForm entry={null} onSave={handleSave} onCancel={handleCancel} showHeaderActions={true} />

	<div class="help-text">
		<p class="subtle">
			<strong>Keyboard shortcuts:</strong><br />
			<kbd>Cmd/Ctrl + Enter</kbd> to save • <kbd>Escape</kbd> to cancel
		</p>
	</div>
</div>

<style>
	.new-entry-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 32px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border);
	}

	.page-header h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 600;
	}

	.help-text {
		margin-top: 24px;
		padding: 16px;
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 8px;
	}

	.help-text kbd {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 3px;
		padding: 2px 6px;
		font-size: 12px;
		font-family: monospace;
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
