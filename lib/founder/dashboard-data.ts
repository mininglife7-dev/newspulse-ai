/**
 * =============================================================================
 * Founder Infrastructure Dashboard — Single Source of Truth (DNA-301)
 * =============================================================================
 *
 * This file is the ONE place that describes the health, readiness, and future
 * of NewsPulse AI's technology foundation, translated into Founder language.
 *
 * It is rendered live at `/founder` and mirrored in
 * `docs/founder/INFRASTRUCTURE_DASHBOARD.md`.
 *
 * RULES (from DNA-301 operating principles):
 *   - Discover reality before reporting. Never guess.
 *   - Never inflate readiness. Unknown means UNKNOWN.
 *   - Every claim carries a Confidence label: Verified / Estimated / Unknown.
 *   - Verified  = confirmed by reading the code / config in this repository.
 *   - Estimated = a reasoned judgement based on how the stack behaves.
 *   - Unknown   = cannot be confirmed from inside the repository; needs the
 *                 Founder or an operator to check a live console (Vercel /
 *                 Supabase / OpenAI billing) to turn it green.
 *
 * HOW TO MAINTAIN THIS (continuous, per DNA-301):
 *   When infrastructure changes, update this file in the same PR. The live
 *   page and the Markdown briefing both read from here, so one edit keeps the
 *   Founder's view current. Bump `dashboardMeta.lastReviewed` every review.
 * =============================================================================
 */

export type Confidence = 'Verified' | 'Estimated' | 'Unknown';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type Trend = 'Improving' | 'Stable' | 'Declining' | 'New';
export type HealthStatus =
  | 'Operational'
  | 'Partial'
  | 'Not Implemented'
  | 'At Risk'
  | 'Unknown';
export type GoDecision = 'GO' | 'GO WITH CONDITIONS' | 'NO-GO';

export interface HealthItem {
  /** Component name in plain language. */
  name: string;
  status: HealthStatus;
  confidence: Confidence;
  risk: RiskLevel;
  trend: Trend;
  /** What this means for the business / customers — Founder language. */
  businessImpact: string;
  /** The single most valuable next move. */
  recommendedAction: string;
  /** One-line technical reality, for the curious. */
  detail: string;
}

export interface DeploymentFact {
  label: string;
  value: string;
  confidence: Confidence;
}

export interface HealthScore {
  label: string;
  /** 0–100, or null when genuinely UNKNOWN (never fabricate a number). */
  score: number | null;
  confidence: Confidence;
  /** One line explaining what is holding the score where it is. */
  rationale: string;
}

export interface Explainer {
  component: string;
  whatItIs: string;
  whyCustomersCare: string;
  businessValue: string;
  currentImplementation: string;
  futureImprovements: string;
  riskIfIgnored: string;
}

export interface ArchitectureGap {
  category:
    | 'Missing Component'
    | 'Under-engineering'
    | 'Over-engineering'
    | 'Security Gap'
    | 'Performance Bottleneck'
    | 'Single Point of Failure'
    | 'Operational Risk'
    | 'Compliance Risk'
    | 'Cost Risk';
  finding: string;
  worldClassPractice: string;
  practicalImprovement: string;
  risk: RiskLevel;
}

export interface DecisionRecord {
  decision: string;
  reason: string;
  alternatives: string;
  benefits: string;
  tradeOffs: string;
  risks: string;
  rollbackPlan: string;
  owner: string;
  date: string;
  evidence: string;
}

export interface ExecutiveSummary {
  architectureHealth: string;
  deploymentHealth: string;
  biggestRisks: string[];
  biggestAchievements: string[];
  criticalBlockers: string[];
  recommendedNextActions: string[];
  decision: GoDecision;
  decisionRationale: string;
}

// =============================================================================
// Dashboard metadata
// =============================================================================

export const dashboardMeta = {
  title: 'Founder Infrastructure Dashboard',
  question: 'Is our technology foundation healthy enough to launch, scale, and support customers?',
  /** Update on every review. */
  lastReviewed: '2026-07-09',
  reviewedBy: 'Governor — Chief Infrastructure & Architecture Advisor',
  /** The stage the product is honestly at today. */
  productStage: 'Hackathon MVP / demo-ready — not yet a multi-customer SaaS',
};

