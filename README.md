# EURO AI

> **AI Governance Made Simple**

Transform AI governance from a compliance checklist into a strategic advantage. Meet EU AI Act obligations with confidence.

EURO AI is a multi-tenant platform for managing AI systems, assessing regulatory compliance, collecting evidence, and tracking remediation — all in one elegant interface.

---

## 🛠️ Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-38BDF8?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres%20%2B%20RLS-3FCF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-deploy-000?logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ What it does

- 🔐 **Real authentication** — email/password sign-up, sign-in, and email confirmation via Supabase (`@supabase/ssr` cookie sessions). The middleware validates the JWT on every protected request.
- 🏢 **Workspace onboarding** — a signed-in user creates a workspace, company profile, and owner membership in one step (`POST /api/workspace`).
- 🛡️ **Multi-tenant by design** — Row Level Security is enforced at the database layer; API routes act as the signed-in user, never bypassing RLS.
- 📊 **Onboarding dashboard** — reflects the real workspace state read back from the database, not hard-coded defaults.
- 🧱 **Governance data model** — schema for AI systems, risk assessments, obligations, evidence, and remediation plans (the EU AI Act workflow).
- 🚦 **Hardened edge** — per-IP rate limiting on the API, security response headers (HSTS, `X-Frame-Options`, …), open-redirect-safe post-auth redirects, and validated request bodies.
- 📱 **Installable PWA** — web manifest + icons; add to the iOS Home Screen from Safari.

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

Fill in `.env.local` (see `.env.example`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
# Optional — absolute site URL for metadata/redirects:
# NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

Verify with the included script (it never prints full secrets):

```bash
npm run check-env
```

### 3. Provision Supabase

1. Open the **Supabase SQL editor** and run [`supabase/schema.sql`](./supabase/schema.sql). It is idempotent and creates the tenant tables (`workspaces`, `workspace_members`, `companies`, `profiles`) plus the governance tables (`ai_systems`, `risk_assessments`, `obligations`, `evidence`, `remediation_plans`) — all with RLS policies.
2. Enable the **Email** auth provider in **Project Settings → Authentication** so sign-up confirmation emails are sent.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🌐 Deploy to Vercel

Connect the repository to a Vercel project (Dashboard → Project → Settings → Git) and add the three Supabase environment variables. Vercel then builds automatically: every push to `main` goes to production, and every pull request gets its own preview deployment.

---

## 📂 Project structure

```
app/
├── api/
│   ├── dashboard/route.ts        # GET  /api/dashboard — governance state
│   ├── health/route.ts           # GET  /api/health
│   └── workspace/route.ts        # POST /api/workspace — create workspace + company
├── auth/
│   ├── signin/page.tsx           # /auth/signin
│   ├── signup/page.tsx           # /auth/signup
│   ├── verify-email/page.tsx     # /auth/verify-email
│   └── confirm/route.ts          # /auth/confirm — email link handler (PKCE / OTP)
├── workspace/setup/page.tsx      # /workspace/setup — onboarding form
├── dashboard/page.tsx            # /dashboard — onboarding dashboard (auth required)
├── governance/page.tsx           # /governance
├── privacy/ · terms/             # legal pages
├── layout.tsx · page.tsx         # root layout + landing page
lib/
├── auth.ts                       # client auth helpers
├── routes.ts                     # route classification + safeInternalPath guard
├── rate-limit.ts                 # per-IP fixed-window limiter
├── supabase.ts                   # browser + admin Supabase clients
├── supabase-server.ts            # cookie-aware server client (RLS)
└── workspace-validation.ts       # request-body validation for /api/workspace
middleware.ts                     # rate limiting + session refresh + auth routing
supabase/schema.sql               # tables + RLS policies
tests/                            # vitest unit + Playwright e2e (mocked Supabase)
```

---

## 🧪 Available scripts

```bash
npm run dev           # local dev server
npm run build         # production build
npm run start         # production server
npm run lint          # next lint
npm run type-check    # tsc --noEmit
npm test              # unit/integration tests (vitest)
npm run test:e2e      # Playwright e2e against a mocked Supabase (no secrets needed)
npm run format        # prettier write
npm run check-env     # verify .env.local without printing secrets
```

The e2e suite (`tests/e2e/`) mocks Supabase (including GoTrue auth) so it exercises the real customer journey — sign-in → workspace creation → dashboard — without live credentials.

---

## 🔒 Security

- **Auth:** `getUser()` (not `getSession()`) validates the JWT server-side on every protected request; sessions are refreshed via cookies in the middleware.
- **Authorization:** Row Level Security in Postgres; user-scoped route client never bypasses it.
- **Edge hardening:** API rate limiting (`middleware.ts` + `lib/rate-limit.ts`), security headers (`next.config.js`), open-redirect-safe redirects (`lib/routes.ts` `safeInternalPath`), and validated request bodies (`lib/workspace-validation.ts`).

---

## 📄 License

MIT — see [`LICENSE`](./LICENSE).
