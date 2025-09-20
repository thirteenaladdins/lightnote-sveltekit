import { writable } from 'svelte/store';
import { getSentiment } from '$lib/utils/sentiment';
import { normalizeForStorage } from '$lib/utils/text-normalization';

export interface Entry {
	id: string;
	created: number;
	prompt?: string;
	text: string;
	textNorm?: string; // Normalized text for consistent character offset calculations
	tags: string[];
	compound: number;
	updated?: number;
	meta?: {
		sent?: {
			compound: number;
			pos: number;
			neu: number;
			neg: number;
			label: string;
		};
	};
	analysis?: {
		entryId: string;
		summary: string;                               // warm, ≤3 sentences (legacy - kept for backward compatibility)
		narrativeSummary?: string;                     // neutral recap of what actually happened
		observation?: string;                          // interpretation/lesson/insight
		sentiment: { score: number };                  // -1..1
		themes: { name: string; confidence?: number }[];
		entities: {
			name: string;
			type?: string;
			salience?: number;                          // 0..1
			sentiment?: number;                         // -1..1 (toward entity)
		}[];
		keySentences?: { 
			text: string; 
			start: number; 
			end: number;
			category?: 'temptation' | 'past_experience' | 'conflict' | 'decision' | 'consequence';
		}[];
		micro?: { 
			nextAction?: string; 
			question?: string 
		};
		uncertainties?: string[];
		model?: string; 
		tokens?: number;
		createdAt: number; 
		updatedAt?: number;         // for staleness checks
	};
}

const STORAGE_KEY = 'lightnote.entries.v1';

// Create the writable store
function createEntriesStore() {
	const { subscribe, set, update } = writable<Entry[]>([]);

	return {
		subscribe,
		load: () => {
			if (typeof window !== 'undefined') {
				const stored = localStorage.getItem(STORAGE_KEY);
				const entries = stored ? JSON.parse(stored) : [];
				// Filter out any invalid entries that don't have required properties
				const validEntries = entries.filter((entry: any) => 
					entry && 
					typeof entry.id === 'string' && 
					typeof entry.text === 'string' &&
					typeof entry.created === 'number'
				);
				set(validEntries);
			}
		},
		save: (entries: Entry[]) => {
			if (typeof window !== 'undefined') {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
				set(entries);
			}
		},
		add: (entry: Entry) => {
			update(entries => {
				const newEntries = [...entries, entry];
				if (typeof window !== 'undefined') {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
				}
				return newEntries;
			});
		},
		update: (id: string, updatedEntry: Entry) => {
			update(entries => {
				const newEntries = entries.map(entry => 
					entry.id === id ? updatedEntry : entry
				);
				if (typeof window !== 'undefined') {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
				}
				return newEntries;
			});
		},
		delete: (id: string) => {
			update(entries => {
				const newEntries = entries.filter(entry => entry.id !== id);
				if (typeof window !== 'undefined') {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
				}
				return newEntries;
			});
		},
		clear: () => {
			if (typeof window !== 'undefined') {
				localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
			}
			set([]);
		},
		addSentimentToEntries: () => {
			update(entries => {
				const updatedEntries = entries.map(entry => {
					// Only add sentiment if it doesn't already exist
					if (!entry.compound && !entry.meta?.sent?.compound) {
						const sentiment = getSentiment(entry.text);
						return {
							...entry,
							compound: sentiment.compound,
							meta: {
								...entry.meta,
								sent: {
									compound: sentiment.compound,
									pos: sentiment.pos,
									neu: sentiment.neu,
									neg: sentiment.neg,
									label: sentiment.label
								}
							}
						};
					}
					return entry;
				});
				
				if (typeof window !== 'undefined') {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
				}
				return updatedEntries;
			});
		}
	};
}

export const entries = createEntriesStore();

// Convenience functions
export function loadEntries() {
	entries.load();
}

export function saveEntries(entriesList: Entry[]) {
	entries.save(entriesList);
}

export function addEntry(entry: Entry) {
	// Normalize text for consistent character offset calculations
	const normalizedEntry = {
		...entry,
		textNorm: normalizeForStorage(entry.text)
	};
	entries.add(normalizedEntry);
}

export function updateEntry(id: string, updatedEntry: Entry) {
	// Normalize text for consistent character offset calculations
	const normalizedEntry = {
		...updatedEntry,
		textNorm: normalizeForStorage(updatedEntry.text)
	};
	entries.update(id, normalizedEntry);
}

