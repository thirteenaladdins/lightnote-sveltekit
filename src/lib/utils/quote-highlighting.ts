// quote-highlighting.ts — Bulletproof quote highlighting using text normalization

import type { EntryInsight } from '../types/entry.js';
import { 
  normalizeForStorage, 
  findAllRangesByQuotes, 
  textToSegments, 
  segmentsToHTML,
  type Range 
} from './text-normalization.js';

export interface QuoteSpan {
  text: string;
  start: number;
  end: number;
  isQuote: boolean;
  quoteIndex?: number;
}

/**
 * Bulletproof quote highlighting using deterministic text search
 * This avoids trusting LLM character offsets which are often wrong
 */
export function wrapQuotesInText(
  text: string, 
  keySentences: { text: string; start: number; end: number }[]
): QuoteSpan[] {
  if (!keySentences || keySentences.length === 0) {
    return [{ text, start: 0, end: text.length, isQuote: false }];
  }

  // Normalize the text for consistent processing
  const normalizedText = normalizeForStorage(text);
  
  // Extract just the quote texts and find their positions deterministically
  const quoteTexts = keySentences.map(s => s.text);
  const ranges = findAllRangesByQuotes(normalizedText, quoteTexts);
  
  // Convert to segments
  const segments = textToSegments(normalizedText, ranges);
  
  // Convert segments back to QuoteSpan format for backward compatibility
  const spans: QuoteSpan[] = [];
  let currentPos = 0;
  let quoteIndex = 0;

  for (const segment of segments) {
    const start = currentPos;
    const end = currentPos + segment.text.length;
    
    spans.push({
      text: segment.text,
      start,
      end,
      isQuote: segment.isHighlight,
      quoteIndex: segment.isHighlight ? quoteIndex++ : undefined
    });
    
    currentPos = end;
  }

  return spans;
}

/**
 * Generate HTML for highlighted text with hover popovers using bulletproof approach
 */
export function generateHighlightedHTML(
  text: string,
  keySentences: { text: string; start: number; end: number }[],
  insights?: EntryInsight,
  normalizedText?: string
): string {
  if (!keySentences || keySentences.length === 0) {
    return escapeHtml(text);
  }

  // Use provided normalized text or normalize the input text
  const textToUse = normalizedText || normalizeForStorage(text);
  
  // Extract just the quote texts and find their positions deterministically
  const quoteTexts = keySentences.map(s => s.text);
  const ranges = findAllRangesByQuotes(textToUse, quoteTexts);
  
  // Convert to segments
  const segments = textToSegments(textToUse, ranges);
  
  // Generate HTML with popover data
  return segments.map((segment, index) => {
    if (!segment.isHighlight) {
      return escapeHtml(segment.text);
    }
    
    // Find the corresponding quote for popover content
    const quoteIndex = quoteTexts.findIndex(q => q === segment.text);
    const quote = keySentences[quoteIndex];
    
    if (!quote) {
      console.warn('🔍 [Quote-Highlighting] Could not find quote for segment:', segment.text);
      return escapeHtml(segment.text);
    }
    
    // Simple quote number display
    return `<span class="quote-highlight" data-quote-number="${quoteIndex + 1}">${escapeHtml(segment.text)}</span>`;
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
 * Initialize hover popover functionality
 * Call this after rendering highlighted text to enable hover effects
 */
export function initializeQuotePopovers(container: HTMLElement): void {
  const quoteHighlights = container.querySelectorAll('.quote-highlight');
  
  quoteHighlights.forEach(highlight => {
    const quoteNumber = highlight.getAttribute('data-quote-number');
    if (!quoteNumber) return;
    
    let tooltip: HTMLElement | null = null;
    let hoverTimeout: number | null = null;
    
    const showTooltip = () => {
      if (tooltip) return;
      
      tooltip = document.createElement('div');
      tooltip.className = 'quote-number-tooltip';
      tooltip.textContent = `Quote ${quoteNumber}`;
      
      document.body.appendChild(tooltip);
      
      // Position the tooltip
      const rect = highlight.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      tooltip.style.position = 'absolute';
      tooltip.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2)}px`;
      tooltip.style.top = `${rect.top + window.scrollY - tooltipRect.height - 8}px`;
      tooltip.style.zIndex = '1000';
      
      // Adjust if tooltip would go off screen
      if (rect.left + (rect.width / 2) - (tooltipRect.width / 2) < 0) {
        tooltip.style.left = `${rect.left + window.scrollX}px`;
      }
      if (rect.left + (rect.width / 2) + (tooltipRect.width / 2) > window.innerWidth) {
        tooltip.style.left = `${rect.right + window.scrollX - tooltipRect.width}px`;
      }
      if (rect.top - tooltipRect.height - 8 < 0) {
        tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
      }
    };
    
    const hideTooltip = () => {
      if (tooltip) {
        document.body.removeChild(tooltip);
        tooltip = null;
      }
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
    };
    
    highlight.addEventListener('mouseenter', () => {
      hoverTimeout = window.setTimeout(showTooltip, 200); // 200ms delay
    });
    
    highlight.addEventListener('mouseleave', () => {
      hideTooltip();
    });
    
    // Clean up on scroll or window resize
    const cleanup = () => hideTooltip();
    window.addEventListener('scroll', cleanup, true);
    window.addEventListener('resize', cleanup);
    
    // Store cleanup function for later use
    (highlight as any).__cleanupTooltip = cleanup;
  });
}

/**
 * Clean up all popover event listeners
 * Call this when removing highlighted text from DOM
 */
export function cleanupQuotePopovers(container: HTMLElement): void {
  const quoteHighlights = container.querySelectorAll('.quote-highlight');
  
  quoteHighlights.forEach(highlight => {
    const cleanup = (highlight as any).__cleanupTooltip;
    if (cleanup) {
      cleanup();
      delete (highlight as any).__cleanupTooltip;
    }
  });
}
