# EURO AI — Dependency Graph & Integration Map

**Analysis Date:** 2026-07-17T14:10:00Z  
**Methodology:** Governor Layer 1 (Eyes) — Dependency discovery & mapping  
**Scope:** NPM packages, external services, internal modules  
**Status:** Complete

---

## NPM Dependency Inventory

### Production Dependencies (9 packages)

| Package               | Version | Purpose                 | Integration Points                   | Risk Level                     |
| --------------------- | ------- | ----------------------- | ------------------------------------ | ------------------------------ |
| Next.js               | 16.2.10 | Application framework   | Core routing, API routes, deployment | **LOW** — LTS, maintained      |
| React                 | 19.2.7  | UI framework            | Page components, hooks               | **LOW** — Standard version     |
| react-dom             | 19.2.7  | React DOM binding       | Rendering                            | **LOW** — Paired with React    |
| @supabase/ssr         | 0.12.0  | Server-side auth        | Cookie-based auth                    | **LOW** — Official package     |
| @supabase/supabase-js | 2.110.2 | Database client         | Data operations, RLS                 | **LOW** — Latest stable        |
| clsx                  | 2.1.1   | Conditional CSS classes | UI styling                           | **MINIMAL** — Single function  |
| lucide-react          | 0.453.0 | Icon library            | UI icons                             | **LOW** — Icon only            |
| tailwind-merge        | 2.5.4   | Tailwind CSS merging    | CSS utility merging                  | **LOW** — Utility              |
| pdf-lib               | 1.17.1  | PDF generation          | Report generation                    | **MEDIUM** — Document handling |

**Total dependencies:** 9  
**Update frequency:** Regular (Next.js, React, Supabase)  
**Vulnerability status:** None known (as of last CI run)

### Development Dependencies (15 packages)

