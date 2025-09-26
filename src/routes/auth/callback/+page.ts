import { supabase } from '$lib/supabase';
import { redirect } from '@sveltejs/kit';

export async function load({ url }) {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Error exchanging code for session:', error);
      return {
        error: 'Authentication failed. Please try again.'
      };
    }
  }

  // Redirect to the intended page or home
  throw redirect(302, next);
}
