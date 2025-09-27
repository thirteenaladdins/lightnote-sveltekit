import { supabase } from '$lib/supabase';

// Disable prerendering for this route since it handles dynamic auth flows
export const prerender = false;

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
        error: 'Authentication failed. Please try again.',
        next
      };
    }
  }
  // For magic links, the session is established via hash fragment
  // The Supabase client will automatically handle this on the client side

  // Return the redirect target to the component
  return {
    next,
    error: null
  };
}