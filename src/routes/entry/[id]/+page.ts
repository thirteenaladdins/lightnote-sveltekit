import { loadEntries } from '$lib/stores/entries-supabase';
import type { PageLoad } from './$types';

// Disable prerendering for this dynamic route
export const prerender = false;

export const load: PageLoad = async ({ params }) => {
	// Load entries to ensure they're available in the store
	loadEntries();
	
	return {
		entryId: params.id
	};
};
