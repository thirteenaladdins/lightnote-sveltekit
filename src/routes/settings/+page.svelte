<script lang="ts">
	import { onMount } from 'svelte';
	import { addSentimentToEntries, entries, saveEntries } from '$lib/stores/entries';
	import {
		getLLMConfig,
		setLLMConfig,
		isLLMConfigured,
		loadLLMConfigFromStorage
	} from '$lib/utils/llm';

	let llmUrl = '';
	let llmToken = '';
	let llmModel = '';
	let llmTimeout = '';
	let showReadme = false;
	let showLlmSettings = false;
	let showDataManagement = false;
	let showImportExport = false;
	let sentimentStatus = '';
	let llmStatus = '';
	let importExportStatus = '';

	onMount(() => {
		// Load any existing configuration from localStorage for migration
		loadLLMConfigFromStorage();
		loadLlmSettings();
	});

	function loadLlmSettings() {
		const config = getLLMConfig();
		llmUrl = config.url;
		llmToken = config.token;
		llmModel = config.model;
		llmTimeout = config.timeout.toString();
	}

	function saveLlmSettings() {
		setLLMConfig({
			url: llmUrl.trim(),
			token: llmToken.trim(),
			model: llmModel.trim(),
			timeout: parseInt(llmTimeout) || 60000
		});
		llmStatus = 'LLM settings saved securely in memory!';
		setTimeout(() => {
			llmStatus = '';
		}, 3000);
	}

	async function testLlmConnection() {
		if (!isLLMConfigured()) {
			llmStatus = 'Please configure LLM settings first.';
			setTimeout(() => {
				llmStatus = '';
			}, 3000);
			return;
		}

		try {
			llmStatus = 'Testing LLM connection...';
			const { llmAsk } = await import('$lib/utils/llm');
			await llmAsk({
				prompt: 'Hello, please respond with "Connection successful!"',
				temperature: 0.1
			});
			llmStatus = '✅ LLM connection successful!';
		} catch (error) {
			llmStatus = `❌ LLM connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
		}

		setTimeout(() => {
			llmStatus = '';
		}, 5000);
	}

	function clearLlmSettings() {
		setLLMConfig({
			url: '',
			token: '',
			model: '',
			timeout: 60000
		});
		loadLlmSettings();
		alert('LLM settings cleared from memory.');
	}

	function downloadReadme() {
		const readme = `LightNote v1 — tiny offline journal
-----------------------------------

QUICK START
1. Open index.html in your browser (Chrome, Firefox, Safari).
2. Start typing. Press Save (or Ctrl/Cmd+Enter) to store an entry.
3. Export/Import your notes anytime for backup.

WHAT IT IS
LightNote is a lightweight, private, offline journal.
- Runs entirely in your browser (no installs, no accounts).
- Notes are saved only in your browser's localStorage.
- Your data never leaves your device.

HOW TO USE
1. Open index.html in your browser.
2. Type freely in the big box.
3. Click Save Entry (or press Ctrl/Cmd+Enter for Quick Save).
4. Use Export for backups (JSON/CSV). Import restores from a previous export.

FEATURES
- 📝 Prompts: Get a daily journaling question (or write your own).
- 🔎 Search & Filters: Filter entries by text, tag, or date range.
- 🔒 Offline & Private: All notes stay in your browser (no servers, no tracking).
- 📊 Quick Analysis:
  • Entry + word counts
  • Average mood (sentiment analysis)
  • Top words (stop words removed)
  • Most-used tags
- 🔥 Streak Counter: Tracks your daily journaling streak.
- 💾 Backup/Restore: Export JSON/CSV, import back anytime.

HOW TO UPDATE
Replace index.html with a newer version.
As long as you keep the same browser/profile, your notes stay under the same storage key:
lightnote.entries.v1

TIPS
- Use #tags anywhere inside an entry to organise.
- Quick save with Ctrl/Cmd+Enter.

DATA & PRIVACY
- Everything stays on-device.
- No accounts. No cloud. No tracking.
`;

		download(readme, 'README.txt', 'text/plain');
	}

	function download(content: string, filename: string, type: string) {
		const blob = new Blob([content], { type });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = filename;
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 250);
	}

	function calculateSentimentForExistingEntries() {
		try {
			sentimentStatus = 'Calculating sentiment for existing entries...';
			addSentimentToEntries();
			sentimentStatus = 'Sentiment calculation completed! All entries now have sentiment data.';
			setTimeout(() => {
				sentimentStatus = '';
			}, 3000);
		} catch (error) {
			sentimentStatus = 'Error calculating sentiment: ' + (error as Error).message;
			setTimeout(() => {
				sentimentStatus = '';
			}, 5000);
		}
	}

	function exportJson() {
		const data = $entries;
		download(JSON.stringify(data, null, 2), 'lightnote-export.json', 'application/json');
		importExportStatus = 'JSON exported successfully!';
		setTimeout(() => {
			importExportStatus = '';
		}, 3000);
	}

	function exportCsv() {
		const items = [...$entries].sort((a, b) => a.created - b.created);
		const esc = (s: string) => '"' + String(s).replace(/"/g, '""') + '"';
		const rows = [['id', 'created_iso', 'updated_iso', 'prompt', 'text', 'tags']].concat(
			items.map((it) => [
				it.id,
				new Date(it.created).toISOString(),
				it.updated ? new Date(it.updated).toISOString() : '',
				it.prompt || '',
				it.text.replace(/\n/g, '\\n'),
				(it.tags || []).join(' ')
			])
		);
		const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
		download(csv, 'lightnote-export.csv', 'text/csv');
		importExportStatus = 'CSV exported successfully!';
		setTimeout(() => {
			importExportStatus = '';
		}, 3000);
	}

	function importJson(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) {
			importExportStatus = 'Choose a JSON file first.';
			setTimeout(() => {
				importExportStatus = '';
			}, 3000);
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = JSON.parse(String(e.target?.result));
				if (!Array.isArray(data)) throw new Error('Invalid JSON format');
				const existing = $entries;
				const ids = new Set(existing.map((x) => x.id));
				const merged = existing.concat(data.filter((x) => x && x.id && !ids.has(x.id)));
				saveEntries(merged);
				importExportStatus = 'Import complete!';
				setTimeout(() => {
					importExportStatus = '';
				}, 3000);
			} catch (err) {
				importExportStatus = 'Import failed: ' + (err as Error).message;
				setTimeout(() => {
					importExportStatus = '';
				}, 5000);
			}
		};
		reader.readAsText(file);
	}
</script>

<details class="card readme" bind:open={showReadme}>
	<summary><b>README (click to view)</b></summary>
	<div class="row" style="margin-top: 10px">
		<div class="smallnote">
			<p>
				<b>What it is:</b> LightNote v1 is a lightweight, private, offline journal. Your notes stay in
				your browser (localStorage) and never touch a server.
			</p>
			<p>
				<b>How to use:</b> Open this file in your browser, write in the big box, hit <i>Save</i>.
				Use Export for backups. Import restores from a previous export.
			</p>
			<p>
				<b>How to update:</b> Replace this file with a newer version. If you keep using the same browser/profile,
				your notes remain under the same storage key.
			</p>
			<p><button class="secondary" on:click={downloadReadme}>Download README.txt</button></p>
		</div>
	</div>
</details>

<details class="card llm-settings" bind:open={showLlmSettings}>
	<summary><b>LLM Settings</b></summary>
	<div class="row" style="margin-top: 10px; flex-direction: column; gap: 8px">
		<label>
			Endpoint URL<br />
			<input bind:value={llmUrl} placeholder="https://api.together.xyz/v1/chat/completions" />
		</label>
		<label>
			API Token<br />
			<input bind:value={llmToken} type="password" placeholder="sk-..." />
		</label>
		<label>
			Model<br />
			<input bind:value={llmModel} placeholder="meta-llama/Meta-Llama-3-8B-Instruct-Turbo" />
		</label>
		<label>
			Timeout (ms)<br />
			<input bind:value={llmTimeout} type="number" min="1000" step="1000" placeholder="60000" />
		</label>
		<div class="flex" style="margin-top: 6px; gap: 8px">
			<button class="secondary" on:click={saveLlmSettings}>Save</button>
			<button class="secondary" on:click={testLlmConnection}>Test Connection</button>
			<button class="secondary" on:click={clearLlmSettings}>Clear</button>
		</div>
		{#if llmStatus}
			<div class="smallnote" style="margin-top: 8px; color: var(--accent);">
				{llmStatus}
			</div>
		{/if}
		<small class="subtle"
			>Stored securely in memory only. Configure these settings to enable AI insights. Settings are
			not persisted to localStorage for security.</small
		>
	</div>
</details>

<details class="card data-management" bind:open={showDataManagement}>
	<summary><b>Data Management</b></summary>
	<div class="row" style="margin-top: 10px; flex-direction: column; gap: 8px">
		<div>
			<h4>Sentiment Analysis</h4>
			<p class="smallnote">
				Calculate sentiment data for existing entries that don't have it yet. This will add mood
				analysis to older entries.
			</p>
			<button class="secondary" on:click={calculateSentimentForExistingEntries}>
				Calculate Sentiment for Existing Entries
			</button>
			{#if sentimentStatus}
				<div class="smallnote" style="margin-top: 8px; color: var(--accent);">
					{sentimentStatus}
				</div>
			{/if}
		</div>
	</div>
</details>

<details class="card import-export" bind:open={showImportExport}>
	<summary><b>Import Existing Entries</b></summary>
	<div class="row" style="margin-top: 10px; flex-direction: column; gap: 8px">
		<div>
			<h4>Export Data</h4>
			<p class="smallnote">
				Export your entries to backup files. Choose JSON for full data or CSV for spreadsheet
				compatibility.
			</p>
			<div class="flex" style="gap: 8px; margin-bottom: 16px">
				<button class="secondary" on:click={exportJson}>Export JSON</button>
				<button class="secondary" on:click={exportCsv}>Export CSV</button>
			</div>
		</div>

		<div>
			<h4>Import Data</h4>
			<p class="smallnote">
				Import entries from a previous export. Only JSON files are supported. Duplicate entries will
				be skipped.
			</p>
			<div class="flex" style="gap: 8px; align-items: center">
				<input type="file" on:change={importJson} accept=".json" />
				<button class="secondary">Import</button>
			</div>
		</div>

		{#if importExportStatus}
			<div class="smallnote" style="margin-top: 8px; color: var(--accent);">
				{importExportStatus}
			</div>
		{/if}
	</div>
</details>
