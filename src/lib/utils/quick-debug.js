// quick-debug.js — Quick debug script to run in console

// Test function to check current state
function quickDebug() {
	console.log('🔍 [QUICK DEBUG] Starting analysis...');

	// Check localStorage
	const stored = localStorage.getItem('lightnote.entries.v1');
	if (!stored) {
		console.log('❌ No stored entries found');
		return;
	}

	const entries = JSON.parse(stored);
	console.log(`📊 Total entries: ${entries.length}`);

	// Find entries with analysis
	const entriesWithAnalysis = entries.filter((e) => e.analysis);
	console.log(`📊 Entries with analysis: ${entriesWithAnalysis.length}`);

	if (entriesWithAnalysis.length > 0) {
		console.log('📝 Entries with analysis:');
		entriesWithAnalysis.forEach((entry, index) => {
			console.log(`  ${index + 1}. ID: ${entry.id}`);
			console.log(`     Analysis EntryID: ${entry.analysis?.entryId}`);
			console.log(`     Match: ${entry.id === entry.analysis?.entryId ? '✅' : '❌'}`);
			console.log(`     Summary: ${entry.analysis?.summary?.substring(0, 50)}...`);
		});
	} else {
		console.log('❌ No entries have analysis data');
	}

	// Check if LLM is configured
	const llmUrl = localStorage.getItem('ln.llm.url');
	const llmModel = localStorage.getItem('ln.llm.model');
	console.log('🤖 LLM Configuration:', {
		url: llmUrl ? '✅ Set' : '❌ Missing',
		model: llmModel ? '✅ Set' : '❌ Missing'
	});
}

// Make it available globally
if (typeof window !== 'undefined') {
	window.quickDebug = quickDebug;
	console.log('🔧 Quick debug available: quickDebug()');
}
