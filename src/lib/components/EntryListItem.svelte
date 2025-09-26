<script lang="ts">
	import type { Entry } from '$lib/stores/entries';

	export let entry: Entry;
	export let onDelete: (entry: Entry) => void = () => {};
	export let onClick: (entry: Entry) => void = () => {};

	// Pre-calculate today and yesterday dates to avoid creating new Date objects
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	const todayString = today.toDateString();
	const yesterdayString = yesterday.toDateString();

	function formatDate(date: number): string {
		const entryDate = new Date(date);
		const entryDateString = entryDate.toDateString();

		// Check if it's today
		if (entryDateString === todayString) {
			return entryDate.toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			});
		}

		// Check if it's yesterday
		if (entryDateString === yesterdayString) {
			return 'Yesterday';
		}

		// Check if it's this week
		const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
		if (daysDiff < 7) {
			return entryDate.toLocaleDateString('en-US', { weekday: 'short' });
		}

		// Check if it's this year
		if (entryDate.getFullYear() === today.getFullYear()) {
			return entryDate.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric'
			});
		}

		// Otherwise show full date
		return entryDate.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function truncateText(text: string, maxLength: number = 80): string {
		if (text.length <= maxLength) return text;

		// Find the last space before maxLength to avoid cutting words
		const truncated = text.substring(0, maxLength);
		const lastSpace = truncated.lastIndexOf(' ');

		if (lastSpace > maxLength * 0.7) {
			return text.substring(0, lastSpace) + '...';
		}

		return truncated + '...';
	}
</script>

<div
	class="entry-item"
	on:click={() => onClick(entry)}
	on:keydown={(e) => e.key === 'Enter' && onClick(entry)}
	role="button"
	tabindex="0"
>
	<div class="entry-content">
		<div class="entry-text">{truncateText(entry.text)}</div>
		<div class="entry-meta">
			<span class="entry-date">{formatDate(entry.created)}</span>
			<span class="entry-id">{entry.id?.slice(0, 8) || 'unknown'}</span>
		</div>
	</div>
	<div class="entry-actions" role="group" aria-label="Entry actions">
		<button
			class="action-btn delete-btn"
			on:click|stopPropagation={() => onDelete(entry)}
			title="Delete"
			aria-label="Delete entry"
		>
			🗑️
		</button>
	</div>
</div>

<style>
	.entry-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border);
		cursor: pointer;
		transition: all 0.15s ease;
		min-height: 60px;
		margin: 0 4px 0 4px;
		/* Performance optimizations */
		will-change: transform, background-color;
		transform: translateZ(0);
		backface-visibility: hidden;
	}

	.entry-item:hover {
		background-color: rgba(255, 255, 255, 0.1);
		transform: translateY(-1px) translateZ(0);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.entry-item:focus {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}

	/* Light theme hover override */
	:global([data-theme='light']) .entry-item:hover {
		background-color: rgba(26, 115, 232, 0.1) !important;
	}

	.entry-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.entry-text {
		font-size: 14px;
		line-height: 1.4;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition:
			color 0.2s ease,
			font-weight 0.2s ease;
	}

	.entry-meta {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 12px;
		color: var(--muted);
	}

	.entry-date {
		font-weight: 500;
	}

	.entry-id {
		font-family: monospace;
		background: var(--bg);
		padding: 2px 6px;
		border-radius: 4px;
		border: 1px solid var(--border);
	}

	.entry-actions {
		display: flex;
		gap: 4px;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.entry-item:hover .entry-actions {
		opacity: 1;
	}

	.entry-item:hover .entry-text {
		color: var(--accent);
		font-weight: 500;
	}

	.action-btn {
		background: none;
		border: none;
		padding: 6px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		transition: background-color 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 32px;
		min-height: 32px;
	}

	.delete-btn:hover {
		background-color: var(--danger-bg);
	}

	@media (max-width: 768px) {
		.entry-item {
			padding: 10px 12px;
			min-height: 56px;
		}

		.entry-text {
			font-size: 13px;
		}

		.entry-meta {
			font-size: 11px;
			gap: 8px;
		}

		.entry-actions {
			opacity: 1; /* Always show on mobile */
		}

		.action-btn {
			min-width: 28px;
			min-height: 28px;
			font-size: 12px;
		}
	}
</style>
