// Unit tests for derivation helpers

import { describe, it, expect } from 'vitest';
import { flattenQuoteSids } from './derive.js';
import type { QuoteSelection } from './types.js';

describe('flattenQuoteSids', () => {
  it('should flatten mixed sid and sidRange quotes correctly', () => {
    const quotes: QuoteSelection[] = [
      { sid: 3, reason: 'test' },
      { sidRange: [7, 9], reason: 'test' },
      { sid: 12, reason: 'test' },
      { sidRange: [15, 17], reason: 'test' }
    ];

    const result = flattenQuoteSids({ quotes });
    
    expect(result).toEqual([3, 7, 8, 9, 12, 15, 16, 17]);
  });

  it('should handle empty quotes array', () => {
    const result = flattenQuoteSids({ quotes: [] });
    expect(result).toEqual([]);
  });

  it('should deduplicate overlapping sids', () => {
    const quotes: QuoteSelection[] = [
      { sid: 5, reason: 'test' },
      { sidRange: [5, 7], reason: 'test' },
      { sid: 6, reason: 'test' }
    ];

    const result = flattenQuoteSids({ quotes });
    
    expect(result).toEqual([5, 6, 7]);
  });

  it('should handle only sid quotes', () => {
    const quotes: QuoteSelection[] = [
      { sid: 1, reason: 'test' },
      { sid: 3, reason: 'test' },
      { sid: 2, reason: 'test' }
    ];

    const result = flattenQuoteSids({ quotes });
    
    expect(result).toEqual([1, 2, 3]);
  });

  it('should handle only sidRange quotes', () => {
    const quotes: QuoteSelection[] = [
      { sidRange: [10, 12], reason: 'test' },
      { sidRange: [1, 3], reason: 'test' }
    ];

    const result = flattenQuoteSids({ quotes });
    
    expect(result).toEqual([1, 2, 3, 10, 11, 12]);
  });
});
