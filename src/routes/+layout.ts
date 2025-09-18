import { base } from '$app/paths';

export const prerender = true;
export const ssr = false;

// Ensure base path is properly set for GitHub Pages
export const load = () => {
	return {
		base
	};
};