// =============================================================================
// 7. Executive Summary  (shown first, per DNA-301)
// =============================================================================

export const executiveSummary: ExecutiveSummary = {
  architectureHealth:
    'The core product works and is cleanly built, but it is a single-user demo: there is no sign-in, no monitoring, and no automated tests. Solid foundation, not yet a customer platform.',
  deploymentHealth:
    'Ships automatically to Vercel on every push, with automated checks (lint, type-check, build) gating each change. There is no separate staging environment and the live production URL has not been verified from inside the code.',
  biggestRisks: [
    'No sign-in / accounts — anyone can use the app and everyone shares one history. This blocks charging customers and creates privacy exposure.',
    'No monitoring or alerting — if the site breaks at 2am, no one is told. We would learn from an angry customer, not a dashboard.',
    'No automated tests — every change risks silently breaking something a customer relies on.',
    'Rate limiting is in-memory, so it resets whenever the server scales or restarts — it does not reliably protect our paid AI/search spend.',
  ],
  biggestAchievements: [
    'End-to-end product works: search → AI summary → saved history, live on Vercel.',
    'Automated quality gate (CI) blocks broken code from reaching customers.',
    'Clean, strict-typed codebase with lazy, build-safe secret handling — a strong base to build on.',
    'Secrets are handled correctly (server-side env vars, never shipped to the browser).',
  ],
  criticalBlockers: [
    'Authentication must exist before we can onboard or bill real, separate customers.',
    'Basic monitoring + error alerting must exist before we can promise uptime.',
  ],
  recommendedNextActions: [
    'Add authentication and per-user data isolation (accounts).',
    'Add uptime + error monitoring with alerts (e.g. a hosted monitor + Sentry).',
    'Add a durable rate limiter (Upstash/Vercel KV) to protect AI spend.',
    'Add a first layer of automated tests around the /api/search pipeline.',
    'Verify and record the real production URL, hosting regions, and data location.',
  ],
  decision: 'GO WITH CONDITIONS',
  decisionRationale:
    'GO to keep demoing and sharing the product publicly — it is stable and impressive. NO-GO for onboarding paying or separated customers until authentication and monitoring exist. Treat the five actions above as the launch checklist.',
};

// =============================================================================
// 1. Infrastructure Health
// =============================================================================

