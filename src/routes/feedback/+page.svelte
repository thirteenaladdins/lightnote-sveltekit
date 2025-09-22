<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let feedback: any[] = [];
	let stats = {
		total: 0,
		wrong: 0,
		flat: 0,
		good: 0,
		bySummaryType: { narrativeSummary: 0, observation: 0, summary: 0 }
	};

	onMount(() => {
		if (!browser) return;

		console.log('📝 [Feedback] Page mounted successfully');

		try {
			// Initialize with empty data
			feedback = [];
			stats = {
				total: 0,
				wrong: 0,
				flat: 0,
				good: 0,
				bySummaryType: { narrativeSummary: 0, observation: 0, summary: 0 }
			};

			console.log('✅ [Feedback] Initialized successfully');
		} catch (error) {
			console.error('❌ [Feedback] Error during initialization:', error);
		}
	});
</script>

<svelte:head>
	<title>Feedback Review - Lightnote</title>
</svelte:head>

<div class="container">
	<header class="page-header">
		<h1>Summary Feedback Review</h1>
		<p class="subtitle">Review and manage AI summary feedback for iteration</p>
		<div class="info-box">
			<p>
				<strong>Getting Started:</strong> To use the feedback system, first create journal entries and
				generate AI insights. The feedback system helps you rate and improve the AI's analysis of your
				entries.
			</p>
		</div>
	</header>

	<!-- Statistics -->
	<section class="card">
		<div class="flex">
			<div>
				<div class="subtle">Feedback Statistics</div>
				<small class="subtle">{stats.total} total feedback entries</small>
			</div>
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

		<div class="empty-state">
			<div class="empty-icon">📝</div>
			<h3>No feedback yet</h3>
			<p>
				AI insights need to be generated first before you can provide feedback. Create some journal
				entries and generate AI insights to get started.
			</p>
		</div>
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

	.info-box {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 16px;
		margin-top: 16px;
	}

	.info-box p {
		margin: 0;
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.5;
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
	}
</style>
