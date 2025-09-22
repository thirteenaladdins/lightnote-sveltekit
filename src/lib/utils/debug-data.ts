// debug-data.ts — Debug utilities to analyze data inconsistencies

import { getAllEntriesWithAnalysis } from '../stores/entries.js';

/**
 * Debug function to analyze data inconsistencies
 */
export function debugDataState() {
  console.log('🔍 [DEBUG] Analyzing data state...');
  
  const entries = getAllEntriesWithAnalysis();
  console.log(`📊 [DEBUG] Total entries: ${entries.length}`);
  
  entries.forEach((entry, index) => {
    console.log(`\n📝 [DEBUG] Entry ${index + 1}:`, {
      id: entry.id,
      text: entry.text.substring(0, 50) + '...',
      hasAnalysis: !!entry.analysis,
      analysisEntryId: entry.analysis?.entryId,
      analysisCreatedAt: entry.analysis?.createdAt,
      analysisSummary: entry.analysis?.summary?.substring(0, 50) + '...',
      idMatch: entry.analysis ? entry.id === entry.analysis.entryId : 'N/A'
    });
    
    // Check for ID mismatches
    if (entry.analysis && entry.id !== entry.analysis.entryId) {
      console.error('❌ [DEBUG] ID MISMATCH FOUND!', {
        entryId: entry.id,
        analysisEntryId: entry.analysis.entryId,
        entryText: entry.text.substring(0, 100),
        analysisSummary: entry.analysis.summary
      });
    }
  });
  
  // Check for duplicate analysis data
  const analysisEntries = entries.filter(e => e.analysis).map(e => e.analysis!.entryId);
  const uniqueAnalysisEntries = new Set(analysisEntries);
  
  if (analysisEntries.length !== uniqueAnalysisEntries.size) {
    console.warn('⚠️ [DEBUG] Duplicate analysis entries found!', {
      total: analysisEntries.length,
      unique: uniqueAnalysisEntries.size,
      duplicates: analysisEntries.length - uniqueAnalysisEntries.size
    });
  }
  
  console.log('✅ [DEBUG] Data analysis complete');
}

/**
 * Debug function to check specific entry
 */
export function debugSpecificEntry(entryId: string) {
  console.log(`🔍 [DEBUG] Analyzing entry: ${entryId}`);
  
  const entries = getAllEntriesWithAnalysis();
  const entry = entries.find(e => e.id === entryId);
  
  if (!entry) {
    console.log('❌ [DEBUG] Entry not found');
    return;
  }
  
  console.log('📝 [DEBUG] Entry details:', {
    id: entry.id,
    text: entry.text,
    created: new Date(entry.created).toISOString(),
    hasAnalysis: !!entry.analysis,
    analysis: entry.analysis ? {
      entryId: entry.analysis.entryId,
      summary: entry.analysis.summary,
      sentiment: entry.analysis.sentiment,
      themes: entry.analysis.themes,
      entities: entry.analysis.entities,
      createdAt: new Date(entry.analysis.createdAt).toISOString(),
      model: entry.analysis.model,
    } : null
  });
  
  if (entry.analysis) {
    const idMatch = entry.id === entry.analysis.entryId;
    console.log(`🔗 [DEBUG] ID Match: ${idMatch ? '✅' : '❌'}`, {
      entryId: entry.id,
      analysisEntryId: entry.analysis.entryId,
      match: idMatch
    });
  }
}

/**
 * Debug function to check localStorage data
 */
export function debugLocalStorage() {
  console.log('💾 [DEBUG] Checking localStorage...');
  
  if (typeof window === 'undefined') {
    console.log('❌ [DEBUG] Not in browser environment');
    return;
  }
  
  const stored = localStorage.getItem('lightnote.entries.v1');
  if (!stored) {
    console.log('❌ [DEBUG] No stored entries found');
    return;
  }
  
  try {
    const entries = JSON.parse(stored);
    console.log(`📊 [DEBUG] Stored entries: ${entries.length}`);
    
    entries.forEach((entry: any, index: number) => {
      console.log(`\n📝 [DEBUG] Stored Entry ${index + 1}:`, {
        id: entry.id,
        text: entry.text?.substring(0, 50) + '...',
        hasAnalysis: !!entry.analysis,
        analysisEntryId: entry.analysis?.entryId,
        idMatch: entry.analysis ? entry.id === entry.analysis.entryId : 'N/A'
      });
    });
  } catch (error) {
    console.error('❌ [DEBUG] Error parsing stored data:', error);
  }
}
