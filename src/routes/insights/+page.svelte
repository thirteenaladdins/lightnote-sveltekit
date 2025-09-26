<script lang="ts">
	import { onMount } from 'svelte';
	import { entries } from '$lib/stores/entries-supabase';
	import DOMPurify from 'dompurify';

	let weeklyDigest = '';
	let digestDates = '';
	let currentWeek = '';
	let insightStatus = '';
	let insightCount = 0;
	let savedInsights: any[] = [];

	// Sanitize user input to prevent XSS
	function sanitizeText(text: string): string {
		return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
	}

	// Sanitize entire digest string with strict allowlist
	function sanitizeDigest(html: string): string {
		return DOMPurify.sanitize(html, {
			ALLOWED_TAGS: ['h3', 'div', 'span', 'b', 'small'],
			ALLOWED_ATTR: ['class']
		});
	}

	// Validate entry shape to prevent logic bugs
	function isEntry(
		e: any
	): e is { created: string; compound?: number; text?: string; tags?: string[] } {
		return e && typeof e.created === 'string';
	}

	onMount(() => {
		loadInsights();
		updateDigest();
	});

	$: if ($entries.length > 0) {
		updateDigest();
	}

	function loadInsights() {
		try {
			const raw = localStorage.getItem('ln.insights');
			const parsed = raw ? JSON.parse(raw) : [];
			savedInsights = Array.isArray(parsed) ? parsed : [];
		} catch (error) {
			console.error('Failed to parse stored insights from localStorage:', error);
			console.log('Falling back to empty insights array to keep UI usable');
			savedInsights = [];
		}
		insightCount = savedInsights.length;
	}

	function saveInsights(insights: any[]) {
		localStorage.setItem('ln.insights', JSON.stringify(insights));
		savedInsights = insights;
		insightCount = insights.length;
	}

	function weekKey(date = new Date()): string {
		const d = new Date(date);
		d.setHours(0, 0, 0, 0);
		d.setDate(d.getDate() - d.getDay());
		return d.toISOString().slice(0, 10);
	}

	function weekRangeFromKey(wk: string) {
		const start = new Date(wk);
		const end = new Date(start);
		end.setDate(end.getDate() + 6);
		return { start, end };
	}

	function prevWeekKey(wk: string): string {
		const d = new Date(wk);
		d.setDate(d.getDate() - 7);
		return d.toISOString().slice(0, 10);
	}

	function getEntriesForWeek(wk: string) {
		const { start, end } = weekRangeFromKey(wk);
		const s = +start;
		const e = +end + 86_400_000; // Add one full day to include the entire last day
		return $entries.filter(isEntry).filter((ei) => {
			const t = +new Date(ei.created);
			return t >= s && t < e;
		});
	}

	function updateDigest() {
		currentWeek = weekKey(new Date());
		const entries = getEntriesForWeek(currentWeek);

		if (!entries.length) {
			weeklyDigest = 'No entries yet this week.';
			digestDates = '';
			return;
		}

		const { start, end } = weekRangeFromKey(currentWeek);
		digestDates = `${start.toDateString()} → ${end.toDateString()}`;

		// Simple weekly digest
		const total = entries.length;
		const avgMood = total > 0 ? entries.reduce((sum, e) => sum + (e.compound || 0), 0) / total : 0;
		const moodLabel = avgMood >= 0.05 ? 'positive' : avgMood <= -0.05 ? 'negative' : 'neutral';

		// Get top tags (using Object.create(null) to prevent prototype pollution)
		const tagCounts = Object.create(null) as Record<string, number>;
		entries.forEach((e) => (e.tags || []).forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)));
		const topTags = Object.entries(tagCounts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5);

		// Get notable entries
		const sortedByMood = [...entries].sort((a, b) => (a.compound || 0) - (b.compound || 0));
		const worst = sortedByMood[0];
		const best = sortedByMood[sortedByMood.length - 1];

		const rawDigest = `
			<h3 class="mono">Weekly Digest — ${currentWeek}</h3>
			<div class="subtle">${digestDates}</div>
			<div class="digest-meta">
				<div><b>Entries: ${total}</b></div>
				<div><b>Mood: ${(avgMood || 0).toFixed(2)} (${moodLabel})</b></div>
			</div>
			${topTags.length ? `<div class="theme-line">${topTags.map(([tag, count]) => `<span class="theme-pill">#${sanitizeText(tag)} (${count})</span>`).join(' ')}</div>` : ''}
			${worst && worst.text ? `<div class="notable neg">Most negative: "${sanitizeText(worst.text.slice(0, 120))}${worst.text.length > 120 ? '...' : ''}" (${(worst.compound || 0).toFixed(2)})</div>` : ''}
			${best && best.text ? `<div class="notable pos">Most positive: "${sanitizeText(best.text.slice(0, 120))}${best.text.length > 120 ? '...' : ''}" (${(best.compound || 0).toFixed(2)})</div>` : ''}
		`;
		weeklyDigest = sanitizeDigest(rawDigest);
	}

	function saveCurrentInsight() {
		if (!weeklyDigest || weeklyDigest.includes('No entries')) {
			showStatus('Nothing to save yet.', true);
			return;
		}

		const dup = savedInsights.find(
			(i) => i.scope === 'week' && i.week === currentWeek && i.text === weeklyDigest
		);
		if (dup) {
			showStatus('Already saved.', true);
			return;
		}

		const newInsight = {
			id:
				typeof crypto !== 'undefined' && crypto.randomUUID
					? crypto.randomUUID()
					: String(Date.now()) + Math.random().toString(36).slice(2),
			scope: 'week',
			week: currentWeek,
			text: weeklyDigest,
			createdAt: Date.now()
		};

		saveInsights([newInsight, ...savedInsights]);
		showStatus('Saved to Insights.');
	}

	function deleteInsight(id: string) {
		if (confirm('Delete this insight?')) {
			saveInsights(savedInsights.filter((i) => i.id !== id));
			showStatus('Insight deleted.');
		}
	}

	function clearAllInsights() {
		if (confirm('Delete ALL saved insights? This cannot be undone.')) {
			saveInsights([]);
			showStatus('All insights cleared.');
		}
	}

	function showStatus(msg: string, isError = false) {
		insightStatus = msg;
		setTimeout(() => {
			insightStatus = '';
		}, 4000);
	}

	function prevWeek() {
		currentWeek = prevWeekKey(currentWeek);
		updateDigest();
	}

	function thisWeek() {
		currentWeek = weekKey(new Date());
		updateDigest();
	}
