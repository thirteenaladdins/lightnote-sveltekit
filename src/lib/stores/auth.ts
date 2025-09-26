import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: true
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    setUser: (user: User | null) => update(state => ({ ...state, user })),
    setSession: (session: Session | null) => update(state => ({ ...state, session })),
    setLoading: (loading: boolean) => update(state => ({ ...state, loading })),
    signIn: async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    },
    signInWithProvider: async (provider: 'google' | 'github' | 'apple') => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    reset: () => set(initialState)
  };
}

export const auth = createAuthStore();

// Initialize auth state
export async function initAuth() {
  console.log('🔐 Initializing auth...');
  
  // Check if Supabase is configured
  const { isSupabaseConfigured } = await import('$lib/supabase');
  if (!isSupabaseConfigured()) {
    console.log('🔐 Supabase not configured, skipping auth initialization');
    auth.setLoading(false);
    return;
  }

  try {
    // Get initial session
    console.log('🔐 Getting session...');
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('🔐 Session error:', error);
      // Don't throw error, just log it and continue
      console.log('🔐 Continuing without session due to error');
    }

    console.log('🔐 Session loaded:', session ? 'authenticated' : 'not authenticated');
    auth.setSession(session);
    auth.setUser(session?.user ?? null);
    auth.setLoading(false);
    console.log('🔐 Auth initialized successfully');

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.email || 'no user');
      auth.setSession(session);
      auth.setUser(session?.user ?? null);
      auth.setLoading(false);
    });
  } catch (error) {
    console.error('🔐 Error initializing auth:', error);
    // Set loading to false even on error to prevent infinite loading
    auth.setLoading(false);
  }
}
