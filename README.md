# Lightnote - AI-Powered Journaling App

A SvelteKit application for AI-powered journaling with enhanced insights generation and contradiction detection.

## Features

- 🤖 **AI-Powered Insights** - Generate meaningful insights from your journal entries
- 🔍 **Contradiction Detection** - Identify internal conflicts and emotional tensions
- 📊 **Evidence-Based Analysis** - Extract and categorize key quotes from your entries
- 🎯 **Emotional Arc Tracking** - Follow the progression from temptation to decision
- 📱 **Modern UI** - Clean, responsive interface built with SvelteKit

## Live Demo

🌐 **[View Live Demo](https://thirteenaladdins.github.io/lightnote-sveltekit/)**

## Development

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
# Clone the repository
git clone https://github.com/thirteenaladdins/lightnote-sveltekit.git
cd lightnote-sveltekit

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Testing AI Insights

Open the browser console and use these test functions:

```javascript
// Test the improved insights system with a conflict example
testConflictInsights()

// Test with a specific entry ID
testImprovedInsights("entry-id")

// Compare with original system
testAIInsights("entry-id")
```

## Building

To create a production build:

```bash
npm run build
```

## Deployment

This app is automatically deployed to GitHub Pages on every push to the `master` branch.

## Architecture

- **Frontend**: SvelteKit with TypeScript
- **AI Processing**: Custom LLM integration with evidence extraction
- **Storage**: Local storage with structured data models
- **Insights**: Two-step process (evidence extraction → composition)

## License

MIT