export function deleteEntry(id: string) {
	entries.delete(id);
}

export function addSentimentToEntries() {
	entries.addSentimentToEntries();
}

// Analysis management functions
export function setAnalysisForEntry(entryId: string, analysis: Entry['analysis']) {
	console.log('💾 [Store] setAnalysisForEntry called', { entryId, analysis });
	
	// Get current entries from localStorage
	if (typeof window === 'undefined') return;
	
	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) {
		console.error('❌ [Store] No entries found in localStorage');
		return;
	}
	
	let entriesList: Entry[];
	try {
		entriesList = JSON.parse(stored);
	} catch (error) {
		console.error('❌ [Store] Error parsing entries from localStorage:', error);
		return;
	}
	
	console.log('💾 [Store] Current entries list', { 
		totalEntries: entriesList.length,
		targetEntryId: entryId 
	});
	
	// Find the target entry
	const targetEntry = entriesList.find(entry => entry.id === entryId);
	if (!targetEntry) {
		console.error('❌ [Store] Target entry not found:', entryId);
		return;
	}
	
	console.log('💾 [Store] Target entry found:', {
		id: targetEntry.id,
		text: targetEntry.text.substring(0, 50) + '...',
		hasAnalysis: !!targetEntry.analysis
	});
	
	// Update the entry
	const updatedEntry = { ...targetEntry, analysis };
	const newEntries = entriesList.map(entry => 
		entry.id === entryId ? updatedEntry : entry
	);
	
	console.log('💾 [Store] Updated entry:', {
		id: updatedEntry.id,
		hasAnalysis: !!updatedEntry.analysis,
		analysisEntryId: updatedEntry.analysis?.entryId
	});
	
	// Save to localStorage
	localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
	console.log('💾 [Store] Saved to localStorage');
	
	// Update the store using the store's update method
	entries.update(entryId, updatedEntry);
	console.log('💾 [Store] Store updated');
}

export function getAnalysisForEntry(entryId: string): Entry['analysis'] | undefined {
	// Get current entries from localStorage directly
	if (typeof window === 'undefined') return undefined;
	
	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) return undefined;
	
	try {
		const entries = JSON.parse(stored);
		const entry = entries.find((e: any) => e.id === entryId);
		return entry?.analysis;
	} catch (error) {
		console.error('❌ [Store] Error getting analysis:', error);
		return undefined;
	}
}

export function hasAnalysis(entryId: string): boolean {
	// Get current entries from localStorage directly
	if (typeof window === 'undefined') return false;
	
	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) return false;
	
	try {
		const entries = JSON.parse(stored);
		const entry = entries.find((e: any) => e.id === entryId);
		const hasAnalysis = !!entry?.analysis;
		console.log('🔍 [Store] hasAnalysis check:', { entryId, hasAnalysis });
		return hasAnalysis;
	} catch (error) {
		console.error('❌ [Store] Error checking hasAnalysis:', error);
		return false;
	}
}

export function isAnalysisStale(entryId: string, maxAgeHours: number = 24): boolean {
	// Get current entries from localStorage directly
	if (typeof window === 'undefined') return true;
	
	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) return true;
	
	try {
		const entries = JSON.parse(stored);
		const entry = entries.find((e: any) => e.id === entryId);
		
		if (!entry?.analysis?.createdAt) {
			console.log('🔍 [Store] isAnalysisStale check: No analysis or createdAt', { entryId });
			return true;
		}
		
		const ageHours = (Date.now() - entry.analysis.createdAt) / (1000 * 60 * 60);
		const isStale = ageHours > maxAgeHours;
		console.log('🔍 [Store] isAnalysisStale check:', { 
			entryId, 
			ageHours: ageHours.toFixed(2), 
			maxAgeHours, 
			isStale 
		});
		return isStale;
	} catch (error) {
		console.error('❌ [Store] Error checking isAnalysisStale:', error);
		return true;
	}
}

// Helper function to get a unified entry with all data
export function getUnifiedEntry(entryId: string): Entry | undefined {
	let result: Entry | undefined;
	entries.subscribe((entriesList) => {
		result = entriesList.find((entry) => entry.id === entryId);
	})();
	return result;
}

// Helper function to get all entries with their analysis data
export function getAllEntriesWithAnalysis(): Entry[] {
	let result: Entry[] = [];
	entries.subscribe((entriesList) => {
		result = entriesList;
	})();
	return result;
}
