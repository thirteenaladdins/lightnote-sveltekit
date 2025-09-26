#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Setting up Supabase for Lightnote...\n');

// Check if .env.local already exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
	console.log('✅ .env.local already exists');
	console.log('Please make sure it contains your Supabase credentials:\n');
	console.log('PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co');
	console.log('PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here\n');
} else {
	// Create .env.local template
	const envContent = `# Supabase Configuration
# Replace these with your actual Supabase project credentials
PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# To get these values:
# 1. Go to https://supabase.com and create a new project
# 2. Go to Settings > API in your Supabase dashboard
# 3. Copy the Project URL and anon public key
# 4. Replace the values above
`;

	fs.writeFileSync(envPath, envContent);
	console.log('✅ Created .env.local template');
}

console.log('📋 Next steps:');
console.log('1. Go to https://supabase.com and create a new project');
console.log('2. In your Supabase dashboard, go to Settings > API');
console.log('3. Copy your Project URL and anon public key');
console.log('4. Update the values in .env.local');
console.log('5. Run the SQL schema from supabase-schema.sql in your Supabase SQL editor');
console.log('6. Restart your development server: npm run dev\n');

console.log('📖 For detailed instructions, see SUPABASE_SETUP.md');
