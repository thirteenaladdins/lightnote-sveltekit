// Derivation helpers for AI analysis

import type { FirstPass, QuoteSelection } from "./types.js";

export function flattenQuoteSids(first: { quotes: QuoteSelection[] }): number[] {
  const s = new Set<number>();
  for (const q of first.quotes || []) {
    if (typeof q.sid === 'number') s.add(q.sid);
    if (q.sidRange) {
      const [a,b] = q.sidRange;
      for (let i=a; i<=b; i++) s.add(i);
    }
  }
  return Array.from(s).sort((a,b)=>a-b);
}

export function normaliseFirstPass(fp: FirstPass): FirstPass {
  const quoteSidList = flattenQuoteSids(fp);
  return { ...fp, quoteSidList };
}
