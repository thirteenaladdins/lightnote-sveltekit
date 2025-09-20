// text-segmentation.ts — Pre-segment text into spans for reliable LLM selection

export interface TextSpan {
  sid: number;           // sentence ID
  text: string;          // normalized text
  charStart: number;     // start position in original text
  charEnd: number;       // end position in original text
  tokenCount: number;    // number of tokens (approximate)
}

export interface TokenSpan {
  tid: number;           // token ID
  text: string;          // token text
  charStart: number;     // start position in original text
  charEnd: number;       // end position in original text
  sid: number;           // parent sentence ID
}

export interface SpanSelection {
  sid?: number;          // sentence ID
  sidRange?: [number, number]; // sentence range
  t0?: number;           // start token index within sentence
  t1?: number;           // end token index within sentence
  char0?: number;        // start char offset within sentence
  char1?: number;        // end char offset within sentence
  reason?: string;       // why this span was selected
}

/**
 * Normalize text for consistent processing while preserving original offsets
 */
function normalizeText(text: string): { normalized: string; offsetMap: number[] } {
  const offsetMap: number[] = [];
  let normalized = '';
  let origIndex = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const normalizedChar = char
      .normalize('NFKC')  // Canonical decomposition + composition
      .replace(/[\u2018\u2019]/g, "'")  // smart quotes
      .replace(/[\u201C\u201D]/g, '"')  // smart quotes
      .replace(/[\u2013\u2014]/g, '-')  // en/em dashes
      .replace(/\u2026/g, '...')        // ellipsis
      // DO NOT collapse whitespace - preserves character offsets
    
    // Map normalized position back to original
    for (let j = 0; j < normalizedChar.length; j++) {
      offsetMap.push(origIndex);
    }
    
    normalized += normalizedChar;
    origIndex++;
  }
  
  return { normalized, offsetMap };
}

/**
 * Segment text into sentences with stable IDs
 */
