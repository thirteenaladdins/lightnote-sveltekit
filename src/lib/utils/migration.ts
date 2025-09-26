import { addEntry } from '$lib/stores/entries-supabase';
import { auth } from '$lib/stores/auth';
import { supabase } from '$lib/supabase';
import type { Entry } from '$lib/stores/entries';

const STORAGE_KEY = 'lightnote.entries.v1';

export async function migrateFromLocalStorage(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Check if user is authenticated
    const { get } = await import('svelte/store');
    const { auth } = await import('$lib/stores/auth');
    const authState = get(auth);
    
    if (!authState.user) {
      return { success: false, count: 0, error: 'User not authenticated' };
    }

    // Get entries from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { success: true, count: 0 }; // No entries to migrate
    }

    const entries: Entry[] = JSON.parse(stored);
    if (!Array.isArray(entries)) {
      return { success: false, count: 0, error: 'Invalid entries format' };
    }

    // Filter out invalid entries
    const validEntries = entries.filter((entry: any) => 
      entry && 
      typeof entry.id === 'string' && 
      typeof entry.text === 'string' &&
      typeof entry.created === 'number'
    );

    if (validEntries.length === 0) {
      return { success: true, count: 0 }; // No valid entries to migrate
    }

    // Migrate entries one by one
    let successCount = 0;
    for (const entry of validEntries) {
      try {
        // Convert to the format expected by Supabase store
        const { id, created, updated, ...entryData } = entry;
        
        // Add the entry with the original creation date
        const { data, error } = await supabase
          .from('entries')
          .insert({
            id: entry.id, // Preserve the original ID
            user_id: authState.user.id,
            created_at: new Date(entry.created).toISOString(), // Preserve original creation date
            updated_at: entry.updated ? new Date(entry.updated).toISOString() : null,
            text: entryData.text,
            text_norm: entryData.textNorm || null,
            prompt: entryData.prompt || null,
            tags: entryData.tags || [],
            compound: entryData.compound || 0,
            meta: entryData.meta || null,
            analysis: entryData.analysis || null
          })
          .select()
          .single();

        if (error) throw error;
        
        successCount++;
      } catch (error) {
        console.error('Failed to migrate entry:', entry.id, error);
        // Continue with other entries even if one fails
      }
    }

    // Clear localStorage after successful migration
    if (successCount > 0) {
      localStorage.removeItem(STORAGE_KEY);
    }

    return { success: true, count: successCount };
  } catch (error) {
    console.error('Migration failed:', error);
    return { 
      success: false, 
      count: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export function hasLocalStorageEntries(): boolean {
  if (typeof window === 'undefined') return false;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;
  
  try {
    const entries = JSON.parse(stored);
    return Array.isArray(entries) && entries.length > 0;
  } catch {
    return false;
  }
}

export function getLocalStorageEntryCount(): number {
  if (typeof window === 'undefined') return 0;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return 0;
  
  try {
    const entries = JSON.parse(stored);
    return Array.isArray(entries) ? entries.length : 0;
  } catch {
    return 0;
  }
}