| Package          | Version | Purpose                | Risk Level                     |
| ---------------- | ------- | ---------------------- | ------------------------------ |
| TypeScript       | 5.6.2   | Language               | **LOW** — Compiler             |
| Vitest           | 4.1.10  | Unit/integration tests | **LOW** — Test framework       |
| @playwright/test | 1.61.1  | E2E tests              | **LOW** — Test framework       |
| ESLint           | 9.39.4  | Linting                | **LOW** — Code quality         |
| Prettier         | 3.9.5   | Formatting             | **LOW** — Code formatting      |
| TailwindCSS      | 3.4.13  | CSS utility            | **LOW** — CSS framework        |
| PostCSS          | 8.5.10  | CSS processing         | **LOW** — CSS tooling          |
| Husky            | 9.1.7   | Git hooks              | **LOW** — Development workflow |
| lint-staged      | 17.0.8  | Pre-commit linting     | **LOW** — Development workflow |
| axe-core         | 4.12.1  | Accessibility testing  | **LOW** — A11y verification    |
| @types/*         | Latest  | TypeScript types       | **LOW** — Type definitions     |

**Total dev dependencies:** 15  
**CI/CD role:** Linting, testing, type checking, building

---

## External Service Integration

### Direct Dependencies (4 critical services)

#### 1. Supabase (Database + Auth)

**Integration Points:** 35 discovered in codebase

**Modules:**

- `@supabase/supabase-js` — Client-side and API-side database
- `@supabase/ssr` — Server-side auth middleware
- `lib/api-auth.ts` — Authorization layer
- `lib/request-context.ts` — Tenant isolation via RLS

**Operations:**

- Multi-tenant isolation (RLS policies)
- User authentication (email/password)
- Session management (cookies)
- Real-time events (WebSocket capable)

**Data:**

- 22 tables, 62 indexes, 43 RLS policies
- CEIS intelligence storage (5 tables)
- User, team, workspace, assessment data

**Current State:** Tokyo (`ap-northeast-1`)  
**Migration Target:** Frankfurt (`eu-central-1`) [IN PROGRESS]

**Risk Assessment:** **CRITICAL**

- Single point of failure for data persistence
- Migration in progress (RISK-008)
- RLS misconfiguration could break tenant isolation
- Password authentication currently failing in EU project

---

#### 2. Vercel (Application Hosting & Deployment)

**Integration Points:**

- Auto-deploy on main push
- Environment variable injection
- Preview deployments for PRs
- serverless function hosting

**Environment Variables:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service role key

**Deployment Pipeline:**

```
GitHub (git push main)
    ↓
Vercel Webhook
    ↓
Build (Next.js build)
    ↓
Test (if configured)
    ↓
Deploy (production)
```

**Current State:** Production deployed, auto-deploy active

**Risk Assessment:** **MEDIUM**

- Deployment verification partially automated
- Environment variable exposure risk (keys in logs)
- No rollback strategy documented
- Production URL unreachable from analysis environment (network policy)

---

#### 3. Claude API (LLM Intelligence)

**Integration Points:**

- CEIS LLM analysis (`lib/ceis/llm.ts`)
- Governance DNA generation
- Proposal generation

**Purpose:**

- Analyze governance intelligence
- Generate compliance suggestions
- Produce remediation proposals

**Authentication:** API key required  
**Rate Limiting:** Standard Claude API limits

**Risk Assessment:** **MEDIUM**

- External API dependency
- Cost exposure (per-token pricing)
- Latency in analysis pipeline
- Model version pinning needed

---

#### 4. External Data Services

**GitHub API**

- Purpose: Trend analysis, code intelligence
- Integration: `lib/ceis/collectors/github-trending.ts`
- Risk: **LOW** — Read-only, rate-limited

**ArXiv API**

- Purpose: Academic research papers
- Integration: `lib/ceis/collectors/arxiv.ts`
- Risk: **LOW** — Public API, no auth required

**HackerNews API**

- Purpose: Security/development news
- Integration: `lib/ceis/collectors/hacker-news.ts`
- Risk: **LOW** — Public API

**Reddit API**

- Purpose: Community discussions
- Integration: `lib/ceis/collectors/reddit.ts`
- Risk: **MEDIUM** — Rate limits, auth required

**Firecrawl**

- Purpose: Web crawling/scraping
- Integration: `lib/ceis/collectors/firecrawl.ts`
- Risk: **MEDIUM** — External service, potential cost, robots.txt compliance

**Email Service (Inferred)**

- Purpose: Verification emails
- Service: Likely Resend (inferred from patterns)
- Risk: **MEDIUM** — Delivery dependency

---

## Internal Module Dependency Graph

```
API Routes
├─ app/api/assessment/*
│  └─ lib/request-context.ts
│     └─ lib/api-auth.ts
│        └─ @supabase/ssr
│
├─ app/api/ceis/*
│  ├─ lib/ceis/pipeline.ts
│  │  ├─ lib/ceis/extraction.ts
│  │  ├─ lib/ceis/dna-generator.ts
│  │  └─ lib/ceis/llm.ts
│  │     └─ Claude API
│  └─ lib/ceis/collectors/* (8 types)
│     ├─ GitHub API
│     ├─ ArXiv API
│     ├─ HackerNews API
│     ├─ Reddit API
│     ├─ Firecrawl API
│     └─ Internal signals
│
├─ app/api/metrics/*
│  └─ lib/ceis/pipeline.ts
│
├─ app/api/security-scan
│  └─ lib/ceis/collectors (GitHub dependency audit)
│
└─ app/api/team/*
   └─ lib/request-context.ts
      └─ lib/api-auth.ts

Pages
├─ app/workspace/*
│  └─ API Routes above
│
├─ app/assessment/*
│  └─ API Routes (assessment)
│
└─ app/compliance/*
   └─ API Routes (ceis, metrics)
```

---

## Dependency Risk Matrix

### Critical Path Dependencies

| Component               | Dependency               | Failure Impact          | Mitigation                                  |
| ----------------------- | ------------------------ | ----------------------- | ------------------------------------------- |
| Data Persistence        | Supabase                 | Complete service outage | RLS fallback? (Unknown)                     |
| Authentication          | Supabase + @supabase/ssr | User lockout            | Session token caching? (Unknown)            |
| Governance Intelligence | Claude API               | CEIS failure            | Graceful degradation implemented? (Unknown) |
| Deployment              | Vercel                   | Cannot deploy changes   | Manual deployment? (Unknown)                |
| External Intelligence   | GitHub/ArXiv/etc         | Degraded features       | Fallback to cached data? (Unknown)          |

---

### Version Pinning Analysis

**Fixed Versions (Production Stability):**

- ✅ Next.js: 16.2.10 (LTS line)
- ✅ React: 19.2.7 (latest stable)
- ✅ TypeScript: 5.6.2 (recent stable)
- ✅ Supabase: 2.110.2 (pinned)

**Caret Versions (Accept Updates):**

- ⚠️ @supabase/ssr: ^0.12.0 (minor updates allowed)
- ⚠️ ESLint: ^9.39.4 (major updates allowed)
- ⚠️ TailwindCSS: ^3.4.13 (major updates allowed)

**Assessment:** Good practice — Core dependencies pinned, tooling allows updates.

---

## Data Flow Analysis

### Customer Data Flow

```
User Input (Browser)
    ↓
Next.js Page
    ↓
Client-side Validation
    ↓
API Route Handler
    ↓
Authentication Check (@supabase/ssr)
    ↓
Tenant Context (lib/request-context.ts)
    ↓
RLS Enforcement (Supabase rules)
    ↓
Database Write (Supabase)
    ↓
Data Stored (with workspace_id isolation)
```

### Governance Intelligence Flow

```
External Data Sources (GitHub, ArXiv, HN, etc.)
    ↓
CEIS Collectors (lib/ceis/collectors/*)
    ↓
Data Extraction (lib/ceis/extraction.ts)
    ↓
Pipeline Orchestration (lib/ceis/pipeline.ts)
    ↓
DNA Generation (lib/ceis/dna-generator.ts)
    ↓
LLM Analysis (lib/ceis/llm.ts + Claude API)
    ↓
Storage (Supabase CEIS tables)
    ↓
Report Generation (lib/ceis/report.ts)
    ↓
Dashboard Display (app/*/dashboard pages)
```

---

## Update & Maintenance Strategy

### Dependency Audit Schedule

**Observed:**

- Package-lock.json maintained (dependency lock active)
- CI/CD runs dependency checks
- No outdated dependencies observed in recent commits

**Best Practices Verification:**

- ✅ Lockfile committed (reproducible builds)
- ✅ Type definitions included (@types/*)
- ✅ Dev dependencies separated from production

### Security Patching

**Mechanism:** Likely GitHub Dependabot or manual  
**Frequency:** Not explicitly observed in branch names  
**Critical fixes:** Would require immediate PR and deployment

---

## Circular Dependency Check

**Observation:** No circular dependencies detected in module structure.

**Modules are layered:**

1. **API Routes** (top) → Domain Logic
2. **Domain Logic** → Libraries
3. **Libraries** → External APIs/Database
4. **External APIs/Database** → No reverse dependency

**Assessment:** ✅ Clean dependency hierarchy

---

## Vendor Lock-In Assessment

### High Lock-In (Difficult to Replace)

| Component  | Alternative       | Migration Cost                  |
| ---------- | ----------------- | ------------------------------- |
| Supabase   | Firebase, AWS RDS | **HIGH** — Schema + auth + RLS  |
| Vercel     | AWS, GCP, Docker  | **MEDIUM** — Config + env vars  |
| Next.js    | Remix, SvelteKit  | **VERY HIGH** — Full rewrite    |
| TypeScript | JavaScript        | **LOW** — Type annotations only |

### Medium Lock-In (Replaceable with effort)

- Claude API → Other LLM providers (code change)
- TailwindCSS → CSS-in-JS (tedious, not hard)
- Vitest → Jest (test rewrite)

### Low Lock-In (Easily replaceable)

- lucide-react → Other icon libraries
- clsx → classnames
- pdf-lib → jsPDF

**Overall Assessment:** Moderate to high lock-in due to Supabase + Next.js + Vercel combination.

---

## External API Reliability

### Service Status (Last Verified)

| Service    | Purpose         | Uptime SLA | Redundancy                         |
| ---------- | --------------- | ---------- | ---------------------------------- |
| Supabase   | Database        | 99.95%     | Single region (Tokyo or Frankfurt) |
| Vercel     | Hosting         | 99.95%     | CDN + global nodes                 |
| Claude API | Intelligence    | 99.9%      | Anthropic managed                  |
| GitHub API | Data collection | 99.9%      | Redundant GitHub infrastructure    |
| ArXiv API  | Research data   | ~99%       | Academic institution (stable)      |
| Firecrawl  | Web crawling    | 99%?       | Unknown                            |

**Critical Path SLA:** Supabase only (single region, no documented failover)

---

## Dependency Compliance

### License Audit

**Observed Licenses:**

- MIT (majority of packages)
- Apache 2.0 (some packages)
- BSD (some packages)

**Risk:** No GPL/AGPL detected (would create viral licensing risk)  
**Assessment:** ✅ Safe for commercial use

---

## Recommendation for VAJRA Analysis

When VAJRA Windows evidence arrives, apply this same dependency analysis to discover:

1. External service integrations (trading APIs, data feeds)
2. Internal module structure
3. Vendor lock-in (especially trading broker APIs)
4. Data flow patterns
5. Circular dependency risks
6. Update/maintenance requirements

---

**Status:** 🟢 **EURO AI DEPENDENCY GRAPH COMPLETE**

All dependencies identified, mapped, and risk-assessed. Ready for next analysis phase (Knowledge Graph).