</script>

<!-- Weekly Digest -->
<section class="card">
	<div class="flex items-center">
		<div>
			<div class="subtle">Weekly Digest</div>
			<small class="subtle">{digestDates}</small>
		</div>
		<div class="spacer"></div>
		<button class="secondary" on:click={prevWeek}>← Previous</button>
		<button class="secondary" on:click={thisWeek}>This Week</button>
	</div>

	<div class="digest-output" style="margin-top: 16px">{@html weeklyDigest}</div>

	<div class="row" style="margin-top: 20px">
		<button on:click={saveCurrentInsight}>Save Insight</button>
		<button class="secondary">Discuss with AI</button>
		<div class="spacer"></div>
		<small class="subtle" role="status" aria-live="polite">{insightStatus}</small>
	</div>
</section>

<!-- Saved Insights -->
<section class="card" style="margin-top: 16px">
	<div class="flex">
		<div>
			<div class="subtle">Saved Insights</div>
			<small class="subtle">{insightCount} saved</small>
		</div>
		<div class="spacer"></div>
		<button class="secondary" on:click={clearAllInsights}>
			<span class="danger">Clear All</span>
		</button>
	</div>
	<div class="list" style="margin-top: 12px">
		{#each savedInsights as insight}
			<div class="entry">
				<h4>
					{new Date(insight.createdAt).toLocaleString()}
					{insight.scope === 'week-ai' ? ' (AI Reflection)' : ''}
				</h4>
				<p style="white-space: pre-wrap; margin: 10px 0">{@html sanitizeText(insight.text)}</p>
				<div class="flex" style="margin-top: 8px; gap: 8px">
					<button class="secondary">Open week</button>
					<button class="secondary destructive" on:click={() => deleteInsight(insight.id)}
						>Delete</button
					>
					<div class="spacer"></div>
					<small class="subtle mono">week: {insight.week}</small>
				</div>
			</div>
		{/each}
	</div>
</section>