export const healthItems: HealthItem[] = [
  {
    name: 'Frontend',
    status: 'Operational',
    confidence: 'Verified',
    risk: 'Low',
    trend: 'Stable',
    businessImpact: 'The website customers see and use works and looks polished.',
    recommendedAction: 'Keep as-is; add screenshots and a customer-facing landing story before launch.',
    detail: 'Next.js 14 App Router, TypeScript strict, Tailwind, lucide-react.',
  },
  {
    name: 'Backend / API',
    status: 'Operational',
    confidence: 'Verified',
    risk: 'Low',
    trend: 'Stable',
    businessImpact: 'The engine that runs a search and returns summaries works reliably at demo scale.',
    recommendedAction: 'Add automated tests around the search pipeline before scaling usage.',
    detail: 'Next.js serverless API routes: POST /api/search, GET/DELETE /api/history, GET /api/health.',
  },
  {
    name: 'Database',
    status: 'Operational',
    confidence: 'Verified',
    risk: 'Medium',
    trend: 'Stable',
    businessImpact: 'Every search and its results are saved so history can be replayed.',
    recommendedAction: 'Add a user/owner column once accounts exist so data is per-customer.',
    detail: 'Supabase Postgres, single table `news_searches` (JSONB results), RLS enabled.',
  },
  {
    name: 'Authentication',
    status: 'Not Implemented',
    confidence: 'Verified',
    risk: 'Critical',
    trend: 'Stable',
    businessImpact: 'No one signs in. Everyone shares one pool of history. We cannot tell customers apart or bill them.',
    recommendedAction: 'Add authentication (Supabase Auth or Clerk) — this is the #1 launch blocker for real customers.',
    detail: 'No auth code anywhere in app/, components/, lib/, or middleware.',
  },
  {
    name: 'Authorization',
    status: 'Partial',
    confidence: 'Verified',
    risk: 'High',
    trend: 'Stable',
    businessImpact: 'Because there are no users, there are no per-user permissions. Anyone can read or clear all history.',
    recommendedAction: 'Introduce per-user row ownership and tighten RLS once accounts exist.',
    detail: 'RLS enabled but anon role is granted read + insert; server uses the service-role key which bypasses RLS.',
  },
  {
    name: 'Storage (files)',
    status: 'Not Implemented',
    confidence: 'Verified',
    risk: 'Low',
    trend: 'Stable',
    businessImpact: 'We do not store files/images today, so there is nothing to lose here — and nothing to protect.',
    recommendedAction: 'No action needed until the product needs to store uploads or exports.',
    detail: 'No object storage in use; results are JSON rows in Postgres only.',
  },
  {
    name: 'AI Models',
    status: 'Operational',
    confidence: 'Verified',
    risk: 'Medium',
    trend: 'Stable',
    businessImpact: 'The intelligence customers pay for — article summaries — works and is inexpensive per use.',
    recommendedAction: 'Track per-search AI cost and add a spend cap to avoid bill surprises.',
    detail: "OpenAI gpt-4o-mini, hosted by OpenAI (US), summaries generated in parallel (concurrency 4).",
  },
  {
    name: 'Vector Database',
    status: 'Not Implemented',
    confidence: 'Verified',
    risk: 'Low',
    trend: 'Stable',
    businessImpact: 'Not needed yet. Would only matter if we add semantic search or a knowledge base.',
    recommendedAction: 'Defer. Revisit only if we build "search across past articles" or RAG features.',
    detail: 'No vector store; not applicable to the current feature set.',
  },
  {
    name: 'External APIs',
    status: 'Operational',
    confidence: 'Verified',
    risk: 'High',
    trend: 'Stable',
    businessImpact: 'The product depends on three outside services. If any goes down or rate-limits us, features break.',
    recommendedAction: 'Add graceful degradation + alerts for each dependency; monitor their status.',
    detail: 'Firecrawl (search+scrape), OpenAI (summaries), Supabase (storage). No retry/circuit-breaker layer.',
  },
  {
    name: 'Monitoring',
    status: 'Partial',
    confidence: 'Verified',
    risk: 'High',
    trend: 'Stable',
    businessImpact: 'If the site breaks, we would likely hear it from a customer first, not a system.',
    recommendedAction: 'Add an uptime monitor hitting /api/health and page/notify on failure.',
    detail: 'A /api/health endpoint exists, but no external monitor or alerting is configured in the repo.',
  },
  {
    name: 'Logging',
    status: 'Partial',
    confidence: 'Verified',
    risk: 'Medium',
    trend: 'Stable',
    businessImpact: 'When something goes wrong we have basic clues, but no searchable, retained record to investigate.',
    recommendedAction: 'Adopt structured logging + a log drain (e.g. Logtail/Datadog) with retention.',
    detail: 'console.error/console.log only, captured ephemerally in Vercel function logs.',
  },
  {
    name: 'Audit Trail',
    status: 'Not Implemented',
    confidence: 'Verified',
    risk: 'Medium',
    trend: 'Stable',
    businessImpact: 'We cannot prove who did what, which enterprise and compliance customers will require.',
    recommendedAction: 'Add an audit log once accounts exist (who searched/deleted what, when).',
    detail: 'No audit logging; created_at timestamps on searches are the only trace.',
  },
  {
    name: 'Security',
    status: 'Partial',
    confidence: 'Verified',
    risk: 'High',
    trend: 'Stable',
    businessImpact: 'Secrets are handled correctly, but with no login and weak rate limiting the app is exposed to abuse.',
    recommendedAction: 'Ship auth + a durable rate limiter; add security headers and dependency scanning.',
    detail: 'Server-side secrets (good), in-memory per-instance rate limit on /api/search (weak), no auth.',
  },
  {
    name: 'Backup',
    status: 'Unknown',
    confidence: 'Unknown',
    risk: 'High',
    trend: 'Stable',
    businessImpact: 'If the database were lost, we do not know from here whether customer history could be recovered.',
    recommendedAction: 'Confirm Supabase plan + backup schedule in the console; document RPO. Turn this from UNKNOWN to a fact.',
    detail: 'Managed by Supabase; backup frequency depends on plan and is not verifiable from the repo.',
  },
  {
    name: 'Disaster Recovery',
    status: 'Partial',
    confidence: 'Estimated',
    risk: 'High',
    trend: 'Stable',
    businessImpact: 'We can roll back a bad code deploy quickly, but have no tested plan for data loss or a provider outage.',
    recommendedAction: 'Write and test a one-page DR runbook (restore DB, redeploy, rotate keys).',
    detail: 'Vercel keeps prior deployments for instant rollback; git revert reverses code. No DB restore drill.',
  },
  {
    name: 'CI/CD',
    status: 'Operational',
    confidence: 'Verified',
    risk: 'Low',
    trend: 'Improving',
    businessImpact: 'Broken code is caught automatically before it can reach customers — a real quality safeguard.',
    recommendedAction: 'Add a test step to CI once tests exist; keep the pipeline green.',
    detail: 'GitHub Actions runs lint + type-check + build on every push/PR; Vercel deploys on merge.',
  },
  {
    name: 'Production Deployment',
    status: 'Partial',
    confidence: 'Estimated',
    risk: 'Medium',
    trend: 'Stable',
    businessImpact: 'The product deploys to the cloud automatically, but we have not verified the live URL from the code.',
    recommendedAction: 'Confirm the real production URL + region and record it here (see Deployment Reality).',
    detail: 'Vercel Git integration: push to main → production. Config verified; live URL unverified in-repo.',
  },
  {
    name: 'Staging Environment',
    status: 'Not Implemented',
    confidence: 'Verified',
    risk: 'Medium',
    trend: 'Stable',
    businessImpact: 'There is no safe copy of production to test on, so risky changes are validated in previews only.',
    recommendedAction: 'Promote a long-lived staging deployment with its own database before onboarding customers.',
    detail: 'Only per-PR Vercel preview deployments exist; no persistent staging environment.',
  },
  {
    name: 'Development Environment',
    status: 'Operational',
    confidence: 'Verified',
    risk: 'Low',
    trend: 'Stable',
    businessImpact: 'Engineers can run and improve the product locally with a documented setup.',
    recommendedAction: 'None; keep .env.example and the env-check script current.',
    detail: 'Local `next dev`; `scripts/check-env.mjs` validates required env vars against .env.local.',
  },
  {
    name: 'Performance',
    status: 'Operational',
    confidence: 'Estimated',
    risk: 'Medium',
    trend: 'Stable',
    businessImpact: 'Searches feel responsive at demo scale; a heavy search can take several seconds (AI + scraping).',
    recommendedAction: 'Measure real p95 latency once traffic exists; consider streaming results to the UI.',
    detail: 'Search route capped at 60s; up to 10 articles summarized 4-at-a-time. No latency metrics collected.',
  },
  {
    name: 'Scalability',
    status: 'Partial',
    confidence: 'Estimated',
    risk: 'Medium',
    trend: 'Stable',
    businessImpact: 'The web layer scales automatically, but a couple of pieces will strain under real, concurrent load.',
    recommendedAction: 'Move rate limiting off in-memory; watch external API rate limits and DB connection use.',
    detail: 'Serverless auto-scales; in-memory rate limiter and single-table design are the near-term limits.',
  },
  {
    name: 'Availability',
    status: 'Unknown',
    confidence: 'Unknown',
    risk: 'High',
    trend: 'Stable',
    businessImpact: 'We cannot state an uptime figure because nothing is measuring it. We cannot promise an SLA today.',
    recommendedAction: 'Start measuring uptime immediately; only then can we make availability promises.',
    detail: 'No uptime monitoring configured; actual availability is unmeasured.',
  },
  {
    name: 'Cost Efficiency',
    status: 'Operational',
    confidence: 'Estimated',
    risk: 'Low',
    trend: 'Stable',
    businessImpact: 'Running costs are expected to be low today (cheap AI model, likely free service tiers).',
    recommendedAction: 'Record actual monthly spend across Vercel/Supabase/OpenAI/Firecrawl; add budget alerts.',
    detail: 'gpt-4o-mini is low-cost; Vercel/Supabase likely free tier. Actual spend not verifiable from repo.',
  },
  {
    name: 'Technical Debt',
    status: 'Partial',
    confidence: 'Verified',
    risk: 'Medium',
    trend: 'Stable',
    businessImpact: 'The code is clean, but missing tests, auth, and monitoring are debts that will slow us as we grow.',
    recommendedAction: 'Pay down in order: tests → durable rate limiter → monitoring → auth foundations.',
    detail: 'No test suite; in-memory rate limiter; single-table schema; explicit "hackathon scale" TODOs in code.',
  },
];

