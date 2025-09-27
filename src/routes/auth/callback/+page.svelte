<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	export let data;

	onMount(() => {
		if (data.error) {
			// Show error and redirect after a delay
			setTimeout(() => {
				goto(data.next || '/');
			}, 3000);
		} else {
			// Give Supabase client time to process hash fragment
			setTimeout(() => {
				goto(data.next || '/');
			}, 100);
		}
	});
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
</style>
