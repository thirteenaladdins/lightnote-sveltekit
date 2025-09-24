import type { Entry } from '$lib/stores/entries';

export interface GroupedEntry {
	dateLabel: string;
	items: Entry[];
}

/**
 * Groups entries by day using the user's local timezone
 * @param entries Array of entries to group
 * @param timezone Optional timezone (defaults to user's local timezone)
 * @returns Array of grouped entries with date labels
 */
export function groupEntriesByDay(entries: Entry[], timezone?: string): GroupedEntry[] {
	if (!entries || entries.length === 0) {
		return [];
	}

	// Sort entries by creation date (most recent first)
	const sortedEntries = [...entries].sort((a, b) => b.created - a.created);

	// Group by date
	const groups = new Map<string, Entry[]>();

	for (const entry of sortedEntries) {
		const entryDate = new Date(entry.created);
		const dateKey = formatDateKey(entryDate, timezone);
		
		if (!groups.has(dateKey)) {
			groups.set(dateKey, []);
		}
		groups.get(dateKey)!.push(entry);
	}

	// Convert to array and format date labels
	const result: GroupedEntry[] = [];
	
	for (const [dateKey, items] of groups) {
		const date = new Date(dateKey);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		let dateLabel: string;
		if (isSameDay(date, today)) {
			dateLabel = 'Today';
		} else if (isSameDay(date, yesterday)) {
			dateLabel = 'Yesterday';
		} else {
			dateLabel = formatDateLabel(date);
		}

		result.push({
			dateLabel,
			items
		});
	}

	return result;
}

/**
 * Formats a date as a key for grouping (YYYY-MM-DD format)
 */
function formatDateKey(date: Date, timezone?: string): string {
	if (timezone) {
		// Use specified timezone
		return date.toLocaleDateString('en-CA', { 
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
	} else {
		// Use local timezone
		return date.toLocaleDateString('en-CA');
	}
}

/**
 * Formats a date for display as a label
 */
function formatDateLabel(date: Date): string {
	const today = new Date();
	const diffTime = today.getTime() - date.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		return 'Today';
	} else if (diffDays === 1) {
		return 'Yesterday';
	} else if (diffDays < 7) {
		return date.toLocaleDateString('en-US', { weekday: 'long' });
	} else if (diffDays < 365) {
		return date.toLocaleDateString('en-US', { 
			month: 'short', 
			day: 'numeric' 
		});
	} else {
		return date.toLocaleDateString('en-US', { 
			year: 'numeric',
			month: 'short', 
			day: 'numeric' 
		});
	}
}

/**
 * Checks if two dates are on the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
	return date1.getFullYear() === date2.getFullYear() &&
		   date1.getMonth() === date2.getMonth() &&
		   date1.getDate() === date2.getDate();
}
