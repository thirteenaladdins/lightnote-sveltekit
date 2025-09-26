<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { addEntry, updateEntry, loadEntries } from '$lib/stores/entries-supabase';
	import { auth } from '$lib/stores/auth';
	import { getSentiment } from '$lib/utils/sentiment';
	import { prompts } from '$lib/utils/prompts';
	import type { Entry } from '$lib/stores/entries';

	export let entry: Entry | null = null; // null for new entry, Entry object for editing
	export let onSave: ((entryId?: string) => void) | null = null; // callback for when entry is saved, with optional entry ID
	export let onCancel: (() => void) | null = null; // callback for when editing is cancelled

	let entryText = '';
	let currentPrompt = '';
	let saveStatus = '';
	let isSaving = false;

	// Initialize form data
	$: if (entry) {
		// Editing existing entry
		entryText = entry.text;
		currentPrompt = entry.prompt || '';
	} else {
		// New entry - reset form
		entryText = '';
		currentPrompt = '';
	}

	// Communicate state to parent via custom events
	$: if (typeof window !== 'undefined') {
		window.dispatchEvent(
			new CustomEvent('entryFormState', {
				detail: { entryText, isSaving, currentPrompt }
			})
		);
	}

	onMount(() => {
		loadEntries();
		if (!entry) {
			// Only pick a random prompt for new entries
			pickPrompt();
		}
		// Focus the textarea on mount
		const textarea = document.getElementById('entry-textarea');
		if (textarea) {
			textarea.focus();
		}

		// Listen for custom events from parent
		const handleSaveEvent = () => saveEntry();
		const handleCancelEvent = () => cancelEntry();
		const handlePickPromptEvent = () => pickPrompt();

		window.addEventListener('saveEntry', handleSaveEvent);
		window.addEventListener('cancelEntry', handleCancelEvent);
		window.addEventListener('pickPrompt', handlePickPromptEvent);

		// Cleanup
		return () => {
			window.removeEventListener('saveEntry', handleSaveEvent);
			window.removeEventListener('cancelEntry', handleCancelEvent);
			window.removeEventListener('pickPrompt', handlePickPromptEvent);
		};
	});

	function pickPrompt() {
		const idx = Math.floor(Math.random() * prompts.length);
		currentPrompt = prompts[idx];
	}

	function autoExpand(node: HTMLTextAreaElement) {
		// No need to auto-expand since we're using flex layout with overflow
		// The textarea will take up available space and scroll internally
	}

	function parseTags(text: string): string[] {
		const set = new Set<string>();
		text.replace(/(^|\s)#([a-zA-Z0-9_\-]+)/g, (_, s, tag) => {
			set.add(tag.toLowerCase());
			return _;
		});
		return Array.from(set);
	}

	async function saveEntry() {
		const prompt = currentPrompt || '';
		const text = entryText.trim();

		if (!text) {
			status('Nothing to save.', true);
			return;
		}

		if ($auth.loading) {
			status('Please wait while authentication loads...', true);
			return;
		}

		if (!$auth.user) {
			status('Please sign in to save entries.', true);
			return;
		}

		if (isSaving) return;
		isSaving = true;

		try {
			if (entry) {
				// Update existing entry
				const updatedEntry = {
					...entry,
					text: text,
					prompt: prompt.trim() || undefined
				};
				await updateEntry(entry.id, updatedEntry);
				status('Entry updated successfully!');

				// Call the onSave callback for editing existing entries
				if (onSave) {
					onSave(entry.id);
				}
			} else {
				// Create new entry
				const { compound, label } = getSentiment(text);
				const tags = parseTags(text);

				const id =
					typeof crypto !== 'undefined' && crypto.randomUUID
						? crypto.randomUUID()
						: String(Date.now()) + Math.random().toString(36).slice(2);
				const created = Date.now();
				const sentiment = getSentiment(text);
				const newEntry = {
					id,
					created,
					prompt,
					text,
					tags,
					compound,
					meta: {
						sent: {
							compound: sentiment.compound,
							pos: sentiment.pos,
							neu: sentiment.neu,
							neg: sentiment.neg,
							label: sentiment.label
						}
					}
				};

				await addEntry(newEntry);
				status('Entry saved successfully!');

				// Call the onSave callback for new entries
				if (onSave) {
					onSave(newEntry.id);
				}
			}

			// Clear form for new entries
			if (!entry) {
				entryText = '';
				currentPrompt = '';
			}
			// Note: No default redirect behavior - let the parent component decide
		} catch (error) {
			console.error('Error saving entry:', error);
			if (error instanceof Error && error.message.includes('not authenticated')) {
				status('Authentication expired. Please sign in again.', true);
			} else {
				status('Failed to save entry. Please try again.', true);
			}
		} finally {
			isSaving = false;
		}
	}

	function cancelEntry() {
		if (
			entryText.trim() &&
			entryText.trim() !== (entry?.text || '') &&
			!confirm('You have unsaved changes. Are you sure you want to cancel?')
		) {
			return;
		}

		// Call the onCancel callback if provided
		if (onCancel) {
			onCancel();
		} else {
			// Default behavior: go back to home
			goto('/');
		}
	}

	function status(msg: string, isError = false) {
		saveStatus = msg;
		setTimeout(() => {
			saveStatus = '';
		}, 4000);
	}

	// Handle keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			event.preventDefault();
			saveEntry();
		}
		if (event.key === 'Escape') {
			event.preventDefault();
			cancelEntry();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="entry-form">
	<div class="text-section">
		<!-- Always show prompt input for both new and edit modes -->
		<div class="prompt-section">
			<div class="section-label">Prompt</div>
			<input
				bind:value={currentPrompt}
				type="text"
				placeholder="Enter a prompt for this entry (optional)"
				class="prompt-input"
				disabled={isSaving}
			/>
		</div>

		<textarea
			id="entry-textarea"
			bind:value={entryText}
			placeholder="Type freely. Use #tags anywhere."
			class="entry-textarea"
			disabled={isSaving}
		></textarea>
	</div>

	<div class="form-actions">
		<div class="spacer"></div>
		<small id="saveStatus" role="status" aria-live="polite" class="status-message">
			{saveStatus}
		</small>
	</div>
</div>

<style>
	.entry-form {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 16px;
		overflow: hidden;
		min-height: 0;
	}

	.text-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.prompt-section {
		margin-bottom: 16px;
	}

	.section-label {
		font-weight: 600;
		margin-bottom: 8px;
		color: var(--text);
	}

	.prompt-input {
		width: 100%;
		padding: 12px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--bg);
		color: var(--text);
		font-size: 14px;
		font-family: inherit;
	}

	.prompt-input:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 2px var(--accent-alpha);
	}

	.prompt-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.entry-textarea {
		flex: 1;
		width: 100%;
		min-height: 0;
		padding: 16px;
		border: none;
		background: var(--bg);
		color: var(--text);
		font-size: 16px;
		line-height: 1.6;
		resize: none;
		font-family: inherit;
		box-sizing: border-box;
		overflow-y: auto;
	}

	.entry-textarea:focus {
		outline: none;
		border: none !important;
		box-shadow: none !important;
	}

	.entry-textarea:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-actions {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 4px 0;
		flex-shrink: 0;
	}

	.status-message {
		color: var(--muted);
		font-style: italic;
	}

	@media (max-width: 768px) {
		.entry-textarea {
			min-height: 300px;
			font-size: 16px; /* Prevent zoom on iOS */
		}
	}
</style>
