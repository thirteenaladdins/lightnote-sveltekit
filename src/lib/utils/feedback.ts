// feedback.ts — Local storage utilities for summary feedback

import { writable } from 'svelte/store';
import type { SummaryFeedback } from '$lib/types/entry';
import { nanoid } from 'nanoid';

const STORAGE_KEY = 'lightnote.feedback.v1';

// Reactive store for feedback data
export const feedbackStore = writable<SummaryFeedback[]>([]);

/**
 * Load feedback from localStorage
 */
export function loadFeedback(): SummaryFeedback[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const feedback = JSON.parse(stored) as SummaryFeedback[];
      feedbackStore.set(feedback);
      return feedback;
    }
  } catch (error) {
    console.error('Failed to load feedback from localStorage:', error);
  }
  return [];
}

/**
 * Save feedback to localStorage
 */
export function saveFeedback(feedback: SummaryFeedback[]): void {
  try {
    console.log('💾 [Feedback] saveFeedback called', { 
      feedbackCount: feedback.length,
      storageKey: STORAGE_KEY 
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
    feedbackStore.set(feedback);
    
    console.log('✅ [Feedback] Successfully saved to localStorage and store');
    
    // Verify it was saved
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log('🔍 [Feedback] Verification - saved data:', { 
        count: parsed.length,
        entries: parsed.map((f: any) => ({ 
          entryId: f.entryId, 
          feedback: f.feedback,
          updatedAt: f.updatedAt 
        }))
      });
    }
  } catch (error) {
    console.error('❌ [Feedback] Failed to save feedback to localStorage:', error);
  }
}

/**
 * Add or update feedback for an entry
 */
export function addOrUpdateFeedback(
  entryId: string,
  summaryType: 'narrativeSummary' | 'observation' | 'summary',
  feedback: 'wrong' | 'flat' | 'good',
  summaryText: string,
  originalText: string
): SummaryFeedback {
  console.log('🔄 [Feedback] addOrUpdateFeedback called', {
    entryId,
    summaryType,
    feedback,
    summaryTextLength: summaryText.length,
    originalTextLength: originalText.length
  });

  const currentFeedback = loadFeedback();
  const existingIndex = currentFeedback.findIndex(f => f.entryId === entryId);
  
  const now = Date.now();
  
  if (existingIndex !== -1) {
    // Update existing feedback
    console.log('📝 [Feedback] Updating existing feedback', { existingIndex });
    const existing = currentFeedback[existingIndex];
    existing.feedback[summaryType] = feedback;
    existing.summaryTexts[summaryType] = summaryText;
    existing.updatedAt = now;
    
    console.log('💾 [Feedback] Saving updated feedback', existing);
    saveFeedback(currentFeedback);
    return existing;
  } else {
    // Create new feedback
    console.log('✨ [Feedback] Creating new feedback');
    const newFeedback: SummaryFeedback = {
      id: nanoid(),
      entryId,
      feedback: {
        [summaryType]: feedback
      },
      summaryTexts: {
        [summaryType]: summaryText
      },
      originalText,
      createdAt: now,
      updatedAt: now
    };

    const updatedFeedback = [...currentFeedback, newFeedback];
    console.log('💾 [Feedback] Saving new feedback', newFeedback);
    saveFeedback(updatedFeedback);
    return newFeedback;
  }
}

/**
 * Update existing feedback
 */
export function updateFeedback(
  feedbackId: string,
  updates: Partial<Pick<SummaryFeedback, 'userComment'>>
): boolean {
  const currentFeedback = loadFeedback();
  const index = currentFeedback.findIndex(f => f.id === feedbackId);
  
  if (index === -1) {
    return false;
  }

  currentFeedback[index] = { 
    ...currentFeedback[index], 
    ...updates,
    updatedAt: Date.now()
  };
  saveFeedback(currentFeedback);
  return true;
}

/**
 * Delete feedback
 */
export function deleteFeedback(feedbackId: string): boolean {
  const currentFeedback = loadFeedback();
  const filtered = currentFeedback.filter(f => f.id !== feedbackId);
  
  if (filtered.length === currentFeedback.length) {
    return false; // No feedback was deleted
  }

  saveFeedback(filtered);
  return true;
}

/**
 * Get feedback for a specific entry
 */
export function getFeedbackForEntry(entryId: string): SummaryFeedback[] {
  const feedback = loadFeedback();
  return feedback.filter(f => f.entryId === entryId);
}

/**
 * Get feedback by type (wrong, flat, good) for a specific summary type
 */
export function getFeedbackByType(feedbackType: 'wrong' | 'flat' | 'good', summaryType?: 'narrativeSummary' | 'observation' | 'summary'): SummaryFeedback[] {
  const feedback = loadFeedback();
  return feedback.filter(f => {
    if (summaryType) {
      return f.feedback[summaryType] === feedbackType;
    }
    // Check if any summary type has this feedback
    return Object.values(f.feedback).includes(feedbackType);
  });
}

/**
 * Get feedback by summary type
 */
export function getFeedbackBySummaryType(summaryType: 'narrativeSummary' | 'observation' | 'summary'): SummaryFeedback[] {
  const feedback = loadFeedback();
  return feedback.filter(f => f.feedback[summaryType] !== undefined);
}

/**
 * Clear all feedback
 */
export function clearAllFeedback(): void {
  saveFeedback([]);
}

/**
 * Get feedback statistics
 */
export function getFeedbackStats(): {
  total: number;
  wrong: number;
  flat: number;
  good: number;
  bySummaryType: {
    narrativeSummary: number;
    observation: number;
    summary: number;
  };
} {
  const feedback = loadFeedback();
  
  let wrong = 0, flat = 0, good = 0;
  let narrativeSummary = 0, observation = 0, summary = 0;
  
  feedback.forEach(f => {
    Object.values(f.feedback).forEach(feedbackType => {
      if (feedbackType === 'wrong') wrong++;
      if (feedbackType === 'flat') flat++;
      if (feedbackType === 'good') good++;
    });
    
    if (f.feedback.narrativeSummary !== undefined) narrativeSummary++;
    if (f.feedback.observation !== undefined) observation++;
    if (f.feedback.summary !== undefined) summary++;
  });
  
  return {
    total: feedback.length,
    wrong,
    flat,
    good,
    bySummaryType: {
      narrativeSummary,
      observation,
      summary
    }
  };
}

// Initialize store on module load
loadFeedback();
