<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import '../app.css';
	import '$lib/utils/console-debug.js';
	import { auth } from '$lib/stores/auth';
	import { initAuth } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	import { entries } from '$lib/stores/entries-supabase';

	// Track current page to prevent unwanted navigation
	let currentPage = '';

	// Track page changes
	$: if ($page.route.id) {
		currentPage = $page.route.id;
		console.log('🧭 [Layout] Page changed to:', currentPage);
	}

	let streak = 0;
	let editBadge = false;
	let mobileMenuOpen = false;
	let theme: 'light' | 'dark' = 'dark';

	onMount(() => {
		updateStreak();
		initTheme();
		initAuth();

		// Load LLM configuration early to ensure it's available
		import('$lib/utils/llm').then(({ loadLLMConfigFromStorage }) => {
			loadLLMConfigFromStorage();
		});

		// Listen for streak update events
		const handleStreakUpdate = () => updateStreak();
		window.addEventListener('updateStreak', handleStreakUpdate);

		// Listen for escape key to close mobile menu
		document.addEventListener('keydown', handleKeydown);

		// Recalculate streak when entries change
		const unsubscribe = entries.subscribe(() => updateStreak());

		// Handle page visibility changes to prevent unwanted navigation
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				console.log('📱 [Layout] Page became visible, current route:', $page.route.id);
				// Store current page to prevent unwanted navigation
				currentPage = $page.route.id || '';
				console.log('📱 [Layout] Stored current page:', currentPage);
			}
		};

		// Handle beforeunload to prevent accidental navigation
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			// Only show confirmation if there are unsaved changes
			// For now, we'll let the page unload normally
			return;
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('updateStreak', handleStreakUpdate);
			document.removeEventListener('keydown', handleKeydown);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('beforeunload', handleBeforeUnload);
			unsubscribe();
		};
	});

	async function handleSignOut() {
		try {
			await auth.signOut();
			goto('/login');
		} catch (error) {
			console.error('Sign out error:', error);
		}
	}

	function ymd(d = new Date()) {
		// Handle invalid dates
		if (!(d instanceof Date) || isNaN(d.getTime())) {
			d = new Date();
		}
		// Use local timezone to avoid UTC day drift
		return d.toLocaleDateString('en-CA');
	}

	function updateStreak() {
		// Calculate streak based on entries in the store (Supabase or local fallback)
		const items = get(entries) || [];
		const validEntries = items.filter(
			(entry: any) =>
				entry && typeof entry.created === 'number' && !isNaN(new Date(entry.created).getTime())
		);

		// Precompute a set of date keys that have at least one entry
		const datesWithEntries = new Set<string>();
		for (const e of validEntries) {
			datesWithEntries.add(ymd(new Date(e.created)));
		}

		let currentStreak = 0;
		let checkDate = new Date();
		while (true) {
			const dateKey = ymd(checkDate);
			if (datesWithEntries.has(dateKey)) {
				currentStreak++;
				checkDate.setDate(checkDate.getDate() - 1);
			} else {
				break;
			}
		}

		streak = currentStreak;
	}

	// Simple favicon as SVG data URL
	const favicon =
		'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="100%" height="100%" fill="%2316161b"/><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="42" fill="%238ab4f8">LN</text></svg>';

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	// Handle escape key to close mobile menu
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && mobileMenuOpen) {
			closeMobileMenu();
		}
	}

	// Theme management
	function initTheme() {
		// Check localStorage for saved theme preference
		const savedTheme = localStorage.getItem('lightnote-theme') as 'light' | 'dark' | null;
		if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
			theme = savedTheme;
		} else {
			// Check system preference
			const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
			theme = prefersLight ? 'light' : 'dark';
		}
		applyTheme();
	}

	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light';
		applyTheme();
		localStorage.setItem('lightnote-theme', theme);
	}

	function applyTheme() {
		document.documentElement.setAttribute('data-theme', theme);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header>
	<div class="wrap">
		<div class="flex">
			<a href="{base}/" class="logo-link">
				<h1>LightNote</h1>
			</a>
			<div class="spacer"></div>
			<nav class="nav desktop-nav">
				<a href="{base}/" class="nav-link" class:active={$page.route.id === '/'}>Entries</a>
				<a href="{base}/analytics" class="nav-link" class:active={$page.route.id === '/analytics'}
					>Analytics</a
				>
				<a href="{base}/insights" class="nav-link" class:active={$page.route.id === '/insights'}
					>Insights</a
				>
				<a href="{base}/feedback" class="nav-link" class:active={$page.route.id === '/feedback'}
					>Feedback</a
				>
				<a href="{base}/settings" class="nav-link" class:active={$page.route.id === '/settings'}
					>Settings</a
				>
			</nav>
			<div class="spacer"></div>
			<div class="header-actions">
				{#if $auth.user}
					<small class="subtle" style="margin-right: 12px">🔥 {streak} day streak</small>
					<span
						class="badge"
						style="display: {editBadge ? 'inline-block' : 'none'}"
						aria-live="polite">Editing…</span
					>
					<button
						class="theme-toggle"
						on:click={toggleTheme}
						title="Toggle theme"
						aria-label="Toggle theme"
					>
						{#if theme === 'light'}
							🌙
						{:else}
							☀️
						{/if}
					</button>
					<button
						class="sign-out-button"
						on:click={handleSignOut}
						title="Sign out"
						aria-label="Sign out"
					>
						Sign Out
					</button>
				{:else}
					<a href="/login" class="sign-in-button">Sign In</a>
				{/if}
				<button
					class="mobile-menu-toggle"
					on:click={toggleMobileMenu}
					aria-label="Toggle mobile menu"
				>
					<div class="hamburger" class:active={mobileMenuOpen}>
						<span></span>
						<span></span>
						<span></span>
					</div>
				</button>
			</div>
		</div>
	</div>

	<!-- Mobile Navigation Overlay -->
	{#if mobileMenuOpen}
		<div
			class="mobile-nav-overlay"
			on:click={closeMobileMenu}
			on:keydown={(e) => e.key === 'Escape' && closeMobileMenu()}
			role="button"
			tabindex="0"
			aria-label="Close mobile menu"
		></div>
		<nav class="mobile-nav" class:open={mobileMenuOpen}>
			<a
				href="{base}/"
				class="mobile-nav-link"
				class:active={$page.route.id === '/'}
				on:click={closeMobileMenu}>Entries</a
			>
			<a
				href="{base}/analytics"
				class="mobile-nav-link"
				class:active={$page.route.id === '/analytics'}
				on:click={closeMobileMenu}>Analytics</a
			>
			<a
				href="{base}/insights"
				class="mobile-nav-link"
				class:active={$page.route.id === '/insights'}
				on:click={closeMobileMenu}>Insights</a
			>
			<a
				href="{base}/feedback"
				class="mobile-nav-link"
				class:active={$page.route.id === '/feedback'}
				on:click={closeMobileMenu}>Feedback</a
			>
			<a
				href="{base}/settings"
				class="mobile-nav-link"
				class:active={$page.route.id === '/settings'}
				on:click={closeMobileMenu}>Settings</a
			>
			{#if $auth.user}
				<button
					class="mobile-nav-link theme-toggle-mobile"
					on:click={toggleTheme}
					style="text-align: left; border: none; background: none;"
				>
					{#if theme === 'light'}
						🌙 Switch to Dark Mode
					{:else}
						☀️ Switch to Light Mode
					{/if}
				</button>
				<button
					class="mobile-nav-link sign-out-mobile"
					on:click={handleSignOut}
					style="text-align: left; border: none; background: none; color: var(--error, #ef4444);"
				>
					Sign Out
				</button>
			{:else}
				<a
					href="/login"
					class="mobile-nav-link sign-in-mobile"
					on:click={closeMobileMenu}
					style="color: var(--accent);"
				>
					Sign In
				</a>
			{/if}
		</nav>
	{/if}
</header>

<main class="wrap" class:full-height={$page.route.id === '/entry/new'}>
	<slot />
</main>

<style>
	/* Logo link styling */
	.logo-link {
		text-decoration: none;
		color: inherit;
		display: flex;
		align-items: center;
	}

	.logo-link:hover {
		opacity: 0.8;
	}

	.logo-link h1 {
		margin: 0;
		font-size: inherit;
		font-weight: inherit;
	}

	/* Theme toggle button */
	.theme-toggle {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--text);
		padding: 8px 12px;
		border-radius: 8px;
		font-size: 16px;
		cursor: pointer;
		transition: all 0.2s ease;
		min-height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.theme-toggle:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: var(--accent);
	}

	.theme-toggle-mobile {
		background: none;
		border: none;
		color: var(--text);
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.theme-toggle-mobile:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	/* Authentication buttons */
	.sign-in-button {
		background: var(--accent);
		color: white;
		padding: 8px 16px;
		border-radius: 6px;
		text-decoration: none;
		font-size: 14px;
		font-weight: 500;
		transition: background-color 0.2s;
		margin-right: 8px;
	}

	.sign-in-button:hover {
		background: var(--accent-hover, var(--accent));
	}

	.sign-out-button {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--text);
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		margin-right: 8px;
		min-height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.sign-out-button:hover {
		background: var(--hover-bg, var(--muted-alpha));
		border-color: var(--error, #ef4444);
		color: var(--error, #ef4444);
	}

	.sign-in-mobile:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.sign-out-mobile:hover {
		background: rgba(239, 68, 68, 0.1);
	}

	/* Full height layout for new entry page */
	main.wrap.full-height {
		height: calc(100vh - 80px);
		height: calc(100dvh - 80px);
		overflow: hidden;
		padding: 0;
	}
</style>
