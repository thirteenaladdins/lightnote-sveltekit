<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import '../app.css';
	import '$lib/utils/console-debug.js';

	let streak = 0;
	let editBadge = false;
	let mobileMenuOpen = false;

	onMount(() => {
		updateStreak();

		// Listen for streak update events
		const handleStreakUpdate = () => updateStreak();
		window.addEventListener('updateStreak', handleStreakUpdate);

		// Listen for escape key to close mobile menu
		document.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('updateStreak', handleStreakUpdate);
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	function ymd(d = new Date()) {
		// Handle invalid dates
		if (!(d instanceof Date) || isNaN(d.getTime())) {
			return new Date().toISOString().slice(0, 10);
		}
		return d.toISOString().slice(0, 10);
	}

	function updateStreak() {
		// Calculate streak based on actual entries
		const entries = JSON.parse(localStorage.getItem('lightnote.entries.v1') || '[]');
		// Filter out entries with invalid created timestamps
		const validEntries = entries.filter(
			(entry: any) =>
				entry && typeof entry.created === 'number' && !isNaN(new Date(entry.created).getTime())
		);
		const today = ymd();
		let currentStreak = 0;

		// Check if there are entries today
		const hasEntryToday = validEntries.some((entry: any) => {
			const entryDate = ymd(new Date(entry.created));
			return entryDate === today;
		});

		if (hasEntryToday) {
			// Start counting from today backwards
			let checkDate = new Date();
			let consecutiveDays = 0;

			while (true) {
				const dateStr = ymd(checkDate);
				const hasEntryOnDate = validEntries.some((entry: any) => {
					const entryDate = ymd(new Date(entry.created));
					return entryDate === dateStr;
				});

				if (hasEntryOnDate) {
					consecutiveDays++;
					// Move to previous day
					checkDate.setDate(checkDate.getDate() - 1);
				} else {
					break;
				}
			}

			currentStreak = consecutiveDays;
		} else {
			// No entry today, streak is 0
			currentStreak = 0;
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
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header>
	<div class="wrap">
		<div class="flex">
			<h1>LightNote</h1>
			<div class="spacer"></div>
			<nav class="nav desktop-nav">
				<a href="{base}/" class="nav-link" class:active={$page.route.id === '/'}>Entries</a>
				<a href="{base}/analytics" class="nav-link" class:active={$page.route.id === '/analytics'}
					>Analytics</a
				>
				<a href="{base}/insights" class="nav-link" class:active={$page.route.id === '/insights'}
					>Insights</a
				>
				<a href="{base}/settings" class="nav-link" class:active={$page.route.id === '/settings'}
					>Settings</a
				>
			</nav>
			<div class="spacer"></div>
			<div class="header-actions">
				<small class="subtle" style="margin-right: 12px">🔥 {streak} day streak</small>
				<span
					class="badge"
					style="display: {editBadge ? 'inline-block' : 'none'}"
					aria-live="polite">Editing…</span
				>
				<button id="btnQuickSave" title="Ctrl/Cmd+Enter">Quick Save</button>
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
				href="{base}/settings"
				class="mobile-nav-link"
				class:active={$page.route.id === '/settings'}
				on:click={closeMobileMenu}>Settings</a
			>
		</nav>
	{/if}
</header>

<main class="wrap">
	<slot />
</main>

<style>
	/* Additional layout-specific styles can go here */
</style>
