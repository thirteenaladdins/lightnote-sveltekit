// feedback/+page.ts - Feedback review page

import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	return {
		title: 'Feedback Review',
		description: 'Review and manage AI summary feedback for iteration'
	};
};

