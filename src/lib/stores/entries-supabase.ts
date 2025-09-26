import { writable, get } from 'svelte/store';
import { supabase, isSupabaseConfigured } from '$lib/supabase';
import { auth } from './auth';
import { getSentiment } from '$lib/utils/sentiment';
import { normalizeForStorage } from '$lib/utils/text-normalization';
import type { Entry } from './entries';
import type { Tables, TablesInsert, TablesUpdate } from '$lib/supabase';

// Convert Supabase entry to our Entry type
function supabaseToEntry(supabaseEntry: Tables<'entries'>): Entry {
  return {
    id: supabaseEntry.id,
    created: new Date(supabaseEntry.created_at).getTime(),
    updated: supabaseEntry.updated_at ? new Date(supabaseEntry.updated_at).getTime() : undefined,
    prompt: supabaseEntry.prompt || undefined,
    text: supabaseEntry.text,
    textNorm: supabaseEntry.text_norm || undefined,
    tags: supabaseEntry.tags || [],
    compound: supabaseEntry.compound || 0,
    meta: supabaseEntry.meta || undefined,
    analysis: supabaseEntry.analysis || undefined
  };
}

// Convert our Entry type to Supabase insert format
function entryToSupabaseInsert(entry: Omit<Entry, 'id' | 'created' | 'updated'>, userId: string): TablesInsert<'entries'> {
  return {
    user_id: userId,
    text: entry.text,
    text_norm: entry.textNorm || null,
    prompt: entry.prompt || null,
    tags: entry.tags || [],
    compound: entry.compound || 0,
    meta: entry.meta || null,
    analysis: entry.analysis || null
  };
}

// Convert our Entry type to Supabase update format
function entryToSupabaseUpdate(entry: Entry, userId: string): TablesUpdate<'entries'> {
  return {
    user_id: userId,
    text: entry.text,
    text_norm: entry.textNorm || null,
    prompt: entry.prompt || null,
    tags: entry.tags || [],
    compound: entry.compound || 0,
    meta: entry.meta || null,
    analysis: entry.analysis || null
  };
}

