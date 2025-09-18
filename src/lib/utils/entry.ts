import { nanoid } from 'nanoid';
import type { Entry, EntryInsight } from '$lib/types';

// Helper function to create a new entry
export function createEntry(text: string, userMood?: -2|-1|0|1|2): Entry {
	return {
		id: nanoid(),
		createdAt: Date.now(),
		text,
		userMood
	};
}

// Helper function to create a new entry with updated timestamp
export function updateEntry(entry: Entry, updates: Partial<Pick<Entry, 'text' | 'userMood'>>): Entry {
	return {
		...entry,
		...updates,
		updatedAt: Date.now()
	};
}

// Helper function to create an insight for an entry
export function createEntryInsight(
	entryId: string,
	summary: string,
	sentiment: { score: number },
	themes: { name: string; confidence?: number }[] = [],
	entities: {
		name: string;
		type?: "person"|"org"|"place"|"task"|"self"|"other";
		salience?: number;
		sentiment?: number;
	}[] = [],
	model?: string,
	tokens?: number
): EntryInsight {
	return {
		entryId,
		summary,
		sentiment,
		themes,
		entities,
		model,
		tokens,
		createdAt: Date.now()
	};
}

// Helper function to update an insight
export function updateEntryInsight(
	insight: EntryInsight,
	updates: Partial<Pick<EntryInsight, 'summary' | 'sentiment' | 'themes' | 'entities' | 'model' | 'tokens'>>
): EntryInsight {
	return {
		...insight,
		...updates,
		updatedAt: Date.now()
	};
}


