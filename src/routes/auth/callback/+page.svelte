<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		// With magic links, the session is applied via URL hash on this page load.
		// Redirect immediately to the app home.
		goto('/');
	});
</script>

<div class="auth-callback">
	<div class="success">
		<h2>Authentication Successful</h2>
		<p>Redirecting to your journal...</p>
	</div>
</div>

<style>
	.auth-callback {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 2rem;
	}

	.success {
		text-align: center;
		max-width: 400px;
	}

	.success h2 {
		color: var(--success, #10b981);
		margin-bottom: 1rem;
	}

	p {
		color: var(--text);
		margin-bottom: 0.5rem;
	}
</style>
