<script lang="ts">
	import { onMount } from 'svelte';
	import { entries, loadEntries } from '$lib/stores/entries-supabase';
	import { generateAnalyticsData, filterEntriesForMonth } from '$lib/utils/analytics';
	import {
		generateCalendarGrid,
		getContributionClass,
		getPreviousMonth,
		getNextMonth
	} from '$lib/utils/calendar';
	import type { AnalyticsData } from '$lib/utils/analytics';
	import type { CalendarCell } from '$lib/utils/calendar';

	let currentMonth = new Date();
	let analysis = '';
	let analyticsData: AnalyticsData | null = null;
	let calendarGrid: CalendarCell[][] = [];

	onMount(() => {
		loadEntries();
		analyze();
		updateCalendarGrid();
	});

	$: if ($entries.length > 0) {
		analyze();
	}

	$: if (currentMonth) {
		analyze();
		updateCalendarGrid();
	}

	function analyze() {
		const items = $entries;
		if (!items.length) {
			analysis =
				'<div class="card"><div class="subtle">No entries yet. Start writing to see analytics.</div></div>';
			return;
		}

		// Filter entries for current month
		const year = currentMonth.getFullYear();
		const monthNum = currentMonth.getMonth();
		const monthlyItems = filterEntriesForMonth(items, year, monthNum);

		// Generate analytics data using utility function
		analyticsData = generateAnalyticsData(monthlyItems);
	}

	function updateCalendarGrid() {
		calendarGrid = generateCalendarGrid($entries, currentMonth);
		console.log(
			'Generated calendar grid for',
			currentMonth.toLocaleDateString(),
			':',
			calendarGrid
		);
	}

	function prevMonth() {
		currentMonth = getPreviousMonth(currentMonth);
		updateCalendarGrid();
	}

	function nextMonth() {
		currentMonth = getNextMonth(currentMonth);
		updateCalendarGrid();
	}
</script>

