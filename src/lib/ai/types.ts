// AI analysis types for two-pass journal analysis

export interface QuoteSelection {
  sid?: number;
  sidRange?: [number, number]; // inclusive
  t0?: number;
  t1?: number; // exclusive
  char0?: number;
  char1?: number;
  reason: string; // <= 3 words
  themeIds?: string[];   // optional links
  entityIds?: string[];  // optional links
}

export interface Emotion { 
  label: string; 
  confidence: number; 
}

export interface Theme { 
  id: string; 
  name: string; 
  confidence: number; 
}

export interface Entity { 
  id: string; 
  name: string; 
  type: string; 
  salience: number; 
  sentiment?: number; 
}

export type RelationType = 'contradiction' | 'uncertainty' | 'escalation' | 'pattern' | 'tension';

export interface Relation {
  type: RelationType;
  sidA: number;
  sidB?: number; // optional for single-sentence relations
  note: string;
  confidence: number;
}

export interface FirstPass {
  quotes: QuoteSelection[];
  emotions: Emotion[];
  themes: Theme[];
  entities: Entity[];
  relations: Relation[]; // flexible relations array
  observation: { text: string; evidenceSids: number[]; };
  coverage: { begin: boolean; middle: boolean; end: boolean; };
  buckets: {
    feeling: boolean; 
    rule: boolean; 
    consequence: boolean; 
    decision: boolean; 
    missing: string[];
  };
  // derived:
  quoteSidList: number[]; // flattened, de-duplicated, sorted
}

export interface SecondPassOutput {
  summary: string;
  narrativeSummary: string;
  observation: string;
  sentiment: { score: number; label: "negative"|"mixed"|"positive"; rationaleSid: number; };
  rationales: Array<{ sid: number; why: string }>;
  micro: { nextAction: string; question: string; };
  trace: { usedThemes: string[]; usedEntities: string[]; usedQuoteSids: number[]; };
  surfacedRelations: Relation[]; // relations chosen to surface in final output
}