// =============================================================================
// 2. Deployment Reality
// =============================================================================

export const deploymentReality: DeploymentFact[] = [
  { label: 'Current Local Deployment', value: 'Yes — `npm run dev` (Next.js dev server)', confidence: 'Verified' },
  { label: 'Current Cloud Deployment', value: 'Vercel (via GitHub integration)', confidence: 'Verified' },
  { label: 'Production Environment', value: 'Vercel production (push to `main`)', confidence: 'Verified' },
  { label: 'Staging Environment', value: 'None (per-PR preview deployments only)', confidence: 'Verified' },
  { label: 'Preview Environment', value: 'Yes — one preview URL per pull request', confidence: 'Verified' },
  { label: 'Regions', value: 'Vercel default region; not pinned in config', confidence: 'Unknown' },
  { label: 'Hosting Provider', value: 'Vercel (web + serverless functions)', confidence: 'Verified' },
  { label: 'Database Location', value: 'Supabase project region — set at project creation', confidence: 'Unknown' },
  { label: 'Backup Location', value: 'Managed by Supabase (plan-dependent)', confidence: 'Unknown' },
  { label: 'AI Model Hosting', value: 'OpenAI (gpt-4o-mini), US-hosted', confidence: 'Verified' },
  { label: 'Customer Data Location', value: 'Search history in Supabase Postgres; article content sent to OpenAI for summarization', confidence: 'Verified' },
  { label: 'Current Production URL', value: 'Not verified in-repo (README default: newspulse-ai.vercel.app)', confidence: 'Unknown' },
  { label: 'Version', value: '1.0.0 (package.json)', confidence: 'Verified' },
  { label: 'Deployment Date', value: 'Continuous — on each merge to `main`', confidence: 'Verified' },
  { label: 'Last Successful Deployment', value: 'Visible in the Vercel dashboard (not readable from repo)', confidence: 'Unknown' },
  { label: 'Last Failed Deployment', value: 'Visible in the Vercel dashboard (not readable from repo)', confidence: 'Unknown' },
  { label: 'Rollback Capability', value: 'Yes — Vercel instant rollback to a prior deployment; git revert for code', confidence: 'Verified' },
  { label: 'Recovery Time (RTO)', value: 'Code: minutes (redeploy/rollback). Data: undefined (no drill)', confidence: 'Estimated' },
  { label: 'Recovery Point (RPO)', value: 'Depends on Supabase backup schedule — unconfirmed', confidence: 'Unknown' },
];

