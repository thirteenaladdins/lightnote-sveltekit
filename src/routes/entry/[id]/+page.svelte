<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;
	import {
		updateEntry,
		hasAnalysis,
		isAnalysisStale,
		entries,
		deleteEntry
	} from '$lib/stores/entries';
	import { getSentiment } from '$lib/utils/sentiment';
	import { generateEntryInsights, getMoodClass, getMoodArrow } from '$lib/utils/ai-insights';
	import { isLLMConfigured } from '$lib/utils/llm';
	import {
		generateHighlightedHTML,
		initializeQuotePopovers,
		cleanupQuotePopovers
	} from '$lib/utils/quote-highlighting';
	import EntryForm from '$lib/components/EntryForm.svelte';
	import type { Entry } from '$lib/stores/entries';
	import type { EntryInsight } from '$lib/types/entry';

	let isEditing = false;
	let insightsExpanded = false;
	let insightsSection: HTMLDivElement;
	let pageBody: HTMLDivElement;

	// AI insights data
	let insights: EntryInsight | null = null;
	let insightsLoading = false;
	let insightsError = '';

	// Quote highlighting
	let highlightedText = '';
	let entryTextContainer: HTMLDivElement;

	// Theme management
	let addingTheme = false;
	let newTheme = '';
	let editingTheme = '';
	let editingThemeIndex = -1;
	let editingThemeValue = '';

	// Get current entry from URL parameter
	$: entryId = $page.params.id || data.entryId;
	$: currentEntry = $entries.find((e) => e.id === entryId) || null;

	// Simple user comment state
	$: hasUserComment = userComment.trim().length > 0;

	// Update insights when entry changes
	$: if (currentEntry) {
		insights = currentEntry.analysis as EntryInsight | null;
		insightsLoading = false;
		insightsError = '';
	}

	onMount(async () => {
		// Wait a bit for entries to load if they're not available yet
		if (!currentEntry) {
			// Try to wait for entries to load
			let attempts = 0;
			while (!currentEntry && attempts < 10) {
				await new Promise((resolve) => setTimeout(resolve, 100));
				attempts++;
			}

			if (!currentEntry) {
				goto('/');
				return;
			}
		}

		// Initialize quote highlighting
		await initializeQuoteHighlighting();
	});

	onDestroy(() => {
		if (entryTextContainer) {
			cleanupQuotePopovers(entryTextContainer);
		}
	});

	async function initializeQuoteHighlighting() {
		if (!currentEntry || !entryTextContainer) return;

		await tick();

		if (insights?.keySentences) {
			highlightedText = generateHighlightedHTML(currentEntry.text, insights.keySentences);
			await tick();
			initializeQuotePopovers(entryTextContainer);
		} else {
			highlightedText = currentEntry.text;
		}
	}

	function startEditing() {
		if (!currentEntry) return;
		isEditing = true;
	}

	function handleEditSave(entryId?: string) {
		isEditing = false;
		// Clear insights since text changed
		if (currentEntry) {
			const clearedEntry = {
				...currentEntry,
				analysis: undefined
			};
			updateEntry(currentEntry.id, clearedEntry);
		}
		// Update insights if LLM is configured
		if (isLLMConfigured()) {
			generateInsights();
		}
	}

	function handleEditCancel() {
		isEditing = false;
	}

	async function generateInsights() {
		if (!currentEntry || !isLLMConfigured()) return;

		insightsLoading = true;
		insightsError = '';

		try {
			const result = await generateEntryInsights(currentEntry, true);
			insights = result;
			await initializeQuoteHighlighting();
		} catch (error) {
			console.error('Error generating insights:', error);
			insightsError = 'Failed to generate insights';
		} finally {
			insightsLoading = false;
		}
	}

	function toggleInsights() {
		insightsExpanded = !insightsExpanded;
		if (insightsExpanded && !insights) {
			if (isLLMConfigured()) {
				generateInsights();
			} else {
				insightsError = 'AI insights require LLM configuration. Please configure your AI settings.';
				insightsLoading = false;
			}
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			if (isEditing) {
				handleEditCancel();
			} else {
				goto('/');
			}
		}
	}

	function deleteEntryById() {
		if (!currentEntry || !confirm('Delete this entry?')) return;
		deleteEntry(currentEntry.id);
		goto('/');
	}

	function formatDate(date: number): string {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Theme management functions
	function addTheme() {
		if (!newTheme.trim()) return;
		if (!insights) return;

		const updatedThemes = [...(insights.themes || []), { name: newTheme.trim(), confidence: 0.8 }];
		insights = { ...insights, themes: updatedThemes };
		newTheme = '';
		addingTheme = false;
	}

	function startEditingTheme(theme: string, index: number) {
		editingTheme = theme;
		editingThemeIndex = index;
		editingThemeValue = theme;
	}

	function saveThemeEdit() {
		if (!insights || editingThemeIndex === -1) return;

		const updatedThemes = [...(insights.themes || [])];
		updatedThemes[editingThemeIndex] = {
			...updatedThemes[editingThemeIndex],
			name: editingThemeValue.trim()
		};
		insights = { ...insights, themes: updatedThemes };

		editingTheme = '';
		editingThemeIndex = -1;
		editingThemeValue = '';
	}

	function cancelThemeEdit() {
		editingTheme = '';
		editingThemeIndex = -1;
		editingThemeValue = '';
	}

	function deleteTheme(index: number) {
		if (!insights) return;

		const updatedThemes = [...(insights.themes || [])];
		updatedThemes.splice(index, 1);
		insights = { ...insights, themes: updatedThemes };
	}

	let userComment = '';

	function addFeedback() {
		userComment = '';
	}

	function updateFeedback(text: string) {
		userComment = text;
		// TODO: Save to localStorage or implement proper feedback system
	}

	function deleteFeedback() {
		userComment = '';
		// TODO: Remove from localStorage or implement proper feedback system
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
	<title
		>{currentEntry ? `Entry - ${currentEntry.text.substring(0, 50)}...` : 'Entry'} - Lightnote</title
	>
</svelte:head>

{#if !currentEntry}
	<div class="loading-page">
		<div class="loading-content">
			<h2>Loading Entry...</h2>
			<p>Please wait while we load your entry.</p>
		</div>
	</div>
{:else if currentEntry}
	<div class="entry-page">
		<div class="page-header">
			<div class="header-left">
				<button class="back-button" on:click={() => goto('/')}> ← Back to Entries </button>
				<div class="entry-meta">
					<span class="entry-date">{formatDate(currentEntry.created)}</span>
					<span class="entry-id">{currentEntry.id?.slice(0, 8) || 'unknown'}</span>
				</div>
			</div>
			<div class="header-actions">
				{#if isEditing}
					<button class="secondary" on:click={handleEditCancel}>Cancel</button>
					<!-- Save button is handled by EntryForm component -->
				{:else}
					<button class="secondary" on:click={startEditing}>Edit Entry</button>
					<button class="danger" on:click={deleteEntryById}>Delete</button>
				{/if}
			</div>
		</div>

		<div class="entry-content" bind:this={pageBody}>
			{#if isEditing}
				<EntryForm
					entry={currentEntry}
					onSave={handleEditSave}
					onCancel={handleEditCancel}
					showHeaderActions={true}
				/>
			{:else}
				<div class="view-section">
					{#if currentEntry.prompt}
						<div class="prompt-display">
							<strong>Prompt:</strong>
							{currentEntry.prompt}
						</div>
					{/if}

					<div class="entry-text-display" bind:this={entryTextContainer}>
						{@html highlightedText}
					</div>
				</div>
			{/if}

			<!-- AI Insights Section -->
			<div class="insights-section" bind:this={insightsSection}>
				<button class="insights-header" on:click={toggleInsights} type="button">
					<h3>AI Insights</h3>
					<div class="insights-toggle">
						{#if insightsLoading}
							<span class="loading">Generating...</span>
						{:else if insightsError}
							<span class="error">Error</span>
						{:else if insights}
							<span class="status">Generated</span>
						{:else}
							<span class="status">Click to generate</span>
						{/if}
						<span class="toggle-icon">{insightsExpanded ? '▼' : '▶'}</span>
					</div>
				</button>

				{#if insightsExpanded}
					<div class="insights-content">
						{#if insightsLoading}
							<div class="loading-state">Generating insights...</div>
						{:else if insightsError}
							<div class="error-state">
								<p>{insightsError}</p>
								{#if insightsError.includes('LLM configuration')}
									<a href="/settings" class="settings-link">Go to Settings</a>
								{:else}
									<button class="retry-button" on:click={generateInsights}>Retry</button>
								{/if}
							</div>
						{:else if insights}
							<!-- Summary -->
							{#if insights.summary}
								<div class="insight-item">
									<h4>Summary</h4>
									<p>{insights.summary}</p>
								</div>
							{/if}

							<!-- Sentiment -->
							{#if insights.sentiment}
								<div class="insight-item">
									<h4>Sentiment</h4>
									<div class="sentiment-display">
										<span class="mood-icon {getMoodClass(insights.sentiment.score)}">
											{getMoodArrow(insights.sentiment.score)}
										</span>
										<span class="sentiment-text"
											>{insights.sentiment.score > 0
												? 'Positive'
												: insights.sentiment.score < 0
													? 'Negative'
													: 'Neutral'}</span
										>
										<span class="sentiment-score">({insights.sentiment.score.toFixed(2)})</span>
									</div>
								</div>
							{/if}

							<!-- Themes -->
							{#if insights.themes && insights.themes.length > 0}
								<div class="insight-item">
									<h4>Themes</h4>
									<div class="themes-list">
										{#each insights.themes as theme, index}
											<div class="theme-item">
												{#if editingThemeIndex === index}
													<input
														bind:value={editingThemeValue}
														on:blur={saveThemeEdit}
														on:keydown={(e) => e.key === 'Enter' && saveThemeEdit()}
														class="theme-input"
													/>
												{:else}
													<span class="theme-name">{theme.name}</span>
													<span class="theme-confidence"
														>({((theme.confidence || 0) * 100).toFixed(0)}%)</span
													>
													<div class="theme-actions">
														<button
															class="theme-edit"
															on:click={() => startEditingTheme(theme.name, index)}
															title="Edit theme"
														>
															✏️
														</button>
														<button
															class="theme-delete"
															on:click={() => deleteTheme(index)}
															title="Delete theme"
														>
															🗑️
														</button>
													</div>
												{/if}
											</div>
										{/each}
									</div>
									{#if addingTheme}
										<div class="add-theme">
											<input
												bind:value={newTheme}
												placeholder="Add new theme..."
												on:blur={addTheme}
												on:keydown={(e) => e.key === 'Enter' && addTheme()}
												class="theme-input"
											/>
										</div>
									{:else}
										<button class="add-theme-button" on:click={() => (addingTheme = true)}>
											+ Add Theme
										</button>
									{/if}
								</div>
							{/if}

							<!-- Key Sentences -->
							{#if insights.keySentences && insights.keySentences.length > 0}
								<div class="insight-item">
									<h4>Key Insights</h4>
									<div class="key-sentences">
										{#each insights.keySentences as sentence, index}
											<div class="sentence-item">
												<span class="sentence-text">"{sentence.text}"</span>
												{#if sentence.category}
													<span class="sentence-category">[{sentence.category}]</span>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Entities -->
							{#if insights.entities && insights.entities.length > 0}
								<div class="insight-item">
									<h4>Entities</h4>
									<div class="entities-list">
										{#each insights.entities as entity}
											<span class="entity-tag">{entity.name} ({entity.type})</span>
										{/each}
									</div>
								</div>
							{/if}
						{/if}
					</div>
				{/if}
			</div>

			<!-- Feedback Section -->
			<div class="feedback-section">
				<div class="feedback-header">
					<h3>Personal Notes</h3>
				</div>
				<div class="feedback-content">
					{#if hasUserComment}
						<textarea
							bind:value={userComment}
							on:input={(e) => updateFeedback((e.target as HTMLTextAreaElement).value)}
							placeholder="Add your personal notes about this entry..."
							class="feedback-textarea"
						></textarea>
						<button class="delete-feedback-button" on:click={deleteFeedback}> Delete Notes </button>
					{:else}
						<button class="add-feedback-button" on:click={addFeedback}> Add Personal Notes </button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="entry-not-found">
		<h2>Entry Not Found</h2>
		<p>The entry you're looking for doesn't exist or has been deleted.</p>
		<button class="back-button" on:click={() => goto('/')}> ← Back to Entries </button>
	</div>
{/if}

<style>
	.entry-page {
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

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.back-button {
		background: none;
		border: none;
		color: var(--accent);
		cursor: pointer;
		font-size: 14px;
		padding: 4px 0;
		text-decoration: none;
		transition: opacity 0.2s ease;
	}

	.back-button:hover {
		opacity: 0.8;
	}

	.entry-meta {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 14px;
		color: var(--muted);
	}

	.entry-date {
		font-weight: 500;
	}

	.entry-id {
		font-family: monospace;
		background: var(--bg);
		padding: 2px 6px;
		border-radius: 4px;
		border: 1px solid var(--border);
	}

	.header-actions {
		display: flex;
		gap: 12px;
	}

	.entry-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.view-section {
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 20px;
	}

	.prompt-display {
		margin-bottom: 16px;
		padding: 12px;
		background: var(--bg);
		border-radius: 6px;
		border: 1px solid var(--border);
		font-style: italic;
		color: var(--yellow);
		font-weight: 500;
	}

	.entry-text-display {
		font-size: 16px;
		line-height: 1.6;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.insights-section,
	.feedback-section {
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}

	.insights-header,
	.feedback-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		background: var(--panel);
		border-bottom: 1px solid var(--border);
		cursor: pointer;
		width: 100%;
		border: none;
		text-align: left;
	}

	.insights-header:hover {
		background: var(--bg);
	}

	.insights-header h3,
	.feedback-header h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
	}

	.insights-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
	}

	.toggle-icon {
		font-size: 12px;
		transition: transform 0.2s ease;
	}

	.insights-content,
	.feedback-content {
		padding: 20px;
	}

	.insight-item {
		margin-bottom: 20px;
	}

	.insight-item:last-child {
		margin-bottom: 0;
	}

	.insight-item h4 {
		margin: 0 0 8px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--accent);
	}

	.sentiment-display {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.mood-icon {
		font-size: 18px;
	}

	.sentiment-text {
		font-weight: 500;
	}

	.sentiment-score {
		color: var(--muted);
		font-size: 14px;
	}

	.themes-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.theme-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: var(--bg);
		border-radius: 6px;
		border: 1px solid var(--border);
	}

	.theme-name {
		flex: 1;
		font-weight: 500;
	}

	.theme-confidence {
		color: var(--muted);
		font-size: 12px;
	}

	.theme-actions {
		display: flex;
		gap: 4px;
	}

	.theme-edit,
	.theme-delete {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 12px;
		padding: 2px;
		border-radius: 3px;
		transition: background-color 0.2s ease;
	}

	.theme-edit:hover {
		background: var(--accent-alpha);
	}

	.theme-delete:hover {
		background: var(--danger-bg);
	}

	.theme-input {
		flex: 1;
		padding: 4px 8px;
		border: 1px solid var(--accent);
		border-radius: 4px;
		background: var(--bg);
		color: var(--text);
		font-size: 14px;
	}

	.add-theme {
		margin-top: 8px;
	}

	.add-theme-button {
		background: none;
		border: 1px dashed var(--border);
		color: var(--muted);
		padding: 8px 12px;
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		transition: all 0.2s ease;
		margin-top: 8px;
	}

	.add-theme-button:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.key-sentences {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.sentence-item {
		padding: 8px 12px;
		background: var(--bg);
		border-radius: 6px;
		border-left: 3px solid var(--accent);
	}

	.sentence-text {
		font-style: italic;
	}

	.sentence-category {
		display: block;
		margin-top: 4px;
		font-size: 12px;
		color: var(--muted);
		font-weight: 500;
	}

	.entities-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.entity-tag {
		background: var(--accent-alpha);
		color: var(--accent);
		padding: 4px 8px;
		border-radius: 12px;
		font-size: 12px;
		font-weight: 500;
	}

	.feedback-textarea {
		width: 100%;
		min-height: 100px;
		padding: 12px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--bg);
		color: var(--text);
		font-size: 14px;
		font-family: inherit;
		resize: vertical;
	}

	.add-feedback-button,
	.delete-feedback-button {
		background: none;
		border: 1px solid var(--border);
		color: var(--text);
		padding: 8px 16px;
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		transition: all 0.2s ease;
	}

	.add-feedback-button:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.delete-feedback-button {
		border-color: var(--danger);
		color: var(--danger);
		margin-top: 8px;
	}

	.delete-feedback-button:hover {
		background: var(--danger-bg);
	}

	.loading-state,
	.error-state {
		text-align: center;
		padding: 20px;
		color: var(--muted);
	}

	.error-state {
		color: var(--danger);
	}

	.retry-button {
		background: var(--accent);
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 6px;
		cursor: pointer;
		margin-top: 8px;
	}

	.retry-button:hover {
		background: var(--accent-dark);
	}

	.settings-link {
		display: inline-block;
		background: var(--accent);
		color: white;
		text-decoration: none;
		padding: 8px 16px;
		border-radius: 6px;
		margin-top: 8px;
		font-size: 14px;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.settings-link:hover {
		background: var(--accent-dark);
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.loading-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 20px;
	}

	.loading-content {
		text-align: center;
		max-width: 400px;
	}

	.loading-content h2 {
		margin-bottom: 16px;
		color: var(--text);
	}

	.loading-content p {
		margin-bottom: 24px;
		color: var(--muted);
	}

	.entry-not-found {
		max-width: 400px;
		margin: 100px auto;
		text-align: center;
		padding: 40px;
	}

	.entry-not-found h2 {
		margin-bottom: 16px;
		color: var(--text);
	}

	.entry-not-found p {
		margin-bottom: 24px;
		color: var(--muted);
	}

	/* Button styles */
	.primary {
		background: var(--accent);
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.primary:hover:not(:disabled) {
		background: var(--accent-dark);
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.secondary {
		background: none;
		border: 1px solid var(--border);
		color: var(--text);
		padding: 8px 16px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.secondary:hover {
		background: var(--panel);
		border-color: var(--accent);
	}

	.danger {
		background: none;
		border: 1px solid var(--danger);
		color: var(--danger);
		padding: 8px 16px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.danger:hover {
		background: var(--danger-bg);
	}

	@media (max-width: 768px) {
		.entry-page {
			padding: 16px;
		}

		.page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 16px;
		}

		.header-actions {
			width: 100%;
			justify-content: flex-end;
		}

		.view-section {
			padding: 16px;
		}

		.insights-content,
		.feedback-content {
			padding: 16px;
		}
	}
</style>
