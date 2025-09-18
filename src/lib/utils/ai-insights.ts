// ai-insights.ts — AI-powered insights generation for journal entries (v2 - evidence-first approach)

import { llmAsk, parseJSONLoose } from './llm.js';
import type { EntryInsight } from '../types/entry.js';
import type { Entry as StoreEntry } from '../stores/entries.js';
import { setAnalysisForEntry, hasAnalysis, isAnalysisStale } from '../stores/entries.js';
import { generateEntryInsightsV2, getMoodClass, getMoodArrow } from './ai-insights-v2.js';

/**
 * Generate AI insights for a single journal entry using the new evidence-first approach
 * Checks for existing analysis and only generates if needed
 */
export async function generateEntryInsights(entry: StoreEntry, forceRefresh: boolean = false): Promise<EntryInsight> {
	console.log('🧠 [AI-Insights] generateEntryInsights called (v2)', {
		entryId: entry.id,
		forceRefresh,
		timestamp: new Date().toISOString()
	});

	// Use the new v2 implementation
	return await generateEntryInsightsV2(entry, forceRefresh);
}

/**
 * Generate insights for multiple entries (batch processing)
 */
export async function generateBatchInsights(entries: StoreEntry[]): Promise<Map<string, EntryInsight>> {
  const insights = new Map<string, EntryInsight>();
  
  // Process entries sequentially to avoid rate limiting
  for (const entry of entries) {
    try {
      const insight = await generateEntryInsights(entry);
      insights.set(entry.id, insight);
    } catch (error) {
      console.error(`Failed to generate insights for entry ${entry.id}:`, error);
    }
  }
  
  return insights;
}

// Re-export functions from v2
export { getMoodClass, getMoodArrow } from './ai-insights-v2.js';