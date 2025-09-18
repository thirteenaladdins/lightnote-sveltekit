// Text processing utilities for analytics

// STOP words set for filtering common words
export const STOP_WORDS = new Set([
	'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
	"aren't", 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both',
	'but', 'by', 'can', 'cannot', 'could', "couldn't", 'did', "didn't", 'do', 'does', "doesn't",
	'doing', "don't", 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', "hadn't",
	'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", "he'll", "he's", 'her', 'here',
	"here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', "how's", 'i', 'id', 'ill', 'im',
	'ive', 'if', 'in', 'into', 'is', "isn't", 'it', "it's", 'its', 'itself', "let's", 'me', 'more',
	'most', "mustn't", 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
	'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', "she'd",
	"she'll", "she's", 'should', "shouldn't", 'so', 'some', 'such', 'than', 'that', "that's", 'the',
	'their', 'theirs', 'them', 'themselves', 'then', 'there', "there's", 'these', 'they', "they'd",
	"they'll", "they're", "they've", 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
	'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were', "weren't", 'what',
	"what's", 'when', "when's", 'where', "where's", 'which', 'while', 'who', "who's", 'whom', 'why',
	"why's", 'with', "won't", 'would', "wouldn't", 'you', "you'd", "you'll", "you're", "you've",
	'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Tokenize text by converting to lowercase, removing special characters, and splitting by whitespace
 */
export function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s#]/g, '')
		.split(/\s+/)
		.filter(Boolean);
}

/**
 * Get the most frequent words from entries, filtering out stop words and short words
 */
export function getTopWords(entries: any[], minWordLength: number = 3, maxResults: number = 25): [string, number][] {
	const freq = new Map();
	
	entries.forEach((entry) => {
		tokenize(entry.text).forEach((word) => {
			if (word.length >= minWordLength && !STOP_WORDS.has(word)) {
				freq.set(word, (freq.get(word) || 0) + 1);
			}
		});
	});
	
	return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxResults);
}

/**
 * Calculate word count from entries
 */
export function calculateWordCount(entries: any[]): number {
	const words = entries.flatMap((entry) => entry.text.trim().split(/\s+/)).filter(Boolean);
	return words.length;
}

/**
 * Get tag counts from entries
 */
export function getTagCounts(entries: any[]): Record<string, number> {
	const tagCounts: Record<string, number> = {};
	entries.forEach((entry) =>
		(entry.tags || []).forEach((tag: string) => (tagCounts[tag] = (tagCounts[tag] || 0) + 1))
	);
	return tagCounts;
}

/**
 * Get top tags sorted by frequency
 */
export function getTopTags(entries: any[], maxResults: number = 10): [string, number][] {
	const tagCounts = getTagCounts(entries);
	return Object.entries(tagCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, maxResults);
}
