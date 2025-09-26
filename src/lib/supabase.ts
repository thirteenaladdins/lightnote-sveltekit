import { createClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';

// Safely import environment variables with fallbacks
let PUBLIC_SUPABASE_URL: string;
let PUBLIC_SUPABASE_ANON_KEY: string;

try {
  const env = await import('$env/static/public');
  PUBLIC_SUPABASE_URL = env.PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  PUBLIC_SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
} catch (error) {
  // Fallback for build time when env vars might not be available
  PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
  PUBLIC_SUPABASE_ANON_KEY = 'placeholder-key';
}

// Check if environment variables are set
const isConfigured = PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY && 
  PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' && 
  PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-key';

if (!isConfigured && browser) {
  console.warn('⚠️ Supabase environment variables are not set!');
  console.warn('Please create a .env.local file with your Supabase credentials.');
  console.warn('See SUPABASE_SETUP.md for instructions.');
  console.warn('App will run in offline mode.');
}

// Create Supabase client with fallback values for development
export const supabase = createClient(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
);

// Export configuration status
export const isSupabaseConfigured = () => isConfigured;

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      entries: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          text_norm: string | null;
          prompt: string | null;
          tags: string[];
          compound: number;
          created_at: string;
          updated_at: string;
          meta: any | null;
          analysis: any | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          text: string;
          text_norm?: string | null;
          prompt?: string | null;
          tags?: string[];
          compound?: number;
          created_at?: string;
          updated_at?: string;
          meta?: any | null;
          analysis?: any | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          text?: string;
          text_norm?: string | null;
          prompt?: string | null;
          tags?: string[];
          compound?: number;
          created_at?: string;
          updated_at?: string;
          meta?: any | null;
          analysis?: any | null;
        };
      };
      settings: {
        Row: {
          id: string;
          user_id: string;
          key: string;
          value: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          key: string;
          value: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          key?: string;
          value?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
