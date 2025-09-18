<script lang="ts">
	import { onMount } from 'svelte';
	import {
		entries,
		addEntry,
		updateEntry,
		deleteEntry,
		loadEntries,
		saveEntries
	} from '$lib/stores/entries';
	import { getSentiment } from '$lib/utils/sentiment';
	import { prompts } from '$lib/utils/prompts';
	import EntryModal from '$lib/components/EntryModal.svelte';
	import type { Entry } from '$lib/stores/entries';
	import '$lib/utils/quick-debug.js';

	let customPrompt = '';
	let entryText = '';
	let saveStatus = '';
	let editingId: string | null = null;
	let searchQuery = '';
	let fromDate = '';
	let toDate = '';
	let currentPrompt = '';
	let selectedEntry: Entry | null = null;
	let isModalOpen = false;
	let modalEditMode = false;

	// Filtered entries based on search and date filters, sorted by most recent first
	$: filteredEntries = $entries
		.filter((entry) => {
			const query = searchQuery.toLowerCase();
			const from = fromDate ? new Date(fromDate) : null;
			const to = toDate ? new Date(toDate) : null;

			// Date filtering
			const entryDate = new Date(entry.created);
			if (from && entryDate < from) return false;
			if (to) {
				const endDate = new Date(to);
				endDate.setDate(endDate.getDate() + 1);
				if (entryDate >= endDate) return false;
			}

			// Text/tag filtering
			if (!query) return true;
			if (entry.text.toLowerCase().includes(query)) return true;
			if (entry.tags?.some((tag) => tag.includes(query.replace('#', '')))) return true;
			return false;
		})
		.sort((a, b) => b.created - a.created);

	onMount(() => {
		loadEntries();
		pickPrompt();

		// Add debug functions to window for easy access
		(window as any).debugData = () => {
			console.log('🔍 [DEBUG] Analyzing data state...');
			console.log('📊 [DEBUG] Total entries:', $entries.length);

			$entries.forEach((entry: Entry, index: number) => {
				console.log(`\n📝 [DEBUG] Entry ${index + 1}:`, {
					id: entry.id,
					text: entry.text.substring(0, 50) + '...',
					hasAnalysis: !!entry.analysis,
					analysisEntryId: entry.analysis?.entryId,
					analysisCreatedAt: entry.analysis?.createdAt,
					analysisSummary: entry.analysis?.summary?.substring(0, 50) + '...',
					idMatch: entry.analysis ? entry.id === entry.analysis.entryId : 'N/A'
				});

				// Check for ID mismatches
				if (entry.analysis && entry.id !== entry.analysis.entryId) {
					console.error('❌ [DEBUG] ID MISMATCH FOUND!', {
						entryId: entry.id,
						analysisEntryId: entry.analysis.entryId,
						entryText: entry.text.substring(0, 100),
						analysisSummary: entry.analysis.summary
					});
				}
			});

			console.log('✅ [DEBUG] Data analysis complete');
		};

		(window as any).debugStorage = () => {
			console.log('💾 [DEBUG] Checking localStorage...');
			const stored = localStorage.getItem('lightnote.entries.v1');
			if (!stored) {
				console.log('❌ [DEBUG] No stored entries found');
				return;
			}

			try {
				const entries = JSON.parse(stored);
				console.log(`📊 [DEBUG] Stored entries: ${entries.length}`);

				entries.forEach((entry: any, index: number) => {
					console.log(`\n📝 [DEBUG] Stored Entry ${index + 1}:`, {
						id: entry.id,
						text: entry.text?.substring(0, 50) + '...',
						hasAnalysis: !!entry.analysis,
						analysisEntryId: entry.analysis?.entryId,
						idMatch: entry.analysis ? entry.id === entry.analysis.entryId : 'N/A'
					});
				});
			} catch (error) {
				console.error('❌ [DEBUG] Error parsing stored data:', error);
			}
		};

		// Add quote mismatch debug function
		(window as any).debugQuotes = (entryId: string) => {
			import('$lib/utils/debug-quote-mismatch.js').then((module) => {
				module.debugQuoteMismatch(entryId);
			});
		};

		// Add advanced quote mismatch debug function
		(window as any).debugQuotesAdvanced = (entryId: string) => {
			import('$lib/utils/debug-quote-mismatch.js').then((module) => {
				module.debugQuoteMismatchAdvanced(entryId);
			});
		};

		// Add quote normalization test function
		(window as any).testQuoteNormalization = (entryId: string) => {
			import('$lib/utils/debug-quote-mismatch.js').then((module) => {
				module.testQuoteNormalization(entryId);
			});
		};

		console.log('🔧 Debug functions available:');
		console.log('  debugData() - Analyze all entries');
		console.log('  debugStorage() - Check localStorage data');
		console.log('  debugQuotes("entry-id") - Debug quote mismatch for specific entry');
		console.log('  debugQuotesAdvanced("entry-id") - Deep analysis of quote mismatch');
		console.log('  testQuoteNormalization("entry-id") - Test quote normalization methods');
		console.log('  testAIInsights("entry-id") - Test original AI insights');
		console.log(
			'  testImprovedInsights("entry-id") - Test improved AI insights with contradiction detection'
		);
		console.log('  testConflictInsights() - Create conflict test entry and test improved insights');
		console.log('  quickDebug() - Quick analysis');

		// Test function to manually trigger AI insights
		(window as any).testAIInsights = async (entryId: string) => {
			console.log('🧪 [TEST] Testing AI insights for entry:', entryId);
			const entry = $entries.find((e) => e.id === entryId);
			if (!entry) {
				console.log('❌ [TEST] Entry not found');
				return;
			}

			try {
				const { generateEntryInsights } = await import('$lib/utils/ai-insights.js');
				console.log('🚀 [TEST] Calling generateEntryInsights...');
				const result = await generateEntryInsights(entry, true);
				console.log('✅ [TEST] AI insights result:', result);
			} catch (error) {
				console.error('❌ [TEST] Error:', error);
			}
		};

		// Test function for the new improved insights system
		(window as any).testImprovedInsights = async (entryId: string) => {
			console.log('🧪 [TEST-IMPROVED] Testing improved AI insights for entry:', entryId);
			const entry = $entries.find((e) => e.id === entryId);
			if (!entry) {
				console.log('❌ [TEST-IMPROVED] Entry not found');
				return;
			}

			try {
				const { generateEntryInsightsV2 } = await import('$lib/utils/ai-insights-v2.js');
				console.log('🚀 [TEST-IMPROVED] Calling generateEntryInsightsV2...');
				const result = await generateEntryInsightsV2(entry, true);
				console.log('✅ [TEST-IMPROVED] Improved AI insights result:', result);
				console.log(
					'📊 [TEST-IMPROVED] Key sentences with categories:',
					result.keySentences.map((s) => ({
						text: s.text.substring(0, 50) + '...',
						category: (s as any).category
					}))
				);
			} catch (error) {
				console.error('❌ [TEST-IMPROVED] Error:', error);
			}
		};

		// Test function to create a conflict entry and test improved insights
		(window as any).testConflictInsights = async () => {
			console.log(
				'🧪 [TEST-CONFLICT] Creating conflict test entry and testing improved insights...'
			);

			try {
				const { createConflictTestEntry } = await import('$lib/utils/test-data-model.js');
				const { addEntry } = await import('$lib/stores/entries.js');
				const { generateEntryInsightsV2 } = await import('$lib/utils/ai-insights-v2.js');

				// Create the conflict test entry
				const conflictEntry = createConflictTestEntry();
				addEntry(conflictEntry);

				console.log('📝 [TEST-CONFLICT] Created conflict entry:', conflictEntry.id);
				console.log('📝 [TEST-CONFLICT] Entry text:', conflictEntry.text);

				// Test improved insights
				console.log('🚀 [TEST-CONFLICT] Testing improved insights...');
				const result = await generateEntryInsightsV2(conflictEntry, true);

				console.log('✅ [TEST-CONFLICT] Improved insights result:');
				console.log('Summary:', result.summary);
				console.log('Sentiment:', result.sentiment);
				console.log('Key sentences with categories:');
				result.keySentences.forEach((s, i) => {
					console.log(`  ${i + 1}. [${(s as any).category || 'uncategorized'}] ${s.text}`);
				});
				console.log(
					'Themes:',
					result.themes.map((t) => `${t.name} (${t.confidence})`)
				);
			} catch (error) {
				console.error('❌ [TEST-CONFLICT] Error:', error);
			}
		};

		// Test function to check localStorage directly
		(window as any).checkLocalStorage = (entryId: string) => {
			console.log('🔍 [TEST] Checking localStorage for entry:', entryId);
			const stored = localStorage.getItem('lightnote.entries.v1');
			if (!stored) {
				console.log('❌ [TEST] No stored entries found');
				return;
			}

			try {
				const entries = JSON.parse(stored);
				const entry = entries.find((e: any) => e.id === entryId);
				if (!entry) {
					console.log('❌ [TEST] Entry not found in localStorage');
					return;
				}

				console.log('📝 [TEST] Entry found in localStorage:', {
					id: entry.id,
					text: entry.text.substring(0, 50) + '...',
					hasAnalysis: !!entry.analysis,
					analysis: entry.analysis
						? {
								entryId: entry.analysis.entryId,
								summary: entry.analysis.summary,
								createdAt: entry.analysis.createdAt
							}
						: null
				});
			} catch (error) {
				console.error('❌ [TEST] Error parsing localStorage:', error);
			}
		};
	});

	function pickPrompt() {
		const idx = Math.floor(Math.random() * prompts.length);
		currentPrompt = prompts[idx];
		customPrompt = '';
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

	function parseTags(text: string): string[] {
		const set = new Set<string>();
		text.replace(/(^|\s)#([a-zA-Z0-9_\-]+)/g, (_, s, tag) => {
			set.add(tag.toLowerCase());
			return _;
		});
		return Array.from(set);
	}

	async function saveEntry() {
		const prompt = (customPrompt.trim() || currentPrompt || '').trim();
		const text = entryText.trim();

		if (!text) {
			status('Nothing to save.', true);
			return;
		}

		const { compound, label } = getSentiment(text);
		const tags = parseTags(text);

		if (editingId) {
			// Update existing entry
			const entry = $entries.find((e) => e.id === editingId);
			if (entry) {
				updateEntry(editingId, {
					...entry,
					text,
					prompt,
					tags,
					compound,
					updated: Date.now()
				});
				status('Updated entry.');
				endEditing();
			} else {
				// Fallback to creating new entry
				addNewEntry(prompt, text, tags, compound);
				status('Saved (previous entry not found).');
			}
		} else {
			// Create new entry
			addNewEntry(prompt, text, tags, compound);
			status('Saved.');
		}

		entryText = '';
		customPrompt = '';
		autoExpand(document.getElementById('entry') as HTMLTextAreaElement);

		// Update streak after saving entry
		window.dispatchEvent(new CustomEvent('updateStreak'));
	}

	function addNewEntry(prompt: string, text: string, tags: string[], compound: number) {
		const id =
			typeof crypto !== 'undefined' && crypto.randomUUID
				? crypto.randomUUID()
				: String(Date.now()) + Math.random().toString(36).slice(2);
		const created = Date.now();
		const sentiment = getSentiment(text);
		const entry = {
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
		addEntry(entry);
	}

	function clearEntry() {
		entryText = '';
		customPrompt = '';
		autoExpand(document.getElementById('entry') as HTMLTextAreaElement);
		if (editingId) {
			endEditing();
			status('Edit canceled.');
		} else {
			status('Cleared.');
		}
	}

	function editEntry(entry: any) {
		customPrompt = entry.prompt || '';
		entryText = entry.text;
		editingId = entry.id || '';
		document.getElementById('entry')?.classList.add('editing');
		document.getElementById('editBadge')?.style.setProperty('display', 'inline-block');
		autoExpand(document.getElementById('entry') as HTMLTextAreaElement);
		window.scrollTo({ top: 0, behavior: 'smooth' });
		status('Editing existing entry. Click Save to update, Clear to cancel.');
	}

	function endEditing() {
		editingId = null;
		document.getElementById('editBadge')?.style.setProperty('display', 'none');
		document.getElementById('entry')?.classList.remove('editing');
	}

	function deleteEntryById(id: string) {
		if (confirm('Delete this entry?')) {
			deleteEntry(id);
			if (editingId === id) {
				endEditing();
			}
			status('Entry deleted.');

			// Update streak after deleting entry
			window.dispatchEvent(new CustomEvent('updateStreak'));
		}
	}

	function openEntryModal(entry: Entry) {
		selectedEntry = entry;
		isModalOpen = true;
		modalEditMode = false;
	}

	function openEntryModalForEdit(entry: Entry) {
		selectedEntry = entry;
		isModalOpen = true;
		modalEditMode = true;
	}

	function closeEntryModal() {
		isModalOpen = false;
		selectedEntry = null;
		modalEditMode = false;
	}

	function exportJson() {
		const data = $entries;
		download(JSON.stringify(data, null, 2), 'lightnote-export.json', 'application/json');
	}

	function exportCsv() {
		const items = [...$entries].sort((a, b) => a.created - b.created);
		const esc = (s: string) => '"' + String(s).replace(/"/g, '""') + '"';
		const rows = [['id', 'created_iso', 'updated_iso', 'prompt', 'text', 'tags']].concat(
			items.map((it) => [
				it.id,
				new Date(it.created).toISOString(),
				it.updated ? new Date(it.updated).toISOString() : '',
				it.prompt || '',
				it.text.replace(/\n/g, '\\n'),
				(it.tags || []).join(' ')
			])
		);
		const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
		download(csv, 'lightnote-export.csv', 'text/csv');
	}

	function importJson(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) {
			status('Choose a JSON file first.', true);
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = JSON.parse(String(e.target?.result));
				if (!Array.isArray(data)) throw new Error('Invalid JSON format');
				const existing = $entries;
				const ids = new Set(existing.map((x) => x.id));
				const merged = existing.concat(data.filter((x) => x && x.id && !ids.has(x.id)));
				saveEntries(merged);
				status('Import complete.');
			} catch (err) {
				status('Import failed: ' + (err as Error).message, true);
			}
		};
		reader.readAsText(file);
	}

	function download(content: string, filename: string, type: string) {
		const blob = new Blob([content], { type });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = filename;
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 250);
	}

	function status(msg: string, isError = false) {
		saveStatus = msg;
		setTimeout(() => {
			saveStatus = '';
		}, 4000);
	}

	function getMoodClass(compound: number): string {
		if (compound >= 0.05) return 'good';
		if (compound <= -0.05) return 'danger';
		return 'neutral';
	}

	function getMoodArrow(compound: number): string {
		if (compound >= 0.05) return '↑';
		if (compound <= -0.05) return '↓';
		return '·';
	}

	// Handle keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			saveEntry();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="grid">
	<section class="card">
		<div class="subtle">Prompt</div>
		<div class="prompt">{currentPrompt}</div>
		<div class="row">
			<input
				bind:value={customPrompt}
				type="text"
				placeholder="Edit this prompt for today (optional)"
			/>
		</div>
		<div class="row">
			<textarea
				id="entry"
				bind:value={entryText}
				placeholder="Type freely. Use #tags anywhere."
				on:input={(e) => autoExpand(e.currentTarget)}
			></textarea>
		</div>
		<div class="row">
			<button on:click={saveEntry}>Save Entry</button>
			<button class="secondary" on:click={clearEntry}>Clear</button>
			<button class="secondary" on:click={pickPrompt}>New Prompt</button>
			<div class="spacer"></div>
			<small id="saveStatus" role="status" aria-live="polite">{saveStatus}</small>
		</div>
	</section>

	<aside class="card">
		<div class="subtle">Filters</div>
		<div class="row">
			<input bind:value={searchQuery} type="text" placeholder="Search text or #tag" />
		</div>
		<div class="row">
			<input bind:value={fromDate} type="date" />
			<input bind:value={toDate} type="date" />
		</div>
		<div class="row">
			<button class="secondary" on:click={() => {}}>Apply</button>
			<button
				class="secondary"
				on:click={() => {
					searchQuery = '';
					fromDate = '';
					toDate = '';
				}}>Reset</button
			>
		</div>

		<hr style="border-color: #23232a; margin: 14px 0" />

		<div class="subtle">Data</div>
		<div class="row">
			<button class="secondary" on:click={exportJson}>Export JSON</button>
			<button class="secondary" on:click={exportCsv}>Export CSV</button>
		</div>
		<div class="row">
			<input type="file" on:change={importJson} accept=".json" />
			<button class="secondary">Import</button>
		</div>
	</aside>
