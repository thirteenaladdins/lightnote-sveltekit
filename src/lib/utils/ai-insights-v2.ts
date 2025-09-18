// ai-insights-v2.ts — Enhanced AI insights with evidence-first approach

import { llmAsk, parseJSONLoose } from './llm.js';
import type { EntryInsight, EvidenceExtraction, InsightComposition } from '../types/entry.js';
import type { Entry as StoreEntry } from '../stores/entries.js';
import { setAnalysisForEntry, hasAnalysis, isAnalysisStale } from '../stores/entries.js';

/**
 * Chunk text into manageable pieces for processing
 */
function chunkText(text: string, maxChunkSize: number = 1000): string[] {
	const paragraphs = text.split('\n\n');
	const chunks: string[] = [];
	let currentChunk = '';

	for (const paragraph of paragraphs) {
		if (currentChunk.length + paragraph.length <= maxChunkSize) {
			currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
		} else {
			if (currentChunk) {
				chunks.push(currentChunk);
			}
			currentChunk = paragraph;
		}
	}
	
	if (currentChunk) {
		chunks.push(currentChunk);
	}
	
	return chunks;
}

/**
 * Extract evidence from a single text chunk with focus on arc and contradiction
 */
async function extractEvidenceFromChunk(chunk: string, chunkIndex: number = 0): Promise<EvidenceExtraction> {
	console.log(`🔍 [AI-Insights-V2] Extracting evidence from chunk ${chunkIndex}`, {
		chunkLength: chunk.length,
		chunkPreview: chunk.substring(0, 100) + '...'
	});

	const prompt = `Return STRICT JSON only:
{
 "key_sentences":[{"text": "exact quote from text", "start": 123, "end": 245, "category": "temptation|past_experience|conflict|decision|consequence"}],
 "emotions":[{"label":"joy|sadness|anger|fear|disgust|surprise","confidence":0..1}],
 "themes":[{"name":"...", "confidence":0..1}],
 "entities":[{"name":"...", "type":"person|org|place|task|self|other","salience":0..1,"sentiment":-1..1}],
 "uncertainties":["short bullets of things you aren't sure about"]
}

Text: """${chunk}"""

Rules: 
- Extract 1-2 quotes that capture the emotional arc: temptation → past experience → conflict → decision → consequence
- Look for CONTRADICTIONS: "I shouldn't" vs "but I want to", "it's wrong" vs "I'm going anyway"
- Quote EXACTLY from the text - no changes, no paraphrasing
- Categorize each quote: temptation, past_experience, conflict, decision, consequence
- start/end are character positions (0-based) where the quote begins/ends in the text
- Focus on sentences that show internal conflict, decision-making, or emotional consequences
- Note: Character offsets are used for reference but will be validated and corrected if needed`;

	try {
		const response = await llmAsk({
			prompt,
			system: "You are a precise evidence extractor. Return only valid JSON. Quote exactly from the text.",
			temperature: 0.1,
		});

		const parsed = parseJSONLoose(response);
		if (!parsed || typeof parsed !== 'object') {
			throw new Error('Invalid JSON response from evidence extraction');
		}

		// Validate and normalize the response
		// Note: We no longer trust character offsets from the LLM since we use deterministic text search
		const validatedSentences = Array.isArray(parsed.key_sentences) 
			? parsed.key_sentences
				.filter((s: any) => s && typeof s.text === 'string' && typeof s.start === 'number' && typeof s.end === 'number')
				.map((s: any) => ({
					text: s.text,
					start: s.start, // These will be ignored in favor of deterministic search
					end: s.end,
					category: s.category && ['temptation', 'past_experience', 'conflict', 'decision', 'consequence'].includes(s.category) 
						? s.category as 'temptation' | 'past_experience' | 'conflict' | 'decision' | 'consequence'
						: undefined
				}))
			: [];

		return {
			key_sentences: validatedSentences,
			emotions: Array.isArray(parsed.emotions)
				? parsed.emotions
					.filter((e: any) => e && typeof e.label === 'string' && typeof e.confidence === 'number')
					.map((e: any) => ({
						label: e.label,
						confidence: Math.max(0, Math.min(1, e.confidence))
					}))
				: [],
			themes: Array.isArray(parsed.themes)
				? parsed.themes
					.filter((t: any) => t && typeof t.name === 'string' && typeof t.confidence === 'number')
					.map((t: any) => ({
						name: t.name,
						confidence: Math.max(0, Math.min(1, t.confidence))
					}))
				: [],
			entities: Array.isArray(parsed.entities)
				? parsed.entities
					.filter((e: any) => e && typeof e.name === 'string' && typeof e.type === 'string')
					.map((e: any) => ({
						name: e.name,
						type: e.type,
						salience: Math.max(0, Math.min(1, e.salience || 0.5)),
						sentiment: Math.max(-1, Math.min(1, e.sentiment || 0))
					}))
				: [],
			uncertainties: Array.isArray(parsed.uncertainties)
				? parsed.uncertainties.filter((u: any) => typeof u === 'string')
				: []
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
 "summary": "<=3 sentences, warm & first-person, UK English, no diagnoses.",
 "sentiment": {"score": -1..1},
 "rationales": ["brief reason referencing specific quote text"],
 "micro": {"nextAction":"<=10 words", "question":"<=12 words"}
}

CRITICAL RULES:
- If the text shows CONFLICTING desires (want vs. should not), capture that contradiction explicitly in the summary
- Use ONLY the provided quotes - do not introduce facts not present in the evidence
- If quotes show an emotional arc (temptation → conflict → decision), reflect that progression
- Look for internal contradictions: "I shouldn't" vs "but I want to", "it's wrong" vs "I'm going anyway"
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
			throw new Error('Invalid JSON response from composition');
		}

		return {
			summary: parsed.summary || "No summary available",
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

	console.log('🚀 [AI-Insights-V2] Starting evidence-first analysis');

	try {
		let evidence: EvidenceExtraction;
		let totalTokens = 0;

		// Determine if we need chunking
		const shouldChunk = entry.text.length > 2000;
		
		if (shouldChunk) {
			console.log('📄 [AI-Insights-V2] Using chunked approach for long entry');
			const chunks = chunkText(entry.text, 1000);
			console.log(`📄 [AI-Insights-V2] Split into ${chunks.length} chunks`);
			
			// Process chunks in parallel
			const chunkResults = await Promise.all(
				chunks.map((chunk, index) => extractEvidenceFromChunk(chunk, index))
			);
			
			// Merge evidence
			evidence = mergeEvidence(chunkResults, { maxQuotes: 8, maxEntities: 5, maxThemes: 5 });
		} else {
			console.log('📄 [AI-Insights-V2] Using single-chunk approach');
			evidence = await extractEvidenceFromChunk(entry.text);
		}

		// Compose final insights
		const composition = await composeInsights(evidence, (entry as any).userMood);

		// Create final insight object
		const insight: EntryInsight = {
			entryId: entry.id,
			summary: composition.summary,
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
