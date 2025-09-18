import { createEntry, createEntryInsight } from './entry';
import { addEntry, loadEntries } from '$lib/stores/entries';
import type { Entry, EntryInsight } from '$lib/types';
import type { Entry as StoreEntry } from '$lib/stores/entries';

// Test function to verify the data model works
export function testDataModel() {
	console.log('🧪 Testing data model...');

	// Create a test entry
	const testEntry: Entry = createEntry(
		"I had a great day today! Went to the park with Sarah and we saw some beautiful flowers. The weather was perfect and I felt really happy.",
		2 // userMood: very positive
	);

	console.log('📝 Created test entry:', testEntry);

	// Add entry to store
	addEntry(testEntry);

	// Create a test insight
	const testInsight: EntryInsight = createEntryInsight(
		testEntry.id,
		"User had a wonderful day at the park with Sarah, enjoying beautiful flowers and perfect weather. The experience brought great happiness and positive emotions.",
		{ score: 0.8 }, // positive sentiment
		[
			{ name: "nature", confidence: 0.9 },
			{ name: "social", confidence: 0.8 },
			{ name: "happiness", confidence: 0.95 }
		],
		[
			{ name: "Sarah", type: "person", salience: 0.7, sentiment: 0.8 },
			{ name: "park", type: "place", salience: 0.8, sentiment: 0.9 },
			{ name: "flowers", type: "other", salience: 0.6, sentiment: 0.8 },
			{ name: "weather", type: "other", salience: 0.5, sentiment: 0.9 }
		],
		"gpt-4",
		150
	);

	console.log('🧠 Created test insight:', testInsight);

	// Load and verify data
	loadEntries();

	console.log('✅ Data model test completed!');
	console.log('📊 Storage keys used:');
	console.log('  - lightnote.entries.v1');
	console.log('  - ln.entry.insights.v1');
	console.log('  - ln.weekly.rollups.v1');

	return { entry: testEntry, insight: testInsight };
}

// Function to create a test entry with internal conflict for testing improved insights
export function createConflictTestEntry(): StoreEntry {
	console.log('🧪 Creating conflict test entry...');
	
	const conflictText = `I'm supposed to meet up with my ex tomorrow. But the thought of hanging as friends makes me feel like I want to have sex. When we had broken up it felt wrong and it only happened twice. It felt really weird the first time, like it shouldn't have happened. I know it would stir up feelings for her and she'd come back and say how can I be so emotionless. But I'm going round anyway. Even though I shouldn't. This should be someone else.`;
	
	const testEntry: StoreEntry = {
		id: `test-conflict-${Date.now()}`,
		created: Date.now(),
		text: conflictText,
		tags: [],
		compound: -0.5, // negative sentiment due to conflict
		meta: {
			sent: {
				compound: -0.5,
				pos: 0.1,
				neu: 0.3,
				neg: 0.6,
				label: 'negative'
			}
		}
	};
	
	console.log('📝 Created conflict test entry:', testEntry);
	return testEntry;
}

// Function to clear test data
export function clearTestData() {
	console.log('🧹 Clearing test data...');
	if (typeof window !== 'undefined') {
		localStorage.removeItem('lightnote.entries.v1');
		localStorage.removeItem('ln.entry.insights.v1');
		localStorage.removeItem('ln.weekly.rollups.v1');
	}
	console.log('✅ Test data cleared!');
}
