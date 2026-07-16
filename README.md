# EURO AI

> **AI Governance Made Simple**

Transform AI governance from a compliance checklist into a strategic advantage. Meet EU AI Act obligations with confidence.

EURO AI is a multi-tenant platform for managing AI systems, assessing regulatory compliance, collecting evidence, and tracking remediation — all in one elegant interface.

---

## 🛠️ Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-38BDF8?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-deploy-000?logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

- 🎯 **AI Inventory** — Catalog all AI systems, vendors, and use cases in your organization
- 📊 **Risk Analysis** — Classify risks and understand EU AI Act obligations
- 📋 **Evidence Collection** — Gather and organize compliance documentation
- ✅ **Remediation Tracking** — Plan and execute compliance actions
- 🔐 **Multi-tenant** — Workspace isolation with role-based access control (RBAC)
- 🚀 **Vercel-ready** — auto-deploy on push via the Vercel GitHub integration
- 🧬 **Evolution engine (CEIS)** — a self-improvement subsystem that studies public AI knowledge weekly, extracts principles, and proposes evidence-based missions behind quality gates — see [`docs/CEIS.md`](./docs/CEIS.md)

---

## 🚀 Setup

### 1. Clone & install

```bash
git clone https://github.com/mininglife7-dev/newspulse-ai.git
cd newspulse-ai
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase keys:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

Verify with the included script (it never prints full secrets):

```bash
npm run check-env
```

### 3. Deploy the Supabase schema

**⚠️ Critical step — do this before any users sign up:**

1. Open the **Supabase SQL editor** for your project
2. Copy the entire contents of [`supabase/schema.sql`](./supabase/schema.sql)
3. Paste into the SQL editor and run
4. Enable "Email" auth in **Project Settings → Auth** (required for signup)

The schema is **idempotent** — safe to run multiple times.

To enable the Evolution engine, also run [`supabase/ceis-schema.sql`](./supabase/ceis-schema.sql) (five `ceis_*` tables). See [`docs/CEIS.md`](./docs/CEIS.md) for the full architecture and the founder/CTO/user guides in [`docs/`](./docs).

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
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel --prod
```

### Option B — GitHub auto-deploy (active)

Connect the repository to the Vercel project (Vercel Dashboard → Project → Settings → Git). Vercel then builds and deploys automatically: every push to `main` goes to production, and every pull request gets a preview deployment with its own URL commented on the PR.

---

## 🔑 Where to get credentials

| Service  | Link                 | What you need                                            |
| -------- | -------------------- | -------------------------------------------------------- |
| Supabase | https://supabase.com | Project URL + publishable + secret keys (Settings → API) |

---

## 📂 Project structure

```
newspulse-ai/
├── app/
│   ├── api/
│   │   ├── health/route.ts                 # GET /api/health
│   │   ├── workspace/route.ts              # POST /api/workspace (create workspace + member)
│   │   ├── dashboard/route.ts              # GET /api/dashboard (readiness state)
│   │   ├── blocking-conditions/route.ts    # GET /api/blocking-conditions (GitHub Actions, etc.)
│   │   ├── production-health/route.ts      # GET /api/production-health (monitoring)
│   │   └── ...other health endpoints
│   ├── auth/
│   │   ├── signin/page.tsx                 # /auth/signin
│   │   ├── signup/page.tsx                 # /auth/signup
│   │   ├── confirm/route.ts                # /auth/confirm (email verification)
│   │   └── verify-email/page.tsx           # /auth/verify-email
│   ├── governance/page.tsx                 # /governance dashboard
│   ├── workspace/setup/page.tsx            # /workspace/setup (onboarding)
│   ├── dashboard/page.tsx                  # /dashboard (requires auth)
│   ├── error.tsx                           # global error boundary
│   ├── globals.css                         # Tailwind + dark-theme
│   ├── layout.tsx                          # root layout, header, footer
│   ├── page.tsx                            # / — landing page
│   ├── privacy/page.tsx                    # /privacy (DRAFT — review with counsel)
│   └── terms/page.tsx                      # /terms (DRAFT — review with counsel)
├── components/
│   ├── ui/                                 # headless UI components
│   └── dashboard/                          # governance dashboard components
├── lib/
│   ├── supabase.ts                         # Supabase client + helpers
│   └── utils.ts                            # shared utilities
├── scripts/
│   └── check-env.mjs                       # verify env vars without leaking values
├── supabase/
│   └── schema.sql                          # complete database schema + RLS policies
├── types/
│   └── index.ts                            # shared types
├── .github/workflows/
│   └── ci.yml                              # lint, type-check, build, test
├── .env.example
├── middleware.ts                           # auth session validation
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
npm test              # unit/integration tests (vitest)
npm run test:watch    # unit tests, watch mode
npm run test:e2e      # Playwright smoke suite
npm run format        # prettier write
npm run check-env     # verify .env.local without printing secrets
```