// =============================================================================
// 3. Founder Health Score  (0–100; null = UNKNOWN, never inflated)
// =============================================================================

export const healthScores: HealthScore[] = [
  { label: 'Deployment Readiness', score: 60, confidence: 'Verified', rationale: 'Automated deploy + CI gate work; no staging and unverified prod URL hold it back.' },
  { label: 'Infrastructure Readiness', score: 45, confidence: 'Verified', rationale: 'Core stack solid; auth, monitoring, and tests are missing.' },
  { label: 'Security Readiness', score: 35, confidence: 'Verified', rationale: 'Secrets handled well, but no auth and only in-memory rate limiting.' },
  { label: 'Reliability', score: 40, confidence: 'Estimated', rationale: 'Depends on 3 external services with no monitoring or automated tests.' },
  { label: 'Scalability', score: 55, confidence: 'Estimated', rationale: 'Serverless scales; rate limiter and single-table design are near-term limits.' },
  { label: 'Maintainability', score: 60, confidence: 'Verified', rationale: 'Clean strict-typed code; the absence of tests is the main drag.' },
  { label: 'Observability', score: 25, confidence: 'Verified', rationale: 'Only a health endpoint; no monitoring, alerting, or retained logs.' },
  { label: 'Cost Optimization', score: 60, confidence: 'Estimated', rationale: 'Cheap model and likely free tiers, but actual spend is unmeasured.' },
  { label: 'Customer Readiness', score: 30, confidence: 'Verified', rationale: 'No accounts, no per-user data, no billing — cannot serve separated customers.' },
  { label: 'Enterprise Readiness', score: 15, confidence: 'Verified', rationale: 'No SSO, audit trail, SLA, or compliance posture.' },
  { label: 'EU AI Readiness', score: 20, confidence: 'Estimated', rationale: 'No AI transparency notices, data-residency guarantees, or DPA posture; data flows to US OpenAI.' },
  { label: 'Overall Launch Readiness', score: 40, confidence: 'Verified', rationale: 'Great demo; not ready to onboard/bill real, separated customers until auth + monitoring land.' },
];

