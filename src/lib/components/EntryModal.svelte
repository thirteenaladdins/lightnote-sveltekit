<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { updateEntry, hasAnalysis, isAnalysisStale, entries } from '$lib/stores/entries';
	import { getSentiment } from '$lib/utils/sentiment';
	import { generateEntryInsights, getMoodClass, getMoodArrow } from '$lib/utils/ai-insights';
	import { isLLMConfigured } from '$lib/utils/llm';
	import {
		generateHighlightedHTML,
		initializeQuotePopovers,
		cleanupQuotePopovers
	} from '$lib/utils/quote-highlighting';
	import type { Entry } from '$lib/stores/entries';
	import type { EntryInsight } from '$lib/types/entry';

	export let entry: Entry | null = null;
	export let isOpen = false;
	export let editMode = false;

	const dispatch = createEventDispatcher();

	let isEditing = false;
	let editText = '';
	let editPrompt = '';
	let saveStatus = '';
	let insightsExpanded = false;
	let insightsSection: HTMLDivElement;
	let modalBody: HTMLDivElement;

	// AI insights data
	let insights: EntryInsight | null = null;
	let insightsLoading = false;
	let insightsError = '';

	// Quote highlighting
	let highlightedText = '';
	let entryTextContainer: HTMLDivElement;

	// Get the latest entry data from the store
	$: currentEntry = entry ? $entries.find((e) => e.id === entry.id) || entry : null;

	// Reactive updates when entry changes
	$: if (currentEntry) {
		console.log('🔄 [EntryModal] Entry changed, updating UI', {
			entryId: currentEntry.id,
			text: currentEntry.text.substring(0, 50) + '...',
			hasAnalysis: !!currentEntry.analysis,
			timestamp: new Date().toISOString()
		});

		editText = currentEntry.text;
		editPrompt = currentEntry.prompt || '';
		// Auto-start editing if editMode is true
		if (editMode) {
			isEditing = true;
		}
		// Generate AI insights if LLM is configured
		generateInsights();
	}

	// Reactive update when analysis is added to currentEntry
	$: if (currentEntry?.analysis && !insightsLoading) {
		console.log('🔄 [EntryModal] Analysis updated, refreshing insights display');
		// Update insights display with the new analysis
		const analysis = currentEntry.analysis;
		insights = {
			entryId: currentEntry.id,
			summary: analysis.summary,
			sentiment: {
				score: analysis.sentiment.score
			},
			themes: analysis.themes,
			entities: analysis.entities.map((e) => ({
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
			keySentences: analysis.keySentences || [],
			model: analysis.model || 'cached',
			tokens: analysis.tokens || 0,
			createdAt: analysis.createdAt
		};
		insightsError = '';
	}

	// Generate highlighted text when entry or insights change
	$: if (currentEntry) {
		if (currentEntry.analysis?.keySentences && currentEntry.analysis.keySentences.length > 0) {
			highlightedText = generateHighlightedHTML(
				currentEntry.text,
				currentEntry.analysis.keySentences,
				insights || undefined,
				currentEntry.textNorm
			);
		} else {
			highlightedText = currentEntry.text;
		}
	}

	// Lifecycle management for popover functionality
	onMount(() => {
		// Initialize popovers when component mounts
		if (entryTextContainer) {
			initializeQuotePopovers(entryTextContainer);
		}
	});

	onDestroy(() => {
		// Clean up popovers when component unmounts
		if (entryTextContainer) {
			cleanupQuotePopovers(entryTextContainer);
		}
	});

	// Initialize popovers when highlighted text changes
	$: if (entryTextContainer && highlightedText) {
		// Use a small delay to ensure DOM is updated
		setTimeout(() => {
			initializeQuotePopovers(entryTextContainer);
		}, 10);
	}

	async function generateInsights(forceRefresh: boolean = false) {
		console.log('🔍 [EntryModal] generateInsights called', {
			entryId: currentEntry?.id,
			forceRefresh,
			timestamp: new Date().toISOString()
		});

		if (!currentEntry) {
			console.log('❌ [EntryModal] No entry provided');
			insights = null;
			return;
		}

		// Check if we already have fresh analysis and don't need to refresh
		const hasExistingAnalysis = hasAnalysis(currentEntry.id);
		const isStale = isAnalysisStale(currentEntry.id);
		const existingAnalysis = currentEntry.analysis;

		console.log('🔍 [EntryModal] Analysis check', {
			hasExistingAnalysis,
			isStale,
			existingAnalysis: existingAnalysis
				? {
						summary: existingAnalysis.summary,
						sentiment: existingAnalysis.sentiment,
						themes: existingAnalysis.themes,
						entities: existingAnalysis.entities,
						createdAt: existingAnalysis.createdAt,
						model: existingAnalysis.model
					}
				: null
		});

		if (!forceRefresh && hasExistingAnalysis && !isStale) {
			if (existingAnalysis) {
				console.log('✅ [EntryModal] Using cached analysis');
				insights = {
					entryId: currentEntry.id,
					summary: existingAnalysis.summary,
					sentiment: {
						score: existingAnalysis.sentiment.score
					},
					themes: existingAnalysis.themes,
					entities: existingAnalysis.entities.map((e) => ({
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
					keySentences: existingAnalysis.keySentences || [],
					model: existingAnalysis.model || 'cached',
					tokens: existingAnalysis.tokens || 0,
					createdAt: existingAnalysis.createdAt
				};
				console.log('📊 [EntryModal] Cached insights set', insights);
				// Clear any previous loading state and errors
				insightsLoading = false;
				insightsError = '';
				return;
			}
		}

		// Check if LLM is configured
		if (!isLLMConfigured()) {
			console.log('❌ [EntryModal] LLM not configured');
			insights = null;
			insightsError = 'AI insights require LLM configuration. Please configure your AI settings.';
			insightsLoading = false;
			return;
		}

		console.log('🚀 [EntryModal] Calling LLM for new analysis');
		// Only set loading state if we're actually going to call the LLM
		insightsLoading = true;
		insightsError = '';

		try {
			insights = await generateEntryInsights(currentEntry, forceRefresh);
			console.log('✅ [EntryModal] LLM analysis completed', insights);
		} catch (error) {
			console.error('❌ [EntryModal] Failed to generate AI insights:', error);
			insightsError = error instanceof Error ? error.message : 'Failed to generate insights';
			insights = null;
		} finally {
			insightsLoading = false;
		}
	}

	function toggleInsights() {
		console.log('🔄 [EntryModal] toggleInsights called', {
			wasExpanded: insightsExpanded,
			willBeExpanded: !insightsExpanded,
			entryId: currentEntry?.id,
			timestamp: new Date().toISOString()
		});

		insightsExpanded = !insightsExpanded;

		// Scroll to insights section when expanding
		if (insightsExpanded && insightsSection) {
			console.log('📜 [EntryModal] Scrolling to insights section');
			// Use requestAnimationFrame to ensure the DOM has updated
			requestAnimationFrame(() => {
				if (!modalBody) return;

				// Get the position of the insights section relative to the modal body
				const insightsRect = insightsSection.getBoundingClientRect();
				const modalBodyRect = modalBody.getBoundingClientRect();

				// Calculate how much we need to scroll
				const scrollTop = modalBody.scrollTop + (insightsRect.top - modalBodyRect.top) - 20;

				// Scroll the modal body to bring insights into view
				modalBody.scrollTo({
					top: scrollTop,
					behavior: 'smooth'
				});
			});
		}
	}

	function handleRefreshInsights() {
		generateInsights(true);
	}

	function closeModal() {
		isOpen = false;
		isEditing = false;
		editText = '';
		editPrompt = '';
		saveStatus = '';
		insightsExpanded = false;
		// Reset edit mode for next time
		editMode = false;
		dispatch('close');
	}

	function startEdit() {
		isEditing = true;
		editText = currentEntry?.text || '';
		editPrompt = currentEntry?.prompt || '';
	}

	function cancelEdit() {
		isEditing = false;
		editText = currentEntry?.text || '';
		editPrompt = currentEntry?.prompt || '';
		saveStatus = '';
	}

	async function saveEdit() {
		if (!currentEntry || !editText.trim()) {
			saveStatus = 'Nothing to save.';
			return;
		}

		try {
			const { compound } = getSentiment(editText);
			const tags = parseTags(editText);

			updateEntry(currentEntry.id, {
				...currentEntry,
				text: editText.trim(),
				prompt: editPrompt.trim(),
				tags,
				compound,
				updated: Date.now()
			});

			saveStatus = 'Entry updated successfully.';
			isEditing = false;

			// Clear status after a delay
			setTimeout(() => {
				saveStatus = '';
			}, 3000);
		} catch (error) {
			saveStatus = 'Error saving entry.';
			console.error('Error saving entry:', error);
		}
	}

	function parseTags(text: string): string[] {
		const set = new Set<string>();
		text.replace(/(^|\s)#([a-zA-Z0-9_\-]+)/g, (_, s, tag) => {
			set.add(tag.toLowerCase());
			return _;
		});
		return Array.from(set);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (isEditing) {
				cancelEdit();
			} else {
				closeModal();
			}
		}
		if ((event.metaKey || event.ctrlKey) && event.key === 's' && isEditing) {
			event.preventDefault();
			saveEdit();
		}
	}

	function autoExpand(node: HTMLTextAreaElement) {
		node.style.height = 'auto';
		const newHeight = node.scrollHeight;
		const max = parseInt(window.getComputedStyle(node).maxHeight);
		if (newHeight > max) {
			node.style.height = max + 'px';
		} else {
			node.style.height = newHeight + 'px';
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && currentEntry}
	<div
		class="modal-overlay"
		on:click={closeModal}
		on:keydown={handleKeydown}
		role="button"
		tabindex="0"
		aria-label="Close modal"
	>
		<div
			class="modal-content"
			on:click|stopPropagation
			on:keydown={handleKeydown}
			role="dialog"
			aria-labelledby="modal-title"
			tabindex="0"
		>
			<div class="modal-header">
				<div class="modal-title-section">
					<h2 id="modal-title" class="modal-title">
						Entry Details
						{#if currentEntry.updated}
							<span class="edit-indicator">(Edited)</span>
						{/if}
					</h2>
					<div class="entry-id">
						<span class="entry-id-label">ID:</span>
						<span class="entry-id-value">{currentEntry.id}</span>
					</div>
				</div>
				<button class="close-button" on:click={closeModal} aria-label="Close modal">
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>

			<div class="modal-body" bind:this={modalBody}>
				{#if isEditing}
					<!-- Edit Mode -->
					<div class="edit-form">
						<div class="form-group">
							<label for="edit-prompt">Prompt</label>
							<input
								id="edit-prompt"
								bind:value={editPrompt}
								type="text"
								placeholder="Entry prompt (optional)"
							/>
						</div>

						<div class="form-group">
							<label for="edit-text">Entry Text</label>
							<textarea
								id="edit-text"
								bind:value={editText}
								placeholder="Type your entry here..."
								on:input={(e) => autoExpand(e.currentTarget)}
							></textarea>
						</div>

						<div class="form-actions">
							<button on:click={saveEdit} class="save-button"> Save Changes </button>
							<button on:click={cancelEdit} class="secondary"> Cancel </button>
							{#if saveStatus}
								<span class="save-status">{saveStatus}</span>
							{/if}
						</div>
					</div>
				{:else}
					<!-- View Mode -->
					<div class="entry-view">
						<div class="entry-meta">
							<div class="entry-date">
								<strong>Created:</strong>
								{new Date(currentEntry.created).toLocaleString()}
							</div>
							{#if currentEntry.updated}
								<div class="entry-updated">
									<strong>Updated:</strong>
									{new Date(currentEntry.updated).toLocaleString()}
								</div>
							{/if}
							<div class="entry-mood">
								<span class="mood-label">Mood:</span>
								<span class="{getMoodClass(currentEntry.compound)} mono">
									{getMoodArrow(currentEntry.compound)}
									{currentEntry.compound >= 0.05
										? 'Positive'
										: currentEntry.compound <= -0.05
											? 'Negative'
											: 'Neutral'}
								</span>
							</div>
						</div>

						{#if currentEntry.prompt}
							<div class="entry-prompt">
								<strong>Prompt:</strong>
								{currentEntry.prompt}
							</div>
						{/if}

						<div class="entry-text" bind:this={entryTextContainer}>
							{@html highlightedText}
						</div>

						{#if currentEntry.tags && currentEntry.tags.length > 0}
							<div class="entry-tags">
								{#each currentEntry.tags as tag}
									<span class="tag">#{tag}</span>
								{/each}
							</div>
						{/if}

						<!-- Insights Section -->
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
												<button class="retry-button" on:click={handleRefreshInsights}>
													Retry
												</button>
											</div>
										{:else if insights}
											<div class="insight-summary">
												<h4>Summary</h4>
												<p>{insights.summary}</p>
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

											{#if currentEntry?.analysis?.keySentences && currentEntry.analysis.keySentences.length > 0}
												<div class="insight-quotes">
													<h4>Key Quotes</h4>
													<div class="quotes-list">
														{#each currentEntry.analysis.keySentences as quote, index}
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
													Generated by {insights.model} • {insights.tokens} tokens
												</small>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/if}

						<div class="entry-actions">
							<button on:click={startEdit} class="edit-button"> Edit Entry </button>
							<button on:click={closeModal} class="secondary"> Close </button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(4px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		animation: fadeIn 0.2s ease-out;
	}

	.modal-content {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 16px;
		width: 100%;
		max-width: 800px;
		max-height: 90vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		animation: slideIn 0.3s ease-out;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.modal-title-section {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.modal-title {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		color: var(--text);
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.entry-id {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
	}

	.entry-id-label {
		color: var(--muted);
		font-weight: 500;
	}

	.entry-id-value {
		color: var(--accent);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
		font-weight: 500;
		background: rgba(138, 180, 248, 0.1);
		padding: 2px 6px;
		border-radius: 4px;
		border: 1px solid rgba(138, 180, 248, 0.2);
	}

	.edit-indicator {
		font-size: 14px;
		color: var(--muted);
		font-weight: 400;
	}

	.close-button {
		background: none;
		border: none;
		color: var(--muted);
		cursor: pointer;
		padding: 8px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.close-button:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text);
	}

	.modal-body {
		padding: 24px;
		overflow-y: auto;
		flex: 1;
	}

	.entry-view {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.entry-meta {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 12px;
		border: 1px solid var(--border);
	}

	.entry-date,
	.entry-updated {
		font-size: 14px;
		color: var(--muted);
	}

	.entry-mood {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
	}

	.mood-label {
		color: var(--muted);
	}

	.entry-prompt {
		padding: 12px 16px;
		background: rgba(255, 193, 7, 0.1);
		border: 1px solid rgba(255, 193, 7, 0.3);
		border-radius: 8px;
		font-size: 14px;
		color: var(--yellow);
	}

	.entry-text {
		font-size: 16px;
		line-height: 1.6;
		white-space: pre-wrap;
		padding: 20px;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 12px;
		border: 1px solid var(--border);
		min-height: 100px;
	}

	.entry-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.tag {
		font-size: 12px;
		background: #1e1e25;
		border: 1px solid var(--border);
		padding: 4px 8px;
		border-radius: 999px;
		color: var(--muted);
	}

	.entry-actions {
		display: flex;
		gap: 12px;
		align-items: center;
		padding-top: 16px;
		border-top: 1px solid var(--border);
	}

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.form-group label {
		font-size: 14px;
		font-weight: 500;
		color: var(--text);
	}

	.form-group input,
	.form-group textarea {
		width: 100%;
		background: var(--bg);
		border: 1px solid var(--border);
		color: var(--text);
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 14px;
		font-family: inherit;
	}

	.form-group textarea {
		min-height: 200px;
		resize: vertical;
		line-height: 1.5;
	}

	.form-actions {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
	}

	.save-button {
		background: var(--accent);
		color: #0c1116;
		border: none;
		padding: 12px 20px;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		font-size: 14px;
		transition: all 0.2s;
	}

	.save-button:hover {
		background: #7aa3f0;
	}

	.edit-button {
		background: var(--accent);
		color: #0c1116;
		border: none;
		padding: 12px 20px;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		font-size: 14px;
		transition: all 0.2s;
	}

	.edit-button:hover {
		background: #7aa3f0;
	}

	.save-status {
		font-size: 14px;
		color: var(--green);
		margin-left: 12px;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
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

	.insight-summary h4,
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

	.insight-summary p {
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
		color: var(--text);
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
		background: rgba(138, 180, 248, 0.1);
		border: 1px solid rgba(138, 180, 248, 0.3);
		color: var(--accent);
		padding: 4px 8px;
		border-radius: 12px;
		font-size: 12px;
		font-weight: 500;
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

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.modal-overlay {
			padding: 10px;
		}

		.modal-content {
			max-height: 95vh;
		}

		.modal-header {
			padding: 16px 20px;
		}

		.modal-title {
			font-size: 18px;
		}

		.entry-id {
			font-size: 12px;
		}

		.entry-id-value {
			padding: 1px 4px;
		}

		.modal-body {
			padding: 20px;
		}

		.entry-text {
			font-size: 15px;
			padding: 16px;
		}

		.form-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.save-button,
		.edit-button {
			width: 100%;
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
