# Supabase Setup for Lightnote

This guide will help you set up Supabase for user authentication and database storage in your Lightnote journaling app.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization and enter project details:
   - Name: `lightnote` (or your preferred name)
   - Database Password: Generate a strong password
   - Region: Choose closest to your users
4. Click "Create new project"

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy the following values:
   - **Project URL** (looks like `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## 3. Set Up Environment Variables

Create a `.env` file in your project root with:

```env
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the values with your actual Supabase credentials.

## 4. Set Up the Database Schema

1. In your Supabase dashboard, go to the SQL Editor
2. Copy and paste the contents of `supabase-schema.sql` from this project
3. Click "Run" to execute the SQL

This will create:
- `profiles` table for user information
- `entries` table for journal entries
- `settings` table for user preferences
- Row Level Security (RLS) policies
- Triggers for automatic profile creation

## 5. Configure Authentication

1. In your Supabase dashboard, go to Authentication > Settings
2. Configure your site URL:
   - Site URL: `http://localhost:5173` (for development)
   - Redirect URLs: `http://localhost:5173/auth/callback`
3. Enable the providers you want:
   - Email (magic links) - enabled by default
   - Google, GitHub, Apple - configure as needed

## 6. Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:5173`
3. Click "Sign In" and test the authentication flow
4. Create a journal entry to test database storage

## Features Enabled

With Supabase integration, you now have:

### User Authentication
- Email magic links (passwordless login)
- OAuth providers (Google, GitHub, Apple)
- Automatic session management
- Cross-device sync

### Database Storage
- All journal entries stored in PostgreSQL
- User-specific data isolation with RLS
- Real-time updates across devices
- Automatic backups and scaling

### Data Structure
- **profiles**: User information and preferences
- **entries**: Journal entries with metadata, tags, and analysis
- **settings**: User preferences and app configuration

## Security Features

- Row Level Security (RLS) ensures users can only access their own data
- JWT tokens for secure authentication
- Automatic profile creation on signup
- Secure API endpoints with built-in validation

## Next Steps

1. Deploy your app to production
2. Update the Site URL in Supabase to your production domain
3. Consider setting up additional OAuth providers
4. Configure email templates for magic links
5. Set up monitoring and analytics

## Troubleshooting

### Common Issues

1. **"Invalid API key"**: Check your environment variables
2. **"User not authenticated"**: Ensure RLS policies are set up correctly
3. **"CORS error"**: Add your domain to allowed origins in Supabase
4. **"Email not sending"**: Check your SMTP settings in Supabase

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Supabase Discord Community](https://discord.supabase.com)
