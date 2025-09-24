// quote-highlighting.ts — Simplified quote highlighting for span-based system

import type { EntryInsight } from '../types/entry.js';

export interface QuoteSpan {
  text: string;
  start: number;
  end: number;
  isQuote: boolean;
  quoteIndex?: number;
}

/**
 * Wrap quotes in text using pre-computed positions from span-based system
 * Much simpler since we have exact character positions
 */
export function wrapQuotesInText(
  text: string, 
  keySentences: { text: string; start: number; end: number }[]
): QuoteSpan[] {
  if (!keySentences || keySentences.length === 0) {
    return [{ text, start: 0, end: text.length, isQuote: false }];
  }

  // Sort keySentences by start position
  const sortedQuotes = [...keySentences].sort((a, b) => a.start - b.start);
  
  const spans: QuoteSpan[] = [];
  let lastEnd = 0;
  let quoteIndex = 0;

  for (const quote of sortedQuotes) {
    // Add plain text before this quote
    if (quote.start > lastEnd) {
      const plainText = text.substring(lastEnd, quote.start);
      if (plainText) {
        spans.push({ text: plainText, start: lastEnd, end: quote.start, isQuote: false });
      }
    }

    // Add the highlighted quote
    const quoteText = text.substring(quote.start, quote.end);
    if (quoteText) {
      spans.push({ 
        text: quoteText, 
        start: quote.start, 
        end: quote.end, 
        isQuote: true, 
        quoteIndex: quoteIndex++ 
      });
    }

    lastEnd = Math.max(lastEnd, quote.end);
  }

  // Add any remaining plain text
  if (lastEnd < text.length) {
    const remainingText = text.substring(lastEnd);
    if (remainingText) {
      spans.push({ text: remainingText, start: lastEnd, end: text.length, isQuote: false });
    }
  }

  return spans;
}

/**
 * Generate HTML for highlighted text using pre-computed positions
 * Much simpler since we have exact character positions from span-based system
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

  // Sort keySentences by start position
  const sortedQuotes = [...keySentences].sort((a, b) => a.start - b.start);
  
  // Create segments: plain text and highlighted quotes
  const segments: { text: string; isQuote: boolean; quoteIndex?: number }[] = [];
  let lastEnd = 0;
  let quoteIndex = 0;

  for (const quote of sortedQuotes) {
    // Add plain text before this quote
    if (quote.start > lastEnd) {
      const plainText = text.substring(lastEnd, quote.start);
      if (plainText) {
        segments.push({ text: plainText, isQuote: false });
      }
    }

    // Add the highlighted quote
    const quoteText = text.substring(quote.start, quote.end);
    if (quoteText) {
      segments.push({ 
        text: quoteText, 
        isQuote: true, 
        quoteIndex: quoteIndex++ 
      });
    }

    lastEnd = Math.max(lastEnd, quote.end);
  }

  // Add any remaining plain text
  if (lastEnd < text.length) {
    const remainingText = text.substring(lastEnd);
    if (remainingText) {
      segments.push({ text: remainingText, isQuote: false });
    }
  }

  // Generate HTML
  return segments.map(segment => {
    if (segment.isQuote) {
      return `<span class="quote-highlight" data-quote-number="${(segment.quoteIndex || 0) + 1}">${escapeHtml(segment.text)}</span>`;
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
  if (!container) return;
  
  const quoteHighlights = container.querySelectorAll('.quote-highlight');
  
  quoteHighlights.forEach(highlight => {
    const cleanup = (highlight as any).__cleanupTooltip;
    if (cleanup) {
      cleanup();
      delete (highlight as any).__cleanupTooltip;
    }
  });
}