</div>

<section class="card" style="margin-top: 16px">
	<div class="flex">
		<div>
			<div class="subtle">Entries</div>
			<small class="subtle">{filteredEntries.length} of {$entries.length} shown</small>
		</div>
		<div class="spacer"></div>
		<button
			class="secondary"
			on:click={() => {
				if (confirm('Delete ALL entries? This cannot be undone.')) {
					saveEntries([]);
					endEditing();
					status('All entries deleted.');
					window.dispatchEvent(new CustomEvent('updateStreak'));
				}
			}}
		>
			<span class="danger">Delete all</span>
		</button>
	</div>
	<div class="list">
		{#each filteredEntries.filter((entry) => entry && entry.id && entry.text) as entry}
			{@const compoundScore =
				entry.compound !== undefined
					? entry.compound
					: (entry.meta?.sent?.compound ?? getSentiment(entry.text).compound)}
			<div
				class="entry clickable-entry"
				on:click={() => openEntryModal(entry)}
				on:keydown={(e) => e.key === 'Enter' && openEntryModal(entry)}
				role="button"
				tabindex="0"
			>
				<h4>
					{entry.created ? new Date(entry.created).toLocaleString() : 'Unknown date'}
					<span class="{getMoodClass(compoundScore)} mono"
						>• {getMoodArrow(compoundScore)} mood</span
					>
					{#if entry.updated}
						&middot; <span class="mono subtle"
							>edited {entry.updated ? new Date(entry.updated).toLocaleString() : 'unknown'}</span
						>
					{/if}
				</h4>
				<div class="subtle">Prompt: {entry.prompt || '—'}</div>
				<p style="white-space: pre-wrap; margin: 10px 0 0 0">{entry.text}</p>
				<div class="tags">
					{#each entry.tags || [] as tag}
						<span class="tag">#{tag}</span>
					{/each}
				</div>
				<div class="flex" style="margin-top: 8px">
					<button class="secondary" on:click|stopPropagation={() => openEntryModalForEdit(entry)}
						>Edit</button
					>
					<button
						class="secondary destructive"
						on:click|stopPropagation={() => entry.id && deleteEntryById(entry.id)}>Delete</button
					>
					<div class="spacer"></div>
					<small class="subtle mono">id: {entry.id?.slice(0, 8) || 'unknown'}</small>
				</div>
			</div>
		{/each}
	</div>
</section>

<small class="subtle">
	<footer>
		<br />
		<div class="subtle">
			Sentiment analysis powered by <strong>sentiment.js</strong>. A lightweight JavaScript library
			for sentiment analysis in text.
		</div>
	</footer>
</small>

<!-- Entry Modal -->
<EntryModal
	bind:entry={selectedEntry}
	bind:isOpen={isModalOpen}
	editMode={modalEditMode}
	on:close={closeEntryModal}
/>