function createEntriesStore() {
  const { subscribe, set, update } = writable<Entry[]>([]);

  return {
    subscribe,
    set,
    load: async () => {
      console.log('🔄 [Entries] Starting to load entries from Supabase...');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ [Entries] Auth error:', authError);
        set([]);
        return;
      }
      
      if (!user) {
        console.log('⚠️ [Entries] No authenticated user, setting empty entries');
        set([]);
        return;
      }

      console.log('✅ [Entries] User authenticated:', { id: user.id, email: user.email });

      try {
        console.log('🔍 [Entries] Querying entries for user:', user.id);
        
        const { data, error } = await supabase
          .from('entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ [Entries] Database query error:', error);
          throw error;
        }

        console.log('📊 [Entries] Query result:', { 
          count: data?.length || 0, 
          data: data?.slice(0, 2) // Show first 2 entries for debugging
        });

        const entries = data ? data.map(supabaseToEntry) : [];
        console.log('✅ [Entries] Successfully loaded entries:', entries.length);
        console.log('🔍 [Entries] First entry details:', entries[0] ? {
          id: entries[0].id,
          text: entries[0].text?.substring(0, 50) + '...',
          created: entries[0].created,
          tags: entries[0].tags,
          hasAnalysis: !!entries[0].analysis
        } : 'No entries');
        set(entries);
      } catch (error) {
        console.error('❌ [Entries] Failed to load entries from Supabase:', error);
        set([]);
      }
    },
    add: async (entry: Omit<Entry, 'id' | 'created' | 'updated'>) => {
      // Check if Supabase is configured first
      if (!isSupabaseConfigured()) {
        console.warn('⚠️ [Entries] Supabase not configured, skipping add');
        // Return a mock entry for offline mode
        const mockEntry: Entry = {
          id: crypto.randomUUID(),
          created: Date.now(),
          text: entry.text,
          textNorm: entry.textNorm,
          prompt: entry.prompt,
          tags: entry.tags || [],
          compound: entry.compound || 0,
          meta: entry.meta,
          analysis: entry.analysis
        };
        update(entries => [mockEntry, ...entries]);
        return mockEntry;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ [Entries] User not authenticated, skipping add');
        // Return a mock entry for offline mode
        const mockEntry: Entry = {
          id: crypto.randomUUID(),
          created: Date.now(),
          text: entry.text,
          textNorm: entry.textNorm,
          prompt: entry.prompt,
          tags: entry.tags || [],
          compound: entry.compound || 0,
          meta: entry.meta,
          analysis: entry.analysis
        };
        update(entries => [mockEntry, ...entries]);
        return mockEntry;
      }

      try {
        const { data, error } = await supabase
          .from('entries')
          .insert(entryToSupabaseInsert(entry, user.id))
          .select()
          .single();

        if (error) throw error;

        const newEntry = supabaseToEntry(data);
        update(entries => [newEntry, ...entries]);
        return newEntry;
      } catch (error) {
        console.error('Failed to add entry to Supabase:', error);
        throw error;
      }
    },
    update: async (id: string, updatedEntry: Entry) => {
      // Check if Supabase is configured first
      if (!isSupabaseConfigured()) {
        console.warn('⚠️ [Entries] Supabase not configured, skipping update');
        return updatedEntry;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ [Entries] User not authenticated, skipping update');
        return updatedEntry;
      }

      try {
        const { data, error } = await supabase
          .from('entries')
          .update(entryToSupabaseUpdate(updatedEntry, user.id))
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;

        const updated = supabaseToEntry(data);
        update(entries => 
          entries.map(entry => entry.id === id ? updated : entry)
        );
        return updated;
      } catch (error) {
        console.error('Failed to update entry in Supabase:', error);
        throw error;
      }
    },
    delete: async (id: string) => {
      // Check if Supabase is configured first
      if (!isSupabaseConfigured()) {
        console.warn('⚠️ [Entries] Supabase not configured, removing from local store only');
        update(entries => entries.filter(entry => entry.id !== id));
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ [Entries] User not authenticated, removing from local store only');
        update(entries => entries.filter(entry => entry.id !== id));
        return;
      }

      try {
        const { error } = await supabase
          .from('entries')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        update(entries => entries.filter(entry => entry.id !== id));
      } catch (error) {
        console.error('Failed to delete entry from Supabase:', error);
        throw error;
      }
    },
    clear: async () => {
      // Check if Supabase is configured first
      if (!isSupabaseConfigured()) {
        console.warn('⚠️ [Entries] Supabase not configured, clearing local store only');
        set([]);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ [Entries] User not authenticated, clearing local store only');
        set([]);
        return;
      }

      try {
        const { error } = await supabase
          .from('entries')
          .delete()
          .eq('user_id', user.id);

        if (error) throw error;

        set([]);
      } catch (error) {
        console.error('Failed to clear entries from Supabase:', error);
        throw error;
      }
    },
    addSentimentToEntries: async () => {
      // Check if Supabase is configured first
      if (!isSupabaseConfigured()) {
        console.warn('⚠️ [Entries] Supabase not configured, skipping sentiment analysis');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ [Entries] User not authenticated, skipping sentiment analysis');
        return;
      }

      try {
        const { data: entries, error: fetchError } = await supabase
          .from('entries')
          .select('*')
          .eq('user_id', user.id)
          .is('meta', null);

        if (fetchError) throw fetchError;

        if (!entries || entries.length === 0) return;

        const updates = entries.map(entry => {
          const sentiment = getSentiment(entry.text);
          return {
            id: entry.id,
            compound: sentiment.compound,
            meta: {
              sent: {
                compound: sentiment.compound,
                pos: sentiment.pos,
                neu: sentiment.neu,
                neg: sentiment.neg,
                label: sentiment.label
              }
            }
          };
        });

        for (const update of updates) {
          const { error } = await supabase
            .from('entries')
            .update(update)
            .eq('id', update.id)
            .eq('user_id', user.id);

          if (error) throw error;
        }

        // Reload entries to get updated data
        await this.load();
      } catch (error) {
        console.error('Failed to add sentiment to entries:', error);
        throw error;
      }
    },
    setAnalysisForEntry: async (entryId: string, analysis: Entry['analysis']) => {
      // Check if Supabase is configured first
      if (!isSupabaseConfigured()) {
        console.warn('⚠️ [Entries] Supabase not configured, updating local store only');
        // Update local store
        update(entries => 
          entries.map(entry => 
            entry.id === entryId ? { ...entry, analysis } : entry
          )
        );
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ [Entries] User not authenticated, updating local store only');
        // Update local store
        update(entries => 
          entries.map(entry => 
            entry.id === entryId ? { ...entry, analysis } : entry
          )
        );
        return;
      }

      try {
        const { error } = await supabase
          .from('entries')
          .update({ analysis })
          .eq('id', entryId)
          .eq('user_id', user.id);

        if (error) throw error;

        // Update local store
        update(entries => 
          entries.map(entry => 
            entry.id === entryId ? { ...entry, analysis } : entry
          )
        );
      } catch (error) {
        console.error('Failed to set analysis for entry:', error);
        throw error;
      }
    },
    getAnalysisForEntry: async (entryId: string): Promise<Entry['analysis'] | undefined> => {
      // Check if Supabase is configured first
      if (!isSupabaseConfigured()) {
        console.warn('⚠️ [Entries] Supabase not configured, checking local store only');
        const entriesList = get(entriesSupabase);
        const entry = entriesList.find(e => e.id === entryId);
        return entry?.analysis;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ [Entries] User not authenticated, checking local store only');
        const entriesList = get(entriesSupabase);
        const entry = entriesList.find(e => e.id === entryId);
        return entry?.analysis;
      }

      try {
        const { data, error } = await supabase
          .from('entries')
          .select('analysis')
          .eq('id', entryId)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        return data?.analysis;
      } catch (error) {
        console.error('Failed to get analysis for entry:', error);
        return undefined;
      }
    },
    hasAnalysis: async (entryId: string): Promise<boolean> => {
      const analysis = await this.getAnalysisForEntry(entryId);
      return !!analysis;
    },
    isAnalysisStale: async (entryId: string, maxAgeHours: number = 24): Promise<boolean> => {
      const analysis = await this.getAnalysisForEntry(entryId);
      if (!analysis?.createdAt) return true;

      const ageHours = (Date.now() - analysis.createdAt) / (1000 * 60 * 60);
      return ageHours > maxAgeHours;
    }
  };
}

