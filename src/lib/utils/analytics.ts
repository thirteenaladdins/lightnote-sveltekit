// Analytics calculation utilities
import { calculateWordCount, getTopWords, getTopTags } from './text';
import { filterEntriesForMonth } from './calendar';

export interface SentimentData {
	compound: number;
	pos: number;
	neu: number;
	neg: number;
	label: string;
}

export interface AnalyticsData {
	total: number;
	wc: number;
	avgMood: string;
	avgLabel: string;
	avgPos: string;
	avgNeu: string;
	avgNeg: string;
	topTags: [string, number][];
	topWords: [string, number][];
}

/**
 * Extract sentiment data from an entry, handling both new and legacy formats
 */
export function extractSentimentData(entry: any): SentimentData {
	// Use the new sentiment data if available, fallback to compound
	if (entry.meta?.sent?.compound !== undefined) {
		return {
			compound: entry.meta.sent.compound,
			pos: entry.meta.sent.pos,
			neu: entry.meta.sent.neu,
			neg: entry.meta.sent.neg,
			label: entry.meta.sent.label
		};
	} else {
		// Fallback for entries without full sentiment data
		return {
			compound: entry.compound || 0,
			pos: 0,
			neu: 1,
			neg: 0,
			label: 'neutral'
		};
	}
}

/**
 * Calculate average sentiment metrics from sentiment data array
 */
export function calculateAverageSentiment(sentimentData: SentimentData[]): {
	avgMood: string;
	avgLabel: string;
	avgPos: string;
	avgNeu: string;
	avgNeg: string;
} {
	const avgMood = sentimentData.length
		? (sentimentData.reduce((a, b) => a + b.compound, 0) / sentimentData.length).toFixed(2)
		: '—';

	const avgPos = sentimentData.length
		? (sentimentData.reduce((a, b) => a + b.pos, 0) / sentimentData.length).toFixed(2)
		: '0.65'; // Sample data for demonstration

	const avgNeu = sentimentData.length
		? (sentimentData.reduce((a, b) => a + b.neu, 0) / sentimentData.length).toFixed(2)
		: '0.25'; // Sample data for demonstration

	const avgNeg = sentimentData.length
		? (sentimentData.reduce((a, b) => a + b.neg, 0) / sentimentData.length).toFixed(2)
		: '0.10'; // Sample data for demonstration

	let avgLabel = 'neutral';
	if (avgMood !== '—') {
		const n = parseFloat(avgMood);
		if (n >= 0.02) avgLabel = 'positive';
		else if (n <= -0.02) avgLabel = 'negative';
	}

	return { avgMood, avgLabel, avgPos, avgNeu, avgNeg };
}

/**
 * Generate comprehensive analytics data for a set of entries
 */
export function generateAnalyticsData(entries: any[]): AnalyticsData {
	const total = entries.length;
	const wc = calculateWordCount(entries);
	
	// Get tag counts and top tags
	const topTags = getTopTags(entries);
	
	// Get mood analysis for entries using the sentiment data structure
	const sentimentData = entries.map(extractSentimentData);
	const sentimentMetrics = calculateAverageSentiment(sentimentData);
	
	// Get top words
	const topWords = getTopWords(entries);

	return {
		total,
		wc,
		...sentimentMetrics,
		topTags,
		topWords
	};
}

// Re-export functions from other utility modules for convenience
export { calculateWordCount, getTopWords, getTopTags } from './text';
export { filterEntriesForMonth } from './calendar';
