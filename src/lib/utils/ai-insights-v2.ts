// ai-insights-v2.ts — Enhanced AI insights with evidence-first approach

import { llmAsk, parseJSONLoose } from './llm.js';
import type { EntryInsight, EvidenceExtraction, InsightComposition } from '../types/entry.js';
import type { Entry as StoreEntry } from '../stores/entries.js';
import { setAnalysisForEntry, hasAnalysis, isAnalysisStale } from '../stores/entries.js';
import { segmentIntoSentences, segmentIntoTokens, resolveSpanSelections, generateSpanSelectionPrompt, type SpanSelection } from './text-segmentation.js';

/**
 * Chunk text into manageable pieces for processing
 */
function chunkText(
	text: string,
	maxChunkSize: number = 1000
): { text: string; startOffset: number }[] {
	const chunks: { text: string; startOffset: number }[] = [];
	let offset = 0;

	while (offset < text.length) {
		let end = Math.min(offset + maxChunkSize, text.length);

		if (end < text.length) {
			// Prefer to break on natural boundaries to preserve readability
			const boundary = Math.max(
				text.lastIndexOf('\n\n', end - 1),
				text.lastIndexOf('\n', end - 1),
				text.lastIndexOf(' ', end - 1)
			);

			if (boundary > offset + maxChunkSize * 0.5) {
				end = boundary;
			}
		}

		const chunk = text.slice(offset, end);
		if (!chunk.length) {
			break;
		}

		chunks.push({ text: chunk, startOffset: offset });
		offset = end;
	}

	return chunks;
}

/**
 * Extract evidence using span-based selection (more reliable than text matching)
 */
async function extractEvidenceWithSpans(
	text: string,
	chunkIndex: number = 0,
	baseOffset: number = 0
): Promise<EvidenceExtraction> {
	console.log(`🔍 [AI-Insights-V2] Extracting evidence with spans from chunk ${chunkIndex}`, {
		textLength: text.length,
		textPreview: text.substring(0, 100) + '...',
		baseOffset
	});

	// Pre-segment the text into sentences and tokens
	const sentences = segmentIntoSentences(text);
	const tokens = segmentIntoTokens(text);
	
	console.log(`📊 [AI-Insights-V2] Segmented into ${sentences.length} sentences, ${tokens.length} tokens`);

	const prompt = generateSpanSelectionPrompt(text, sentences, tokens);

	try {
		const response = await llmAsk({
			prompt,
			system: "You are a precise evidence extractor. Select key quotes using the provided sentence IDs and token indices. Return only valid JSON.",
			temperature: 0.1,
		});

		const parsed = parseJSONLoose(response);
		if (!parsed || typeof parsed !== 'object') {
			console.error('❌ [AI-Insights-V2] Invalid JSON response from evidence extraction:', response);
			throw new Error('Invalid JSON response from evidence extraction');
		}
		
		console.log('🔍 [AI-Insights-V2] Parsed LLM response:', {
			quotes: parsed.quotes?.length || 0,
			emotions: parsed.emotions?.length || 0,
			themes: parsed.themes?.length || 0,
			entities: parsed.entities?.length || 0
		});
		
		console.log('🔍 [AI-Insights-V2] Raw quotes from LLM:', parsed.quotes);

		// Extract span selections
		const spanSelections: SpanSelection[] = Array.isArray(parsed.quotes) 
			? parsed.quotes.filter((q: any) => q && (q.sid !== undefined || q.sidRange !== undefined))
			: [];
		
		console.log('🔍 [AI-Insights-V2] Span selections:', spanSelections);

	// Resolve selections to actual text spans with base offset
	const resolvedSpans = resolveSpanSelections(spanSelections, sentences, tokens, text, baseOffset);

	console.log(`✅ [AI-Insights-V2] Resolved ${resolvedSpans.length} quote spans`);
	console.log(
		'🔍 [AI-Insights-V2] Resolved spans:',
		resolvedSpans.map((s) => ({ text: s.text.substring(0, 50) + '...', start: s.start, end: s.end }))
	);

		// Convert to key_sentences format
		const keySentences = resolvedSpans.map((span, index) => ({
			text: span.text,
			start: span.start,
			end: span.end,
			category: determineQuoteCategory(span.text, span.reason) as 'temptation' | 'past_experience' | 'conflict' | 'decision' | 'consequence' | undefined
		}));

		// Extract other evidence (emotions, themes, entities, uncertainties)
		const emotions = Array.isArray(parsed.emotions)
			? parsed.emotions
				.filter((e: any) => e && typeof e.label === 'string' && typeof e.confidence === 'number')
				.map((e: any) => ({
					label: e.label,
					confidence: Math.max(0, Math.min(1, e.confidence))
				}))
			: [];

		const themes = Array.isArray(parsed.themes)
			? parsed.themes
				.filter((t: any) => t && typeof t.name === 'string' && typeof t.confidence === 'number')
				.flatMap((t: any) => {
					const themeNames = t.name.split('|').map((name: string) => name.trim()).filter((name: string) => name.length > 0);
					return themeNames.map((name: string) => ({
						name: name,
						confidence: Math.max(0, Math.min(1, t.confidence))
					}));
				})
			: [];

		const entities = Array.isArray(parsed.entities)
			? parsed.entities
				.filter((e: any) => e && typeof e.name === 'string' && typeof e.type === 'string')
				.map((e: any) => ({
					name: e.name,
					type: e.type,
					salience: Math.max(0, Math.min(1, e.salience || 0.5)),
					sentiment: Math.max(-1, Math.min(1, e.sentiment || 0))
				}))
			: [];

		const uncertainties = Array.isArray(parsed.uncertainties)
			? parsed.uncertainties.filter((u: any) => typeof u === 'string')
			: [];

		return {
			key_sentences: keySentences,
			emotions,
			themes,
			entities,
			uncertainties
		};
	} catch (error) {
		console.error(`❌ [AI-Insights-V2] Evidence extraction failed for chunk ${chunkIndex}:`, error);
		return {
			key_sentences: [],
			emotions: [],
			themes: [],
			entities: [],
			uncertainties: [`Failed to extract evidence from chunk ${chunkIndex}`]
		};
	}
}

