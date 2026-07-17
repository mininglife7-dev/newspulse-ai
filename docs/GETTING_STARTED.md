# Getting Started with NewsPulse AI

A Next.js 14 application for searching news articles and generating AI summaries using Firecrawl, OpenAI, and Supabase.

---

## Prerequisites

- **Node.js** 18+ and npm 9+
- **Git** for version control

## Quick Start (Demo Mode)

To run the application immediately without any external API keys:

```bash
# 1. Clone the repository
git clone https://github.com/mininglife7-dev/newspulse-ai.git
cd newspulse-ai

# 2. Install dependencies
npm install

# 3. Run with demo mode (no API keys required)
DEMO_MODE=true npm run dev

# 4. Open http://localhost:3000
```

**Demo mode behavior:**

- Search returns mock articles (same data regardless of keyword)
- History is empty (searches not persisted)
- All pages work normally (just with sample data)
- Perfect for testing UI and features without external dependencies

---

## Full Setup (Real Search)

To use real news search and AI summaries, configure these services:

### 1. Get API Keys

#### Firecrawl (Web Search & Scraping)

```bash
# Visit https://firecrawl.dev
# Sign up for free account
# Create API key
# Copy to FIRECRAWL_API_KEY
```

#### OpenAI (Article Summarization)

```bash
# Visit https://platform.openai.com/api-keys
# Create new secret key
# Copy to OPENAI_API_KEY
```

#### Supabase (Search History Storage)

```bash
# Visit https://supabase.com/dashboard
# Create new project
# In Project Settings → API:
#   - Copy PROJECT_URL to NEXT_PUBLIC_SUPABASE_URL
#   - Copy anon public key to NEXT_PUBLIC_SUPABASE_ANON_KEY
#   - Copy service_role key to SUPABASE_SERVICE_ROLE_KEY
```

### 2. Create `.env.local` File

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```env
# Required for real search
FIRECRAWL_API_KEY=your-firecrawl-api-key-here
OPENAI_API_KEY=sk-your-openai-api-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Optional
DEMO_MODE=false
```

### 3. Set Up Supabase Database

Supabase automatically creates the necessary tables when you first run the app, but you can manually create the schema:

```sql
-- Create news_searches table
CREATE TABLE public.news_searches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword text NOT NULL,
  results jsonb NOT NULL DEFAULT '[]',
  result_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.news_searches ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (anon key)
CREATE POLICY "Enable read access for all users"
ON public.news_searches FOR SELECT USING (true);

-- Allow service role to insert
CREATE POLICY "Enable insert for service role"
ON public.news_searches FOR INSERT WITH CHECK (true);

-- Allow service role to delete
CREATE POLICY "Enable delete for service role"
ON public.news_searches FOR DELETE USING (true);
```

### 4. Run the App

```bash
npm run dev
```

Visit http://localhost:3000

---

## Available Commands

```bash
# Development server (auto-reload on file changes)
npm run dev

# Production build
npm run build

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code with Prettier
npm run format

# Type check without building
npm run type-check
```

---

## Project Structure

```
newspulse-ai/
├── app/                     # Next.js App Router
│   ├── api/                 # API routes
│   │   ├── search/         # POST /api/search
│   │   ├── history/        # GET/DELETE /api/history
│   │   ├── dashboard/      # GET /api/dashboard (governance state)
│   │   └── health/         # GET /api/health (system status)
│   ├── dashboard/          # Dashboard page (governance UI)
│   ├── history/            # Search history page
│   └── page.tsx            # Home page (search UI)
│
├── components/             # React components
│   ├── dashboard/          # Dashboard components
│   ├── ui/                 # Reusable UI components
│   └── NewsCard.tsx        # Article result card
│
├── lib/                    # Utilities
│   ├── governance-state.ts # Canonical state builder
│   ├── supabase.ts        # Supabase client
│   ├── firecrawl.ts       # Firecrawl API client
│   ├── openai.ts          # OpenAI API client
│   └── utils.ts           # Helper functions
│
├── types/                  # TypeScript type definitions
│   └── governance.ts       # Governance state schema
│
├── tests/                  # Unit tests (Vitest)
├── docs/                   # Documentation
│   ├── API.md             # API reference
│   └── GETTING_STARTED.md # This file
│
└── public/                 # Static assets
```

---

## Testing

### Run All Tests

```bash
npm run test
```

### Run Specific Test File

```bash
npm run test -- tests/api-search.test.ts
```

### Watch Mode

```bash
npm run test:watch
```

### Check Coverage

```bash
npm run test -- --coverage
```

---

## Deployment

### Deploy to Vercel (Recommended)

```bash
# Connect repository to Vercel
# https://vercel.com/new/git/external

# Vercel will:
# - Run npm install
# - Run npm run build
# - Deploy the app
```

**Environment Variables:**
Add to Vercel project settings:

- `FIRECRAWL_API_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Deploy to Other Platforms

The app is a standard Next.js application and can be deployed to:

- AWS Amplify
- Netlify
- Docker (containerized)
- Self-hosted Node.js servers

---

## Troubleshooting

### "Missing FIRECRAWL_API_KEY"

- Run with `DEMO_MODE=true` to use mock data
- Or get API key from https://firecrawl.dev

### "Missing Supabase credentials"

- Set up Supabase project and add keys to `.env.local`
- Or run with `DEMO_MODE=true` to skip persistence

### Port 3000 already in use

```bash
# Use a different port
PORT=3001 npm run dev
```

### TypeScript errors

```bash
# Rebuild TypeScript
npm run type-check

# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Tests fail

```bash
# Reset modules and try again
npm run test -- --reporter=verbose

# Clear Next.js cache
rm -rf .next
npm run test
```

---

## Development Tips

### 1. Use Demo Mode During Development

```bash
DEMO_MODE=true npm run dev
```

This avoids burning through API quota during development.

### 2. Check API Status

```bash
curl http://localhost:3000/api/health
```

Shows which services are configured.

### 3. View Console Logs

Check browser console (`Cmd+Option+J` on Mac, `Ctrl+Shift+J` on Windows) for client-side errors.

### 4. Inspect Network Requests

Use browser DevTools → Network tab to see API responses and errors.

### 5. Read API Documentation

See `docs/API.md` for complete endpoint reference.

---

## Contributing

1. Create a new branch: `git checkout -b feature/my-feature`
2. Make changes and test: `npm run test`
3. Lint: `npm run lint`
4. Commit: `git commit -am "Add my feature"`
5. Push: `git push origin feature/my-feature`
6. Create Pull Request on GitHub

---

## Next Steps

- ✅ Run the app in demo mode
- ✅ Explore the UI at http://localhost:3000
- ✅ Try searching with suggestions buttons
- ✅ View the governance dashboard at /dashboard
- 📖 Read `docs/API.md` to understand the API
- 🔧 Configure real API keys for production use
- 🚀 Deploy to Vercel or your preferred platform

---

## Support

- **Issues:** GitHub Issues tab
- **Discussions:** GitHub Discussions
- **Documentation:** `docs/` directory

---

Last updated: July 10, 2026
