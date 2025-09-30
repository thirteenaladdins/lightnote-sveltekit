#!/usr/bin/env node

/**
 * Script to check and help configure Supabase redirect URLs
 * Run this to see what URLs are currently configured and what you need to add
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('❌ Missing Supabase environment variables');
	console.log('Please make sure you have .env.local with:');
	console.log('PUBLIC_SUPABASE_URL=your_supabase_url');
	console.log('PUBLIC_SUPABASE_ANON_KEY=your_supabase_key');
	process.exit(1);
}

console.log('🔍 Checking Supabase configuration...');
console.log('Supabase URL:', supabaseUrl);

// Note: We can't directly check the redirect URLs via API
// This is a manual configuration in the Supabase dashboard
console.log('\n📋 To fix the magic link redirect issue:');
console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
console.log('2. Select your project');
console.log('3. Go to Authentication > URL Configuration');
console.log('4. Add these URLs to "Redirect URLs":');
console.log('   - http://localhost:5173/auth/callback');
console.log('   - http://localhost:5174/auth/callback');
console.log('   - http://localhost:5175/auth/callback');
console.log('   - http://localhost:5176/auth/callback');
console.log('   - http://localhost:3000/auth/callback');
console.log('5. Make sure your Site URL is set to your production URL:');
console.log('   - https://lightnote-sveltekit.vercel.app');
console.log('\n💡 The Site URL is used as the default, but Redirect URLs allow specific callbacks');

console.log('\n🔧 Current environment detection:');
console.log(
	'Current origin would be:',
	process.env.NODE_ENV === 'development'
		? 'http://localhost:5176'
		: 'https://lightnote-sveltekit.vercel.app'
);
console.log(
	'Magic links will redirect to:',
	process.env.NODE_ENV === 'development'
		? 'http://localhost:5176/auth/callback'
		: 'https://lightnote-sveltekit.vercel.app/auth/callback'
);