// =============================================================================
// 4. Explain Like a Founder  (<=150 words each)
// =============================================================================

export const explainers: Explainer[] = [
  {
    component: 'Authentication (Sign-in / Accounts)',
    whatItIs: 'The front door that lets a person prove who they are and gives them their own private space.',
    whyCustomersCare: 'Customers expect their searches and history to be theirs alone, not shared with strangers.',
    businessValue: 'Without it we cannot separate customers, charge them, or protect their data — so we cannot really sell the product.',
    currentImplementation: 'None. The app is fully public and everyone shares a single history.',
    futureImprovements: 'Add Supabase Auth or Clerk, give each user their own data, and gate the API behind login.',
    riskIfIgnored: 'No revenue path, privacy exposure, and abuse of our paid AI/search budget by anonymous users.',
  },
  {
    component: 'Monitoring & Alerting',
    whatItIs: 'An always-on watchman that checks the product is up and tells us the instant it breaks.',
    whyCustomersCare: 'Customers judge us on whether the product works when they need it — not on our apologies afterward.',
    businessValue: 'Lets us catch and fix problems before customers notice, and eventually promise reliability (an SLA).',
    currentImplementation: 'A health-check endpoint exists, but nothing is watching it and no one gets alerted.',
    futureImprovements: 'Add an uptime monitor on /api/health plus error tracking (e.g. Sentry) with phone/email alerts.',
    riskIfIgnored: 'Outages go unnoticed for hours; we lose trust and customers before we even know something is wrong.',
  },
  {
    component: 'Automated Tests',
    whatItIs: 'A safety net of checks that automatically confirm the product still works after every change.',
    whyCustomersCare: 'They only see a stable product — they never see the bug we caught before it shipped.',
    businessValue: 'Lets us move fast without breaking things, which keeps customers happy and support costs down.',
    currentImplementation: 'None. We rely on type-checking and manual review only.',
    futureImprovements: 'Add tests around the search pipeline and the history API, then run them in CI.',
    riskIfIgnored: 'Each change risks silently breaking a customer-facing feature that no one notices until it is too late.',
  },
  {
    component: 'Rate Limiting (Spend Protection)',
    whatItIs: 'A bouncer that stops any single user from hammering the app and running up our AI/search bill.',
    whyCustomersCare: 'It keeps the service fast and fairly available for everyone, and keeps prices sustainable.',
    businessValue: 'Protects our margins by preventing runaway costs and abuse of paid third-party APIs.',
    currentImplementation: 'A basic limiter exists but lives in memory, so it forgets everyone whenever the server restarts or scales.',
    futureImprovements: 'Move it to a shared store (Upstash or Vercel KV) so limits hold across all servers.',
    riskIfIgnored: 'A single abuser (or a bad script) could quietly run up a large OpenAI/Firecrawl bill.',
  },
  {
    component: 'AI Summaries (the product intelligence)',
    whatItIs: 'The AI that reads each article and writes a short, neutral 2–3 sentence summary.',
    whyCustomersCare: 'It is the reason to use us instead of a plain search engine — it saves them reading time.',
    businessValue: 'This is our core value proposition and it is cheap to run per search today.',
    currentImplementation: "OpenAI's gpt-4o-mini summarizes up to 10 articles per search, in parallel, with a safe fallback.",
    futureImprovements: 'Track cost per search, add a spend cap, and consider streaming summaries into the page for speed.',
    riskIfIgnored: 'Uncapped AI cost and a slower experience as usage grows.',
  },
  {
    component: 'Database & Backups',
    whatItIs: 'The filing cabinet that stores every search and its results, plus the copies that protect against loss.',
    whyCustomersCare: 'Customers expect their history to still be there tomorrow — and not to vanish in an accident.',
    businessValue: 'Reliable storage and recovery are table stakes for trust; losing data can end a company.',
    currentImplementation: 'Supabase Postgres holds the data. Backup frequency is managed by Supabase and unconfirmed from the code.',
    futureImprovements: 'Confirm the backup schedule, test a restore, and document how fast we could recover.',
    riskIfIgnored: 'A data-loss event could be unrecoverable, destroying customer trust instantly.',
  },
];