export const entriesSupabase = createEntriesStore();

// Export the store as 'entries' for compatibility
export const entries = entriesSupabase;

// Re-export the configuration check from supabase.ts
export { isSupabaseConfigured };

// Debug function to test database connection
export async function debugDatabaseConnection() {
  console.log('🔍 [Debug] Testing database connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('entries')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ [Debug] Database connection failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ [Debug] Database connection successful');
    
    // Test RLS policies
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select('id, text, created_at')
        .eq('user_id', user.id)
        .limit(5);
      
      if (entriesError) {
        console.error('❌ [Debug] RLS policy test failed:', entriesError);
        return { success: false, error: entriesError.message };
      }
      
      console.log('✅ [Debug] RLS policies working, found entries:', entries?.length || 0);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ [Debug] Database test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Convenience functions that match the original API
export function loadEntries() {
  return entriesSupabase.load();
}

export function saveEntries(entriesList: Entry[]) {
  // This function is for compatibility - in Supabase mode, entries are saved individually
  // We'll just update the local store for now
  entriesSupabase.set(entriesList);
}

export function addEntry(entry: Omit<Entry, 'id' | 'created' | 'updated'>) {
  // Normalize text for consistent character offset calculations
  const normalizedEntry = {
    ...entry,
    textNorm: normalizeForStorage(entry.text)
  };
  return entriesSupabase.add(normalizedEntry);
}

export function updateEntry(id: string, updatedEntry: Entry) {
  // Normalize text for consistent character offset calculations
  const normalizedEntry = {
    ...updatedEntry,
    textNorm: normalizeForStorage(updatedEntry.text)
  };
  return entriesSupabase.update(id, normalizedEntry);
}

export function deleteEntry(id: string) {
  return entriesSupabase.delete(id);
}

export function addSentimentToEntries() {
  return entriesSupabase.addSentimentToEntries();
}

export function setAnalysisForEntry(entryId: string, analysis: Entry['analysis']) {
  return entriesSupabase.setAnalysisForEntry(entryId, analysis);
}

export function getAnalysisForEntry(entryId: string) {
  return entriesSupabase.getAnalysisForEntry(entryId);
}

export function hasAnalysis(entryId: string) {
  return entriesSupabase.hasAnalysis(entryId);
}

export function isAnalysisStale(entryId: string, maxAgeHours: number = 24) {
  return entriesSupabase.isAnalysisStale(entryId, maxAgeHours);
}

export function getUnifiedEntry(entryId: string): Entry | undefined {
  const entriesList = get(entriesSupabase);
  return entriesList.find((entry) => entry.id === entryId);
}

export function getAllEntriesWithAnalysis(): Entry[] {
  return get(entriesSupabase);
}

// Subscribe to auth changes and reload entries when user changes
auth.subscribe(({ user, loading }) => {
  if (!loading) {
    if (user) {
      loadEntries();
    } else {
      entriesSupabase.update(() => []);
    }
  }
});
