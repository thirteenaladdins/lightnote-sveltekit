// Sentiment Analysis using the sentiment library
import Sentiment from 'sentiment';

const sentiment = new Sentiment();

export function getSentiment(text: string): { compound: number; pos: number; neu: number; neg: number; label: string } {
	const result = sentiment.analyze(text || "");
	const { score, comparative, positive, negative } = result;
	
	// Convert sentiment.js output to match VADER-like format
	// sentiment.js gives us: score (total), comparative (score/word count), positive/negative arrays
	const wordCount = result.words.length;
	const pos = positive.length / wordCount || 0;
	const neg = negative.length / wordCount || 0;
	const neu = 1 - pos - neg;
	
	// More aggressive scoring - use the raw comparative score with better scaling
	// sentiment.js comparative is already normalized per word, so we can use it more directly
	let compound = comparative;
	
	// Apply amplification for more opinionated results
	if (compound > 0) {
		compound = Math.min(1, compound * 2); // Amplify positive sentiment
	} else if (compound < 0) {
		compound = Math.max(-1, compound * 2); // Amplify negative sentiment
	}
	
	// More sensitive thresholds - closer to VADER behavior
	const label = compound >= 0.02 ? "positive" :  // Lowered from 0.05
		compound <= -0.02 ? "negative" : "neutral"; // Lowered from -0.05
	
	return { compound, pos, neu, neg, label };
}
