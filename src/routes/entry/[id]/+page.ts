import { loadEntries, entriesSupabase } from '$lib/stores/entries-supabase';
import { get } from 'svelte/store';
import type { PageLoad } from './$types';

// Disable prerendering for this dynamic route
export const prerender = false;

export const load: PageLoad = async ({ params }) => {
	try {
		// Load entries and wait for them to be available
		await loadEntries();
		
		// Get the current entries from the store
		const currentEntries = get(entriesSupabase);
		
		// Check if the entry exists
		const entryExists = currentEntries.some(entry => entry.id === params.id);
		
		console.log('🔍 [Entry Load] Checking entry:', {
			entryId: params.id,
			entryExists,
			totalEntries: currentEntries.length
		});
		
		return {
			entryId: params.id,
			entryExists
		};
	} catch (error) {
		console.error('❌ [Entry Load] Error loading entry:', error);
		return {
			entryId: params.id,
			entryExists: false
		};
	}
};
