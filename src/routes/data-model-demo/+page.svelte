<script lang="ts">
	import { onMount } from 'svelte';
	import { entries } from '$lib/stores/entries';
	import { testDataModel, clearTestData } from '$lib/utils/test-data-model';
	import type { Entry as StoreEntry } from '$lib/stores/entries';
	import type { Entry, EntryInsight } from '$lib/types';

	let testData: { entry: Entry; insight: EntryInsight } | null = null;
	let allEntries: StoreEntry[] = [];

	onMount(() => {
		// Load existing data
		entries.subscribe((value: StoreEntry[]) => (allEntries = value));
		entries.load();
	});

	function runTest() {
		testData = testDataModel();
		// Reload stores to show the new data
		entries.load();
	}

	function clearData() {
		clearTestData();
		entries.load();
		testData = null;
	}
</script>

n th<svelte:head>
	<title>Data Model Demo - Lightnote</title>
</svelte:head>

<div class="container">
	<h1>🧪 Data Model Demo</h1>

	<div class="section">
		<h2>New Data Model</h2>
		<p>
			This demo showcases the new AI-powered data model with separate storage for entries and
			insights.
		</p>

		<div class="actions">
			<button on:click={runTest} class="btn btn-primary">Run Test</button>
			<button on:click={clearData} class="btn btn-secondary">Clear Data</button>
		</div>
	</div>

	{#if testData}
		<div class="section">
			<h2>Test Results</h2>

			<div class="card">
				<h3>📝 Entry</h3>
				<pre>{JSON.stringify(testData.entry, null, 2)}</pre>
			</div>

			<div class="card">
				<h3>🧠 Insight</h3>
				<pre>{JSON.stringify(testData.insight, null, 2)}</pre>
			</div>
		</div>
	{/if}

	<div class="section">
		<h2>Storage Overview</h2>

		<div class="storage-info">
			<h3>Storage Keys</h3>
			<ul>
				<li><code>lightnote.entries.v1</code> - Raw entries array</li>
				<li><code>ln.entry.insights.v1</code> - AI insights by entry ID</li>
				<li><code>ln.weekly.rollups.v1</code> - Weekly analytics rollups</li>
			</ul>
		</div>

		<div class="data-summary">
			<h3>Current Data</h3>
			<p><strong>Entries:</strong> {allEntries.length}</p>
		</div>
	</div>

	<div class="section">
		<h2>Data Model Benefits</h2>
		<ul>
			<li>✅ <strong>Separation of concerns:</strong> Raw data separate from AI analysis</li>
			<li>
				✅ <strong>Extensible:</strong> Easy to add new insight types without changing entries
			</li>
			<li>✅ <strong>Re-generatable:</strong> Can refresh insights without losing raw data</li>
			<li>✅ <strong>Versioned storage:</strong> Clear storage keys for future migrations</li>
			<li>✅ <strong>Type-safe:</strong> Full TypeScript support</li>
		</ul>
	</div>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	.section {
		margin-bottom: 2rem;
		padding: 1.5rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--panel);
	}

	.actions {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 500;
	}

	.btn-primary {
		background: var(--accent);
		color: var(--text);
	}

	.btn-secondary {
		background: var(--muted);
		color: var(--text);
	}

	.btn:hover {
		opacity: 0.9;
	}

	.card {
		margin: 1rem 0;
		padding: 1rem;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 4px;
	}

	pre {
		background: var(--bg-secondary);
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		font-size: 0.9rem;
	}

	.storage-info,
	.data-summary {
		margin: 1rem 0;
		padding: 1rem;
		background: var(--panel);
		border-radius: 4px;
	}

	code {
		background: var(--bg-secondary);
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		font-family: monospace;
	}

	ul {
		padding-left: 1.5rem;
	}

	li {
		margin-bottom: 0.5rem;
	}
</style>
