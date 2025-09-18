// entry-usage-example.ts — Example of how to use the unified data structure

import { getCompleteEntry, getAllCompleteEntries } from './data-unification.js';
import { addEntry } from '../stores/entries.js';

/**
 * Example: How to work with entries after they're saved
 */
export function demonstrateEntryUsage() {
  // 1. When you save an entry, it creates the basic structure
  // (This happens automatically in your saveEntry() function)
  
  // 2. To get a complete entry with all data unified:
  const entryId = "your-entry-id-here";
  const completeEntry = getCompleteEntry(entryId);
  
  if (completeEntry) {
    console.log("=== Complete Entry Data ===");
    console.log("ID:", completeEntry.id);
    console.log("Text:", completeEntry.text);
    console.log("Created:", new Date(completeEntry.created).toLocaleString());
    
    // Basic sentiment (always available)
    console.log("Basic Sentiment:", completeEntry.sentiment?.label);
    console.log("Sentiment Score:", completeEntry.compound);
    
    // AI Analysis (only if available)
    if (completeEntry.analysis) {
      console.log("AI Summary:", completeEntry.analysis.summary);
      console.log("AI Sentiment:", completeEntry.analysis.sentiment.score);
      console.log("Themes:", completeEntry.analysis.themes.map(t => t.name));
      console.log("Entities:", completeEntry.analysis.entities.map(e => e.name));
    } else {
      console.log("No AI analysis yet");
    }
    
    // Metadata
    console.log("Has Analysis:", completeEntry.hasAnalysis);
    console.log("Is Analysis Stale:", completeEntry.isAnalysisStale);
  }
  
  // 3. To get all entries with unified data:
  const allEntries = getAllCompleteEntries();
  console.log(`\n=== All Entries (${allEntries.length}) ===`);
  
  allEntries.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.text.substring(0, 50)}...`);
    console.log(`   Sentiment: ${entry.sentiment?.label} (${entry.compound})`);
    console.log(`   AI Analysis: ${entry.hasAnalysis ? 'Yes' : 'No'}`);
    if (entry.analysis) {
      console.log(`   AI Summary: ${entry.analysis.summary}`);
    }
    console.log('');
  });
}

/**
 * Example: How to check if an entry needs AI analysis
 */
export function checkEntryAnalysisStatus(entryId: string) {
  const entry = getCompleteEntry(entryId);
  if (!entry) {
    console.log("Entry not found");
    return;
  }
  
  if (!entry.hasAnalysis) {
    console.log("Entry needs AI analysis - no analysis exists yet");
  } else if (entry.isAnalysisStale) {
    console.log("Entry has stale analysis - should be refreshed");
  } else {
    console.log("Entry has fresh analysis - no refresh needed");
  }
}

/**
 * Example: How to work with entries in your components
 */
export function getEntryForDisplay(entryId: string) {
  const entry = getCompleteEntry(entryId);
  if (!entry) return null;
  
  return {
    // Display data
    id: entry.id,
    text: entry.text,
    date: new Date(entry.created).toLocaleDateString(),
    sentiment: entry.sentiment?.label || 'unknown',
    sentimentScore: entry.compound,
    
    // AI insights (if available)
    summary: entry.analysis?.summary || null,
    themes: entry.analysis?.themes || [],
    entities: entry.analysis?.entities || [],
    
    // Status flags
    needsAnalysis: !entry.hasAnalysis,
    needsRefresh: entry.isAnalysisStale,
  };
}
