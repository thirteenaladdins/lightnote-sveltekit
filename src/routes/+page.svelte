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
	import { getFeedbackForEntry } from '$lib/utils/feedback';
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

		try {
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
		} catch (error) {
			console.error('Error saving entry:', error);
			status('Failed to save entry. Please try again.', true);
		}
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

	function truncateText(
		text: string,
		maxLength: number = 200
	): { text: string; isTruncated: boolean; showReadMore: boolean } {
		if (text.length <= maxLength) return { text, isTruncated: false, showReadMore: false };

		// Find the last sentence ending before maxLength
		const truncated = text.substring(0, maxLength);
		const lastSentenceEnd = Math.max(
			truncated.lastIndexOf('.'),
			truncated.lastIndexOf('!'),
			truncated.lastIndexOf('?')
		);

		// If we found a sentence ending, truncate there
		if (lastSentenceEnd > maxLength * 0.5) {
			const truncatedText = text.substring(0, lastSentenceEnd + 1);
			return {
				text: truncatedText + ' <span class="ellipsis">...</span>',
				isTruncated: true,
				showReadMore: true
			};
		}

		// Otherwise, truncate at word boundary
		const lastSpace = truncated.lastIndexOf(' ');
		if (lastSpace > maxLength * 0.7) {
			return {
				text: text.substring(0, lastSpace) + ' <span class="ellipsis">...</span>',
				isTruncated: true,
				showReadMore: true
			};
		}

		// Fallback to character truncation
		return {
			text: truncated + ' <span class="ellipsis">...</span>',
			isTruncated: true,
			showReadMore: true
		};
	}

	// Handle keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			saveEntry();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

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

	<!-- Filters -->
	<div class="subtle" style="margin: 24px 0 16px 0;">Filters</div>
	<div class="inline-filters">
		<input
			bind:value={searchQuery}
			type="text"
			placeholder="Search text or #tag"
			class="search-input"
		/>
		<div class="date-row">
			<div
				class="date-section"
				role="button"
				tabindex="0"
				on:click={(e) => {
					// Only trigger if clicking on the container itself, not the inputs
					if (e.target === e.currentTarget) {
						const firstDateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
						if (firstDateInput) {
							firstDateInput.focus();
							firstDateInput.showPicker();
						}
					}
				}}
				on:keydown={(e) => {
					if (e.key === 'Enter') {
						const firstDateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
						if (firstDateInput) {
							firstDateInput.focus();
							firstDateInput.showPicker();
						}
					}
				}}
			>
				<input bind:value={fromDate} type="date" class="date-input" />
				<span class="date-separator">–</span>
				<input bind:value={toDate} type="date" class="date-input" />
			</div>
			<div class="filter-buttons">
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
		</div>
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
				<div class="subtle" style="margin-bottom: 8px">Prompt: {entry.prompt || '—'}</div>
				<p style="white-space: pre-wrap; margin: 0 0 8px 0; line-height: 1.5">
					{@html truncateText(entry.text).text}
				</p>
				{#if truncateText(entry.text).showReadMore}
					<div class="read-more">Read more</div>
				{/if}
				<div class="tags" style="margin: 8px 0">
					{#each entry.tags || [] as tag}
						<span class="tag">#{tag}</span>
					{/each}
				</div>
				<div
					class="flex"
					style="margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--border)"
				>
					<button class="secondary" on:click|stopPropagation={() => openEntryModalForEdit(entry)}
						>Edit</button
					>
					<button
						class="secondary destructive"
						on:click|stopPropagation={() => entry.id && deleteEntryById(entry.id)}>Delete</button
					>
					<div class="spacer"></div>
					{#if entry.id}
						{@const feedback = getFeedbackForEntry(entry.id)}
						{#if feedback.length > 0}
							{@const feedbackEntry = feedback[0]}
							{@const feedbackCount = Object.values(feedbackEntry.feedback).filter(
								(f) => f !== undefined
							).length}
							{#if feedbackCount > 0}
								<small class="feedback-indicator" title="{feedbackCount} feedback entries">
									📝 {feedbackCount}
								</small>
							{/if}
						{/if}
					{/if}
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

<style>
	.inline-filters {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 20px;
	}

	.search-input {
		width: 100%;
		max-width: 500px;
	}

	.date-row {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.date-section {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px;
		border-radius: 4px;
		cursor: pointer;
	}

	.date-input {
		width: 160px;
	}

	.date-separator {
		color: var(--muted);
		font-weight: bold;
		margin: 0 4px;
		pointer-events: none;
	}

	.filter-buttons {
		display: flex;
		gap: 8px;
	}

	.read-more {
		color: var(--muted);
		font-style: normal;
		font-weight: normal;
		font-size: 13px;
		margin-top: 4px;
		text-align: left;
	}

	.ellipsis {
		color: var(--muted) !important;
		font-size: inherit;
	}

	@media (max-width: 768px) {
		.inline-filters {
			width: 100%;
			box-sizing: border-box;
		}

		.search-input {
			width: 100%;
			max-width: none;
			box-sizing: border-box;
		}

		.date-row {
			justify-content: center;
			gap: 8px;
		}

		.date-section {
			justify-content: center;
			flex-wrap: wrap;
			gap: 6px;
		}

		.date-input {
			width: 130px;
			flex-shrink: 0;
		}

		.filter-buttons {
			justify-content: center;
		}
	}

	@media (max-width: 400px) {
		.date-row {
			flex-direction: column;
			align-items: center;
			gap: 12px;
		}

		.date-section {
			flex-direction: column;
			align-items: center;
			gap: 8px;
		}

		.date-input {
			width: 100%;
			max-width: 200px;
		}

		.date-separator {
			display: none;
		}

		.filter-buttons {
			width: 100%;
			justify-content: center;
		}
	}
</style>
