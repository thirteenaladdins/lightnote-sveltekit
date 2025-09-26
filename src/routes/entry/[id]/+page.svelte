<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;
	import { updateEntry, entries, deleteEntry } from '$lib/stores/entries-supabase';
	import {
		generateHighlightedHTML,
		initializeQuotePopovers,
		cleanupQuotePopovers
	} from '$lib/utils/quote-highlighting';
	import { generateEntryInsights, getMoodClass, getMoodArrow } from '$lib/utils/ai-insights';
	import { isLLMConfigured } from '$lib/utils/llm';
	import EntryForm from '$lib/components/EntryForm.svelte';
	import type { Entry } from '$lib/stores/entries';
	import type { EntryInsight } from '$lib/types/entry';

	let isEditing = false;
	let pageBody: HTMLDivElement;

	// Quote highlighting
	let highlightedText = '';
	let entryTextContainer: HTMLDivElement;

	// AI insights data
	let insights: EntryInsight | null = null;
	let insightsLoading = false;
	let insightsError = '';
	let insightsExpanded = false;
	let insightsSection: HTMLDivElement;

	// Get current entry from URL parameter
	$: entryId = $page.params.id || data.entryId;
	$: currentEntry = $entries.find((e) => e.id === entryId) || null;

	// Track the current entry text to detect changes
	$: currentEntryText = currentEntry?.text || '';

	// Update highlighted text when entry text changes
	$: if (currentEntryText && entryTextContainer) {
		updateHighlightedText();
	}

	// Generate AI insights when entry changes
	$: if (currentEntry && !isEditing) {
		generateInsights();
	}

	// Function to update highlighted text
	async function updateHighlightedText() {
		if (!currentEntry || !entryTextContainer) return;

		await tick();
		highlightedText = currentEntry.text;
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
		await updateHighlightedText();
	}

	function startEditing() {
		if (!currentEntry) return;
		isEditing = true;
	}

	function handleEditSave(entryId?: string) {
		isEditing = false;
		// The EntryForm component has already saved the entry with updated text
		// No additional processing needed
	}

	function handleEditCancel() {
		isEditing = false;
	}

	function triggerSave() {
		// Dispatch event to EntryForm component to trigger save
		const event = new CustomEvent('saveEntry');
		window.dispatchEvent(event);
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

	async function generateInsights(forceRefresh: boolean = false) {
		if (!currentEntry) {
			insights = null;
			return;
		}

		// Check if we already have fresh analysis and don't need to refresh
		const hasExistingAnalysis = !!currentEntry.analysis;
		const isStale = currentEntry.analysis
			? Date.now() - (currentEntry.analysis.updatedAt || currentEntry.analysis.createdAt) >
				24 * 60 * 60 * 1000
			: true;

		if (!forceRefresh && hasExistingAnalysis && !isStale && currentEntry.analysis) {
			console.log('✅ [EntryView] Using cached analysis');
			insights = {
				entryId: currentEntry.id,
				summary: currentEntry.analysis.summary,
				narrativeSummary: currentEntry.analysis.narrativeSummary || currentEntry.analysis.summary,
				observation: currentEntry.analysis.observation || 'No observation available',
				sentiment: {
					score: currentEntry.analysis.sentiment.score
				},
				themes: currentEntry.analysis.themes,
				entities: currentEntry.analysis.entities.map((e) => ({
					name: e.name,
					type:
						e.type === 'org'
							? 'concept'
							: e.type === 'task'
								? 'activity'
								: e.type === 'self'
									? 'person'
									: e.type === 'other'
										? 'concept'
										: e.type
				})),
				keySentences: currentEntry.analysis.keySentences || [],
				model: currentEntry.analysis.model || 'cached',
				createdAt: currentEntry.analysis.createdAt
			};
			insightsLoading = false;
			insightsError = '';
			return;
		}

		// Check if LLM is configured
		if (!isLLMConfigured()) {
			insights = null;
			insightsError = 'AI insights require LLM configuration. Please configure your AI settings.';
			insightsLoading = false;
			return;
		}

		insightsLoading = true;
		insightsError = '';

		try {
			insights = await generateEntryInsights(currentEntry, forceRefresh);
		} catch (error) {
			console.error('❌ [EntryView] Failed to generate AI insights:', error);
			insightsError = error instanceof Error ? error.message : 'Failed to generate insights';
			insights = null;
		} finally {
			insightsLoading = false;
		}
	}

	function toggleInsights() {
		insightsExpanded = !insightsExpanded;
	}

	function handleRefreshInsights() {
		generateInsights(true);
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
					<button class="primary" on:click={triggerSave}>Save</button>
				{:else}
					<button class="secondary" on:click={startEditing}>Edit Entry</button>
					<button class="danger" on:click={deleteEntryById}>Delete</button>
				{/if}
			</div>
		</div>

		<div class="entry-content" bind:this={pageBody}>
			{#if isEditing}
				<EntryForm entry={currentEntry} onSave={handleEditSave} onCancel={handleEditCancel} />
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

					<!-- AI Insights Section -->
					{#if insights || insightsLoading || insightsError}
						<div class="insights-section" bind:this={insightsSection}>
							<button
								class="insights-toggle"
								on:click={() => toggleInsights()}
								aria-expanded={insightsExpanded}
								disabled={insightsLoading}
							>
								<span class="insights-title">
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path d="M9 12l2 2 4-4" />
										<path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
										<path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
										<path d="M13 12h3" />
										<path d="M8 12h3" />
									</svg>
									AI Insights
									{#if insightsLoading}
										<span class="loading-spinner">⟳</span>
									{/if}
								</span>
								<span class="insights-indicator">
									{insightsExpanded ? '▼' : '▶'}
								</span>
							</button>

							{#if insightsExpanded}
								<div class="insights-content">
									{#if insightsLoading}
										<div class="insights-loading">
											<div class="loading-spinner large">⟳</div>
											<p>Generating AI insights...</p>
										</div>
									{:else if insightsError}
										<div class="insights-error">
											<div class="error-icon">⚠️</div>
											<p>{insightsError}</p>
											<button class="retry-button" on:click={handleRefreshInsights}> Retry </button>
										</div>
									{:else if insights}
										<div class="insight-narrative">
											<h4>Summary</h4>
											<p>{insights.narrativeSummary}</p>
										</div>

										<div class="insight-observation">
											<h4>Observation</h4>
											<p>{insights.observation}</p>
										</div>

										<div class="insight-sentiment">
											<h4>Sentiment Analysis</h4>
											<div class="sentiment-score">
												<span class="score-label">Score:</span>
												<span class="score-value {getMoodClass(insights.sentiment.score)}">
													{insights.sentiment.score.toFixed(2)}
												</span>
												<span class="sentiment-arrow {getMoodClass(insights.sentiment.score)}">
													{getMoodArrow(insights.sentiment.score)}
												</span>
											</div>
										</div>

										{#if insights.themes && insights.themes.length > 0}
											<div class="insight-themes">
												<h4>Themes</h4>
												<div class="themes-list">
													{#each insights.themes as theme}
														<span class="theme-pill" style="opacity: {theme.confidence || 0.7}">
															{theme.name}
														</span>
													{/each}
												</div>
											</div>
										{/if}

										{#if insights.entities && insights.entities.length > 0}
											<div class="insight-entities">
												<h4>Key Entities</h4>
												<div class="entities-list">
													{#each insights.entities as entity}
														<div class="entity-item">
															<span class="entity-name">{entity.name}</span>
															{#if entity.type}
																<span class="entity-type">{entity.type}</span>
															{/if}
														</div>
													{/each}
												</div>
											</div>
										{/if}

										{#if insights.keySentences && insights.keySentences.length > 0}
											<div class="insight-quotes">
												<h4>Key Quotes</h4>
												<div class="quotes-list">
													{#each insights.keySentences as quote, index}
														<div class="quote-item">
															<div class="quote-number">Quote {index + 1}</div>
															<div class="quote-text">"{quote.text}"</div>
														</div>
													{/each}
												</div>
											</div>
										{/if}

										<div class="insight-meta">
											<small class="insight-model">
												Generated by {insights.model}
											</small>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
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
		/* Smooth transitions */
		animation: fadeIn 0.2s ease-out;
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

	/* Animation keyframes */
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Insights Section Styles */
	.insights-section {
		margin-top: 16px;
		border-top: 1px solid var(--border);
		padding-top: 16px;
	}

	.insights-toggle {
		width: 100%;
		background: none;
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 12px 16px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: space-between;
		transition: all 0.2s ease;
		color: var(--text);
	}

	.insights-toggle:hover:not(:disabled) {
		background: rgba(138, 180, 248, 0.05);
		border-color: var(--accent);
	}

	.insights-toggle:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.insights-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 500;
		font-size: 14px;
	}

	.insights-indicator {
		font-size: 12px;
		color: var(--muted);
		transition: transform 0.2s ease;
	}

	.insights-content {
		margin-top: 12px;
		padding: 16px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid var(--border);
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.insight-narrative h4,
	.insight-observation h4,
	.insight-sentiment h4,
	.insight-themes h4,
	.insight-entities h4,
	.insight-quotes h4 {
		margin: 0 0 8px 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--accent);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.insight-narrative p,
	.insight-observation p {
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
		color: var(--text);
	}

	.insight-narrative {
		background: rgba(138, 180, 248, 0.05);
		border: 1px solid rgba(138, 180, 248, 0.15);
		border-radius: 8px;
		padding: 12px;
	}

	.insight-observation {
		background: rgba(255, 193, 7, 0.05);
		border: 1px solid rgba(255, 193, 7, 0.15);
		border-radius: 8px;
		padding: 12px;
	}

	.sentiment-score {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.score-label {
		font-size: 13px;
		color: var(--muted);
	}

	.score-value {
		font-weight: 600;
		font-size: 14px;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
	}

	.sentiment-arrow {
		font-size: 16px;
		font-weight: bold;
	}

	/* Quotes section styles */
	.quotes-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.quote-item {
		background: rgba(138, 180, 248, 0.05);
		border: 1px solid rgba(138, 180, 248, 0.15);
		border-radius: 8px;
		padding: 12px;
		position: relative;
	}

	.quote-number {
		font-size: 11px;
		color: var(--accent);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 6px;
	}

	.quote-text {
		font-size: 13px;
		line-height: 1.5;
		color: var(--text);
		font-style: italic;
		position: relative;
	}

	.quote-text::before {
		content: '"';
		color: var(--accent);
		font-weight: bold;
		font-size: 14px;
	}

	.quote-text::after {
		content: '"';
		color: var(--accent);
		font-weight: bold;
		font-size: 14px;
	}

	.themes-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.theme-pill {
		color: var(--accent);
		padding: 4px 8px;
		font-size: 12px;
		font-weight: 500;
		display: inline-block;
		background: rgba(138, 180, 248, 0.1);
		border: 1px solid rgba(138, 180, 248, 0.3);
		border-radius: 12px;
	}

	.entities-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.entity-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 6px;
		border: 1px solid var(--border);
	}

	.entity-name {
		font-weight: 500;
		font-size: 13px;
		color: var(--text);
	}

	.entity-type {
		font-size: 11px;
		color: var(--muted);
		background: rgba(255, 255, 255, 0.05);
		padding: 2px 6px;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.insight-meta {
		padding-top: 8px;
		border-top: 1px solid var(--border);
	}

	.insight-model {
		color: var(--muted);
		font-size: 11px;
	}

	/* Loading and Error States */
	.loading-spinner {
		display: inline-block;
		animation: spin 1s linear infinite;
		font-size: 14px;
		margin-left: 8px;
	}

	.loading-spinner.large {
		font-size: 24px;
		margin: 0;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.insights-loading {
		text-align: center;
		padding: 20px;
		color: var(--muted);
	}

	.insights-loading p {
		margin: 8px 0 0 0;
		font-size: 14px;
	}

	.insights-error {
		text-align: center;
		padding: 20px;
		color: var(--red);
	}

	.error-icon {
		font-size: 24px;
		margin-bottom: 8px;
	}

	.insights-error p {
		margin: 0 0 12px 0;
		font-size: 14px;
	}

	.retry-button {
		background: var(--accent);
		color: var(--bg);
		border: none;
		border-radius: 6px;
		padding: 8px 16px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.retry-button:hover {
		background: rgba(138, 180, 248, 0.8);
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

		.header-left {
			width: 100%;
		}

		.header-actions {
			width: 100%;
			justify-content: flex-end;
		}

		.view-section {
			padding: 16px;
		}

		.insights-content {
			padding: 12px;
		}

		.themes-list {
			gap: 4px;
		}

		.theme-pill {
			font-size: 11px;
			padding: 3px 6px;
		}
	}
</style>
