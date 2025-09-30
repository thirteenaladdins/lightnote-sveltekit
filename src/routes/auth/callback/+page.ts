import { supabase } from '$lib/supabase';

// Disable prerendering for this route since it handles dynamic auth flows
export const prerender = false;

export async function load({ url }) {
  // Handle both OAuth code exchange and magic link hash fragments
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';
  
  // For mobile detection, we'll handle this on the client side
  // since server-side user agent detection can be unreliable
  const isMobile = false; // Will be determined client-side

  if (code) {
    // OAuth flow - exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Error exchanging code for session:', error);
      return {
        error: 'Authentication failed. Please try again.',
        next,
        isMobile
      };
    }
  }
  
  // For magic links, we need to handle hash fragments on the client side
  // The hash fragment contains the access token and refresh token
  // This is especially important on mobile where the hash might not be processed server-side

  // Return the redirect target to the component
  return {
    next,
    error: null,
    isMobile
  };
}