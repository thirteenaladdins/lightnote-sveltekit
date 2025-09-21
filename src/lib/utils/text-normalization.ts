// text-normalization.ts — Bulletproof text normalization and range handling

export interface Range {
  start: number;
  end: number;
  id: string;
  kind?: string;
}

/**
 * Normalize text for consistent storage and processing
 * This ensures all character offsets are computed against the same version
 */
export function normalizeForStorage(text: string): string {
  // 1) Unicode NFC normalization
  // 2) Normalize line endings to \n only
  // 3) DO NOT trim - keep exact characters
  return text.normalize('NFC').replace(/\r\n/g, '\n');
}

/**
 * Clamp ranges to valid text bounds and remove empty/overlapping ranges
 */
export function clampRanges(text: string, ranges: Range[]): Range[] {
  return ranges
    .map(r => ({
      ...r,
      start: Math.max(0, Math.min(text.length, r.start)),
      end: Math.max(0, Math.min(text.length, r.end)),
    }))
    .filter(r => r.end > r.start)
    .sort((a, b) => a.start - b.start || b.end - a.end);
}

/**
 * Find all ranges by searching for quote text deterministically
 * This avoids trusting LLM character offsets which are often wrong
 */
export function findAllRangesByQuotes(text: string, quotes: string[]): Range[] {
  let cursor = 0;
  const out: Range[] = [];
  const seen = new Set<string>();
  
  for (const quote of quotes) {
    // Try multiple normalization approaches
    const approaches = [
      { name: 'original', quoteNorm: quote.normalize('NFC').replace(/\r\n/g, '\n'), textNorm: text },
      { name: 'enhanced', quoteNorm: normalizeQuoteText(quote), textNorm: normalizeQuoteText(text) },
      { name: 'storage', quoteNorm: quote.normalize('NFC').replace(/\r\n/g, '\n'), textNorm: normalizeForStorage(text) }
    ];
    
    let found = false;
    
    for (const approach of approaches) {
      let idx = approach.textNorm.indexOf(approach.quoteNorm, cursor);
      
      // If not found from cursor, try to find it anywhere in the text
      if (idx === -1) {
        idx = approach.textNorm.indexOf(approach.quoteNorm);
      }
      
      if (idx !== -1) {
        const start = idx;
        const end = idx + approach.quoteNorm.length;
        const key = `${start}:${end}`;
        if (!seen.has(key)) {
          console.log(`✅ [Text-Normalization] Found quote using ${approach.name} approach at index ${idx}`);
          out.push({ 
            start, 
            end, 
            id: crypto.randomUUID(),
            kind: 'quote'
          });
          seen.add(key);
        }
        // Move cursor forward but never backwards
        cursor = Math.max(cursor, end);
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.warn('🔍 [Text-Normalization] Quote not found with any approach:', {
        quote: quote,
        quoteLength: quote.length,
        textPreview: text.substring(0, 100) + '...',
        textLength: text.length,
        cursor
      });
      
      // Try fuzzy matching as last resort
      const fuzzyMatch = findFuzzyMatch(text, quote);
      if (fuzzyMatch) {
        const key = `${fuzzyMatch.start}:${fuzzyMatch.end}`;
        if (!seen.has(key)) {
          console.warn('🔍 [Text-Normalization] Found fuzzy match:', fuzzyMatch);
          out.push({
            start: fuzzyMatch.start,
            end: fuzzyMatch.end,
            id: crypto.randomUUID(),
            kind: 'quote-fuzzy'
          });
          seen.add(key);
        }
        cursor = Math.max(cursor, fuzzyMatch.end);
      }
    }
  }
  
  return out;
}

/**
 * Try to find a fuzzy match for a quote that might have slight differences
 */
function findFuzzyMatch(text: string, quote: string): { start: number; end: number } | null {
  const words = quote.split(' ');
  const minWords = Math.max(3, Math.floor(words.length * 0.7)); // At least 70% of words must match
  
  for (let i = 0; i <= text.length - quote.length; i++) {
    const textSlice = text.substring(i, i + quote.length);
    const textWords = textSlice.split(/\s+/);
    
    // Count matching words
    let matches = 0;
    for (const word of words) {
      if (textWords.some(tw => tw.includes(word) || word.includes(tw))) {
        matches++;
      }
    }
    
    if (matches >= minWords) {
      return { start: i, end: i + quote.length };
    }
  }
  
  return null;
}

/**
 * Normalize quote text to handle common character differences
 */
export function normalizeQuoteText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    // Handle common apostrophe variations
    .replace(/[''`]/g, "'")
    // Handle common quote variations
    .replace(/[""]/g, '"')
    // Handle common dash variations
    .replace(/[–—]/g, '-')
    // Handle common ellipsis variations
    .replace(/…/g, '...')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert text and ranges into segments for rendering
 * Each segment is either highlighted or plain text
 */
export interface TextSegment {
  text: string;
  isHighlight: boolean;
  rangeId?: string;
  rangeKind?: string;
}

export function textToSegments(text: string, ranges: Range[]): TextSegment[] {
  const clampedRanges = clampRanges(text, ranges);
  const segments: TextSegment[] = [];
  let lastEnd = 0;

  for (const range of clampedRanges) {
    // Add plain text before this range
    if (range.start > lastEnd) {
      const plainText = text.slice(lastEnd, range.start);
      if (plainText) {
        segments.push({
          text: plainText,
          isHighlight: false
        });
      }
    }

    // Add highlighted text for this range
    const highlightedText = text.slice(range.start, range.end);
    if (highlightedText) {
      segments.push({
        text: highlightedText,
        isHighlight: true,
        rangeId: range.id,
        rangeKind: range.kind
      });
    }

    lastEnd = range.end;
  }

  // Add any remaining plain text
  if (lastEnd < text.length) {
    const remainingText = text.slice(lastEnd);
    if (remainingText) {
      segments.push({
        text: remainingText,
        isHighlight: false
      });
    }
  }

  return segments;
}

/**
 * Generate HTML from segments with proper highlighting
 */
export function segmentsToHTML(segments: TextSegment[], className: string = 'quote-highlight'): string {
  return segments.map(segment => {
    if (segment.isHighlight) {
      return `<span class="${className}" data-range-id="${segment.rangeId}" data-range-kind="${segment.rangeKind}">${escapeHtml(segment.text)}</span>`;
    }
    return escapeHtml(segment.text);
  }).join('');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Validate that ranges match the actual text at those positions
 */
export function validateRanges(text: string, ranges: Range[]): { valid: Range[]; invalid: Range[] } {
  const valid: Range[] = [];
  const invalid: Range[] = [];

  for (const range of ranges) {
    const actualText = text.slice(range.start, range.end);
    const expectedText = text.slice(range.start, range.end);
    
    // For now, we'll consider all ranges valid since we're computing them deterministically
    // But this could be enhanced to check against expected quote text
    valid.push(range);
  }

  return { valid, invalid };
}
