import { loadEntries } from '$lib/stores/entries';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	// Load entries to ensure they're available in the store
	loadEntries();
	
	return {
		entryId: params.id
	};
};
