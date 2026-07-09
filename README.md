# 📰 NewsPulse AI

> **AI-Powered News Intelligence — Search. Scrape. Summarize.**

Search any topic and get the latest articles from across the web, each summarized into 2–3 crisp sentences by `gpt-4o-mini`. Every search is saved to Supabase so you can replay past queries, view results, or wipe the slate.

Built for the **Outskill AI Generalist Accelerator Hackathon**.

---

## 🛠️ Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-38BDF8?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o--mini-412991?logo=openai&logoColor=white)
![Firecrawl](https://img.shields.io/badge/Firecrawl-%2Fv1%2Fsearch-FF7043)
![Vercel](https://img.shields.io/badge/Vercel-deploy-000?logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📸 Screenshots

> _Screenshots below show the live UI populated with representative sample data._

| Search | History |
|---|---|
| ![Search UI](./public/screenshots/search.png) | ![History table](./public/screenshots/history.png) |

---

## ✨ Features

- 🔎 **Live web search** — Firecrawl `/v1/search` pulls fresh news for any keyword
- 🧠 **AI summaries** — every article is summarized in parallel by OpenAI `gpt-4o-mini`
- 💾 **Saved history** — every query and its results land in Supabase
- 📋 **History table** — keyword, date, count, expand-to-view, re-run, clear all
- 🎨 **Dark, polished UI** — Tailwind + lucide-react + Inter font
- ⚡ **API-first** — `POST /api/search`, `GET/DELETE /api/history`, `GET /api/health`
- 🚀 **Vercel-ready** — auto-deploy on push to `main` via GitHub Actions

---

## 🚀 Setup

### 1. Clone & install

```bash
git clone https://github.com/<your-username>/newspulse-ai.git
cd newspulse-ai
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your keys:

```bash
FIRECRAWL_API_KEY=fc-...
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

Verify with the included script (it never prints full secrets):

```bash
npm run check-env
```

### 3. Run the Supabase schema

Open the **Supabase SQL editor** and paste the contents of [`supabase/schema.sql`](./supabase/schema.sql). It creates the `news_searches` table, indexes, and RLS policies.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🌐 Deploy to Vercel

### Option A — One-click via CLI

```bash
npm install -g vercel
vercel login
vercel link            # creates a project named "newspulse-ai"
vercel env add FIRECRAWL_API_KEY            # repeat for each var
vercel env add OPENAI_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel --prod
```

### Option B — GitHub auto-deploy

Push to `main`. The included [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) builds and deploys to Vercel automatically. Set three GitHub secrets first:

- `VERCEL_TOKEN` — from https://vercel.com/account/tokens
- `VERCEL_ORG_ID` — from `.vercel/project.json` after `vercel link`
- `VERCEL_PROJECT_ID` — from `.vercel/project.json` after `vercel link`

```bash
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID
gh secret set VERCEL_PROJECT_ID
```

---

## 🔑 Where to get API keys

| Service | Link | What you need |
|---|---|---|
| Firecrawl | https://firecrawl.dev | API key (Dashboard → API Keys) |
| OpenAI | https://platform.openai.com/api-keys | API key |
| Supabase | https://supabase.com | Project URL + publishable + secret keys (Settings → API) |

---

## 📂 Project structure

```
newspulse-ai/
├── app/
│   ├── api/
│   │   ├── health/route.ts          # GET /api/health
│   │   ├── history/[id]/route.ts    # GET /api/history/:id, DELETE /api/history/:id
│   │   ├── history/route.ts         # GET /api/history, DELETE /api/history (clear all)
│   │   └── search/route.ts          # POST /api/search
│   ├── history/[id]/page.tsx        # /history/:id — single saved search
│   ├── history/page.tsx             # /history — table of all saved searches
│   ├── error.tsx                    # global error boundary
│   ├── globals.css                  # Tailwind + dark-theme tokens
│   ├── icon.tsx                     # programmatic favicon
│   ├── layout.tsx                   # root layout, header, footer, Inter font
│   ├── loading.tsx                  # route-transition skeleton
│   ├── not-found.tsx                # 404
│   ├── opengraph-image.tsx          # 1200×630 social card
│   ├── page.tsx                     # / — search UI
│   ├── robots.ts                    # robots.txt
│   └── sitemap.ts                   # sitemap.xml
├── components/
│   ├── EmptyState.tsx
│   └── NewsCard.tsx
├── lib/
│   ├── firecrawl.ts                 # Firecrawl /v1/search wrapper
│   ├── openai.ts                    # gpt-4o-mini summarizer
│   ├── supabase.ts                  # supabase client + helpers
│   └── utils.ts                     # cn() + date formatters
├── scripts/
│   └── check-env.mjs                # verify env vars without leaking values
├── supabase/
│   └── schema.sql                   # news_searches table + RLS
├── types/
│   └── index.ts                     # shared API types
├── .github/workflows/
│   ├── ci.yml                       # lint, type-check, build
│   └── deploy.yml                   # Vercel production deploy on push to main
├── .env.example
├── middleware.ts                    # rate limit on /api/search
├── next.config.js
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vercel.json
```

---

## 🧪 Available scripts

```bash
npm run dev           # local dev server
npm run build         # production build
npm run start         # production server
npm run lint          # next lint
npm run type-check    # tsc --noEmit
npm run format        # prettier write
npm run check-env     # verify .env.local without printing secrets
```

---

## 🧠 How it works

```
User keyword
    │
    ▼
POST /api/search
    │
    ├─► 1. Firecrawl /v1/search       (web search + scrape, limit 10)
    │       returns title, url, markdown content per article
    │
    ├─► 2. OpenAI gpt-4o-mini         (parallel summarization, concurrency=4)
    │       returns 2–3 sentence neutral summary per article
    │
    ├─► 3. Supabase `news_searches`   (insert: keyword, results JSONB, count)
    │
    └─► returns { title, url, source, date, description, ai_summary }[]
```

---

## 🏆 Hackathon Notes

- **Project:** NewsPulse AI
- **Tagline:** *AI-Powered News Intelligence — Search. Scrape. Summarize.*
- **Differentiator:** Real-time AI summaries + persistent search history
- **Built for:** Outskill AI Generalist Accelerator Hackathon

---

## 📄 License

MIT — see [`LICENSE`](./LICENSE).
