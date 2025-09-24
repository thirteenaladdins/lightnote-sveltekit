<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { entries, loadEntries, saveEntries, deleteEntry } from '$lib/stores/entries';
	import { getSentiment } from '$lib/utils/sentiment';
	import { groupEntriesByDay } from '$lib/utils/entries-grouping';
	import EntryListItem from '$lib/components/EntryListItem.svelte';
	import { getFeedbackForEntry } from '$lib/utils/feedback';
	import type { Entry } from '$lib/stores/entries';
	import '$lib/utils/quick-debug.js';

	let searchQuery = '';
	let saveStatus = '';
	let scrollPosition = 0;
	let entriesContainer: HTMLElement;

	// Filtered entries based on search, sorted by most recent first
	$: filteredEntries = $entries
		.filter((entry) => {
			const query = searchQuery.toLowerCase();

			// Text/tag filtering
			if (!query) return true;
			if (entry.text.toLowerCase().includes(query)) return true;
			if (entry.tags?.some((tag) => tag.includes(query.replace('#', '')))) return true;
			return false;
		})
		.sort((a, b) => b.created - a.created);

	// Group filtered entries by day
	$: groupedEntries = groupEntriesByDay(filteredEntries);

	// Track if scroll has been restored to prevent multiple restorations
	let scrollRestored = false;

	onMount(() => {
		loadEntries();

		// Restore scroll position from sessionStorage on initial load
		if (browser) {
			const storedPosition = sessionStorage.getItem('entries-scroll-position');
			if (storedPosition) {
				scrollPosition = parseInt(storedPosition, 10);
				// Wait for the component to be fully rendered using multiple strategies
				const restoreScroll = () => {
					if (entriesContainer && scrollPosition > 0) {
						// Temporarily disable smooth scrolling
						const originalScrollBehavior = entriesContainer.style.scrollBehavior;
						entriesContainer.style.scrollBehavior = 'auto';

						entriesContainer.scrollTop = scrollPosition;

						// Restore smooth scrolling after a brief delay
						setTimeout(() => {
							if (entriesContainer) {
								entriesContainer.style.scrollBehavior = originalScrollBehavior;
							}
						}, 100);
					}
				};

				// Try multiple times to ensure DOM is ready
				requestAnimationFrame(() => {
					requestAnimationFrame(restoreScroll);
				});
			}
		}

		// Listen for storage errors
		const handleStorageError = (event: CustomEvent) => {
			const { operation, error, errorType } = event.detail;
			console.error('Storage error:', { operation, error, errorType });

			// Show user-friendly error message
			if (errorType === 'QuotaExceededError') {
				status(
					'Storage full! Your entry was too long to save. Try shortening it or clearing old entries.',
					true
				);
			} else {
				status(`Failed to save entry: ${error}`, true);
			}
		};

		window.addEventListener('storageError', handleStorageError as EventListener);

		// Cleanup listener on component destroy
		return () => {
			window.removeEventListener('storageError', handleStorageError as EventListener);
		};

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

		// Test function for span-based text segmentation
		(window as any).testSpanSegmentation = async (entryId: string) => {
			console.log('🧪 [TEST-SPANS] Testing span-based segmentation for entry:', entryId);
			const entry = $entries.find((e) => e.id === entryId);
			if (!entry) {
				console.log('❌ [TEST-SPANS] Entry not found');
				return;
			}

			try {
				const { segmentIntoSentences, segmentIntoTokens, generateSpanSelectionPrompt } =
					await import('$lib/utils/text-segmentation.js');

				console.log('📊 [TEST-SPANS] Segmenting text...');
				const sentences = segmentIntoSentences(entry.text);
				const tokens = segmentIntoTokens(entry.text);

				console.log(`📊 [TEST-SPANS] Found ${sentences.length} sentences, ${tokens.length} tokens`);

				// Show first few sentences
				console.log('📝 [TEST-SPANS] First 5 sentences:');
				sentences.slice(0, 5).forEach((s, i) => {
					console.log(`  ${s.sid}: "${s.text}" (${s.charStart}-${s.charEnd})`);
				});

				// Show first few tokens
				console.log('🔤 [TEST-SPANS] First 10 tokens:');
				tokens.slice(0, 10).forEach((t, i) => {
					console.log(`  ${t.tid}: "${t.text}" (${t.charStart}-${t.charEnd})`);
				});

				// Generate sample prompt
				const prompt = generateSpanSelectionPrompt(entry.text, sentences, tokens);
				console.log('📋 [TEST-SPANS] Sample prompt (first 500 chars):');
				console.log(prompt.substring(0, 500) + '...');
			} catch (error) {
				console.error('❌ [TEST-SPANS] Error:', error);
			}
		};

		// Test function to verify span-based quote highlighting
		(window as any).testSpanHighlighting = async (entryId: string) => {
			console.log(
				'🧪 [TEST-SPAN-HIGHLIGHTING] Testing span-based quote highlighting for entry:',
				entryId
			);
			const entry = $entries.find((e) => e.id === entryId);
			if (!entry) {
				console.log('❌ [TEST-SPAN-HIGHLIGHTING] Entry not found');
				return;
			}

			try {
				// Generate insights with span-based approach
				const { generateEntryInsightsV2 } = await import('$lib/utils/ai-insights-v2.js');
				console.log('🚀 [TEST-SPAN-HIGHLIGHTING] Generating insights with span-based approach...');
				const result = await generateEntryInsightsV2(entry, true);

				console.log('✅ [TEST-SPAN-HIGHLIGHTING] Insights generated:', {
					keySentences: result.keySentences.length,
					summary: result.summary.substring(0, 100) + '...'
				});

				// Test quote highlighting
				const { generateHighlightedHTML } = await import('$lib/utils/quote-highlighting.js');
				const highlighted = generateHighlightedHTML(entry.text, result.keySentences);

				console.log('🎨 [TEST-SPAN-HIGHLIGHTING] Highlighted HTML generated');
				console.log('📊 [TEST-SPAN-HIGHLIGHTING] Quote positions:');
				result.keySentences.forEach((quote, i) => {
					const actualText = entry.text.substring(quote.start, quote.end);
					const matches = actualText === quote.text;
					console.log(
						`  Quote ${i + 1}: ${matches ? '✅' : '❌'} "${quote.text.substring(0, 50)}..." (${quote.start}-${quote.end})`
					);
					if (!matches) {
						console.log(`    Expected: "${quote.text}"`);
						console.log(`    Actual:   "${actualText}"`);
					}
				});
			} catch (error) {
				console.error('❌ [TEST-SPAN-HIGHLIGHTING] Error:', error);
			}
		};

		// Test function to debug AI insights issues
		(window as any).debugAIInsights = async (entryId?: string) => {
			console.log('🔍 [DEBUG-AI-INSIGHTS] Starting debug session');

			// Find entry to test
			let entry;
			if (entryId) {
				entry = $entries.find((e) => e.id === entryId);
			} else {
				entry = $entries[$entries.length - 1]; // Use most recent entry
			}

			if (!entry) {
				console.log('❌ [DEBUG-AI-INSIGHTS] No entry found');
				return;
			}

			console.log('🔍 [DEBUG-AI-INSIGHTS] Testing entry:', {
				id: entry.id,
				text: entry.text.substring(0, 100) + '...',
				hasAnalysis: !!entry.analysis
			});

			try {
				// Test LLM configuration
				const { isLLMConfigured, getLLMConfig } = await import('$lib/utils/llm.js');
				console.log('🔍 [DEBUG-AI-INSIGHTS] LLM Config:', {
					isConfigured: isLLMConfigured(),
					config: isLLMConfigured() ? getLLMConfig() : null
				});

				// Test evidence extraction
				const { generateEntryInsightsV2 } = await import('$lib/utils/ai-insights-v2.js');
				console.log('🚀 [DEBUG-AI-INSIGHTS] Generating insights...');

				const result = await generateEntryInsightsV2(entry, true);

				console.log('✅ [DEBUG-AI-INSIGHTS] Results:', {
					summary: result.summary,
					narrativeSummary: result.narrativeSummary,
					observation: result.observation,
					sentiment: result.sentiment,
					keySentences: result.keySentences.length,
					themes: result.themes.length,
					entities: result.entities.length
				});

				// Test quote highlighting
				const { generateHighlightedHTML } = await import('$lib/utils/quote-highlighting.js');
				const highlighted = generateHighlightedHTML(entry.text, result.keySentences);
				console.log('🎨 [DEBUG-AI-INSIGHTS] Highlighting test:', {
					originalLength: entry.text.length,
					highlightedLength: highlighted.length,
					hasHighlights: highlighted.includes('quote-highlight')
				});
			} catch (error) {
				console.error('❌ [DEBUG-AI-INSIGHTS] Error:', error);
			}
		};

		// Simple test to debug character positions
		(window as any).debugCharPositions = () => {
			const text = "Know yourself. That's the most important thing. Know yourself.";
			console.log('🔍 [DEBUG-CHAR-POSITIONS] Test text:', JSON.stringify(text));
			console.log('🔍 [DEBUG-CHAR-POSITIONS] Text length:', text.length);

			// Find "Know yourself" positions manually
			const knowYourselfPos1 = text.indexOf('Know yourself');
			const knowYourselfPos2 = text.indexOf('Know yourself', knowYourselfPos1 + 1);

			console.log('🔍 [DEBUG-CHAR-POSITIONS] "Know yourself" positions:', {
				first: knowYourselfPos1,
				second: knowYourselfPos2,
				firstSlice: JSON.stringify(text.slice(knowYourselfPos1, knowYourselfPos1 + 13)),
				secondSlice: JSON.stringify(text.slice(knowYourselfPos2, knowYourselfPos2 + 13))
			});
		};

		// Test function to debug text segmentation
		(window as any).testTextSegmentation = async (entryId?: string) => {
			console.log('🔍 [TEST-TEXT-SEGMENTATION] Starting test');

			// Find entry to test
			let entry;
			if (entryId) {
				entry = $entries.find((e) => e.id === entryId);
			} else {
				entry = $entries[$entries.length - 1]; // Use most recent entry
			}

			if (!entry) {
				console.log('❌ [TEST-TEXT-SEGMENTATION] No entry found');
				return;
			}

			console.log('🔍 [TEST-TEXT-SEGMENTATION] Original text:');
			console.log(JSON.stringify(entry.text));

			try {
				const { segmentIntoSentences } = await import('$lib/utils/text-segmentation.js');
				const sentences = segmentIntoSentences(entry.text);

				console.log('🔍 [TEST-TEXT-SEGMENTATION] Segmented sentences:');
				sentences.forEach((sentence, i) => {
					console.log(`Sentence ${sentence.sid}:`, {
						text: JSON.stringify(sentence.text),
						charStart: sentence.charStart,
						charEnd: sentence.charEnd,
						originalSlice: JSON.stringify(entry.text.slice(sentence.charStart, sentence.charEnd))
					});
				});

				// Find the problematic sentence
				const knowYourselfSentences = sentences.filter(
					(s) =>
						s.text.toLowerCase().includes('know yourse') ||
						s.text.toLowerCase().includes('know yourself')
				);

				console.log(
					'🔍 [TEST-TEXT-SEGMENTATION] Sentences with "know yourself":',
					knowYourselfSentences
				);
			} catch (error) {
				console.error('❌ [TEST-TEXT-SEGMENTATION] Error:', error);
			}
		};

		// Test function to debug quote truncation issues
		(window as any).debugQuoteTruncation = async (entryId?: string) => {
			console.log('🔍 [DEBUG-QUOTE-TRUNCATION] Starting debug session');

			// Find entry to test
			let entry;
			if (entryId) {
				entry = $entries.find((e) => e.id === entryId);
			} else {
				entry = $entries[$entries.length - 1]; // Use most recent entry
			}

			if (!entry) {
				console.log('❌ [DEBUG-QUOTE-TRUNCATION] No entry found');
				return;
			}

			console.log('🔍 [DEBUG-QUOTE-TRUNCATION] Testing entry:', {
				id: entry.id,
				text: entry.text.substring(0, 200) + '...'
			});

			try {
				// Test text segmentation
				const { segmentIntoSentences, segmentIntoTokens } = await import(
					'$lib/utils/text-segmentation.js'
				);
				const sentences = segmentIntoSentences(entry.text);
				const tokens = segmentIntoTokens(entry.text);

				console.log('🔍 [DEBUG-QUOTE-TRUNCATION] Text segmentation:', {
					sentences: sentences.length,
					tokens: tokens.length,
					firstSentence: sentences[0]?.text,
					lastSentence: sentences[sentences.length - 1]?.text
				});

				// Look for sentences containing "Know yourself"
				const knowYourselfSentences = sentences.filter(
					(s) =>
						s.text.toLowerCase().includes('know yourself') ||
						s.text.toLowerCase().includes('know yourse')
				);

				console.log(
					'🔍 [DEBUG-QUOTE-TRUNCATION] Sentences with "know yourself":',
					knowYourselfSentences.map((s) => ({
						sid: s.sid,
						text: s.text,
						charStart: s.charStart,
						charEnd: s.charEnd
					}))
				);

				// Test span resolution with a mock selection
				if (knowYourselfSentences.length > 0) {
					const { resolveSpanSelections } = await import('$lib/utils/text-segmentation.js');
					const mockSelection = { sid: knowYourselfSentences[0].sid };
					const resolved = resolveSpanSelections([mockSelection], sentences, tokens, entry.text);

					console.log('🔍 [DEBUG-QUOTE-TRUNCATION] Mock resolution result:', resolved);
				}
			} catch (error) {
				console.error('❌ [DEBUG-QUOTE-TRUNCATION] Error:', error);
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

	onDestroy(() => {
		if (browser && entriesContainer && scrollListenerAdded) {
			entriesContainer.removeEventListener('scroll', saveScrollPosition);
			scrollListenerAdded = false;
		}
	});

	// Save scroll position on scroll
	function saveScrollPosition() {
		if (browser && entriesContainer) {
			scrollPosition = entriesContainer.scrollTop;
			try {
				if (scrollPosition > 0) {
					sessionStorage.setItem('entries-scroll-position', scrollPosition.toString());
				} else {
					// Clear stored position when at top
					sessionStorage.removeItem('entries-scroll-position');
				}
			} catch (error) {
				console.error('Failed to save scroll position:', error);
			}
		}
	}

	// Track if scroll listener has been added
	let scrollListenerAdded = false;

	// Add scroll event listener when container becomes available
	$: if (browser && entriesContainer && !scrollListenerAdded) {
		entriesContainer.addEventListener('scroll', saveScrollPosition);
		scrollListenerAdded = true;
	}

	// Function to restore scroll position
	function restoreScrollPosition() {
		if (browser && entriesContainer) {
			const storedPosition = sessionStorage.getItem('entries-scroll-position');
			if (storedPosition) {
				const position = parseInt(storedPosition, 10);
				if (position > 0) {
					// Temporarily disable smooth scrolling
					const originalScrollBehavior = entriesContainer.style.scrollBehavior;
					entriesContainer.style.scrollBehavior = 'auto';

					// Set scroll position immediately
					entriesContainer.scrollTop = position;

					// Restore smooth scrolling after a brief delay
					setTimeout(() => {
						if (entriesContainer) {
							entriesContainer.style.scrollBehavior = originalScrollBehavior;
						}
					}, 100);

					// Verify the scroll position was actually set
					if (Math.abs(entriesContainer.scrollTop - position) > 5) {
						// Try again after a short delay
						setTimeout(() => {
							if (entriesContainer) {
								entriesContainer.scrollTop = position;
							}
						}, 50);
					}
				}
			}
		}
	}

	// Restore scroll position when returning to the page (only if not already restored)
	$: if (browser && $page.url.pathname === '/' && entriesContainer && !scrollRestored) {
		// Restore immediately to prevent visible scrolling
		restoreScrollPosition();
		scrollRestored = true;
	}

	function deleteEntryById(entry: Entry) {
		if (confirm('Delete this entry?')) {
			deleteEntry(entry.id);
			status('Entry deleted.');

			// Update streak after deleting entry
			window.dispatchEvent(new CustomEvent('updateStreak'));
		}
	}

	function openEntryModal(entry: Entry) {
		// Save current scroll position before navigating
		saveScrollPosition();
		// Reset scroll restoration flag so it can be restored when coming back
		scrollRestored = false;
		// Navigate immediately
		goto(`/entry/${entry.id}`);
	}

	function status(msg: string, isError = false) {
		saveStatus = msg;
		setTimeout(() => {
			saveStatus = '';
		}, 4000);
	}
</script>

<svelte:head>
	<title>Home - Lightnote</title>
</svelte:head>

<div class="home-page">
	<div class="page-header">
		<h1>Entries</h1>
		<div class="header-actions">
			<a href="/entry/new" class="new-entry-button">
				<span class="button-icon">✍️</span>
				New Entry
			</a>
		</div>
	</div>

	<!-- Search -->
	<div class="search-section">
		<input
			bind:value={searchQuery}
			type="text"
			placeholder="Search text or #tag"
			class="search-input"
		/>
	</div>

	<!-- Entries List -->
	<div class="entries-list" bind:this={entriesContainer}>
		{#if groupedEntries.length === 0}
			<div class="empty-state">
				<p>No entries found.</p>
				{#if filteredEntries.length === 0 && $entries.length > 0}
					<p class="subtle">Try adjusting your search.</p>
				{:else if $entries.length === 0}
					<p class="subtle">Start by creating your first entry.</p>
				{/if}
			</div>
		{:else}
			{#each groupedEntries as group}
				<div class="day-group">
					<div class="day-header">
						<h2>{group.dateLabel}</h2>
						<span class="day-count"
							>{group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}</span
						>
					</div>
					<div class="day-entries">
						{#each group.items as entry}
							<EntryListItem {entry} onClick={openEntryModal} onDelete={deleteEntryById} />
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	{#if saveStatus}
		<div
			class="status-message"
			class:error={saveStatus.includes('Failed') || saveStatus.includes('Error')}
		>
			{saveStatus}
		</div>
	{/if}
</div>

<style>
	.home-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 32px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border);
		position: relative;
		z-index: 5;
	}

	.page-header h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 600;
	}

	.header-actions {
		display: flex;
		gap: 12px;
	}

	.new-entry-button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: var(--accent);
		color: white;
		padding: 8px 16px;
		border-radius: 6px;
		text-decoration: none;
		font-weight: 500;
		font-size: 0.9rem;
		transition: all 0.2s ease;
		border: none;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.new-entry-button:hover {
		background: var(--accent-dark);
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.button-icon {
		font-size: 1rem;
	}

	.search-section {
		margin-bottom: 24px;
	}

	.search-input {
		width: 100%;
		padding: 12px 16px;
		border: 1px solid var(--border);
		border-radius: 16px;
		background: var(--panel);
		color: var(--text);
		font-size: 16px;
		transition: border-color 0.2s ease;
		box-sizing: border-box;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 2px var(--accent-alpha);
	}

	.entries-list {
		display: flex;
		flex-direction: column;
		gap: 32px;
		max-height: calc(100vh - 200px);
		overflow-y: auto;
		scroll-behavior: smooth;
	}

	.day-group {
		margin-bottom: 32px;
	}

	.day-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border);
	}

	.day-count {
		color: var(--muted);
		font-size: 0.9rem;
	}

	.day-entries {
		display: flex;
		flex-direction: column;
	}

	.empty-state {
		text-align: center;
		padding: 60px 20px;
		color: var(--muted);
	}

	.empty-state p {
		margin: 8px 0;
	}

	.status-message {
		position: fixed;
		top: 20px;
		right: 20px;
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 12px 16px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 1000;
		font-size: 0.9rem;
	}

	.status-message.error {
		border-color: var(--danger);
		background: var(--danger-bg);
		color: var(--danger);
	}

	@media (max-width: 768px) {
		.home-page {
			padding: 16px;
		}

		.page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 16px;
			position: relative;
			z-index: 1;
		}

		.header-actions {
			width: 100%;
			justify-content: flex-end;
			position: relative;
			z-index: 2;
		}

		.new-entry-button {
			position: relative;
			z-index: 3;
			flex-shrink: 0;
		}

		.search-input {
			width: 100%;
			box-sizing: border-box;
		}

		.status-message {
			position: relative;
			top: auto;
			right: auto;
			margin: 16px 0;
		}
	}

	@media (max-width: 480px) {
		.page-header h1 {
			font-size: 1.5rem;
		}
	}
</style>