---

## 🏆 Architecture

```
User signup (email)
    │
    ▼
POST /auth/confirm
    ├─► Supabase verifyOtp() (email confirmation)
    ├─► create auth session (JWT cookie)
    └─► redirect to /workspace/setup
        │
        ▼
      POST /api/workspace
        ├─► validate input (workspace slug, company name, etc.)
        ├─► create workspace + company + profile in Supabase (RLS enforced)
        └─► redirect to /dashboard
            │
            ▼
          [Access AI Inventory, Risk Analysis, Evidence Collection]
```

---

## 📊 Observability & Autonomous Monitoring

EURO AI implements a **5-layer observability system** that continuously monitors production health and triggers autonomous responses. The system runs every 60 seconds and achieves ~99% autonomy for technical issues — only CRITICAL incidents (component down, error rate >5%) escalate to the Founder.

### Quick Start

No setup required. Monitoring starts automatically on app initialization via `lib/init-monitoring.ts`.

**Check monitoring status:**

```bash
curl https://your-app.com/api/init
```

**View recent investigations:**

```bash
curl https://your-app.com/api/metrics/investigations?limit=10&severity=critical
```

### 5-Layer Architecture

| Layer             | Endpoint                      | Monitors                                                         | Interval  |
| ----------------- | ----------------------------- | ---------------------------------------------------------------- | --------- |
| **1. Health**     | `GET /api/health/detailed`    | 6 components (database, auth, session, RLS, triggers, functions) | 60s       |
| **2. Errors**     | `GET /api/errors`             | Error rate & trends                                              | 60s       |
| **3. Funnel**     | `GET /api/metrics/journey`    | 7-stage customer conversion (signup → first AI system)           | on-demand |
| **4. Database**   | `GET /api/metrics/database`   | Query latency, connection pool, RLS compliance, cache            | on-demand |
| **5. Deployment** | `GET /api/metrics/deployment` | CI/CD, test results, rollback health                             | Phase 3+  |

### Incident Severity Routing

| Severity        | Response                       | Escalation           |
| --------------- | ------------------------------ | -------------------- |
| 🔴 **CRITICAL** | Auto-investigate + escalate    | SMS/Email to Founder |
| 🟠 **HIGH**     | Auto-investigate + create task | No escalation        |
| 🟡 **MEDIUM**   | Auto-log + trend track         | No escalation        |
| ⚪ **INFO**     | Log for trends                 | No escalation        |

**Critical Thresholds:**

- Error rate > 5%
- Any component down
- Connection pool > 95% (critical)
- Query latency > 2000ms
- Cache hit rate < 75%
- RLS policy violation

### Auto-Repair Workflows

When HIGH or CRITICAL incidents occur, the monitoring loop automatically triggers investigation engines that:

1. **Analyze error signatures** — Categorize timeout, connection, memory errors
2. **Generate root causes** — Database indexes, connection leaks, cascading failures
3. **Suggest fixes** — Query optimization, connection scaling, memory leak investigation
4. **Provide recommendations** — Specific actions for on-call engineers

**Example investigation:**

```json
{
  "id": "INV-1784205620078",
  "issueType": "high_error_rate",
  "severity": "critical",
  "findings": [
    "Critical error rate detected: 7.25%",
    "Top error signature: TypeError: Cannot read property (42 occurrences)"
  ],
  "rootCausePossibilities": [
    "Database connection pool exhaustion",
    "External service timeout",
    "Memory leak"
  ],
  "recommendedActions": [
    "Escalate to on-call engineer",
    "Check external service status"
  ],
  "suggestedFixes": [
    {
      "type": "investigate",
      "severity": "critical",
      "target": "error_rate",
      "suggestedFix": "Review error logs, check external service status, verify database connectivity",
      "autoExecute": true
    }
  ]
}
```

**View investigations:**

```bash
# All investigations
curl https://your-app.com/api/metrics/investigations?limit=50

# By type
curl https://your-app.com/api/metrics/investigations?type=high_error_rate

# By severity
curl https://your-app.com/api/metrics/investigations?severity=critical
```

### Monitoring Architecture

