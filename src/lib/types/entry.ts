// Raw entry
export type Entry = {
  id: string;            // nanoid
  createdAt: number;     // epoch ms
  updatedAt?: number;
  text: string;
  userMood?: -2|-1|0|1|2;     // optional face tap
};

// AI output attached to the entry (v2 - evidence-first approach)
export type EntryInsight = {
  entryId: string;
  summary: string;                               // warm, ≤3 sentences (legacy - kept for backward compatibility)
  narrativeSummary: string;                      // neutral recap of what actually happened
  observation: string;                           // interpretation/lesson/insight
  sentiment: { score: number };                  // -1..1
  themes: { name: string; confidence?: number }[];
  entities: { 
    name: string; 
    type?: string; 
    salience?: number; 
    sentiment?: number 
  }[];
  keySentences: { 
    text: string; 
    start: number; 
    end: number;
    category?: 'temptation' | 'past_experience' | 'conflict' | 'decision' | 'consequence';
  }[];                                           // evidence
  micro?: { 
    nextAction?: string; 
    question?: string 
  };
  uncertainties?: string[];                      // hedges the model adds
  model?: string; 
  tokens?: number; 
  createdAt: number; 
  updatedAt?: number;
};

// Evidence extraction result from first LLM call
export type EvidenceExtraction = {
  key_sentences: { 
    text: string; 
    start: number; 
    end: number; 
    category?: 'temptation' | 'past_experience' | 'conflict' | 'decision' | 'consequence' 
  }[];
  emotions: { label: string; confidence: number }[];
  themes: { name: string; confidence: number }[];
  entities: { 
    name: string; 
    type: string; 
    salience: number; 
    sentiment: number 
  }[];
  uncertainties: string[];
};

// Composition result from second LLM call
export type InsightComposition = {
  summary: string;                    // legacy - kept for backward compatibility
  narrativeSummary: string;           // neutral recap of what actually happened
  observation: string;                // interpretation/lesson/insight
  sentiment: { score: number };
  rationales: string[];
  micro: { nextAction: string; question: string };
};

// Weekly rollup for analytics
export type WeeklyRollup = {
  weekKey: string;        // YYYY-W## format
  entryCount: number;
  avgSentiment: number;
  topThemes: { name: string; count: number }[];
  topEntities: { name: string; count: number }[];
  moodDistribution: Record<string, number>; // mood value -> count
  createdAt: number;
  updatedAt?: number;
};

// Summary feedback for iteration and improvement
export type SummaryFeedback = {
  id: string;
  entryId: string;
  feedback: {
    narrativeSummary?: 'wrong' | 'flat' | 'good';
    observation?: 'wrong' | 'flat' | 'good';
    summary?: 'wrong' | 'flat' | 'good';
  };
  summaryTexts: {
    narrativeSummary?: string;
    observation?: string;
    summary?: string;
  };
  originalText: string; // The entry text that was summarized
  createdAt: number;
  updatedAt: number;
  userComment?: string;
};
