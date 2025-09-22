// data-unification.ts — Utilities for creating cohesive data structures

import { getUnifiedEntry, getAllEntriesWithAnalysis } from '../stores/entries.js';
import type { Entry } from '../stores/entries.js';

/**
 * Get a complete entry with all its data in one cohesive structure
 * This includes the raw entry data, sentiment analysis, and AI insights
 */
export function getCompleteEntry(entryId: string): CompleteEntry | null {
  const entry = getUnifiedEntry(entryId);
  if (!entry) return null;

  return {
    // Raw entry data
    id: entry.id,
    created: entry.created,
    updated: entry.updated,
    text: entry.text,
    prompt: entry.prompt,
    tags: entry.tags,
    
    // Basic sentiment (from text analysis)
    compound: entry.compound,
    sentiment: entry.meta?.sent || null,
    
    // AI analysis (if available)
    analysis: entry.analysis ? {
      summary: entry.analysis.summary,
      narrativeSummary: entry.analysis.narrativeSummary,
      observation: entry.analysis.observation,
      sentiment: entry.analysis.sentiment,
      themes: entry.analysis.themes,
      entities: entry.analysis.entities.map(entity => ({
        ...entity,
        type: entity.type && ['person', 'org', 'place', 'task', 'self', 'other'].includes(entity.type) 
          ? entity.type as "person"|"org"|"place"|"task"|"self"|"other"
          : 'other' as const
      })),
      model: entry.analysis.model,
      createdAt: entry.analysis.createdAt,
      updatedAt: entry.analysis.updatedAt,
    } : null,
    
    // Metadata
    hasAnalysis: !!entry.analysis,
    isAnalysisStale: entry.analysis ? 
      (Date.now() - entry.analysis.createdAt) / (1000 * 60 * 60) > 24 : 
      true,
  };
}

/**
 * Get all entries with their complete data structure
 */
export function getAllCompleteEntries(): CompleteEntry[] {
  const entries = getAllEntriesWithAnalysis();
  return entries.map(entry => getCompleteEntry(entry.id)).filter(Boolean) as CompleteEntry[];
}

/**
 * Complete entry type that unifies all data
 */
export type CompleteEntry = {
  // Raw entry data
  id: string;
  created: number;
  updated?: number;
  text: string;
  prompt?: string;
  tags: string[];
  
  // Basic sentiment (from text analysis)
  compound: number;
  sentiment: {
    compound: number;
    pos: number;
    neu: number;
    neg: number;
    label: string;
  } | null;
  
  // AI analysis (if available)
  analysis: {
    summary: string;
    narrativeSummary?: string;
    observation?: string;
    sentiment: { score: number };
    themes: { name: string; confidence?: number }[];
    entities: {
      name: string;
      type?: "person"|"org"|"place"|"task"|"self"|"other";
      salience?: number;
      sentiment?: number;
    }[];
    model?: string;
    tokens?: number;
    createdAt: number;
    updatedAt?: number;
  } | null;
  
  // Metadata
  hasAnalysis: boolean;
  isAnalysisStale: boolean;
};

/**
 * Example of how the unified data structure looks
 */
export function getDataStructureExample(): CompleteEntry {
  return {
    id: "6f634d44-1a62-4ae9-b329-acf3e47a118d",
    created: 1758142286013,
    updated: undefined,
    text: "checking if this works",
    prompt: "What's one thing I want to remember about today?",
    tags: [],
    
    // Basic sentiment (from text analysis)
    compound: 0,
    sentiment: {
      compound: 0,
      pos: 0,
      neu: 1,
      neg: 0,
      label: "neutral"
    },
    
    // AI analysis (if available)
    analysis: {
      summary: "The writer is testing functionality, showing a neutral sentiment with minimal emotional content.",
      sentiment: { score: 0.1 },
      themes: [
        { name: "Testing and validation", confidence: 0.9 }
      ],
      entities: [
        { name: "Self", type: "person" }
      ],
      model: "ai-insights-v1",
      createdAt: 1758142199047,
      updatedAt: undefined,
    },
    
    // Metadata
    hasAnalysis: true,
    isAnalysisStale: false,
  };
}
