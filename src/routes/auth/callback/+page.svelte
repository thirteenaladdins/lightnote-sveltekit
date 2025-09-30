<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';

	export let data;

	let isMobile = false;

	onMount(async () => {
		// Detect mobile on client side
		isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

		if (data.error) {
			// Show error and redirect after a delay
			setTimeout(() => {
				goto(data.next || '/');
			}, 3000);
		} else {
			// Handle magic link authentication
			await handleMagicLinkAuth();
		}
	});

	async function handleMagicLinkAuth() {
		try {
			// Check if we have a hash fragment (magic link)
			const hash = window.location.hash;

			if (hash) {
				console.log('🔐 Processing magic link hash fragment...');

				// Parse the hash fragment to extract tokens
				const hashParams = new URLSearchParams(hash.substring(1));
				const accessToken = hashParams.get('access_token');
				const refreshToken = hashParams.get('refresh_token');
				const error = hashParams.get('error');
				const errorDescription = hashParams.get('error_description');

				if (error) {
					console.error('🔐 Magic link error:', error, errorDescription);
					// Show error and redirect
					setTimeout(() => {
						goto(data.next || '/');
					}, 3000);
					return;
				}

				if (accessToken && refreshToken) {
					console.log('🔐 Setting session from magic link...');

					// Set the session using the tokens from the hash
					const { error: sessionError } = await supabase.auth.setSession({
						access_token: accessToken,
						refresh_token: refreshToken
					});

					if (sessionError) {
						console.error('🔐 Error setting session:', sessionError);
						// Show error and redirect
						setTimeout(() => {
							goto(data.next || '/');
						}, 3000);
						return;
					}

					console.log('🔐 Magic link authentication successful!');

					// Clear the hash from the URL for security
					window.history.replaceState(
						{},
						document.title,
						window.location.pathname + window.location.search
					);
				}
			} else {
				// No hash fragment, check if we already have a session
				console.log('🔐 No hash fragment, checking existing session...');
				const {
					data: { session }
				} = await supabase.auth.getSession();

				if (!session) {
					console.log('🔐 No existing session found, redirecting to login...');
					// No session and no magic link, redirect to login
					setTimeout(() => {
						goto('/login');
					}, 1000);
					return;
				}
			}

			// Give a moment for the session to be established
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Redirect to the intended destination
			goto(data.next || '/');
		} catch (error) {
			console.error('🔐 Error handling magic link auth:', error);
			// Show error and redirect
			setTimeout(() => {
				goto(data.next || '/');
			}, 3000);
		}
	}
</script>

<div class="auth-callback">
	{#if data.error}
		<div class="error">
			<h2>Authentication Error</h2>
			<p>{data.error}</p>
			<p>Redirecting to home page...</p>
		</div>
	{:else}
		<div class="success">
			<h2>Authentication Successful</h2>
			<p>Redirecting to your journal...</p>
			{#if isMobile}
				<div class="mobile-note">
					<p>📱 If you're using a mobile app, you may need to switch back to the app.</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.auth-callback {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 2rem;
	}

	.error,
	.success {
		text-align: center;
		max-width: 400px;
	}

	.error h2 {
		color: var(--error, #ef4444);
		margin-bottom: 1rem;
	}

	.success h2 {
		color: var(--success, #10b981);
		margin-bottom: 1rem;
	}

	p {
		color: var(--text);
		margin-bottom: 0.5rem;
	}

	.mobile-note {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		border: 1px solid var(--border);
	}

	.mobile-note p {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-muted, var(--text));
	}
</style>