/**
 * Determine quote category based on text content and reason
 */
function determineQuoteCategory(text: string, reason?: string): string | undefined {
	const lowerText = text.toLowerCase();
	const lowerReason = reason?.toLowerCase() || '';
	
	// Check for temptation indicators
	if (lowerText.includes('want') || lowerText.includes('desire') || lowerText.includes('tempted') || 
		lowerReason.includes('temptation')) {
		return 'temptation';
	}
	
	// Check for past experience indicators
	if (lowerText.includes('remember') || lowerText.includes('before') || lowerText.includes('used to') ||
		lowerReason.includes('past')) {
		return 'past_experience';
	}
	
	// Check for conflict indicators
	if (lowerText.includes('but') || lowerText.includes('however') || lowerText.includes('conflict') ||
		lowerText.includes('shouldn\'t') || lowerText.includes('can\'t') || lowerReason.includes('conflict')) {
		return 'conflict';
	}
	
	// Check for decision indicators
	if (lowerText.includes('decide') || lowerText.includes('choose') || lowerText.includes('going to') ||
		lowerReason.includes('decision')) {
		return 'decision';
	}
	
	// Check for consequence indicators
	if (lowerText.includes('result') || lowerText.includes('happened') || lowerText.includes('because') ||
		lowerReason.includes('consequence') || lowerReason.includes('outcome')) {
		return 'consequence';
	}
	
	return undefined;
}

/**
 * Merge evidence from multiple chunks, deduplicating and capping results
 */
