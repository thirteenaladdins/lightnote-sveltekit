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
      const redirectTo = resolveRedirectUrl();

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo
        }
      });
      if (error) throw error;
    },
    signInWithProvider: async (provider: 'google' | 'github' | 'apple') => {
      const redirectTo = resolveRedirectUrl();

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo
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

function resolveRedirectUrl() {
  if (typeof window === 'undefined') {
    throw new Error('Redirect URL requested outside of browser context');
  }

  // Use the current origin so magic links and OAuth callbacks land on the same site the user started from.
  const origin = window.location.origin.replace(/\/$/, '');
  
  // For mobile devices, ensure we use HTTPS if available
  // This helps with magic link compatibility on mobile browsers
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile && origin.startsWith('http://') && window.location.protocol === 'https:') {
    // If we're on HTTPS but the origin is HTTP, use HTTPS
    return `https://${window.location.host}/auth/callback`;
  }
  
  return `${origin}/auth/callback`;
}

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
