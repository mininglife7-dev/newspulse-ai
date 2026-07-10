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
  lastReviewed: '2026-07-10',
  reviewedBy: 'Governor — Chief Infrastructure & Architecture Advisor',
  /** The stage the product is honestly at today. */
  productStage:
    'Customer-readiness build in progress — accounts, per-user data isolation, monitoring, durable-capable rate limiting, and an automated test suite are code-complete and verified locally; live Supabase Auth enablement is the remaining step before real customers.',
};

// =============================================================================
// 7. Executive Summary  (shown first, per DNA-301)
// =============================================================================

export const executiveSummary: ExecutiveSummary = {
  architectureHealth:
    'Materially stronger than a demo now: customers can create accounts and sign in, every saved search is private to its owner (isolation proven by automated tests), expensive routes are rate-limited, and a 36-test suite guards the core paths. The one gap between "built" and "serving customers" is enabling Supabase Auth on the live project and running the database migration.',
  deploymentHealth:
    'Ships automatically to Vercel on every push, now gated by lint, type-check, an automated test suite, AND build. The Vercel preview for this work deployed successfully. There is still no separate staging environment, and the live production URL/region remain unverified from inside the code.',
  biggestRisks: [
    'Live Supabase Auth is not yet enabled/verified — the sign-in code is complete and fails closed, but a real end-to-end login has not been exercised on the production project.',
    'No external monitoring or alerting yet — logging is now structured and the health check is richer, but nothing pages a human when the site breaks.',
    'Rate limiting is durable ONLY if Upstash is configured; without it, it falls back to per-instance memory (the app reports which mode it is in at /api/health).',
    'No billing/subscription system — accounts exist, but there is no way to charge yet.',
  ],
  biggestAchievements: [
    'Authentication + per-customer data isolation built end-to-end (Supabase Auth, middleware-protected routes, server-side ownership on every query).',
    'Cross-user isolation proven by automated tests: one customer cannot read or delete another’s searches.',
    'The previously unauthenticated delete-any-row endpoint is now locked to the owner — a real security hole closed.',
    'From zero tests to a 36-test suite wired into CI; durable-capable rate limiting protects our AI/search spend.',
  ],
  criticalBlockers: [
    'Enable Email auth in the Supabase console and run migration 0002 on the live project — the last step to turn accounts on for real customers.',
    'Stand up external uptime + error alerting before promising any reliability.',
  ],
  recommendedNextActions: [
    'Enable Supabase Email auth + run supabase/migrations/0002 on the live project, then verify a real signup/login/isolation journey.',
    'Configure Upstash (or Vercel KV) so rate limiting is durably distributed in production.',
    'Add uptime + error alerting (a hosted monitor on /api/health + Sentry).',
    'Add a billing/subscription layer once auth is live, to enable revenue.',
    'Verify and record the real production URL, hosting regions, and data location.',
  ],
  decision: 'GO WITH CONDITIONS',
  decisionRationale:
    'GO to keep demoing publicly and to proceed toward a gated launch — the customer-readiness foundation (accounts, data isolation, tests, spend protection) is now built and locally verified. Still NO-GO for onboarding or billing real customers until Supabase Auth is enabled + verified live, external alerting exists, and a billing path is added. These are the conditions, and they are now a short, concrete list rather than a rebuild.',
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
    trend: 'Improving',
    businessImpact: 'The engine that runs a search and returns summaries works reliably, and its routes are now authenticated, validated, and covered by automated tests.',
    recommendedAction: 'Keep growing test coverage as features are added; add request tracing to a log drain.',
    detail: 'Next.js serverless API routes: POST /api/search (auth-aware), GET/DELETE /api/history (auth-required), GET /api/health. 36-test suite covers validation, auth, and isolation.',
  },
  {
    name: 'Database',
    status: 'Operational',
    confidence: 'Verified',
    risk: 'Medium',
    trend: 'Improving',
    businessImpact: 'Every signed-in customer’s searches are saved and kept private to them; anonymous demo searches are not persisted.',
    recommendedAction: 'Run migration 0002 on the live database so ownership + RLS are enforced there too.',
    detail: 'Supabase Postgres, `news_searches` now has a `user_id` owner column, indexes, and owner-only RLS policies (migration 0002). Anonymous searches are not stored.',
  },
  {
    name: 'Authentication',
    status: 'Partial',
    confidence: 'Verified',
    risk: 'Medium',
    trend: 'Improving',
    businessImpact: 'Customers can now create accounts and sign in. This unlocks private history and is the prerequisite for billing. It is built and fails closed; it just needs switching on for the live project.',
    recommendedAction: 'Enable Email auth in the Supabase console and run migration 0002, then verify a real login end-to-end.',
    detail: 'Supabase Auth (email+password) via @supabase/ssr; login/signup/signout, middleware session refresh, and route protection. Code-complete and verified locally (protected routes 401/redirect when signed out); live enablement pending.',
  },
  {
    name: 'Authorization',
    status: 'Partial',
    confidence: 'Verified',
    risk: 'Medium',
    trend: 'Improving',
    businessImpact: 'Each customer’s searches are now private to them. One customer cannot read or delete another’s data — proven by automated tests.',
    recommendedAction: 'Run migration 0002 on the live database so row-level security enforces ownership at the database tier too.',
    detail: 'Every query is scoped by user_id in application code (defense in depth), plus owner-only RLS policies in migration 0002. Cross-user isolation covered by tests; live RLS pending the migration run.',
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
    trend: 'Improving',
    businessImpact: 'We can now see structured error records and a health check that distinguishes "up" from "up but database unreachable" — but nothing yet pages a human automatically.',
    recommendedAction: 'Point an external uptime monitor at /api/health and wire error alerts (e.g. Sentry) to email/Slack.',
    detail: 'Richer /api/health probes Supabase connectivity and reports rate-limit durability. Still no external monitor or alerting configured.',
  },
  {
    name: 'Logging',
    status: 'Partial',
    confidence: 'Verified',
    risk: 'Medium',
    trend: 'Improving',
    businessImpact: 'Failures are now traceable: each server log is structured JSON with a request id and (for signed-in actions) the customer id — but logs are not yet retained/searchable long-term.',
    recommendedAction: 'Send structured logs to a drain (Logtail/Datadog) with retention and alerting.',
    detail: 'Structured JSON logger (lib/logger.ts) with request ids; no secrets/PII logged. Still captured only in ephemeral Vercel function logs.',
  },
  {
    name: 'Audit Trail',
    status: 'Partial',
    confidence: 'Verified',
    risk: 'Medium',
    trend: 'Improving',
    businessImpact: 'We can now attribute searches and deletions to a specific customer id in the logs — a starting point, but not yet a durable, queryable audit record enterprises require.',
    recommendedAction: 'Persist an audit log (who did what, when) to a durable, queryable store.',
    detail: 'Structured logs record userId + action (search/clear/delete); no dedicated audit table yet.',
  },
  {
    name: 'Security',
    status: 'Partial',
    confidence: 'Verified',
    risk: 'Medium',
    trend: 'Improving',
    businessImpact: 'Materially safer: real sign-in, per-customer data isolation, no anonymous database access, and spend-protecting rate limits. Biggest remaining items are live auth enablement and external alerting.',
    recommendedAction: 'Enable live auth, configure durable rate limiting (Upstash), and add dependency scanning.',
    detail: 'Server-side secrets (good); Supabase Auth + owner-scoped queries + owner-only RLS; durable-capable rate limiter; anon DB policies removed; baseline security headers (nosniff, frame DENY, referrer, permissions, HSTS). Closed a critical hole: the delete-any-row endpoint is now owner-locked.',
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
    businessImpact: 'Broken code — including anything that would break customer isolation — is now caught automatically before it can reach customers.',
    recommendedAction: 'Keep the pipeline green; grow test coverage with each feature.',
    detail: 'GitHub Actions runs lint + type-check + a 36-test suite + build on every push/PR; Vercel deploys on merge.',
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
    trend: 'Improving',
    businessImpact: 'The web layer scales automatically, and rate limiting can now hold correctly across instances once the shared store is configured.',
    recommendedAction: 'Configure Upstash/Vercel KV in production; watch external API rate limits and DB connection use.',
    detail: 'Serverless auto-scales; rate limiter is now durable-capable (Upstash REST) with an honest in-memory fallback. Data model indexed by user_id.',
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
    risk: 'Low',
    trend: 'Improving',
    businessImpact: 'Several core debts are paid down: there is now a test suite, real auth, a durable-capable rate limiter, and structured logging. Remaining debt is mostly live-config and observability retention.',
    recommendedAction: 'Wire up external monitoring retention/alerting and a billing layer; keep test coverage growing with features.',
    detail: 'Was: no tests, in-memory limiter, no auth. Now: 36-test suite in CI, Supabase Auth, durable-capable limiter, structured logging. Single-table schema still adequate at this scale.',
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

// Scores reflect what is BUILT and verified locally. Where a capability is
// code-complete but not yet verified against the live project (auth, RLS), the
// confidence is 'Estimated' and the score is not pushed to where live proof
// would put it. Nothing is inflated; UNKNOWNs (below) stay UNKNOWN.
export const healthScores: HealthScore[] = [
  { label: 'Deployment Readiness', score: 63, confidence: 'Verified', rationale: 'Automated deploy + CI now also runs tests; preview deploy verified. No staging and unverified prod URL still hold it back.' },
  { label: 'Infrastructure Readiness', score: 58, confidence: 'Verified', rationale: 'Auth, per-user data, tests, and structured logging now exist; live enablement and external alerting remain.' },
  { label: 'Security Readiness', score: 60, confidence: 'Estimated', rationale: 'Real auth, owner-scoped data, no anon DB access, spend-protecting limits, baseline security headers; a critical delete hole closed. Not yet verified against live auth, and no external alerting.' },
  { label: 'Reliability', score: 50, confidence: 'Estimated', rationale: 'Graceful degradation, honest health checks, and a test suite; still no external monitoring or staging.' },
  { label: 'Scalability', score: 60, confidence: 'Estimated', rationale: 'Serverless scales; rate limiter is now durable-capable when Upstash is configured.' },
  { label: 'Maintainability', score: 70, confidence: 'Verified', rationale: 'Clean strict-typed code now backed by a 36-test suite in CI.' },
  { label: 'Observability', score: 42, confidence: 'Verified', rationale: 'Structured logs with request ids + a dependency-aware health check; still no external monitor, alerting, or log retention.' },
  { label: 'Cost Optimization', score: 62, confidence: 'Estimated', rationale: 'Cheap model; tighter, user/IP-aware rate limits reduce abuse risk. Actual spend still unmeasured.' },
  { label: 'Customer Readiness', score: 52, confidence: 'Estimated', rationale: 'Accounts + private per-customer data are built and locally verified; needs live auth enablement and a billing path before real customers.' },
  { label: 'Enterprise Readiness', score: 22, confidence: 'Verified', rationale: 'Auth foundation + per-user isolation exist; still no SSO, durable audit trail, SLA, or compliance posture.' },
  { label: 'EU AI Readiness', score: 22, confidence: 'Estimated', rationale: 'Marginal: no AI transparency notices, data-residency guarantees, or DPA; article text still flows to US OpenAI.' },
  { label: 'Overall Launch Readiness', score: 52, confidence: 'Estimated', rationale: 'Customer-readiness foundation is built and locally verified; gated launch is now a short checklist (enable live auth, add alerting + billing) rather than a rebuild.' },
];

// =============================================================================
// 4. Explain Like a Founder  (<=150 words each)
// =============================================================================

export const explainers: Explainer[] = [
  {
    component: 'Authentication (Sign-in / Accounts)',
    whatItIs: 'The front door that lets a person prove who they are and gives them their own private space.',
    whyCustomersCare: 'Customers expect their searches and history to be theirs alone, not shared with strangers.',
    businessValue: 'Accounts are the prerequisite for separating customers, charging them, and protecting their data — the basis of selling the product.',
    currentImplementation: 'Built: Supabase Auth email + password, with sign-in/sign-up/sign-out, protected pages, and every saved search scoped to its owner. Verified locally; needs enabling on the live Supabase project.',
    futureImprovements: 'Enable it live, then add password reset, optional social login, and a billing/subscription layer.',
    riskIfIgnored: 'Until enabled live, real customers cannot yet be onboarded or billed, and the public demo stays anonymous.',
  },
  {
    component: 'Monitoring & Alerting',
    whatItIs: 'An always-on watchman that checks the product is up and tells us the instant it breaks.',
    whyCustomersCare: 'Customers judge us on whether the product works when they need it — not on our apologies afterward.',
    businessValue: 'Lets us catch and fix problems before customers notice, and eventually promise reliability (an SLA).',
    currentImplementation: 'A richer health check now distinguishes healthy / degraded / unavailable and reports rate-limit durability, and errors are logged as structured, request-traced JSON — but nothing external watches or alerts yet.',
    futureImprovements: 'Point an uptime monitor at /api/health and add error tracking (e.g. Sentry) with phone/email alerts.',
    riskIfIgnored: 'Without external alerting, outages still go unnoticed until a customer tells us.',
  },
  {
    component: 'Automated Tests',
    whatItIs: 'A safety net of checks that automatically confirm the product still works after every change.',
    whyCustomersCare: 'They only see a stable product — they never see the bug we caught before it shipped.',
    businessValue: 'Lets us move fast without breaking things, which keeps customers happy and support costs down.',
    currentImplementation: 'Built: a 36-test suite runs in CI on every change, covering validation, authentication, cross-customer isolation, rate limiting, and dashboard invariants.',
    futureImprovements: 'Grow coverage with each new feature and add a live end-to-end signup/login test once auth is enabled.',
    riskIfIgnored: 'Gaps in coverage let a change silently break a customer-facing feature; keep the suite growing with the product.',
  },
  {
    component: 'Rate Limiting (Spend Protection)',
    whatItIs: 'A bouncer that stops any single user from hammering the app and running up our AI/search bill.',
    whyCustomersCare: 'It keeps the service fast and fairly available for everyone, and keeps prices sustainable.',
    businessValue: 'Protects our margins by preventing runaway costs and abuse of paid third-party APIs.',
    currentImplementation: 'Built: limits are user- and IP-aware, tighter for anonymous visitors, and durable across servers when Upstash is configured — with an honest in-memory fallback the health check reports.',
    futureImprovements: 'Configure Upstash (or Vercel KV) in production so limits are durably distributed.',
    riskIfIgnored: 'Without the shared store configured, limits reset on scale/restart, weakening protection against a determined abuser.',
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
    category: 'Operational Risk',
    finding: 'Authentication is built but not yet enabled/verified on the live project.',
    worldClassPractice: 'Auth is enabled, tested end-to-end, and monitored in production before onboarding customers.',
    practicalImprovement: 'Enable Email auth in Supabase, run migration 0002, and verify a real signup/login/isolation journey.',
    risk: 'Medium',
  },
  {
    category: 'Operational Risk',
    finding: 'Structured logs and a health check exist, but no external monitoring, alerting, or log retention.',
    worldClassPractice: 'Uptime checks, error tracking, retained structured logs, and on-call alerting from day one.',
    practicalImprovement: 'Point a monitor at /api/health + add Sentry + a log drain; wire alerts to email/Slack.',
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
    finding: 'Rate limiting is durable-capable but runs in-memory until Upstash is configured in production.',
    worldClassPractice: 'Distributed rate limiting backed by a shared store, applied at the edge.',
    practicalImprovement: 'Set UPSTASH_REDIS_REST_URL/TOKEN in production; the adapter switches automatically.',
    risk: 'Medium',
  },
  {
    category: 'Missing Component',
    finding: 'No billing/subscription system — accounts exist but there is no way to charge.',
    worldClassPractice: 'A metered or subscription billing layer (e.g. Stripe) tied to accounts.',
    practicalImprovement: 'Once live auth is verified, add Stripe subscriptions gated on the authenticated user.',
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
    decision: 'Authenticate with Supabase Auth (email+password) via @supabase/ssr, not a new vendor.',
    reason: 'Supabase is already our database; its Auth reuses that project with no new paid vendor and cookie-based SSR sessions that fit Next.js App Router.',
    alternatives: 'Clerk or Auth0 (new vendors/cost); rolling our own auth (unsafe).',
    benefits: 'One vendor, RLS keyed to auth.uid(), server-verified sessions, no extra bill.',
    tradeOffs: 'Couples auth to Supabase; email deliverability depends on Supabase settings.',
    risks: 'Requires enabling Email auth + running migration 0002 on the live project before real logins work.',
    rollbackPlan: 'Auth is additive; revert the auth commits and the app returns to anonymous demo behavior.',
    owner: 'Engineering (Governor)',
    date: '2026-07-10',
    evidence: 'lib/supabase/server.ts, lib/auth.ts, middleware.ts, app/login; 36-test suite incl. isolation.',
  },
  {
    decision: 'Hybrid access: anonymous visitors may search (demo) but only signed-in customers’ searches are saved, scoped to them.',
    reason: 'Preserves a frictionless public demo while making all persisted data private and per-customer; anonymous searches are never stored.',
    alternatives: 'Gate the whole app behind login (kills the demo); keep everything public (no isolation).',
    benefits: 'Demo stays; customer data is isolated; anonymous spend is limited by tighter rate limits.',
    tradeOffs: 'Two code paths (authed vs anonymous) to reason about and test.',
    risks: 'Anonymous search still costs money — mitigated by stricter anonymous rate limits.',
    rollbackPlan: 'Flip protected-route list / persistence rule; both are localized and covered by tests.',
    owner: 'Engineering (Governor)',
    date: '2026-07-10',
    evidence: 'app/api/search/route.ts (save only when authed), middleware.ts protected pages + limits.',
  },
  {
    decision: 'Rate limiting via a durable-capable adapter (Upstash REST) with an honest in-memory fallback.',
    reason: 'Gives real distributed durability when configured, without forcing infra at hackathon scale, and never misrepresents which mode is active.',
    alternatives: 'In-memory only (not durable); mandatory Upstash (adds required infra/cost).',
    benefits: 'Durable across instances when Upstash is set; zero-config dev fallback; state reported at /api/health.',
    tradeOffs: 'Two backends to maintain; fallback is per-instance.',
    risks: 'If Upstash is never configured in prod, protection is per-instance only — surfaced honestly, not hidden.',
    rollbackPlan: 'Adapter is behind one interface; revert to the prior middleware limiter if needed.',
    owner: 'Engineering (Governor)',
    date: '2026-07-10',
    evidence: 'lib/rate-limit.ts (isDurable + Upstash pipeline + memory fallback); rate-limit tests.',
  },
];