function mergeEvidence(
	evidenceList: EvidenceExtraction[], 
	options: { maxQuotes: number; maxEntities: number; maxThemes: number } = { maxQuotes: 8, maxEntities: 5, maxThemes: 5 }
): EvidenceExtraction {
	console.log('🔄 [AI-Insights-V2] Merging evidence from chunks', {
		chunkCount: evidenceList.length,
		options
	});

	// Merge key sentences (dedupe by text)
	const allSentences = evidenceList.flatMap(e => e.key_sentences);
	const uniqueSentences = allSentences.filter((sentence, index, arr) => 
		arr.findIndex(s => s.text === sentence.text) === index
	).slice(0, options.maxQuotes);

	// Merge emotions (dedupe by label, keep highest confidence)
	const emotionMap = new Map<string, number>();
	evidenceList.forEach(e => {
		e.emotions.forEach(emotion => {
			const current = emotionMap.get(emotion.label) || 0;
			emotionMap.set(emotion.label, Math.max(current, emotion.confidence));
		});
	});
	const mergedEmotions = Array.from(emotionMap.entries()).map(([label, confidence]) => ({
		label,
		confidence
	}));

	// Merge themes (dedupe by name, keep highest confidence)
	const themeMap = new Map<string, number>();
	evidenceList.forEach(e => {
		e.themes.forEach(theme => {
			const current = themeMap.get(theme.name) || 0;
			themeMap.set(theme.name, Math.max(current, theme.confidence));
		});
	});
	const mergedThemes = Array.from(themeMap.entries())
		.map(([name, confidence]) => ({ name, confidence }))
		.sort((a, b) => b.confidence - a.confidence)
		.slice(0, options.maxThemes);

	// Merge entities (dedupe by name, keep highest salience)
	const entityMap = new Map<string, any>();
	evidenceList.forEach(e => {
		e.entities.forEach(entity => {
			const existing = entityMap.get(entity.name);
			if (!existing || entity.salience > existing.salience) {
				entityMap.set(entity.name, entity);
			}
		});
	});
	const mergedEntities = Array.from(entityMap.values())
		.sort((a, b) => b.salience - a.salience)
		.slice(0, options.maxEntities);

	// Merge uncertainties
	const allUncertainties = evidenceList.flatMap(e => e.uncertainties);
	const uniqueUncertainties = [...new Set(allUncertainties)];

	return {
		key_sentences: uniqueSentences,
		emotions: mergedEmotions,
		themes: mergedThemes,
		entities: mergedEntities,
		uncertainties: uniqueUncertainties
	};
}

/**
 * Compose insights from merged evidence
 */
