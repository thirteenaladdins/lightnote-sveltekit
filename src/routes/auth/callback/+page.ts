import { supabase } from '$lib/supabase';
import { redirect } from '@sveltejs/kit';

export async function load({ url }) {
  // Handle both OAuth code exchange and magic link hash fragments
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  if (code) {
    // OAuth flow - exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Error exchanging code for session:', error);
      return {
        error: 'Authentication failed. Please try again.'
      };
    }
  }
  // For magic links, the session is established via hash fragment
  // The Supabase client will automatically handle this on the client side
  
  // Redirect to the intended page
  throw redirect(302, next);
}