export function segmentIntoSentences(text: string): TextSpan[] {
  const SENTENCE_RE = /(?<=\S[.!?]["')\]]?)(?:\s+|\n+)(?=[A-Z"'\(\[]|\n|$)/g;
  const spans: TextSpan[] = [];
  let sid = 1;
  
  // Use regex to find sentence boundaries while preserving positions
  let lastIndex = 0;
  let match;
  
  // Find all sentence boundaries
  const boundaries: number[] = [0]; // Start of text
  
  while ((match = SENTENCE_RE.exec(text)) !== null) {
    boundaries.push(match.index + match[0].length);
  }
  
  boundaries.push(text.length); // End of text
  
  // Create spans from boundaries
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    const rawText = text.slice(start, end);
    const sentenceText = rawText.trim();
    
    if (sentenceText) {
      // Find the actual start/end positions of the trimmed text
      const trimmedStart = start + rawText.indexOf(sentenceText);
      const trimmedEnd = trimmedStart + sentenceText.length;
      
      spans.push({
        sid: sid++,
        text: sentenceText,
        charStart: trimmedStart,
        charEnd: trimmedEnd,
        tokenCount: estimateTokenCount(sentenceText)
      });
    }
  }
  
  return spans;
}

/**
 * Segment text into tokens for fine-grained selection
 */
export function segmentIntoTokens(text: string, maxTokensPerSentence: number = 64): TokenSpan[] {
  const sentences = segmentIntoSentences(text);
  const tokens: TokenSpan[] = [];
  
  for (const sentence of sentences) {
    let tokensInSentence = 0;
    const wordRegex = /\S+/g;
    let match: RegExpExecArray | null;
    while (
      (match = wordRegex.exec(sentence.text)) !== null &&
      tokensInSentence < maxTokensPerSentence
    ) {
      const wordText = match[0];
      const relStart = match.index; // index within trimmed sentence text
      const relEnd = relStart + wordText.length;

      tokens.push({
        tid: tokens.length,
        text: wordText,
        charStart: sentence.charStart + relStart,
        charEnd: sentence.charStart + relEnd,
        sid: sentence.sid
      });

      tokensInSentence++;
    }
  }
  
  return tokens;
}

/**
 * Estimate token count (words * 1.3 approximation)
 */
function estimateTokenCount(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  return Math.ceil(words * 1.3);
}

/**
 * Snap partial selections to clean word boundaries
 */
function snapToWord(text: string, start: number, end: number): [number, number] {
  const isWord = (c: string) => /\w|[''-]/.test(c);
  while (start > 0 && isWord(text[start - 1])) start--;
  while (end < text.length && isWord(text[end])) end++;
  return [start, end];
}

/**
 * Check if text ends like a complete sentence
 */
function endsLikeSentence(s: string): boolean {
  return /[.!?]["')\]]?\s*$/.test(s);
}

/**
 * Convert span selections back to character ranges in original text (simplified)
 * - For sid: returns the full sentence span
 * - For sidRange: returns the span from start sentence start to end sentence end
 * - Ignores partial token/char ranges to avoid truncation issues
 */
export function resolveSpanSelections(
  selections: SpanSelection[],
  sentences: TextSpan[],
  _tokens: TokenSpan[],
  originalText?: string
): { text: string; start: number; end: number; reason?: string }[] {
  const results: { text: string; start: number; end: number; reason?: string }[] = [];

  for (const selection of selections) {
    let start = -1;
    let end = -1;
    let text = '';

    if (selection.sid !== undefined) {
      const sentence = sentences.find((s) => s.sid === selection.sid);
      if (sentence) {
        start = sentence.charStart;
        end = sentence.charEnd;
        text = originalText ? originalText.slice(start, end) : sentence.text;
      }
    } else if (selection.sidRange) {
      const startSentence = sentences.find((s) => s.sid === selection.sidRange![0]);
      const endSentence = sentences.find((s) => s.sid === selection.sidRange![1]);
      if (startSentence && endSentence) {
        start = startSentence.charStart;
        end = endSentence.charEnd;
        text = originalText
          ? originalText.slice(start, end)
          : sentences
              .filter((s) => s.sid >= selection.sidRange![0] && s.sid <= selection.sidRange![1])
              .sort((a, b) => a.sid - b.sid)
              .map((s) => s.text)
              .join(' ');
      }
    }

    if (start !== -1 && end !== -1) {
      results.push({ text, start, end, reason: selection.reason });
    }
  }

  return results;
}

/**
 * Generate LLM prompt with span selection format (t1 is EXCLUSIVE)
 */
export function generateSpanSelectionPrompt(
  text: string,
  sentences: TextSpan[],
  tokens: TokenSpan[],
  maxSentences: number = 50
): string {
  const limited = sentences.slice(0, maxSentences);
  const sentenceData = limited.map(s => ({
    sid: s.sid,
    text: s.text,
    tokenCount: s.tokenCount
  }));

  return `Analyze the journal entry and select key quotes that capture the emotional arc and important insights.

SENTENCES:
${JSON.stringify(sentenceData, null, 2)}

Return JSON using this schema (t1 is EXCLUSIVE):
{
  "quotes": [
    // Prefer full sentences via "sid" or consecutive sentences via "sidRange".
    // Use token or char ranges ONLY when the idea is fully contained in one sentence.
    { "sid": 3, "reason": "process plan" },
    { "sidRange": [7, 9], "reason": "emotional moment" },
    { "sid": 12, "reason": "decision point" },
    // Optional partial within a single sentence (t1 exclusive):
    // { "sid": 5, "t0": 2, "t1": 7, "reason": "cause" }
    // Or character offsets within the sentence string:
    // { "sid": 5, "char0": 14, "char1": 42, "reason": "detail" }
  ],
  "emotions": [{ "label": "joy", "confidence": 0.80 }],
  "themes":   [{ "name": "work process", "confidence": 0.90 }],
  "entities": [{ "name": "John", "type": "person", "salience": 0.70, "sentiment": 0.20 }],
  "observation": {
    "text": "Interpretive but grounded statement; NO new concepts not present in the sentences.",
    "evidenceSids": [3, 7]   // cite the sids that justify the observation
  },
  "coverage": { "begin": true, "middle": false, "end": true },
  "buckets": {
    "feeling": true,          // (a) desire/feeling present?
    "rule": true,             // (b) rule/boundary (“should/shouldn’t”) present?
    "consequence": false,     // (c) consequence/fear present?
    "decision": false,        // (d) explicit decision present?
    "missing": ["consequence","decision"]
  },
  "uncertainties": []
}

Selection Rules:
- STRONGLY PREFER "sid" (full sentence) or "sidRange" (consecutive sentences).
- Use "t0"/"t1" (t1 is EXCLUSIVE) or "char0"/"char1" ONLY if the idea is fully contained within a single sentence
  AND bounded by punctuation (commas, dashes, semicolons). Snap to clean word boundaries.
- Select 3–6 quotes total. Aim to cover: feeling → reason → consequence; include a decision if present.
- If the entry is a brain dump, pick the most representative 3–6 sentences (strongest emotion or repeated idea).

Diversity Requirements:
Choose at least one quote for:
(a) desire/feeling
(b) rule/boundary ("should/shouldn't")
(c) consequence/fear
(d) decision (if present)
If any are missing, list them under buckets.missing.

Important:
- Select complete thoughts; avoid mid-word fragments.
- Do NOT invent new topics in "observation"; it must be supported by the cited evidenceSids.
- Keep each "reason" as a short label (≤ 3 words).`;
}
