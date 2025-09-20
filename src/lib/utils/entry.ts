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
	narrativeSummary: string,
	observation: string,
	sentiment: { score: number },
	themes: { name: string; confidence?: number }[] = [],
	entities: {
		name: string;
		type?: string;
		salience?: number;
		sentiment?: number;
	}[] = [],
	keySentences: {
		text: string;
		start: number;
		end: number;
		category?: 'temptation' | 'past_experience' | 'conflict' | 'decision' | 'consequence';
	}[] = [],
	micro?: { 
		nextAction?: string; 
		question?: string 
	},
	uncertainties?: string[],
	model?: string,
	tokens?: number
): EntryInsight {
	return {
		entryId,
		summary,
		narrativeSummary,
		observation,
		sentiment,
		themes,
		entities,
		keySentences,
		micro,
		uncertainties,
		model,
		tokens,
		createdAt: Date.now()
	};
}

// Helper function to update an insight
export function updateEntryInsight(
	insight: EntryInsight,
	updates: Partial<Pick<EntryInsight, 'summary' | 'narrativeSummary' | 'observation' | 'sentiment' | 'themes' | 'entities' | 'model' | 'tokens'>>
): EntryInsight {
	return {
		...insight,
		...updates,
		updatedAt: Date.now()
	};
}