async function composeInsights(
	evidence: EvidenceExtraction, 
	userMood?: number
): Promise<InsightComposition> {
	console.log('🎨 [AI-Insights-V2] Composing insights from evidence', {
		keySentences: evidence.key_sentences.length,
		themes: evidence.themes.length,
		entities: evidence.entities.length,
		userMood
	});

	const evidenceJson = JSON.stringify(evidence, null, 2);
	
	let agreementCheck = '';
	if (userMood !== undefined) {
		agreementCheck = `\n\nUser mood: ${userMood} (scale: -2 to +2)`;
	}

	const prompt = `Using ONLY these quotes and items:
${evidenceJson}

Write STRICT JSON:
{
 "summary": "<=3 sentences, warm & first-person, UK English, no diagnoses (legacy field).",
 "narrativeSummary": "Neutral recap of what actually happened - just the facts, no interpretation. 2-3 sentences describing the sequence of events.",
 "observation": "Interpretation/lesson/insight - what this might mean for the person. 2-3 sentences highlighting patterns, contradictions, or deeper meaning.",
 "sentiment": {"score": -1..1},
 "rationales": ["brief reason referencing specific quote text"],
 "micro": {"nextAction":"<=10 words", "question":"<=12 words"}
}

CRITICAL RULES:
- narrativeSummary: Just describe what happened chronologically, like "You chatted briefly with Dave from work, then reflected on your desire for adventure and change. You expressed uncertainty about your future and frustration about feeling stuck as time goes on."
- observation: Focus on interpretation and meaning, like "You're caught between wanting transformation and fearing stagnation. The longing for change is strong, but you haven't yet defined what that change could look like."
- Use ONLY the provided quotes - do not introduce facts not present in the evidence
- If quotes show an emotional arc (temptation → conflict → decision), reflect that progression in the narrativeSummary
- Look for internal contradictions in the observation: "I shouldn't" vs "but I want to", "it's wrong" vs "I'm going anyway"
- Write as a supportive coach speaking directly to me ('you/we'), concise, compassionate, UK English
- Avoid clinical labels and diagnoses
- If unsure, include a hedge ("I might be off because …")${agreementCheck}`;

	try {
		const response = await llmAsk({
			prompt,
			system: "You are a supportive personal coach who excels at identifying internal conflicts and contradictions. Write warm, evidence-based insights in UK English. Always cite specific quotes when making claims. Pay special attention to conflicting desires and emotional tensions.",
			temperature: 0.3,
		});

		const parsed = parseJSONLoose(response);
		if (!parsed || typeof parsed !== 'object') {
			console.error('❌ [AI-Insights-V2] Invalid JSON response from composition:', response);
			throw new Error('Invalid JSON response from composition');
		}
		
		console.log('🔍 [AI-Insights-V2] Parsed composition response:', {
			hasSummary: !!parsed.summary,
			hasNarrativeSummary: !!parsed.narrativeSummary,
			hasObservation: !!parsed.observation,
			hasSentiment: !!parsed.sentiment,
			rationalesCount: parsed.rationales?.length || 0
		});

		return {
			summary: parsed.summary || "No summary available",
			narrativeSummary: parsed.narrativeSummary || "No narrative summary available",
			observation: parsed.observation || "No observation available",
			sentiment: {
				score: typeof parsed.sentiment?.score === 'number' 
					? Math.max(-1, Math.min(1, parsed.sentiment.score))
					: 0
			},
			rationales: Array.isArray(parsed.rationales) 
				? parsed.rationales.filter((r: any) => typeof r === 'string')
				: [],
			micro: {
				nextAction: parsed.micro?.nextAction || "",
				question: parsed.micro?.question || ""
			}
		};
	} catch (error) {
		console.error('❌ [AI-Insights-V2] Composition failed:', error);
		return {
			summary: "I'm having trouble processing this entry right now.",
			narrativeSummary: "Unable to generate narrative summary at this time.",
			observation: "Unable to generate observation at this time.",
			sentiment: { score: 0 },
			rationales: ["Analysis temporarily unavailable"],
			micro: {
				nextAction: "Try again later",
				question: "What's on your mind?"
			}
		};
	}
}

/**
 * Generate enhanced AI insights for a single journal entry
 */
