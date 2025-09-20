<script lang="ts">
	import { onMount } from 'svelte';
	import {
		feedbackStore,
		loadFeedback,
		clearAllFeedback,
		deleteFeedback,
		updateFeedback,
		getFeedbackStats
	} from '$lib/utils/feedback';
	import { entries } from '$lib/stores/entries';
	import type { SummaryFeedback } from '$lib/types/entry';

	let feedback: SummaryFeedback[] = [];
	let stats = {
		total: 0,
		wrong: 0,
		flat: 0,
		good: 0,
		bySummaryType: { narrativeSummary: 0, observation: 0, summary: 0 }
	};
	let filterType: string = 'all';
	let filterSummaryType: string = 'all';
	let editingComment: string | null = null;
	let editingId: string | null = null;

	// Reactive filtered feedback
	$: filteredFeedback = feedback
		.filter((f) => {
			// Check if any summary type matches the filter
			const typeMatch =
				filterType === 'all' ||
				(filterType !== 'all' &&
					Object.values(f.feedback).includes(filterType as 'wrong' | 'flat' | 'good'));

			const summaryTypeMatch =
				filterSummaryType === 'all' ||
				(filterSummaryType !== 'all' &&
					f.feedback[filterSummaryType as 'narrativeSummary' | 'observation' | 'summary'] !==
						undefined);

			return typeMatch && summaryTypeMatch;
		})
		.sort((a, b) => b.updatedAt - a.updatedAt); // Most recent first

	onMount(() => {
		feedback = loadFeedback();
		stats = getFeedbackStats();

		// Subscribe to feedback store changes
		const unsubscribe = feedbackStore.subscribe((updatedFeedback) => {
			feedback = updatedFeedback;
			stats = getFeedbackStats();
		});

		return unsubscribe;
	});

	function getEntryById(entryId: string) {
		return $entries.find((e) => e.id === entryId);
	}

	function formatDate(timestamp: number) {
		return new Date(timestamp).toLocaleString();
	}

	function getFeedbackIcon(feedbackType: string) {
		switch (feedbackType) {
			case 'wrong':
				return '❌';
			case 'flat':
				return '😐';
			case 'good':
				return '✅';
			default:
				return '❓';
		}
	}

	function getFeedbackColor(feedbackType: string) {
		switch (feedbackType) {
			case 'wrong':
				return 'var(--red)';
			case 'flat':
				return 'var(--orange)';
			case 'good':
				return 'var(--green)';
			default:
				return 'var(--text-secondary)';
		}
	}

	function startEditComment(feedbackId: string, currentComment?: string) {
		editingId = feedbackId;
		editingComment = currentComment || '';
	}

	function saveComment() {
		if (editingId && editingComment !== null) {
			updateFeedback(editingId, { userComment: editingComment || undefined });
			editingId = null;
			editingComment = null;
		}
	}

	function cancelEdit() {
		editingId = null;
		editingComment = null;
	}

	function handleDelete(feedbackId: string) {
		if (confirm('Delete this feedback?')) {
			deleteFeedback(feedbackId);
		}
	}

	function handleClearAll() {
		if (confirm('Delete ALL feedback? This cannot be undone.')) {
			clearAllFeedback();
		}
	}

	function exportFeedback() {
		const dataStr = JSON.stringify(feedback, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `lightnote-feedback-${new Date().toISOString().split('T')[0]}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	function getSummaryTypeDisplayName(summaryType: string) {
		switch (summaryType) {
			case 'narrativeSummary':
				return 'Narrative Summary';
			case 'observation':
				return 'Observation';
			case 'summary':
				return 'Summary';
			default:
				return summaryType;
		}
	}
</script>

<svelte:head>
	<title>Feedback Review - Lightnote</title>
</svelte:head>

<div class="container">
	<header class="page-header">
		<h1>Summary Feedback Review</h1>
		<p class="subtitle">Review and manage AI summary feedback for iteration</p>
	</header>

	<!-- Statistics -->
	<section class="card">
		<div class="flex">
			<div>
				<div class="subtle">Feedback Statistics</div>
				<small class="subtle">{stats.total} total feedback entries</small>
			</div>
			<div class="spacer"></div>
			<button class="secondary" on:click={exportFeedback}>Export Data</button>
			<button class="secondary destructive" on:click={handleClearAll}>
				<span class="danger">Clear All</span>
			</button>
		</div>

		<div class="stats-grid" style="margin-top: 16px">
			<div class="stat-card">
				<div class="stat-number wrong">{stats.wrong}</div>
				<div class="stat-label">Wrong</div>
			</div>
			<div class="stat-card">
				<div class="stat-number flat">{stats.flat}</div>
				<div class="stat-label">Flat</div>
			</div>
			<div class="stat-card">
				<div class="stat-number good">{stats.good}</div>
				<div class="stat-label">Good</div>
			</div>
			<div class="stat-card">
				<div class="stat-number">{stats.bySummaryType.narrativeSummary}</div>
				<div class="stat-label">Narrative</div>
			</div>
			<div class="stat-card">
				<div class="stat-number">{stats.bySummaryType.observation}</div>
				<div class="stat-label">Observation</div>
			</div>
			<div class="stat-card">
				<div class="stat-number">{stats.bySummaryType.summary}</div>
				<div class="stat-label">Summary</div>
			</div>
		</div>
	</section>

	<!-- Filters -->
	<section class="card" style="margin-top: 16px">
		<div class="flex">
			<div>
				<div class="subtle">Filters</div>
				<small class="subtle">{filteredFeedback.length} of {feedback.length} shown</small>
			</div>
			<div class="spacer"></div>
			<div class="filter-group">
				<select bind:value={filterType}>
					<option value="all">All Types</option>
					<option value="wrong">❌ Wrong</option>
					<option value="flat">😐 Flat</option>
					<option value="good">✅ Good</option>
				</select>
				<select bind:value={filterSummaryType}>
					<option value="all">All Summary Types</option>
					<option value="narrativeSummary">Narrative Summary</option>
					<option value="observation">Observation</option>
					<option value="summary">Summary</option>
				</select>
			</div>
		</div>
	</section>

	<!-- Feedback List -->
	<section class="card" style="margin-top: 16px">
		<div class="flex">
			<div>
				<div class="subtle">Feedback Entries</div>
				<small class="subtle">Most recent first</small>
			</div>
		</div>

		{#if filteredFeedback.length === 0}
			<div class="empty-state">
				<div class="empty-icon">📝</div>
				<h3>No feedback found</h3>
				<p>No feedback matches your current filters.</p>
			</div>
		{:else}
			<div class="list" style="margin-top: 12px">
				{#each filteredFeedback as item}
					{@const entry = getEntryById(item.entryId)}
					<div class="feedback-entry">
						<div class="feedback-header">
							<div class="feedback-meta">
								<span class="feedback-date">{formatDate(item.updatedAt)}</span>
								{#if entry}
									<span class="entry-date">
										Entry: {new Date(entry.created).toLocaleString()}
									</span>
								{/if}
							</div>
							<button class="secondary destructive small" on:click={() => handleDelete(item.id)}>
								Delete
							</button>
						</div>

						<div class="feedback-content">
							<!-- Feedback Summary -->
							<div class="feedback-summary">
								<h4>Feedback Summary:</h4>
								<div class="feedback-tags">
									{#each Object.entries(item.feedback) as [summaryType, feedbackType]}
										{#if feedbackType}
											<span
												class="feedback-tag"
												style="color: {getFeedbackColor(
													feedbackType
												)}; border-color: {getFeedbackColor(feedbackType)}"
											>
												{getFeedbackIcon(feedbackType)}
												{getSummaryTypeDisplayName(summaryType)}: {feedbackType}
											</span>
										{/if}
									{/each}
								</div>
							</div>

							<!-- Individual Summary Sections -->
							{#each Object.entries(item.feedback) as [summaryType, feedbackType]}
								{#if feedbackType && item.summaryTexts[summaryType as keyof typeof item.summaryTexts]}
									<div class="summary-section">
										<h4>
											{getSummaryTypeDisplayName(summaryType)} ({getFeedbackIcon(feedbackType)}
											{feedbackType}):
										</h4>
										<p class="summary-text">
											{item.summaryTexts[summaryType as keyof typeof item.summaryTexts]}
										</p>
									</div>
								{/if}
							{/each}

							{#if entry}
								<div class="original-section">
									<h4>Original Entry:</h4>
									<p class="original-text">{entry.text}</p>
								</div>
							{/if}

							<div class="comment-section">
								<h4>Comments:</h4>
								{#if editingId === item.id}
									<div class="comment-editor">
										<textarea
											bind:value={editingComment}
											placeholder="Add notes about this feedback..."
											rows="2"
										></textarea>
										<div class="comment-actions">
											<button class="secondary small" on:click={saveComment}>Save</button>
											<button class="secondary small" on:click={cancelEdit}>Cancel</button>
										</div>
									</div>
								{:else}
									<div class="comment-display">
										{#if item.userComment}
											<p class="comment-text">{item.userComment}</p>
										{:else}
											<p class="comment-placeholder">No comments added</p>
										{/if}
										<button
											class="secondary small"
											on:click={() => startEditComment(item.id, item.userComment)}
										>
											{item.userComment ? 'Edit' : 'Add'} Comment
										</button>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}

	.page-header {
		margin-bottom: 24px;
	}

	.page-header h1 {
		margin: 0 0 8px 0;
		font-size: 32px;
		font-weight: 700;
	}

	.subtitle {
		color: var(--text-secondary);
		margin: 0;
		font-size: 16px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 12px;
	}

	.stat-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 16px;
		text-align: center;
	}

	.stat-number {
		font-size: 24px;
		font-weight: 700;
		margin-bottom: 4px;
	}

	.stat-number.wrong {
		color: var(--red);
	}

	.stat-number.flat {
		color: var(--orange);
	}

	.stat-number.good {
		color: var(--green);
	}

	.stat-label {
		font-size: 12px;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.filter-group {
		display: flex;
		gap: 8px;
	}

	.filter-group select {
		padding: 6px 12px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--bg);
		color: var(--text);
		font-size: 14px;
	}

	.empty-state {
		text-align: center;
		padding: 40px 20px;
		color: var(--text-secondary);
	}

	.empty-icon {
		font-size: 48px;
		margin-bottom: 16px;
	}

	.empty-state h3 {
		margin: 0 0 8px 0;
		font-size: 20px;
		font-weight: 600;
	}

	.empty-state p {
		margin: 0;
		font-size: 14px;
	}

	.feedback-entry {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 16px;
		margin-bottom: 12px;
	}

	.feedback-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border);
	}

	.feedback-meta {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 14px;
	}

	.feedback-date,
	.entry-date {
		color: var(--text-secondary);
		font-size: 12px;
	}

	.feedback-content {
		display: grid;
		gap: 16px;
	}

	.feedback-summary h4,
	.summary-section h4,
	.original-section h4,
	.comment-section h4 {
		margin: 0 0 8px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.feedback-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 16px;
	}

	.feedback-tag {
		padding: 4px 8px;
		border: 1px solid;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
		background: transparent;
	}

	.summary-text,
	.original-text {
		margin: 0;
		padding: 12px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: 14px;
		line-height: 1.5;
		white-space: pre-wrap;
	}

	.original-text {
		max-height: 200px;
		overflow-y: auto;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.comment-editor textarea {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--bg);
		color: var(--text);
		font-size: 14px;
		resize: vertical;
		font-family: inherit;
	}

	.comment-actions {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}

	.comment-display {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
	}

	.comment-text {
		margin: 0;
		flex: 1;
		padding: 8px 12px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: 14px;
		line-height: 1.4;
	}

	.comment-placeholder {
		margin: 0;
		flex: 1;
		color: var(--text-secondary);
		font-style: italic;
		font-size: 14px;
	}

	.small {
		font-size: 12px;
		padding: 4px 8px;
		min-height: unset;
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.container {
			padding: 12px;
		}

		.page-header h1 {
			font-size: 24px;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.filter-group {
			flex-direction: column;
			width: 100%;
		}

		.filter-group select {
			width: 100%;
		}

		.feedback-meta {
			flex-wrap: wrap;
			gap: 8px;
		}

		.comment-display {
			flex-direction: column;
			align-items: stretch;
		}

		.feedback-tags {
			flex-direction: column;
		}
	}
</style>