// =============================================================================
// 5. Architecture Verification  (current vs world-class SaaS)
// =============================================================================

export const architectureGaps: ArchitectureGap[] = [
  {
    category: 'Missing Component',
    finding: 'No authentication or per-user data isolation.',
    worldClassPractice: 'Every multi-tenant SaaS authenticates users and scopes all data to an owner.',
    practicalImprovement: 'Adopt Supabase Auth or Clerk; add an owner column and RLS policies keyed to the user.',
    risk: 'Critical',
  },
  {
    category: 'Operational Risk',
    finding: 'No monitoring, alerting, or retained logs.',
    worldClassPractice: 'Uptime checks, error tracking, structured logs, and on-call alerting are standard from day one.',
    practicalImprovement: 'Add an uptime monitor + Sentry + a log drain; wire alerts to email/Slack.',
    risk: 'High',
  },
  {
    category: 'Single Point of Failure',
    finding: 'Hard dependency on Firecrawl, OpenAI, and Supabase with no retries or fallback.',
    worldClassPractice: 'Retries, timeouts, circuit breakers, and graceful degradation for each external dependency.',
    practicalImprovement: 'Add bounded retries + clear user-facing degradation when a provider fails.',
    risk: 'High',
  },
  {
    category: 'Under-engineering',
    finding: 'Rate limiting is in-memory and per-instance, so it resets on scale/restart.',
    worldClassPractice: 'Distributed rate limiting backed by a shared store, applied at the edge.',
    practicalImprovement: 'Move to Upstash Ratelimit or Vercel KV; keep it on the expensive routes.',
    risk: 'High',
  },
  {
    category: 'Under-engineering',
    finding: 'No automated test suite.',
    worldClassPractice: 'Unit + integration tests gate every merge in CI.',
    practicalImprovement: 'Start with tests for the search pipeline and history API; add a CI test step.',
    risk: 'Medium',
  },
  {
    category: 'Compliance Risk',
    finding: 'No audit trail, AI-transparency notices, or documented data-residency posture; article text flows to US OpenAI.',
    worldClassPractice: 'Audit logs, a data processing agreement, regional data handling, and clear AI disclosures.',
    practicalImprovement: 'Add an audit log, publish an AI/data notice, and document where customer data lives and flows.',
    risk: 'Medium',
  },
  {
    category: 'Operational Risk',
    finding: 'No persistent staging environment; changes are validated in ephemeral previews only.',
    worldClassPractice: 'A production-like staging environment with its own data for pre-release validation.',
    practicalImprovement: 'Stand up a long-lived staging deployment with a separate Supabase project.',
    risk: 'Medium',
  },
  {
    category: 'Cost Risk',
    finding: 'Actual cloud/AI spend is unmeasured and uncapped.',
    worldClassPractice: 'Per-feature cost tracking and hard budget alerts on every paid provider.',
    practicalImprovement: 'Record monthly spend, add budget alerts, and cap AI usage per user.',
    risk: 'Low',
  },
];