```
[60s Interval]
    │
    ▼
[Health Check: database, auth, RLS, etc.]
[Error Check: error rate & trends]
    │
    ▼
[Store in 60-check history window (1 hour)]
    │
    ▼
[Incident Detection]
    ├─► Critical? → Escalate + Auto-repair
    ├─► High? → Auto-repair + Create task
    ├─► Medium? → Log + Trend track
    └─► Info? → Log only
    │
    ▼
[Trend Analysis]
    ├─► Increasing error rates (3+ checks)
    ├─► Intermittent failures (component up/down alternating)
    └─► Sustained degradation (consistent elevated errors)
```

### Configuration

All monitoring constants in `lib/observability/monitoring-loop.ts`:

```typescript
private intervalMs = 60000;           // Check every 60 seconds
private maxHistorySize = 60;          // Keep 1 hour of history
```

Incident thresholds in `detectIncident()`:

```typescript
if (result.errors.errorRate > 5) {
  // CRITICAL
} else if (result.errors.errorRate > 2) {
  // HIGH (auto-investigate)
}
```

### Testing

Observability system has 200+ tests covering all layers:

```bash
npm test -- tests/monitoring-loop.test.ts           # 49 tests
npm test -- tests/auto-repair.test.ts               # 39 tests
npm test -- tests/monitoring-loop-integration.test.ts # 34 tests
npm test -- tests/observability-endpoints.test.ts   # 25+ tests
```

### Documentation

For deep dives:

- **Architecture & design:** [`docs/observability/ARCHITECTURE.md`](./docs/observability/ARCHITECTURE.md)
- **Monitoring loop implementation:** [`lib/observability/monitoring-loop.ts`](./lib/observability/monitoring-loop.ts)
- **Auto-repair engine:** [`lib/observability/auto-repair.ts`](./lib/observability/auto-repair.ts)
- **Initialization:** [`lib/init-monitoring.ts`](./lib/init-monitoring.ts)

---

## 🔐 Security

- **Authentication:** Supabase Auth (email + magic links)
- **Authorization:** Row-Level Security (RLS) policies enforce multi-tenant isolation
- **Session management:** JWT cookies via @supabase/ssr middleware
- **Input validation:** TypeScript + Zod schema validation
- **Rate limiting:** Middleware on sensitive endpoints (opt-in `ADMIN_TOKEN` for destructive routes)

---

## 📋 Legal (⚠️ DRAFT)

- `/privacy` — Privacy policy (DRAFT, pending legal review)
- `/terms` — Terms of Service (DRAFT, pending legal review)

**Do not share publicly until reviewed with counsel.** These are templates; your legal obligations depend on your specific deployment and data practices.

---

## 🧠 What's next

### Completed (EURO AI integration)

- ✅ Multi-tenant authentication and workspace setup
- ✅ Authorization via Row-Level Security
- ✅ Email confirmation flow
- ✅ Governance dashboard scaffolding
- ✅ Blocking conditions detector (DNA-GOV-001)
- ✅ Production monitoring API (DNA-GOV-002)
- ✅ **5-Layer Observability System (Phase 2-3)**
  - ✅ API health monitoring (6 components)
  - ✅ Error tracking & incident detection
  - ✅ Customer journey funnel analysis (7-stage)
  - ✅ Database performance monitoring (queries, connection pool, RLS)
  - ✅ Auto-repair engine (error rate, slow query, connection pool investigations)
  - ✅ Autonomous monitoring loop (60s interval, incident routing, auto-repair triggering)
  - ✅ Investigations endpoint with filtering
- ✅ **1481 tests passing** (unit + integration + E2E)

### In Progress (Founder Actions)

- ⏳ Deploy Supabase schema via console (idempotent SQL)
- ⏳ Enable Email auth in Supabase settings
- ⏳ Verify Supabase project region (should be EU)

### Planned (Next Missions)

- **Auto-rollback on deployment health check failure** — Autonomous rollback when deployment health critical
- **Deployment health monitoring** — CI/CD pipeline status, test results, auto-remediation (Phase 3+)
- **AI system inventory interface** — Add/edit/delete AI systems in workspace
- **Risk assessment workflow** — Interactive EU AI Act questionnaire
- **Evidence collection** — File upload and annotation
- **Compliance reporting** — Executive dashboard with findings
- **German localization** — Full i18n for DE customers
- **Accessibility audit** — WCAG 2.1 AA compliance

---

## 📄 License

MIT — see [`LICENSE`](./LICENSE).

---

## 🤝 Contributing

Contributions welcome. See the [Governance Constitutions](./docs/governance/) for decision authority and technical standards.

---

**Questions?** Open an issue or check [`docs/`](./docs/) for technical details, architecture decisions, and risk registers.
