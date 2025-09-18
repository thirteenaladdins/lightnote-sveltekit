import { describe, it, expect } from 'vitest';
import { getSentiment } from './lib/utils/sentiment';

describe('Sentiment Analysis', () => {
	it('should analyze positive sentiment correctly', () => {
		const input = 'I love this amazing wonderful fantastic product!';
		const result = getSentiment(input);
		
		// Check that we get the expected structure
		expect(result).toHaveProperty('compound');
		expect(result).toHaveProperty('pos');
		expect(result).toHaveProperty('neu');
		expect(result).toHaveProperty('neg');
		expect(result).toHaveProperty('label');
		
		// Check that it's positive with new thresholds
		expect(result.compound).toBeGreaterThan(0.02);
		expect(result.label).toBe('positive');
		expect(result.pos).toBeGreaterThan(result.neg);
	});

	it('should handle negative sentiment', () => {
		const input = 'This is terrible awful horrible and disgusting';
		const result = getSentiment(input);
		
		expect(result.compound).toBeLessThan(-0.02);
		expect(result.label).toBe('negative');
		expect(result.neg).toBeGreaterThan(result.pos);
	});

	it('should handle neutral sentiment', () => {
		const input = 'This is a neutral statement about nothing special';
		const result = getSentiment(input);
		
		expect(result.compound).toBeGreaterThanOrEqual(-0.02);
		expect(result.compound).toBeLessThanOrEqual(0.02);
		expect(result.label).toBe('neutral');
	});

	it('should handle empty string', () => {
		const result = getSentiment('');
		
		expect(result).toHaveProperty('compound');
		expect(result).toHaveProperty('pos');
		expect(result).toHaveProperty('neu');
		expect(result).toHaveProperty('neg');
		expect(result).toHaveProperty('label');
	});

	it('should handle mixed sentiment', () => {
		const input = 'I love this but hate that part';
		const result = getSentiment(input);
		
		expect(result).toHaveProperty('compound');
		expect(result).toHaveProperty('pos');
		expect(result).toHaveProperty('neu');
		expect(result).toHaveProperty('neg');
		expect(result).toHaveProperty('label');
	});

	it('should be more opinionated than before', () => {
		// Test that we get more decisive results
		const positiveInput = 'I love this!';
		const negativeInput = 'I hate this!';
		const neutralInput = 'This is okay.';
		
		const posResult = getSentiment(positiveInput);
		const negResult = getSentiment(negativeInput);
		const neuResult = getSentiment(neutralInput);
		
		// Should be more decisive
		expect(Math.abs(posResult.compound)).toBeGreaterThan(0.1);
		expect(Math.abs(negResult.compound)).toBeGreaterThan(0.1);
		expect(Math.abs(neuResult.compound)).toBeLessThan(0.1);
	});
});