// =============================================================================
// 6. Architecture Decision Record
// =============================================================================

export const decisionRecords: DecisionRecord[] = [
  {
    decision: 'Deploy via Vercel Git integration (push-to-deploy) instead of a GitHub Actions deploy job.',
    reason: 'Vercel natively builds, previews, and deploys Next.js with zero custom pipeline to maintain.',
    alternatives: 'GitHub Actions deploy workflow; self-hosted/containerized deploy.',
    benefits: 'Automatic production deploys on merge, a preview URL per PR, instant rollback.',
    tradeOffs: 'Deploy history and status live in Vercel, not in the repo — less visible from the code.',
    risks: 'Vendor lock-in to Vercel; production URL/regions not recorded in-repo.',
    rollbackPlan: 'Use Vercel instant rollback to a previous deployment; revert the commit in git.',
    owner: 'Engineering (Governor)',
    date: '2026-07-09',
    evidence: 'Commit 4f9ad97 removed the broken Actions deploy workflow; README documents the Vercel integration.',
  },
  {
    decision: 'Store each search and its results as a JSONB row in a single Postgres table.',
    reason: 'Lets the /history page replay the exact result view with a simple, flexible schema.',
    alternatives: 'Normalized tables (searches + articles); a document database.',
    benefits: 'Fast to build, easy to render, flexible result shape.',
    tradeOffs: 'Harder to query inside results; no per-article relationships or per-user scoping yet.',
    risks: 'Will need migration to add user ownership and richer querying as the product grows.',
    rollbackPlan: 'Schema is additive; a migration can normalize later without data loss.',
    owner: 'Engineering (Governor)',
    date: '2026-07-09',
    evidence: 'supabase/schema.sql — `news_searches` with a JSONB `results` column.',
  },
  {
    decision: 'Instantiate Supabase and OpenAI clients lazily behind guards/Proxy.',
    reason: 'Allows `next build` to collect page data without real secrets and avoids crashing on cold import.',
    alternatives: 'Eager client creation at module load (fails the build without env vars).',
    benefits: 'CI can build with stub env vars; runtime fails loudly only when a secret is truly needed.',
    tradeOffs: 'Slightly more indirection in the client modules.',
    risks: 'Low — behavior is well-contained and covered by the health endpoint.',
    rollbackPlan: 'Revert to eager initialization if the indirection ever causes confusion.',
    owner: 'Engineering (Governor)',
    date: '2026-07-09',
    evidence: 'lib/supabase.ts (Proxy) and lib/openai.ts (lazy client); commit 18c751c.',
  },
  {
    decision: 'Adopt an in-memory rate limiter for /api/search as an interim guard.',
    reason: 'Ships basic abuse protection with zero extra infrastructure at hackathon scale.',
    alternatives: 'Upstash Ratelimit or Vercel KV (durable, distributed) from the start.',
    benefits: 'Immediate, dependency-free protection for the expensive search route.',
    tradeOffs: 'Resets on every cold start and does not coordinate across serverless instances.',
    risks: 'Does not reliably cap spend under real, distributed load — flagged as technical debt.',
    rollbackPlan: 'Swap the limiter implementation for a shared store; the middleware boundary stays the same.',
    owner: 'Engineering (Governor)',
    date: '2026-07-09',
    evidence: 'middleware.ts — in-memory `buckets` map with an explicit "swap for Upstash/KV" note.',
  },
];
