import { redirect } from '@sveltejs/kit';

export async function load({ url }) {
  // For magic links, Supabase sets the session from the hash fragment automatically.
  // We don't need to exchange a code here. Just redirect to the intended page.
  const next = url.searchParams.get('next') ?? '/';
  throw redirect(302, next);
}