<section class="card">
	<div class="subtle">Quick Analysis (local, offline)</div>
	{#if analyticsData}
		<div class="analytics-container">
			<div class="analytics-wrap" style="max-width:900px; margin:0 auto">
				<div class="analytics-grid" style="grid-template-columns:1fr 1fr 1fr; gap:16px">
					<div class="card">
						<div class="subtle">Monthly Totals</div>
						<div class="row" style="margin-top:12px">
							<div class="pill">Entries: <b>{analyticsData.total}</b></div>
							<div class="pill">Words: <b>{analyticsData.wc}</b></div>
						</div>
						<div class="row" style="margin-top:8px">
							<div class="pill">
								Overall mood: <b>{analyticsData.avgMood} ({analyticsData.avgLabel})</b>
							</div>
						</div>
					</div>
					<div class="card">
						<div class="subtle">Sentiment Breakdown</div>
						<div class="row" style="margin-top:12px; flex-direction: column; gap: 6px">
							<div class="sentiment-bar">
								<span class="sentiment-label">Positive:</span>
								<div class="sentiment-progress">
									<div
										class="sentiment-fill positive"
										style="width: {analyticsData.avgPos !== '—'
											? (parseFloat(analyticsData.avgPos) * 100).toFixed(1)
											: 0}%"
									></div>
								</div>
								<span class="sentiment-value">{analyticsData.avgPos}</span>
							</div>
							<div class="sentiment-bar">
								<span class="sentiment-label">Neutral:</span>
								<div class="sentiment-progress">
									<div
										class="sentiment-fill neutral"
										style="width: {analyticsData.avgNeu !== '—'
											? (parseFloat(analyticsData.avgNeu) * 100).toFixed(1)
											: 0}%"
									></div>
								</div>
								<span class="sentiment-value">{analyticsData.avgNeu}</span>
							</div>
							<div class="sentiment-bar">
								<span class="sentiment-label">Negative:</span>
								<div class="sentiment-progress">
									<div
										class="sentiment-fill negative"
										style="width: {analyticsData.avgNeg !== '—'
											? (parseFloat(analyticsData.avgNeg) * 100).toFixed(1)
											: 0}%"
									></div>
								</div>
								<span class="sentiment-value">{analyticsData.avgNeg}</span>
							</div>
						</div>
					</div>
					<div class="card">
						<div class="subtle">Top tags (this month)</div>
						<div class="tags" style="margin-top:12px">
							{#each analyticsData.topTags as [tag, count]}
								<span class="tag">#{tag} × {count}</span>
							{/each}
							{#if analyticsData.topTags.length === 0}
								<small class="subtle">No tags yet.</small>
							{/if}
						</div>
					</div>
				</div>

				<div class="card" style="margin-top:16px">
					<div class="subtle">Entry patterns</div>
					<div class="charts-container">
						<div class="chart-section">
							<div
								class="flex"
								style="justify-content: space-between; align-items: center; margin-bottom: 12px;"
							>
								<button class="secondary" on:click={prevMonth}>← Previous</button>
								<div class="subtle chart-title">
									{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
								</div>
								<button class="secondary" on:click={nextMonth}>Next →</button>
							</div>
							<div class="calendar-grid">
								<div class="github-grid">
									{#each calendarGrid as week, weekIndex}
										{#each week as cell, dayIndex}
											{#if cell.isCurrentMonth && cell.day > 0}
												<div
													class="calendar-cell current-month {getContributionClass(cell.count)}"
													title="{cell.count} entries on {cell.day}"
												>
													<span class="day-number">{cell.day}</span>
													{#if cell.count > 0}
														<span class="entry-count">{cell.count}</span>
													{/if}
												</div>
											{:else}
												<div class="calendar-cell empty-cell"></div>
											{/if}
										{/each}
									{/each}
								</div>
								<div class="calendar-legend">
									<span class="legend-text">Calendar shows entry counts for each day</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="wrap" style="margin-top:16px">
				<div class="card">
					<div class="subtle">Most common words</div>
					<div class="tags word-cloud" style="margin-top:12px">
						{#each analyticsData.topWords as [word, count]}
							<span class="tag">{word} × {count}</span>
						{/each}
						{#if analyticsData.topWords.length === 0}
							<small class="subtle">Start writing to see patterns.</small>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="card">
			<div class="subtle">No entries yet. Start writing to see analytics.</div>
		</div>
	{/if}
</section>

<style>
	.calendar-grid {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-top: 12px;
	}

	.github-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
		align-items: start;
		grid-auto-flow: row;
	}

	.calendar-cell {
		width: 100%;
		height: 60px;
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 4px;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: flex-start;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
	}

	/* Mobile calendar improvements */
	@media (max-width: 768px) {
		.calendar-cell {
			height: 50px;
			padding: 3px;
		}

		.day-number {
			font-size: 11px;
		}

		.entry-count {
			font-size: 9px;
			padding: 1px 3px;
		}
	}

	@media (max-width: 480px) {
		.calendar-cell {
			height: 45px;
			padding: 2px;
		}

		.day-number {
			font-size: 10px;
		}

		.entry-count {
			font-size: 8px;
			padding: 1px 2px;
		}
	}

	.calendar-cell:hover {
		background-color: var(--hover);
		border-color: var(--accent);
	}

	.calendar-cell.current-month {
		background-color: var(--card-bg);
	}

	.calendar-cell.other-month {
		background-color: var(--muted-bg);
		opacity: 0.5;
	}

	.calendar-cell.empty-cell {
		background-color: transparent;
		border: none;
		cursor: default;
	}

	.day-number {
		font-size: 12px;
		font-weight: 500;
		color: var(--text);
	}

	.entry-count {
		font-size: 10px;
		color: var(--accent);
		background-color: var(--accent-bg);
		padding: 2px 4px;
		border-radius: 2px;
		margin-top: auto;
	}

	.calendar-legend {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-top: 8px;
		font-size: 10px;
		color: var(--muted);
	}

	.legend-text {
		font-size: 10px;
		color: var(--muted);
	}

	/* Contribution level colors */
	.contribution-none {
		background-color: rgba(138, 180, 248, 0.1) !important;
	}

	.contribution-very-low {
		background-color: rgba(138, 180, 248, 0.2) !important;
	}

	.contribution-low {
		background-color: rgba(138, 180, 248, 0.4) !important;
	}

	.contribution-medium {
		background-color: rgba(138, 180, 248, 0.6) !important;
	}

	.contribution-medium-high {
		background-color: rgba(138, 180, 248, 0.8) !important;
	}

	.contribution-high {
		background-color: rgba(138, 180, 248, 1) !important;
	}

	/* Sentiment breakdown styles */
	.sentiment-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 13px;
		margin-bottom: 8px;
		width: 100%;
	}

	/* Mobile sentiment improvements */
	@media (max-width: 768px) {
		.sentiment-bar {
			gap: 8px;
			font-size: 12px;
			margin-bottom: 6px;
		}

		.sentiment-label {
			min-width: 60px;
			font-size: 11px;
		}

		.sentiment-progress {
			min-width: 80px;
		}

		.sentiment-value {
			min-width: 35px;
			font-size: 11px;
		}
	}

	@media (max-width: 480px) {
		.sentiment-bar {
			gap: 6px;
			font-size: 11px;
			flex-wrap: wrap;
		}

		.sentiment-label {
			min-width: 50px;
			font-size: 10px;
		}

		.sentiment-progress {
			min-width: 60px;
			flex: 1;
		}

		.sentiment-value {
			min-width: 30px;
			font-size: 10px;
		}
	}

	.sentiment-label {
		min-width: 70px;
		font-weight: 600;
		color: var(--text);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.sentiment-progress {
		flex: 1;
		height: 1.2em;
		background-color: var(--muted-bg);
		border-radius: 0;
		overflow: hidden;
		position: relative;
		min-width: 100px;
	}

	.sentiment-fill {
		height: 100%;
		transition: width 0.5s ease;
		border-radius: 0;
		position: relative;
		min-width: 2px;
	}

	.sentiment-fill.positive {
		background-color: var(--green);
	}

	.sentiment-fill.neutral {
		background-color: var(--muted);
	}

	.sentiment-fill.negative {
		background-color: var(--red);
	}

	.sentiment-value {
		min-width: 40px;
		text-align: right;
		font-weight: 600;
		color: var(--text);
		font-size: 12px;
		font-family: monospace;
	}

	/* Analytics grid mobile responsiveness */
	.analytics-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 16px;
	}

	@media (max-width: 768px) {
		.analytics-grid {
			grid-template-columns: 1fr 1fr;
			gap: 12px;
		}
	}

	@media (max-width: 480px) {
		.analytics-grid {
			grid-template-columns: 1fr;
			gap: 10px;
		}
	}
</style>