export async function generateEntryInsightsV2(entry: StoreEntry, forceRefresh: boolean = false): Promise<EntryInsight> {
	console.log('🧠 [AI-Insights-V2] generateEntryInsightsV2 called', {
		entryId: entry.id,
		forceRefresh,
		textLength: entry.text.length,
		timestamp: new Date().toISOString()
	});

	// Check if we already have fresh analysis
	const hasExistingAnalysis = hasAnalysis(entry.id);
	const isStale = isAnalysisStale(entry.id);
	const existingAnalysis = entry.analysis;

	if (!forceRefresh && hasExistingAnalysis && !isStale && existingAnalysis) {
		console.log('✅ [AI-Insights-V2] Returning cached analysis');
		return {
			entryId: entry.id,
			summary: existingAnalysis.summary,
			narrativeSummary: (existingAnalysis as any).narrativeSummary || existingAnalysis.summary, // fallback to summary for backward compatibility
			observation: (existingAnalysis as any).observation || "No observation available", // fallback for old entries
			sentiment: existingAnalysis.sentiment,
			themes: existingAnalysis.themes,
			entities: existingAnalysis.entities,
			keySentences: existingAnalysis.keySentences || [],
			micro: existingAnalysis.micro,
			uncertainties: existingAnalysis.uncertainties,
			model: existingAnalysis.model || 'cached',
			tokens: existingAnalysis.tokens || 0,
			createdAt: existingAnalysis.createdAt,
			updatedAt: existingAnalysis.updatedAt
		};
	}

	// Check if LLM is configured
	if (!llmAsk) {
		throw new Error('LLM not configured');
	}
	
	// Check LLM configuration
	const { isLLMConfigured } = await import('./llm.js');
	if (!isLLMConfigured()) {
		throw new Error('LLM endpoint not configured. Please check your LLM settings.');
	}

	console.log('🚀 [AI-Insights-V2] Starting evidence-first analysis');
	
	// Validate entry has content
	if (!entry.text || entry.text.trim().length === 0) {
		throw new Error('Entry has no content to analyze');
	}
	
	if (entry.text.trim().length < 10) {
		console.warn('⚠️ [AI-Insights-V2] Entry is very short, analysis may be limited');
	}

	try {
		let evidence: EvidenceExtraction;
		let totalTokens = 0;

		// Determine if we need chunking
		const shouldChunk = entry.text.length > 2000;
		
		if (shouldChunk) {
			console.log('📄 [AI-Insights-V2] Using chunked approach for long entry');
			const chunks = chunkText(entry.text, 1000);
			console.log(`📄 [AI-Insights-V2] Split into ${chunks.length} chunks`);
			
			// Process chunks in parallel using span-based extraction
			const chunkResults = await Promise.all(
				chunks.map(({ text, startOffset }, index) =>
					extractEvidenceWithSpans(text, index, startOffset)
				)
			);
			
			// Merge evidence
			evidence = mergeEvidence(chunkResults, { maxQuotes: 8, maxEntities: 5, maxThemes: 5 });
		} else {
			console.log('📄 [AI-Insights-V2] Using single-chunk approach with spans');
			evidence = await extractEvidenceWithSpans(entry.text, 0, 0);
		}

		// Compose final insights
		const composition = await composeInsights(evidence, (entry as any).userMood);

		// Create final insight object
		const insight: EntryInsight = {
			entryId: entry.id,
			summary: composition.summary,
			narrativeSummary: composition.narrativeSummary,
			observation: composition.observation,
			sentiment: composition.sentiment,
			themes: evidence.themes,
			entities: evidence.entities,
			keySentences: evidence.key_sentences,
			micro: composition.micro,
			uncertainties: evidence.uncertainties,
			model: 'ai-insights-v2',
			tokens: totalTokens,
			createdAt: Date.now()
		};

		console.log('✅ [AI-Insights-V2] Analysis completed', {
			summary: insight.summary.substring(0, 100) + '...',
			keySentences: insight.keySentences.length,
			themes: insight.themes.length,
			entities: insight.entities.length
		});

		// Save to store
		const analysisData = {
			entryId: entry.id,
			summary: insight.summary,
			narrativeSummary: insight.narrativeSummary,
			observation: insight.observation,
			sentiment: insight.sentiment,
			themes: insight.themes,
			entities: insight.entities,
			keySentences: insight.keySentences,
			micro: insight.micro,
			uncertainties: insight.uncertainties,
			model: insight.model,
			tokens: insight.tokens,
			createdAt: insight.createdAt
		};
		
		setAnalysisForEntry(entry.id, analysisData);
		console.log('💾 [AI-Insights-V2] Analysis saved to store');

		return insight;
	} catch (error) {
		console.error('❌ [AI-Insights-V2] Failed to generate insights:', error);
		throw error;
	}
}

/**
 * Get mood class for CSS styling based on sentiment score
 */
export function getMoodClass(score: number): string {
	if (score >= 0.1) return 'positive';
	if (score <= -0.1) return 'negative';
	return 'neutral';
}

/**
 * Get mood arrow for display based on sentiment score
 */
export function getMoodArrow(score: number): string {
	if (score >= 0.1) return '↑';
	if (score <= -0.1) return '↓';
	return '→';
}
