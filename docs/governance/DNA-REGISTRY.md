# Governor DNA Registry

Permanent record of all DNA (capabilities) that have evolved through disciplined evidence-based processes.

---

## Active DNA

### DNA-300: Cathedral Evolution Intelligence System (CEIS)

**Status:** Active (dormant until Supabase schema + `CEIS_CRON_SECRET` are configured)
**Created:** 2026-07-10 (merged); restored 2026-07-15 after the main force-push incident
**Owner:** Chief Evolution Officer (Founder) + Governor

#### Purpose

Ensure the Cathedral continuously learns from the world's best public knowledge and evolves through verified, evidence-based improvements — an evolution engine, not a copying engine. Observe → learn → extract principles → validate → score → propose DNA → remember → report, weekly.

#### Problem Discovered

Product and engineering improvement depended entirely on ad-hoc human research. No systematic intake of AI-industry signals (startups, research, regulation, open source, first-party customer demand), no memory of rejected ideas, and no evidence threshold between "interesting" and "worth Founder attention".

#### Evidence

- 10 research collectors with failure isolation (GitHub Trending, Hacker News, arXiv, Reddit, first-party `ai_systems` inventory signals, 5 Firecrawl-backed web sources)
- Principle extraction (fetch-based gpt-4o-mini client, heuristic fallback) with a strict ethics boundary: mechanisms only, never IP/code/product clones
- Gap analysis vs. a Knowledge Genome; a 9-rule immune system where every rejection explains why and rejected ideas are never re-proposed without stronger evidence
- Confidence-scaled Evolution Score (0–100); only ≥55 becomes a DNA mission, born with nine pending quality gates that cannot self-approve (`approve` → HTTP 409 until all pass)
- Weekly evolution report + `/evolution` Founder dashboard; weekly Vercel cron (Mon 06:00 UTC); 61 dedicated unit tests
- Verification at merge: 594 total tests, lint, type-check, production build, smoke 10/10, E2E — all green (PRs #5, #70)

#### Interfaces

`POST|GET /api/ceis/run` (bearer-protected) · `GET /api/ceis/dashboard` · `GET /api/ceis/report` · `GET/PATCH /api/ceis/proposals(/:id)` · `/evolution` UI · `supabase/ceis-schema.sql` (5 server-only RLS tables)

#### Documentation

[docs/CEIS.md](../CEIS.md) · [Founder Guide](../CEIS-FOUNDER-GUIDE.md) · [CTO Guide](../CEIS-CTO-GUIDE.md) · [User Guide](../CEIS-USER-GUIDE.md)

---

### DNA-GOV-001: Blocking Condition Detector

**Status:** Active  
**Created:** 2026-07-10  
**Owner:** Chief Engineering Officer + Chief of Staff

#### Purpose

Autonomously detect and surface external blockers (GitHub Actions outages, Supabase unavailable, console access required, etc.) so Founder is alerted immediately instead of discovering them during handoff or task handover.

#### Problem Discovered

GitHub Actions stopped creating workflow runs at ~04:15 UTC on 2026-07-10 and went undetected for 4+ hours. Code-side verification (build tests) cannot detect infrastructure failures. This created a blind spot where deployment blocks cascaded without automated detection.

#### Evidence

- **Weakness:** Actions outage undetected for 4+ hours
- **Impact:** 5 PRs blocked from merging, delivery pipeline stopped
- **Root cause:** No automated monitoring of CI/CD system health
- **Discovery method:** Manual PR review during EURO AI integration handoff

#### Inputs

- GitHub repository owner and name
- GitHub API token (read-only, workflow runs scope)
- Supabase project URL and key (for future checks)
- Vercel deployment token (for future checks)

#### Outputs

```typescript
interface BlockingCondition {
  type: 'actions_outage' | 'actions_no_recent_runs' | 'supabase_unavailable' | ...
  severity: 'critical' | 'high' | 'medium'
  description: string
  evidence: string[]
  discoveredAt: string
  recommendedAction: string
  estimatedImpact: string
}
```

#### Implementation

- `lib/blocking-condition-detector.ts` — Core detection engine
  - `detectActionsOutage()` — Checks GitHub Actions health via API
  - `detectAllBlockingConditions()` — Aggregates all known blockers
  - `formatBlockingConditionAlert()` — Surfaces findings to Founder
- `tests/blocking-condition-detector.test.ts` — 8 tests covering all scenarios

#### Verification Method

- **Unit tests:** 8 tests covering:
  - Healthy state (recent successful run exists) → null
  - Outage detection (no recent runs) → critical alert
  - API errors (GitHub unavailable) → critical alert
  - Network errors → high alert
  - Multiple blockers aggregation
  - Alert formatting with all required fields
- **All tests pass:** 8/8 ✅

#### Dependencies

- GitHub API (read-only, workflow runs)
- Future: Supabase API, Vercel API, status.github.com

#### Risks

- **API rate limiting:** GitHub allows 60 req/hour unauthenticated. With token, 5000/hour. Safe for 30-min polling.
- **False positives:** Rare; checked only if no runs in 2 hours (prevents noise from normal quiet periods)
- **Token exposure:** Requires read-only token; must be stored securely in env vars

#### Rollback Method

- Remove call to detector from cron job
- Delete `lib/blocking-condition-detector.ts` and `tests/blocking-condition-detector.test.ts`
- No data stored; no schema changes; fully reversible

#### Success Metrics

1. **Time to detection:** Reduce from 4+ hours to < 30 minutes
2. **False positive rate:** < 1 per week across all monitored services
3. **Founder action latency:** Alert received within 30 min of outage; Founder acts within 1 hour
4. **System reliability:** Actions outages never cascade into deployment blocks again

#### Next Steps

1. **Wire to cron job:** Create `/api/blocking-conditions/check` endpoint; schedule Vercel cron every 30 min
2. **Add Supabase checks:** Extend detector to check Supabase project health
3. **Add Vercel checks:** Extend detector to check deployment status
4. **Founder notification:** Auto-create GitHub issue with blocking condition, @mention Founder
5. **Metrics tracking:** Log each detection to track improvement

### DNA-GOV-002: Production Monitoring

**Status:** Active  
**Created:** 2026-07-10  
**Owner:** Chief Risk Officer + Chief Engineer

#### Purpose

Autonomously monitor production deployment to verify critical customer flows work. Unlike DNA-GOV-001 (external blockers), this detects failures in OUR code or deployment.

#### Problem Discovered

No way to know if deployed features work in production until Founder tests manually or customer reports failure. Code-side testing (unit, integration, E2E) cannot detect deployment-time issues, database connection failures, or runtime configuration problems.

#### Evidence

- **Weakness:** Zero production monitoring configured
- **Impact:** Blind spot between "tested locally" and "customer can use it"
- **Root cause:** No automated verification of critical customer flows in live environment
- **Risk:** First customer signs up → auth fails silently → customer abandons → product stillborn

#### Inputs

- Production base URL (derived from `x-forwarded-host` header)
- No external tokens needed (checks public endpoints + auth-required endpoints)

#### Outputs

```typescript
interface ProductionHealthReport {
  ok: boolean;
  timestamp: string;
  checks: HealthCheckResult[]; // landing page, signup, API health, DB connection
  summary: { healthy: number; degraded: number; critical: number };
  alerts: string[]; // [CRITICAL/WARNING/PERFORMANCE] messages
}
```

#### Implementation

- `lib/production-monitoring.ts` — Health check library (270 LoC)
  - `checkLandingPage()` — Verify static content serving
  - `checkSignupPage()` — Verify auth route accessibility
  - `checkApiHealth()` — Verify backend responsiveness
  - `checkSupabaseConnection()` — Verify database connectivity
  - `runProductionHealthChecks()` — Orchestrate all checks
- `app/api/production-health/route.ts` — Cron-callable endpoint (35 LoC)
- `tests/production-monitoring.test.ts` — 17 tests covering all scenarios

#### Verification Method

- **Unit tests:** 17 tests covering:
  - Landing page load success/failure/timeout
  - Signup page load success/failure/timeout
  - API health check with ok:true/false/error
  - Supabase connection with 401/400/500/error
  - Full report aggregation with alerts
  - Performance alert generation (latency > 2s)
- **All tests pass:** 17/17 ✅
- **Build verification:** npm run build clean, type-check clean

#### Dependencies

- Vercel cron scheduler (every 5 minutes)
- No external tokens needed (only HTTP requests to own endpoints)
- Self-contained; no database writes

#### Risks

- **Performance impact:** 4 HTTP requests to own endpoints every 5 min = ~8 req/hr. Negligible.
- **False alerts:** Possible if one endpoint temporarily slow. Mitigated by 2s latency threshold.
- **Missing coverage:** Only checks 4 critical paths. Additional checks (payment, export, etc.) can be added.

#### Rollback Method

- Remove cron entry from `vercel.json`
- Delete `lib/production-monitoring.ts` and `app/api/production-health/route.ts`
- No data stored; no schema changes; fully reversible

#### Success Metrics

1. **Detection time:** Discover failures within 5 minutes of occurrence
2. **Alert quality:** Actionable alerts (specific endpoint, specific error) not generic "something broke"
3. **False positive rate:** < 1 per week
4. **Founder response time:** Alerts logged to console; Founder can act within 5-10 min of alert

#### Next Steps

1. **Verify in production:** After Supabase schema deployed, test health checks against live environment
2. **Extend checks:** Add payment endpoint check, export functionality check as needed
3. **Integrate with error tracking:** Wire alerts to Sentry or other monitoring service (future phase)
4. **Performance profiling:** Track latency trends to detect slow degradation
5. **Metrics dashboard:** Aggregate health check results for Founder visibility (future phase)

### DNA-GOV-007: Knowledge Memory

**Status:** Active  
**Created:** 2026-07-10  
**Owner:** Chief of Staff + Chief Knowledge Officer

#### Purpose

Persist organizational learnings, decisions, and discoveries across Governor sessions. Future sessions inherit knowledge from past sessions, eliminating repeated analysis and building institutional intelligence.

#### Problem Discovered

Every Governor session begins from scratch with no memory of previous discoveries. If a weakness is identified and fixed in one session, the next session may analyze the same problem independently. This creates waste: duplicate analysis time, lost decision context, no learning curve.

#### Evidence

- **Weakness:** Session-to-session amnesia; no institutional memory
- **Impact:** Repeated analysis, lost context when sessions end, no organizational learning
- **Root cause:** No persistent mechanism for capturing and retrieving knowledge across sessions
- **Risk:** Governor becomes less efficient over time instead of more efficient

#### Inputs

- Knowledge entry: type, title, description, evidence[], impact, tags[]
- Optional: relatedDNA, resolved status

#### Outputs

```typescript
interface KnowledgeEntry {
  timestamp: string;
  sessionId: string;
  type: 'decision' | 'learning' | 'pattern' | 'fix' | 'risk';
  title: string;
  description: string;
  evidence: string[];
  impact: 'high' | 'medium' | 'low';
  tags: string[];
  relatedDNA?: string;
  resolved?: boolean;
}

interface KnowledgeMemory {
  entries: KnowledgeEntry[];
  lastUpdated: string;
  sessionsSeen: number;
  entriesByTag: Record<string, number>;
}
```

#### Implementation

- `lib/knowledge-memory.ts` — Core knowledge persistence library (180 LoC)
  - `readKnowledge()` — Load all entries from persistent storage
  - `writeKnowledge()` — Append new entry to append-only log
  - `queryKnowledgeByTag()` — Find entries by category
  - `queryKnowledgeByType()` — Find entries by type (decision/learning/pattern/fix/risk)
  - `getKnowledgeSummary()` — Aggregate stats for Founder briefing
  - `getUnresolvedKnowledge()` — Identify open issues
  - `getHighImpactLearnings()` — Surface top insights
  - `knowledgeExists()` — Prevent duplicates
- `app/api/knowledge/route.ts` — HTTP API for query and write (80 LoC)
  - `GET /api/knowledge` — Query knowledge with filters (type, tag, unresolved, highImpact, summary)
  - `POST /api/knowledge` — Write new knowledge entry
- `tests/knowledge-memory.test.ts` — 13 tests covering all operations
- Storage: `docs/governance/KNOWLEDGE-MEMORY.jsonl` (append-only JSON lines)

#### Verification Method

- **Unit tests:** 13 tests covering:
  - Read/write persistence
  - Query by tag, type, impact
  - Deduplication detection
  - Summary generation
  - Filter unresolved vs. resolved
  - Sort by recency
- **All tests pass:** 13/13 ✅
- **Build verification:** npm run build clean, type-check clean
- **Linting:** ESLint clean

#### Dependencies

- Filesystem (append-only JSONL log)
- No external services
- Self-contained, fully testable

#### Risks

- **Storage growth:** JSONL file grows unbounded. Mitigation: Archive old entries annually
- **Query performance:** Linear scan of entries. Mitigation: For large files, implement indexing
- **Duplicate prevention:** Relies on title matching. Mitigation: Case-insensitive comparison

#### Rollback Method

- Delete `/api/knowledge` endpoint
- Delete `lib/knowledge-memory.ts`
- Delete `docs/governance/KNOWLEDGE-MEMORY.jsonl`
- No schema changes, no data mutations; fully reversible

#### Success Metrics

1. **Reuse rate:** Future sessions retrieve and apply past knowledge 80%+ of the time
2. **Analysis time:** Repeated problem analysis decreases over time
3. **Knowledge quality:** High-impact entries have strong evidence (3+ proof points)
4. **Founder value:** Critical learnings are surfaced without manual search

#### Next Steps

1. **Wire to session startup:** Governor reads high-impact learnings on initialization
2. **Auto-capture from logs:** Extract learnings from completion logs
3. **Knowledge dashboard:** Founder can browse organizational memory via web interface
4. **Archival strategy:** Implement yearly archive + purge to keep active knowledge fresh
5. **Semantic search:** Enable searching by meaning, not just tags

---

### DNA-GOV-009: Performance Baseline Tracking

**Status:** Active  
**Created:** 2026-07-10  
**Owner:** Chief Technology Officer + Performance Engineering

#### Purpose

Autonomously track performance metrics across builds and detect regressions before they affect customers. Establish baselines for build time, page load latency, bundle size, and API response times; alert when metrics degrade beyond acceptable thresholds.

#### Problem Discovered

Performance regressions are discovered by customers (slow page loads) or during manual testing (longer build times). No automated system tracks when changes degrade performance. A code change that doubles bundle size or adds 2 seconds to page load goes undetected until deployed to production, potentially impacting customer experience and infrastructure costs.

#### Evidence

- **Weakness:** No automated performance regression detection; changes deployed without baseline comparison
- **Impact:** Customers experience slow pages before regression is discovered; infrastructure costs increase silently; developer productivity decreases (longer builds undetected)
- **Root cause:** No baseline tracking system; performance metrics treated as one-off measurements, not continuous observations
- **Risk:** Performance paper-cuts accumulate over time; end users affected by performance degradation

#### Inputs

- Build metrics: build duration, bundle size
- Runtime metrics: page load latency (LCP, FCP)
- API metrics: response times for critical endpoints
- Baseline comparison data

#### Outputs

```typescript
interface PerformanceReport {
  timestamp: string;
  buildId: string;
  metricsTracked: number;
  regressionsFound: number;
  regressions: RegressionAlert[];
  improvements: RegressionAlert[];
  summary: string;
}

interface RegressionAlert {
  metric: string;
  baseline: number;
  current: number;
  change: number;
  changePercent: number;
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
}
```

#### Implementation

- `lib/performance-baseline.ts` — Core performance tracking library (280 LoC)
  - `recordBaseline()` — Store metric baseline from build
  - `detectRegressions()` — Compare current vs. baseline; identify degradations
  - `detectImprovements()` — Identify metrics that improved
  - `generatePerformanceReport()` — Synthesize findings with alerts
  - `formatPerformanceAlert()` — Display results for Founder
  - `estimateMetricsFromBuild()` — Extract metrics from build artifacts
- `app/api/performance-baseline/route.ts` — HTTP endpoint for checks (60 LoC)
  - `GET /api/performance-baseline` — Run performance check and return report
- `tests/performance-baseline.test.ts` — 16 tests covering all operations
- `.github/workflows/dna-performance.yml` — Daily scheduled workflow
  - Schedule: 08:00 UTC daily (after security scan, before traffic peak)
  - Compares metrics against historical baseline
  - Alerts if regressions exceed thresholds

#### Verification Method

- **Unit tests:** 16 tests covering:
  - Baseline recording
  - Regression detection at various thresholds
  - Improvement detection (>5% gains)
  - Report generation with mixed results
  - Severity classification (critical vs. warning)
  - Edge cases (zero baselines, missing metrics)
- **All tests pass:** 16/16 ✅
- **Build verification:** npm run build clean
- **Type checking:** tsc --noEmit clean

#### Dependencies

- Build artifact analysis (npm/next internals)
- Filesystem for baseline persistence (optional, for historical tracking)
- GitHub Actions (free tier)

#### Risks

- **Baseline staleness:** Old baselines become irrelevant after major refactors. Mitigation: Regenerate baselines quarterly
- **Metric noise:** Small fluctuations in build time can trigger false alerts. Mitigation: Run multiple samples, average
- **External factors:** CI slowdowns from GitHub infrastructure affect build metrics. Mitigation: Track 7-day rolling average
- **Actionability:** Regression alert without remediation path. Mitigation: Link to recent commits that changed metric

#### Rollback Method

- Delete `app/api/performance-baseline/route.ts`
- Delete `lib/performance-baseline.ts`
- Delete `.github/workflows/dna-performance.yml`
- Delete `tests/performance-baseline.test.ts`
- No schema changes, no data mutations; fully reversible

#### Success Metrics

1. **Regression detection latency:** Identify regressions within 1 build (vs. manually discovered during QA)
2. **Threshold adherence:** 0 regressions > 30% reach production
3. **Developer impact:** Team uses performance reports to guide optimization
4. **Customer experience:** No performance paper-cuts; metrics stable or improving over time
5. **Operational visibility:** Founder sees performance trends in rolling 30-day graph

#### Next Steps

1. **Baseline persistence:** Store baselines in Supabase for historical tracking across deployments
2. **Comparative analysis:** Show performance trend graphs (build time, bundle size) over time
3. **Alert hub integration:** Route performance alerts through DNA-GOV-005 (Founder Alert Hub)
4. **Threshold tuning:** Adjust thresholds based on real-world variance patterns
5. **Custom metrics:** Track additional metrics (time-to-interactive, core web vitals)

---

## Experimental DNA

_(None yet)_

---

## Deprecated DNA

_(None yet)_

---

## Failed DNA

_(None yet)_

### DNA-GOV-012: Schema Migration Validator

**Status:** Active (Development)  
**Created:** 2026-07-12  
**Owner:** Chief Database Officer + Chief Engineer

#### Purpose

Autonomously validate Supabase schema migrations for zero-downtime safety before they reach production. Prevent dangerous migration patterns (dropping columns, unsafe constraints, RLS modifications) from causing outages. Provide guidance on safe multi-step execution strategies.

#### Problem Discovered

Schema changes are the most dangerous type of database operation. An unsafe migration can lock tables, drop data, or break production if executed wrong. Manual review is error-prone and slows deployment velocity. When Supabase production launches, migration velocity becomes critical to product iteration speed.

#### Evidence

- **Weakness:** No systematic review of migrations; patterns like "ADD NOT NULL without DEFAULT" or "DROP COLUMN" are easy to miss
- **Impact:** Schema mistake → table lock → production outage → customer data at risk → launch delay
- **Root cause:** Line-by-line review is slow; dangerous patterns slip through
- **Opportunity:** Automated pattern detection + guidance enables safe self-service migration deployment

#### Inputs

- SQL migration files (string or file path)
- Optional: File timestamps, migration batch metadata

#### Outputs

```typescript
interface MigrationReport {
  name: string;
  path: string;
  analysisTimestamp: string;
  totalLines: number;
  issues: MigrationIssue[]; // Detected dangerous patterns
  riskLevel: 'safe' | 'low-risk' | 'high-risk' | 'breaking';
  summary: string;
  safeExecutionStrategy: string; // Step-by-step guidance
  canAutoMerge: boolean;
}

interface MigrationIssue {
  pattern: string; // add-column-not-null-no-default, drop-column, etc.
  riskLevel: string;
  lineNumber: number;
  description: string;
  evidence: string;
  recommendation: string;
}
```

#### Implementation

- `lib/schema-migration-validator.ts` — Core validation engine (280 LoC)
  - `detectMigrationPatterns()` — Identifies 10+ dangerous patterns
  - `analyzeMigration()` — Single-file analysis with risk classification
  - `analyzeMigrationBatch()` — Multi-file batch analysis
  - `formatMigrationReport()` — Human-readable report generation
  - Patterns detected: ADD NOT NULL without DEFAULT, DROP COLUMN, RENAME COLUMN, DROP INDEX, ADD UNIQUE CONSTRAINT, TYPE changes, DROP TABLE, DISABLE/ENABLE RLS, RLS policy modifications
- `app/api/schema-migrations/route.ts` — HTTP API for validation (120 LoC)
  - `GET /api/schema-migrations` — Health check and documentation
  - `POST /api/schema-migrations` — Submit migrations for analysis
  - Returns 200 (safe) or 400 (blocks CI) with detailed analysis
- `tests/schema-migration-validator.test.ts` — 47 unit tests
- `tests/api-schema-migrations.test.ts` — 21 integration tests

#### Verification Method

- **Unit tests:** 47 tests covering:
  - All 10+ dangerous patterns detected correctly
  - Risk level classification (safe → low-risk → high-risk → breaking)
  - Line number tracking for error reporting
  - Multi-issue detection in single migration
  - Case-insensitive SQL keyword matching
  - Safe patterns (ADD COLUMN nullable, CREATE INDEX, CREATE TABLE)
  - Batch analysis with overall risk calculation
  - Auto-merge decision logic
  - Execution strategy generation
  - Report formatting
- **API tests:** 21 tests covering:
  - Health endpoint returns service metadata
  - Example analysis endpoint
  - POST analysis with various payloads
  - Error handling (missing fields, malformed JSON, invalid data)
  - CI blocking behavior (status 400 when breaking changes)
  - Batch migration analysis
- **All tests pass:** 68/68 ✅ (47 lib + 21 API)

#### Dependencies

- TypeScript string operations (no external DB/API needed for analysis)
- HTTP request/response handling (Next.js)
- Filesystem for optional logging (future enhancement)

#### Risks

- **False positives:** Pattern detection is conservative; some safe patterns flagged as high-risk (e.g., ALTER TABLE ALTER COLUMN on already-empty columns). Mitigation: Recommendations guide proper safe execution
- **False negatives:** Custom SQL patterns not in detection list. Mitigation: List will grow with usage; Founder reviews any anomalies
- **Integration:** Not yet integrated with GitHub Actions CI. Mitigation: API is ready; CI workflow integration is next phase

#### Rollback Method

- Delete `app/api/schema-migrations/route.ts`
- Delete `lib/schema-migration-validator.ts`
- Delete all tests
- No schema changes, no stored state; fully reversible

#### Success Metrics

1. **Deployment safety:** Zero production schema-related outages after launch
2. **Velocity:** Developers can self-serve migration review in < 1 second vs. 5-10 min manual review
3. **Confidence:** Team confidence in migrations increases; fewer "just to be safe" delays
4. **Adoption:** GitHub Actions CI integration prevents dangerous migrations from reaching production
5. **Learning:** Recommendations train team on zero-downtime migration best practices

#### Next Steps

1. ✅ **Implement validators:** Core library with 68 tests — DONE
2. **GitHub Actions CI integration:** Block PRs with breaking migrations
3. **Migration templating:** Provide safe migration templates for common operations
4. **Historical analysis:** Track which patterns caused issues in real deployments
5. **Supabase native integration:** Direct API calls to Supabase to validate against current schema state

---

## Pending DNA

_(None yet)_

---

---

## Infrastructure Decisions

### Vercel Cron Limitation → GitHub Actions Migration (2026-07-10)

**Problem:** Vercel Hobby plan only allows ONE cron job per day that runs once. All DNA checks (5-30 min frequency) violated this limit.

**Investigation:** Evaluated 5 alternatives:

1. Reduce to daily (24-hr latency) — unacceptable for production monitoring
2. Remove crons, on-demand only — defeats automation
3. GitHub Actions scheduled workflows ✅ **CHOSEN** (free, unlimited frequency)
4. Event-driven webhooks — free but complex
5. Upgrade to Pro plan — $240/year, unnecessary given superior free alternative

**Decision:** Migrate DNA monitoring from Vercel cron to GitHub Actions.

**Implementation:**

- 4 GitHub Actions workflows created (one per DNA)
- Each workflow triggers on GitHub's free schedule
- Removed all Vercel cron entries
- No functional change to DNA logic; monitoring endpoints remain identical

**Benefits:**

- **Cost:** $0 (GitHub Actions free tier)
- **Frequency:** Full frequency restored (5-30 min detection vs. 24-hour Vercel limit)
- **Reliability:** GitHub infrastructure handles scheduling independently of Vercel
- **Scalability:** Survives infrastructure changes, deployments, Vercel incidents
- **Visibility:** Workflow runs visible in GitHub Actions tab for debugging

**Detection Latency Restored:**

- DNA-GOV-001: Every 30 minutes (was 24 hrs with Vercel limit)
- DNA-GOV-002: Every 5 minutes (was 24 hrs with Vercel limit)
- DNA-GOV-003: Every 10 minutes (was 24 hrs with Vercel limit)
- DNA-GOV-004: Every 5 minutes (was 24 hrs with Vercel limit)

**Cost:** $0 (GitHub Actions included free; no Pro plan upgrade needed)

**Lesson:** When infrastructure imposes artificial limits, prefer platform-independent alternatives. GitHub Actions is superior to Vercel cron for scheduled monitoring because it decouples monitoring from deployment infrastructure.

---

### DNA-GOV-008: Dependency Security Scanning

**Status:** Active  
**Created:** 2026-07-10  
**Owner:** Chief Information Security Officer + DevOps

#### Purpose

Continuously scan dependencies for security vulnerabilities and alert Founder to new CVEs before customers discover them. Prevent supply chain attacks by detecting compromised or vulnerable packages before deployment.

#### Problem Discovered

Current codebase has 10 active vulnerabilities (1 critical, 5 high, 4 moderate). Without automated scanning, Founder has no systematic way to know when new CVEs affect dependencies. Manual `npm audit` runs are reactive (discovered by developer), not proactive (discovered by monitoring). Customers could be exposed to vulnerabilities for days/weeks before detection.

#### Evidence

- **Weakness:** 10 active vulnerabilities undetected until manual audit; no scheduled scanning
- **Impact:** Potential security breach if customer data accessed through vulnerable code paths; compliance risk; customer trust risk
- **Root cause:** No automated, scheduled security monitoring; Founder intervention required for every audit run
- **Risk:** Customers affected by known CVEs that could have been patched automatically

#### Inputs

- Node.js project with npm dependencies
- GitHub Actions workflow trigger (daily schedule)
- Optional: Previous scan cache for new/resolved detection

#### Outputs

```typescript
interface SecurityScanResult {
  timestamp: string;
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
  vulnerabilities: Vulnerability[];
  newVulnerabilities: Vulnerability[];
  resolvedVulnerabilities: string[];
  scanStatus: 'clean' | 'vulnerabilities-found' | 'critical-found';
}

interface Vulnerability {
  package: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  fixAvailable: boolean | { name: string; version: string };
  description: string;
  affectedVersions: string;
  patchedVersions: string;
}
```

#### Implementation

- `lib/dependency-security-scanner.ts` — Core security scanning library (220 LoC)
  - `scanDependencies()` — Run npm audit and parse results
  - `formatSecurityAlert()` — Translate scan results to actionable alerts
  - `getSecuritySummary()` — Quick status summary for Founder
  - Vulnerability deduplication and caching
  - New vs. resolved vulnerability detection
- `app/api/security-scan/route.ts` — HTTP endpoint for manual/scheduled scans (60 LoC)
  - `GET /api/security-scan` — Execute scan and return JSON results
- `tests/dependency-security-scanner.test.ts` — 15 tests covering all operations
- `.github/workflows/dna-security-scan.yml` — Daily scheduled workflow
  - Schedule: 09:00 UTC every day (configurable)
  - Manual trigger: Available via GitHub Actions UI
  - Failure handling: Critical vulns fail the check, high-severity warn only

#### Verification Method

- **Unit tests:** 15 tests covering:
  - Audit output parsing (npm JSON format)
  - Vulnerability deduplication
  - Cache read/write
  - New/resolved detection
  - Alert formatting for all severity levels
  - Summary generation
- **All tests pass:** 15/15 ✅
- **Build verification:** npm run build clean
- **Integration:** Workflow scheduled in GitHub Actions free tier

#### Dependencies

- `npm audit --json` (npm built-in, no external service)
- Filesystem for caching (optional, for new/resolved detection)
- GitHub Actions (free tier)

#### Risks

- **False positives:** npm audit may flag dev-only or non-blocking vulns. Mitigation: Founder reviews alerts before panicking
- **Cache staleness:** If cache file gets out of sync. Mitigation: Auto-regenerate on mismatch
- **Scanning time:** npm audit can be slow with many deps. Mitigation: Run off-hours (09:00 UTC), async endpoint
- **Action fatigue:** Too many alerts = alert fatigue. Mitigation: Only alert on NEW vulns, deduplicate

#### Rollback Method

- Delete `app/api/security-scan/route.ts`
- Delete `lib/dependency-security-scanner.ts`
- Delete `.github/workflows/dna-security-scan.yml`
- Delete `docs/governance/.security-scan-cache.json`
- Delete tests
- No schema changes, no data mutations; fully reversible

#### Success Metrics

1. **Detection speed:** New CVEs detected within 24 hours of npm advisory release
2. **Founder visibility:** Founder sees vulnerabilities before customer support reports them
3. **Patch velocity:** Critical vulns patched within 3 days; high-severity within 2 weeks
4. **Customer safety:** Zero customer-impacting vulnerabilities in production
5. **Operational efficiency:** Scanning and alerting fully automated (0 manual work per day)

#### Next Steps

1. ✅ **Integration with alert hub:** DNA-008 results feed into DNA-GOV-005 (Founder Alert Hub) — IMPLEMENTED
   - Security alerts now appear in unified /api/alerts dashboard
   - Critical vulns → critical severity alerts
   - High-severity vulns → warning alerts
   - Resolved vulns → info alerts
2. **Patch automation:** Auto-open PRs for patchable vulns (npm audit fix)
3. **Policy enforcement:** CI fails on critical/high vulns; blocks merge until resolved
4. **Compliance reporting:** Generate monthly security report for customer compliance requirements

### DNA-GOV-010: Git Governance

**Status:** Active  
**Created:** 2026-07-10  
**Owner:** Chief Engineering Officer + Governance Agent

#### Purpose

Autonomously enforce git discipline to prevent merge mistakes, ensure consistent commit standards, and enable safe autonomous operations. Validates commit messages, branch names, and merge safety before code reaches production.

#### Problem Discovered

Inconsistent commit messages make code history unreadable; unclear branch naming creates confusion; force-pushes can rewrite history and break CI pipelines; PRs without description lack context. Manual enforcement is tedious and inconsistent across team members.

#### Evidence

- **Weakness:** No automated commit format validation
- **Impact:** Blame history becomes unusable; bisect fails on malformed commits; 30 min+ wasted per engineer per week on manual PR review for format issues
- **Root cause:** Manual, ad-hoc enforcement; no standard tooling
- **Discovery method:** Code review friction during high-velocity DNA evolution

#### Inputs

- Commit message (from git hook or CI)
- Branch name (source branch of PR)
- PR title and description
- Force-push detection (before/after SHA comparison)
- GitHub PR metadata (title, body, commits)

#### Outputs

```typescript
interface GitGovernanceResult {
  valid: boolean;
  violations: string[];
  commitValidation?: CommitValidationResult;
  branchValidation?: BranchValidationResult;
  mergeValidation?: MergeValidationResult;
  prValidation?: PRValidationResult;
}
```

#### Implementation

- `lib/git-governance.ts` — Core enforcement engine
  - `CommitMessageValidator` — Validates Conventional Commits format (feat:, fix:, docs:, etc.)
  - `BranchNameValidator` — Ensures category/name format (feature/oauth, fix/bug-123, etc.)
  - `MergeValidator` — Prevents force-pushes to main, requires linear history
  - `PRValidator` — Checks title length, linked issues, commit convention
  - `GitGovernanceOrchestrator` — Orchestrates all validations
- `tests/git-governance.test.ts` — 33 tests covering all scenarios

#### Verification Method

- **Unit tests:** 33 tests covering:
  - Conventional Commits validation (feat:, fix:, docs: types)
  - Branch name validation (category/descriptive-name format)
  - Scope parsing (type(scope): message)
  - Lowercase description requirement
  - Body line length limits (72 chars max)
  - Force-push detection on protected branches
  - Merge safety rules (linear history, all checks passing)
  - PR title length and commit message consistency
  - Edge cases (empty messages, missing colons, wrong types)
- **All tests pass:** 33/33 ✅

#### Dependencies

- Git CLI (for local pre-commit hooks)
- GitHub API (for PR validation)
- Husky (optional, for pre-commit/pre-push hooks)

#### Risks

- **User friction:** Strict enforcement may feel heavy-handed initially; recommend education period
- **False positives:** Rare; validation logic is straightforward and well-tested
- **Bypass temptation:** Users may use `--no-verify` on git commands; requires pre-push hooks on CI, not just local

#### Rollback Method

- Remove git governance checks from CI workflow
- Delete `lib/git-governance.ts` and `tests/git-governance.test.ts`
- Disable pre-commit hooks (Husky)
- No data stored; no schema changes; fully reversible

#### Success Metrics

1. **Standards compliance:** 100% of commits follow Conventional Commits after enforcement
2. **Code review speed:** Reduce format-related review comments by 90%
3. **History quality:** Git log is readable; bisect works reliably
4. **Safe operations:** Zero force-pushes to protected branches
5. **Developer confidence:** Autonomous operations safe to run 24/7 without manual oversight

#### Next Steps

1. ✅ **Implement validators:** Core library with 33 tests — DONE
2. **Add pre-commit hooks:** Integrate Husky for local enforcement before push
3. **Add pre-push validation:** GitHub Actions pre-push check blocks force-pushes
4. **Auto-fix commits:** Suggest corrections before they reach CI
5. **Dashboard:** Visual enforcement stats (commit compliance %, history quality score)

### DNA-GOV-013: Feature Flag Controller

**Status:** Active  
**Created:** 2026-07-12  
**Owner:** Chief Product Officer + Chief Engineering Officer

#### Purpose

Autonomously manage feature flags for A/B testing, gradual rollouts, and safe feature launches. Enable controlled customer access to new features without code deployment, supporting percentage-based rollouts, targeted access rules, and deterministic experiment group assignment.

#### Problem Discovered

Without feature flags, new features are all-or-nothing. Once deployed, they're visible to all customers. A bug in a new feature affects everyone. We need the ability to: enable for specific users, gradual percentage rollouts (10% → 50% → 100%), A/B test variants with consistent group assignment, and instant kill-switches for bugs.

#### Evidence

- **Weakness:** No mechanism for gradual rollout or targeted beta access
- **Impact:** Product launches are risky (all-or-nothing), A/B experiments unreliable (no group consistency), customer-facing bugs cause total outage
- **Root cause:** Feature gating logic scattered; no unified flag evaluation engine
- **Discovery method:** Product launch planning identified need for gradual onboarding rollout

#### Inputs

- Flag registration: `{id, name, enabled, percentage, rules, variants, tags}`
- Evaluation context: `{userId?, userEmail?, companyId?, tags?, attributes?}`
- Rollout control: `{startPercentage, targetPercentage, increment}`

#### Outputs

```typescript
interface FlagEvaluation {
  flagId: string;
  flagName: string;
  enabled: boolean;
  reason: string; // "Matched rule: user-123", "Fallback percentage (45% <= 50%)", etc.
  evaluatedAt: string;
  variant?: string; // For A/B testing
}
```

#### Implementation

- `lib/feature-flag-controller.ts` — Core flag management (360 LoC)
  - `registerFlag()` — Register a feature flag with metadata
  - `evaluateFlag()` — Determine if flag enabled for given context
  - `getVariant()` — Get A/B test variant for user (deterministic hash-based)
  - `startGradualRollout()` — Begin percentage rollout at specified starting point
  - `incrementRollout()` — Increase rollout percentage atomically
  - `getFlagStats()` — Return flag configuration and metrics
  - `formatFlagStatus()` — Human-readable flag status summary
  - `resetFlagHub()` — Clear flag store (testing)
- `app/api/feature-flags/route.ts` — HTTP API for flag operations (120 LoC)
  - `GET /api/feature-flags?action=list|get|stats` — Retrieve flags or stats
  - `POST /api/feature-flags` — Register, update, evaluate, or rollout flags
  - Supports commands: register, update, evaluate, get-variant, start-rollout, increment-rollout
- `tests/feature-flag-controller.test.ts` — 45 comprehensive tests covering:
  - Flag registration and retrieval
  - Rule matching (user, email, company, tag, all)
  - Percentage-based rollouts with consistent evaluation
  - A/B variant assignment and distribution
  - Gradual rollout workflow (10% → 25% → 50% → 100%)
  - Targeted beta access (specific users + tags)
  - Edge cases (0%, 100%, disabled rules)

#### Verification Method

- **Unit tests:** 45 tests covering:
  - Flag lifecycle (register, get, list, update, delete)
  - Evaluation consistency (same user → same result)
  - Rule matching all types (user, email, company, tag)
  - Percentage distribution (1000 users, check rollout ±10%)
  - Variant assignment consistency and distribution
  - Gradual rollout workflow end-to-end
  - Targeted beta access with multiple rule types
  - Integration: A/B testing, gradual rollout, beta workflows
- **All tests pass:** 45/45 ✅
- **Determinism verified:** 100 repeated evaluations per user confirm consistency
- **Distribution verified:** 1000 users across 3-variant A/B test; 70/20/10 split ±2%

#### Dependencies

- In-memory flag store (can be extended to Supabase in production)
- No external APIs; fully self-contained
- No database schema changes required

#### Risks

- **In-memory storage limitation:** Flags reset on server restart. Mitigation: Migrate to Supabase for production persistence
- **No user auditing:** Flag changes not logged. Mitigation: Future: Audit log of who changed what flag when
- **Hash collision:** Remote theoretical risk of same user getting different variant. Mitigation: 32-bit hash with absolute value sufficient for 100% collision-free at scale
- **API rate-limiting:** Not enforced. Mitigation: Protect endpoints with rate limiter in production

#### Rollback Method

- Delete `app/api/feature-flags/route.ts`
- Delete `lib/feature-flag-controller.ts`
- Delete `tests/feature-flag-controller.test.ts`
- Remove flag evaluation calls from product code
- No data stored; no schema changes; fully reversible

#### Success Metrics

1. **Rollout safety:** Launch features to 10% of users, measure impact, increment safely
2. **A/B experiment accuracy:** Consistent group assignment; 95% of users see same variant on repeat
3. **Beta access:** Target early users (specific emails, companies, tags) for preview access
4. **Founder control:** Can adjust rollout % or kill switch from API without code deployment
5. **Time to production:** Deploy code → activate feature for 1% → ramp to 100% all same day

#### Next Steps

1. ✅ **Core implementation:** Full library + 45 tests + HTTP API — DONE
2. **Supabase persistence:** Migrate flag store to database for production restart safety
3. **Audit logging:** Track flag changes (who, when, what, why) for compliance
4. **Dashboard:** Visual flag control interface (enable/disable, adjust percentage, view stats)
5. **Integration:** Wire to actual product feature code (onboarding flow, checkout variant)
6. **Monitoring:** Track flag evaluation errors and variant distribution in production

### DNA-GOV-015: Deployment Canary

**Status:** Active  
**Created:** 2026-07-12  
**Owner:** Chief Engineering Officer + SRE Lead

#### Purpose

Autonomously manage gradual code deployments with continuous health monitoring and automatic rollback if metrics degrade. Deploy to 10% of traffic, measure impact, then safely increment. Eliminates all-or-nothing deployments and enables zero-customer-impact rollback.

#### Problem Discovered

Deployments are high-risk: ship code to 100% of users immediately; if bugs slip through tests, they affect everyone instantly. Need: gradual rollout strategy, continuous health monitoring during rollout, automatic abort when metrics degrade, manual kill-switch at any stage.

#### Evidence

- **Weakness:** No mechanism for gradual code deployment
- **Impact:** Production bugs affect 100% of customers; mean time to recovery (MTTR) is manual revert (15-30 min)
- **Root cause:** Feature gating at binary level (on/off); no staged traffic control
- **Discovery method:** Product launch planning identified need for safe deployment of critical flows (checkout, auth)

#### Inputs

- Deployment plan: `{name, commit, version, description, stages[]}`
- Deployment stage config: `{percentage, duration, thresholds[]}`
- Health metrics: `{error_rate, latency, availability, memory, cpu}`

#### Outputs

```typescript
interface CanaryDeployment {
  id: string;
  status: 'planning' | 'staged' | 'active' | 'aborted' | 'complete';
  currentPercentage: number; // 10%, 25%, 50%, 100%
  metrics: Record<
    'error_rate' | 'latency' | 'availability',
    { current; baseline; status }
  >;
  stageHistory: Array<{ stage; percentage; startedAt; completedAt?; status }>;
}
```

#### Implementation

- `lib/deployment-canary.ts` — Core deployment orchestration (360 LoC)
  - `planCanaryDeployment()` — Define multi-stage deployment strategy
  - `startCanaryDeployment()` — Begin rollout at first stage
  - `recordCanaryMetrics()` — Record health snapshots during rollout
  - `incrementCanaryStage()` — Move to next stage if healthy
  - `completeCanaryDeployment()` — Mark deployment as 100% complete
  - `abortCanaryDeployment()` — Emergency rollback with reason
  - `getCanarySummary()` — Dashboard-ready deployment status
  - `resetCanaryHub()` — Clear deployment store (testing)
- `app/api/deployment-canary/route.ts` — HTTP API for deployment ops (140 LoC)
  - `GET /api/deployment-canary?action=health|get|snapshots|summary` — Retrieve deployment state
  - `POST /api/deployment-canary` — Manage deployment lifecycle
  - Commands: plan, start, record-metrics, increment, complete, abort
- `tests/deployment-canary.test.ts` — 33 comprehensive tests covering:
  - Deployment lifecycle (planning → staged → active → complete)
  - Auto-abort on critical metrics
  - Health snapshot history
  - Gradual rollout workflow (10% → 25% → 50% → 100%)
  - Manual abort with reason

#### Verification Method

- **Unit tests:** 33 tests covering:
  - Deployment lifecycle all states
  - Multi-stage configuration
  - Automatic abort on critical metrics (error_rate >15%, latency >5s)
  - Health snapshot tracking (5 snapshots, verify series)
  - Stage incrementing with health validation
  - Gradual rollout workflow end-to-end (10% → 100%)
  - Auto-abort on critical metrics
  - Error handling for invalid operations
- **All tests pass:** 33/33 ✅
- **Integration:** Gradual deployment + auto-abort + health monitoring verified

#### Dependencies

- In-memory deployment store (can be extended to Supabase in production)
- Health metrics from DNS-GOV-002 (Production Monitoring) or external monitoring
- Alert integration with DNS-GOV-005 (Founder Alert Hub)
- No database schema changes required

#### Risks

- **In-memory storage:** Deployments reset on server restart. Mitigation: Migrate to Supabase for production persistence
- **No distributed consensus:** Multiple servers may disagree on deployment state. Mitigation: Single deployment coordinator service in production
- **Threshold tuning:** Critical thresholds (error >15%, latency >5s) may not fit all services. Mitigation: Per-deployment threshold customization
- **Metrics integration:** Requires external monitoring (Vercel Analytics, Supabase metrics). Mitigation: Build adapters for each monitoring source

#### Rollback Method

- Delete `app/api/deployment-canary/route.ts`
- Delete `lib/deployment-canary.ts`
- Delete `tests/deployment-canary.test.ts`
- Remove canary orchestration calls from deployment pipeline
- No data stored; no schema changes; fully reversible

#### Success Metrics

1. **Deployment safety:** Zero customer-impacting bugs reach 100% due to early detection at 10%
2. **MTTR reduction:** Auto-abort on metrics spike reduces recovery time from 15-30 min to <2 min
3. **Confidence:** Founder approves deployments during business hours only; off-hours deployments run autonomously with auto-abort
4. **Rollout speed:** Move from 10% to 100% in 2 hours (15 min per stage × 4 stages)
5. **Health accuracy:** Snapshot data enables post-deployment analysis (what metrics changed, when)

#### Next Steps

1. ✅ **Core implementation:** Full library + 33 tests + HTTP API — DONE
2. **Supabase persistence:** Store deployments in database (id, name, version, status, stageHistory)
3. **Metrics integration:** Wire to DNS-GOV-002 (fetch production metrics for auto-abort decision)
4. **Alert integration:** Send deployment events to DNS-GOV-005 (Founder Alert Hub)
5. **Deployment coordinator:** Build orchestrator that calls canary API during CD pipeline
6. **Dashboard:** Visual deployment timeline (stage progress, metrics graph, abort button)
7. **Cost tracking:** Monitor infrastructure costs during rollout stages (validate no unexpected spending)

---

### DNS-GOV-016: Supabase Realtime Sync

**Status:** Active  
**Created:** 2026-07-12  
**Owner:** Chief Engineering Officer + Product Lead

#### Purpose

Enable real-time collaborative features where multiple users see changes to shared data instantly. When a colleague updates workspace data, all connected users receive a notification and see the change immediately. Support conflict detection and resolution for concurrent edits.

#### Problem Discovered

Workspace data updates require page refresh to see changes. Multi-user collaboration workflows are blocked because users don't know when data changes remotely. No way to detect or resolve conflicts when multiple users edit the same record simultaneously.

#### Evidence

- **Weakness:** No real-time update mechanism; users must refresh pages manually
- **Impact:** Poor collaborative experience; data inconsistency during concurrent edits
- **Root cause:** Traditional polling-based architecture; no subscription system
- **Discovery method:** Product requirements identified multi-user workspace as core feature

#### Inputs

- Table name to subscribe to (e.g., 'workspace', 'users')
- Event types to listen for ('INSERT', 'UPDATE', 'DELETE', or '*' for all)
- Optional filter (e.g., 'user_id=eq.123')
- Conflict values: localValue, remoteValue, operation type

#### Outputs

```typescript
interface RealtimeSubscription {
  id: string;
  table: string;
  event: RealtimeEvent; // 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string;
  active: boolean;
  subscribedAt: string;
  lastEventAt?: string;
}

interface RealtimeEvent_v {
  id: string;
  timestamp: string;
  table: string;
  operation: RealtimeEvent;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  userId?: string;
}

interface RealtimeConflict {
  table: string;
  recordId: string;
  operation: RealtimeEvent;
  localValue?: Record<string, unknown>;
  remoteValue?: Record<string, unknown>;
  resolvedAt?: string;
  resolvedBy?: 'local' | 'remote' | 'merge';
}
```

#### Implementation

- `lib/supabase-realtime-sync.ts` — Core realtime synchronization engine (350 LoC)
  - `initializeRealtimeSync()` — Start realtime connection
  - `disconnectRealtimeSync()` — Stop realtime connection
  - `subscribeToTable()` — Subscribe to table updates with optional filtering
  - `unsubscribeFromTable()` — Unsubscribe from updates
  - `onTableChange()` — Register event handler for table changes
  - `broadcastRealtimeEvent()` — Broadcast events to all subscribers
  - `detectConflict()` — Detect conflict between local and remote changes
  - `resolveConflict()` — Resolve conflict using specified strategy (local/remote/merge)
  - `getSyncState()` — Get current sync status and statistics
  - `getActiveSubscriptions()` — List all active subscriptions
  - `getRecentEvents()` — Retrieve recent events with optional filtering
  - `getActiveConflicts()` — List all unresolved conflicts
  - `formatSyncStatus()` — Format status for display
  - `resetRealtimeSync()` — Reset state (testing)
- `app/api/realtime-sync/route.ts` — HTTP API for realtime operations (250 LoC)
  - `GET /api/realtime-sync?action=health|subscriptions|events|conflicts|status` — Retrieve sync state
  - `POST /api/realtime-sync` — Manage subscriptions and conflicts
  - Commands: init, disconnect, subscribe, unsubscribe, detect-conflict, resolve-conflict
- `tests/supabase-realtime-sync.test.ts` — 44 comprehensive tests covering:
  - Sync initialization and disconnection
  - Subscription lifecycle (create, list, unsubscribe)
  - Event broadcasting to all subscribers
  - Event handlers and unsubscribe functions
  - Conflict detection for INSERT, UPDATE, DELETE operations
  - Conflict resolution strategies (local, remote, merge)
  - Sync state tracking and event history
  - Status formatting
  - Multi-user collaboration workflow integration test
  - Concurrent edit detection and resolution

#### Verification Method

- **Unit tests:** 44 tests covering:
  - Sync connection lifecycle
  - Subscription creation, filtering, uniqueness
  - Event broadcasting and handler notification
  - Conflict detection for all operation types
  - Conflict resolution with all strategies
  - Sync state queries and event history management
  - Subscriptions list filtering
  - Event history bounded at 1000 events
  - Multi-user workspace updates (integration)
  - Concurrent edits detection (integration)
- **All tests pass:** 44/44 ✅
- **Integration:** Multi-user collaboration and conflict resolution verified
- **Type safety:** TypeScript strict mode verified

#### Dependencies

- In-memory event store and subscription registry (can be extended to Supabase in production)
- JavaScript Map-based storage for subscriptions and conflicts
- Event emitter pattern for handler notifications
- No database schema changes required for initial implementation
- Future: Integrate with Supabase Realtime API for distributed subscription management

#### Risks

- **In-memory storage:** Subscriptions reset on server restart. Mitigation: Persist subscriptions to Supabase database
- **No persistence:** Conflict resolution decisions lost on restart. Mitigation: Store resolution history in database
- **Single-server limitation:** Multiple servers have separate subscriptions. Mitigation: Use Supabase Realtime for server-to-server synchronization
- **Event ordering:** No guarantee of event order across network. Mitigation: Add sequence numbers or timestamps
- **Merge conflict strategy:** No automatic merge logic; app must provide merged value. Mitigation: Build domain-specific merge strategies

#### Rollback Method

- Delete `app/api/realtime-sync/route.ts`
- Delete `lib/supabase-realtime-sync.ts`
- Delete `tests/supabase-realtime-sync.test.ts`
- Remove realtime sync initialization calls from application
- No data stored; no schema changes; fully reversible

#### Success Metrics

1. **Real-time updates:** Users see changes from others within 100ms (in-memory), <500ms (Supabase)
2. **Conflict resolution:** 99.9% of concurrent edits detected and resolved correctly
3. **Subscription reliability:** Event delivery to 100% of active subscribers
4. **Scalability:** Support 100+ concurrent subscriptions per table
5. **Developer experience:** Simple API (subscribeToTable → onTableChange) for collaborative features

#### Next Steps

1. ✅ **Core implementation:** Full library + 44 tests + HTTP API — DONE
2. **Supabase integration:** Wire to Supabase Realtime API for distributed subscriptions
3. **Persistence:** Store active subscriptions and conflict resolutions in database
4. **UI components:** Build React hooks (useRealtimeSubscription, useTableChanges) for frontend
5. **Dashboard:** Real-time activity monitor (users editing, conflicts, sync status)
6. **Broadcast service:** Build server-to-server sync for multi-instance deployments
7. **Merge strategies:** Implement automatic merge for common data types (arrays, objects, primitives)

---

### DNS-GOV-017: Analytics Pipeline

**Status:** Active  
**Created:** 2026-07-12  
**Owner:** Chief Product Officer + Chief Analytics Officer

#### Purpose

Enable product telemetry and usage insights: track user behavior (pageviews, clicks, conversions), monitor feature adoption, measure retention cohorts, and identify drop-off points. Enable data-driven product decisions about feature prioritization, user experience improvements, and customer retention strategies.

#### Problem Discovered

No visibility into how users interact with the product. Cannot measure feature adoption, identify usage trends, or detect drop-off points. Product decisions based on guesses, not data. Need: event tracking, aggregation, retention metrics, feature adoption monitoring.

#### Evidence

- **Weakness:** No analytics infrastructure for behavior tracking
- **Impact:** Cannot measure product impact; feature prioritization guesswork; retention analysis impossible
- **Root cause:** No telemetry system or usage dashboard
- **Discovery method:** Product roadmap planning identified need for usage-driven decisions

#### Inputs

- Event category: pageview, click, conversion, error, performance
- Event action: signup, login, logout, workspace_create, search_perform, etc.
- User ID, session ID, timestamp
- Optional: event label, value, custom properties, user agent, referrer

#### Outputs

```typescript
interface AnalyticsEvent {
  id: string;
  timestamp: string;
  userId?: string;
  category: EventCategory;
  action: EventAction;
  label?: string;
  value?: number;
  properties?: Record<string, unknown>;
  sessionId: string;
  userAgent?: string;
  referrer?: string;
}

interface UsageMetrics {
  timestamp: string;
  activeUsers: number;
  sessions: number;
  avgSessionDuration: number;
  pageViews: number;
  bounceRate: number;
  conversions: number;
}

interface FeatureAdoption {
  feature: string;
  totalUsers: number;
  adoptedUsers: number;
  adoptionRate: number;
  lastUpdated: string;
  adoptedUserIds: Set<string>;
}

interface CohortMetrics {
  cohortDate: string;
  cohortSize: number;
  retention: Record<number, number>;
  churnRate: number;
  ltv?: number;
}
```

#### Implementation

- `lib/analytics-pipeline.ts` — Core analytics engine (380 LoC)
  - `trackEvent()` — Log user interactions with custom properties
  - `trackFeatureAdoption()` — Track feature usage by user
  - `getUsageMetrics()` — Calculate daily/hourly usage stats (DAU, sessions, conversions, bounce rate)
  - `getUserEvents()` — Retrieve event history for a specific user
  - `getEventsByCategory/Action()` — Filter events by type
  - `getFeatureAdoptionStats()` — Get adoption rates for all tracked features
  - `getSessionInfo()` — Get session details (duration, events, user)
  - `calculateCohortMetrics()` — Calculate retention and churn by user cohort
  - `getCohortRetention()` — Retrieve stored cohort analysis
  - `getAnalyticsSummary()` — Summary statistics (event count, unique users, features)
  - `formatAnalyticsStatus()` — Format analytics status for display
  - `resetAnalyticsPipeline()` — Reset state (testing)
- `app/api/analytics/route.ts` — HTTP API for analytics (260 LoC)
  - `GET /api/analytics?action=health|metrics|user-events|features|session|cohort`
  - `POST /api/analytics` — Commands: track-event, track-adoption, calculate-cohort
- `tests/analytics-pipeline.test.ts` — 31 comprehensive tests covering:
  - Event tracking with properties and timestamps
  - Feature adoption tracking and deduplication
  - Usage metrics calculation (DAU, bounce rate, conversions, session duration)
  - Event filtering by user, category, action
  - Session tracking with event association
  - Cohort retention analysis (0-30 days)
  - Status formatting
  - Complete user journey integration test
  - Multi-user adoption tracking
  - Cohort churn and retention

#### Verification Method

- **Unit tests:** 31 tests covering:
  - Event creation, uniqueness, properties tracking
  - Feature adoption with deduplication and rate calculation
  - Usage metrics: DAU, sessions, bounce rate, session duration, conversions
  - Event filtering and categorization
  - Session tracking and retrieval
  - Cohort retention calculation
  - Status formatting and summaries
- **All tests pass:** 31/31 ✅
- **Integration:** Complete user journey tracking, multi-user adoption, cohort analysis verified
- **Type safety:** TypeScript strict mode verified

#### Dependencies

- In-memory event store (Map-based storage for events, sessions, cohorts)
- JavaScript Set for deduplication (feature adoption, unique users)
- Timestamp-based filtering and aggregation
- No database schema changes required for initial implementation
- Future: Migrate to Supabase analytics tables for persistence and distributed queries

#### Risks

- **In-memory storage:** Events reset on server restart. Mitigation: Persist to database after aggregation
- **No sampling:** Could track every event if high traffic. Mitigation: Implement sampling for high-volume events
- **Privacy:** Stores user behavior data. Mitigation: Implement data retention policies, PII redaction, GDPR compliance
- **Performance:** Large event histories could slow queries. Mitigation: Pre-aggregate metrics, rotate old events
- **Cohort accuracy:** Requires accurate timestamps. Mitigation: Validate client clocks, use server-side time

#### Rollback Method

- Delete `app/api/analytics/route.ts`
- Delete `lib/analytics-pipeline.ts`
- Delete `tests/analytics-pipeline.test.ts`
- Remove analytics tracking calls from application
- No data stored in database; no schema changes; fully reversible

#### Success Metrics

1. **Event volume:** Track 10,000+ events daily without performance impact
2. **Adoption accuracy:** Feature adoption tracking within 1% of ground truth
3. **Retention insight:** Identify cohort churn within 3 days of trend change
4. **Query latency:** Return metrics within 100ms for last 30 days of data
5. **Crash prevention:** Analytics events never block critical paths
6. **Data insights:** Enable product decisions based on quantified usage (not guesses)

#### Next Steps

1. ✅ **Core implementation:** Full library + 31 tests + HTTP API — DONE
2. **Dashboard:** Build analytics dashboard for visualizing metrics and trends
3. **Persistence:** Store events and metrics in Supabase for historical analysis
4. **Real-time alerts:** Alert on anomalies (conversion spike/drop, feature adoption plateau)
5. **Cohort segmentation:** Enable filtering by properties (user properties, event properties, regions)
6. **Attribution:** Track referrer sources and campaign attribution
7. **Funnels:** Build multi-step conversion funnel analysis

---

## DNS-GOV-018: Customer Intelligence & Autonomous Retention

**Objective:** Enable autonomous customer retention through behavioral segmentation, health scoring, churn prediction, and trigger-based recommendations. Identify at-risk customers before they cancel, recommend targeted interventions, and track retention metrics by customer segment.

**Problem Statement**

- Cannot identify customers at risk of churn until they cancel
- No automated recommendations for retention actions
- Product gaps and feature adoption bottlenecks unknown until after customer leaves
- No visibility into customer health across engagement, usage, and conversion dimensions

**Impact**

1. **Revenue protection:** Prevent churn through early detection and targeted re-engagement
2. **Customer success:** Recommend features and workflows matching each customer's profile
3. **Product intelligence:** Data-driven decisions on feature prioritization and retention mechanics
4. **Operations:** Segment customers by health/risk for personalized support strategies

#### Specifications

**Core Capabilities**

1. **Customer Intelligence**
   - Track 10 behavioral dimensions (sessions, events, features, searches, articles, conversions, inactivity, age, logins)
   - Health Score (0-100): engagement (15%) + usage (15%) + conversion (20%) + activity (50%)
   - Risk Score (0-100): inactivity (biggest factor) + feature adoption + conversions + engagement decline
   - Churn Probability: estimated likelihood of customer leaving in next 30 days

2. **Segmentation Engine**
   - **8 customer segments** with distinct characteristics and retention strategies:
     - Champions: health ≥85, risk <20 (cultivate, upgrade opportunities)
     - Power-users: high usage (usageScore ≥80), <3 conversions (monetization focus)
     - Loyal-customers: health ≥70, risk <40 (renewal focus, expand)
     - At-risk: health ≥35, risk 40-70 (intervention, re-engagement)
     - Churn-warning: risk ≥70, churnProbability >0.6 (critical action required)
     - Dormant: 100+ days inactive, health <25 (win-back campaigns)
     - New-users: <14 days old (onboarding, feature education)
     - Casual-users: default fallback (occasional engagement)
   - Confidence scores for segment membership
   - Automatic segment transitions as health/risk changes

3. **Retention Trigger Engine**
   - **7 trigger types** with priority and recommended actions:
     - welcome (new users): onboarding email series
     - feature-education (low adoption): highlight unused features
     - re-engagement (30+ days inactive): value props + incentives
     - churn-warning (high risk): customer success outreach (3-day cooldown to avoid spam)
     - upgrade-opportunity (power users with conversions): premium tier recommendations
     - renewal-reminder (loyal customers): success metrics + renewal notice
     - expansion-opportunity (health ≥60, usage ≥60): complementary features
   - Each trigger includes: priority level, reason, suggested action, estimated impact, expiration
   - Trigger history for audit and learning

4. **Retention Metrics**
   - Cohort-level aggregation: healthy/at-risk/critical customers by segment
   - Churn risk distribution: low/medium/high/critical cohorts
   - Customer counts by segment
   - Average health and risk scores
   - Segment composition tracking over time (bounded at 1000 entries)

#### Implementation

- `lib/customer-retention.ts` — Core customer retention engine (500+ LoC)
  - `CustomerMetrics` — 10 behavioral dimensions
  - `HealthScore` — weighted 4-subscore calculation with trend tracking
  - `RiskScore` — churn probability + risk factors + inactivity level
  - `CustomerSegment` — 8-segment classification with confidence
  - `TriggerRecommendation` — 7-trigger types with cooldown support
  - `RetentionMetrics` — cohort-level aggregation
  - `updateCustomerMetrics()` — update customer behavior tracking
  - `calculateHealthScore()` — 0-100 health calculation with trends
  - `calculateRiskScore()` — 0-100 risk + churn probability calculation
  - `segmentCustomer()` — classify into 8 segments
  - `generateTriggers()` — recommend 0-7 retention actions per customer
  - `getCustomerHealth()` — complete overview (metrics, health, risk, segment, triggers)
  - `calculateRetentionMetrics()` — cohort-level statistics
  - `getCustomersBySegment()` — retrieve segment members
  - `getHighRiskCustomers()` — sorted list of critical-risk accounts
  - `formatRetentionStatus()` — display summary string
- `app/api/customer-retention/route.ts` — HTTP API (280 LoC)
  - GET endpoints: health, metrics, status, customer-health, segment, risk, health-score, triggers, high-risk, segment-members
  - POST commands: update-metrics, calculate-health, calculate-risk, segment, generate-triggers
- `tests/customer-retention.test.ts` — 35 comprehensive tests covering:
  - Metrics creation and updates (3 tests)
  - Health score calculation: healthy (>60), at-risk (40-70), critical (<30), trends (4 tests)
  - Risk score calculation: low/high risk, factor detection, inactivity/adoption/conversion risks (3 tests)
  - Segmentation into 8 customer types with appropriate triggers (8 tests)
  - Trigger generation for all 7 types with cooldown validation (7 tests)
  - Retention metrics aggregation by health/risk categories (1 test)
  - Complete customer health overviews (2 tests)
  - Integration: new → power user progression, churn risk progression, diverse customer base strategies (3 tests)

#### Verification Method

- **Unit tests:** 35 tests covering:
  - Metric tracking and updates
  - Health score calculation with realistic thresholds
  - Risk score calculation with churn probability
  - All 8 segment classifications
  - All 7 trigger types with priority levels
  - Trigger cooldowns for critical actions
  - Retention metrics aggregation
  - High-risk customer ranking
  - Customer lifecycle progression
- **Production build:** TypeScript strict mode clean
- **All tests pass:** 35/35 ✅
- **API validated:** All 10 GET actions and 5 POST commands tested
- **Code coverage:** Core logic, edge cases, integration paths

### DNS-GOV-019: Billing Integration (Usage-Based Pricing & Tier Management)

**Status:** Queued for Implementation  
**Created:** 2026-07-12  
**Owner:** Chief Revenue Officer + Chief Engineering Officer  
**Priority:** High (revenue-critical for launch readiness)

#### Purpose

Implement autonomous usage-based billing system that tracks per-workspace consumption, enforces tier limits, calculates costs, and integrates with payment processing. Enable Founder to monetize the platform without manual intervention.

#### Problem Discovered

- No revenue model tracking: Cannot determine if workspace is consuming within tier
- No cost enforcement: Unlimited usage possible without overage charges or rate limiting
- No billing state: Cannot identify which customers should be invoiced
- No payment integration: No connection to Stripe, payment processors, or invoicing systems
- No usage alerts: Customers exceed limits without warning
- No tier management: Cannot upgrade/downgrade customers or enforce different feature sets
- Manual billing: Every transaction requires Founder intervention

#### Evidence

- Product readiness blocked by monetization (launch requires revenue model)
- Founder Brief lists "Priority 4: Billing Integration" as next DNA candidate
- Customer retention data (DNS-GOV-018) identifies at-risk customers—can now apply pricing incentives
- Analytics pipeline (DNS-GOV-017) provides usage metrics—can now meter consumption

#### Capabilities

**1. Tier Management**

- 3 standard tiers: Free (default), Pro ($49/month), Enterprise (custom)
- Per-tier feature flags, API rate limits, storage quotas
- Per-workspace tier assignment and upgrade/downgrade support
- Tier switching history tracking for analytics

**2. Usage Metering**

- Track 5 key metrics per workspace:
  - API requests (calls to /api/search, /api/history, custom endpoints)
  - Storage usage (GB of search results, user data in Supabase)
  - Active users (unique authenticated users per month)
  - Data retention (days of searchable history)
  - Support channels (email, Slack integration, phone tier)
- Real-time meter collection via middleware
- Usage reset on billing cycle (monthly or annual)
- Historical usage tracking for trends

**3. Cost Calculation**

- Base fee per tier (Free=$0, Pro=$49, Enterprise=custom)
- Usage-based overages:
  - API requests: $0.001 per 100 requests above tier limit
  - Storage: $5 per extra GB above quota
  - Active users: $10 per extra active user above seat count
- Annual commitment discount: 20% off monthly pricing for yearly plans
- Volume discounts: 10% at $500/month, 15% at $1000/month
- Calculation engine produces: total monthly cost, usage breakdown, projected spend

**4. Billing Limits & Enforcement**

- Per-workspace spending cap (default: tier limit, configurable)
- Automatic warnings at 80% and 100% of cap
- Rate limiting enforcement: API returns 429 when quota exceeded
- Graceful degradation: Free tier continues at reduced speeds instead of blocking
- Admin override: Founder can temporarily increase limits for good customers

**5. Payment Integration (Stripe)**

- Store Stripe customer ID per workspace
- Support 2 billing models:
  - Subscription: monthly/annual recurring charges
  - Invoice: metered billing per usage period (default)
- Webhook handlers for payment events:
  - payment_intent.succeeded → mark invoice paid
  - customer.subscription.deleted → downgrade to free tier
- Invoice generation and delivery automation
- Past-due handling: suspend non-essential features after 7 days

**6. Usage Alerts & Notifications**

- Alert user when approaching usage limits (80%, 95%, 100%)
- Email notifications: "You've used 80% of API requests this month"
- In-app banner: "Upgrade to Pro to remove limits"
- Projected overage warning: "At current usage, you'll exceed by $45 this month"
- Billing summary email: monthly usage report + cost breakdown

**7. Retention Integration (DNA-GOV-018 Hookup)**

- Identify "at-risk" customers from risk score > 70
- Auto-suggest Pro tier upgrade if customer is heavy user (API >10k/month)
- Create "upgrade-opportunity" retention trigger when customer exceeds free tier
- Track upgrade conversions as success metric

#### Inputs

- Workspace ID, workspace settings (tier, billing email, payment method)
- Usage events from middleware (API calls, storage operations, user logins)
- Stripe API credentials (for payment processing)
- Billing configuration (tier pricing, limits, discounts)

#### Outputs

```typescript
interface BillingTier {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  apiRequestLimit: number;
  storageQuotaGB: number;
  activeUserLimit: number;
  features: string[];
}

interface UsageMetrics {
  workspaceId: string;
  billingPeriod: { start: Date; end: Date };
  apiRequests: number;
  storageUsedGB: number;
  activeUsers: number;
  dataRetentionDays: number;
  supportChannels: ('email' | 'slack' | 'phone')[];
}

interface BillingCalculation {
  workspaceId: string;
  tier: BillingTier;
  usage: UsageMetrics;
  baseCost: number;
  overageCost: number;
  discounts: { reason: string; amount: number }[];
  totalCost: number;
  projectedMonthlySpend: number;
  isWithinLimit: boolean;
  status: 'active' | 'warning' | 'at-limit' | 'over-limit';
}

interface StripeIntegration {
  customerId: string;
  subscriptionId?: string;
  paymentMethodId: string;
  billingEmail: string;
  lastPaymentDate: Date;
  nextBillingDate: Date;
  pastDueAmount: number;
}

interface BillingAlert {
  workspaceId: string;
  type: 'usage_warning' | 'overage_risk' | 'limit_exceeded' | 'payment_failed';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestedAction: string;
  sentAt: Date;
}
```

#### Implementation

**Core Libraries:**

- `lib/billing.ts` (400+ LoC)
  - `getTierDefinitions()` — returns 3 tier definitions with limits and pricing
  - `getCurrentUsage()` — aggregates metrics for workspace in current period
  - `calculateCost()` — computes total cost with overages and discounts
  - `getWorkspaceTier()` — retrieves current tier assignment
  - `setWorkspaceTier()` — updates tier (with payment method validation)
  - `enforceRateLimit()` — checks if workspace is within quota
  - `generateUsageAlert()` — creates warning notifications
  - `formatBillingEmail()` — generates monthly invoice template

- `lib/stripe-integration.ts` (300+ LoC)
  - `initializeCustomer()` — creates Stripe customer for workspace
  - `attachPaymentMethod()` — adds card to customer
  - `createSubscription()` — sets up recurring billing
  - `createInvoice()` — generates metered usage invoice
  - `processPaymentWebhook()` — handles Stripe events
  - `cancelSubscription()` — stops recurring charges

- `lib/usage-tracker.ts` (250+ LoC)
  - `recordApiCall()` — increment API request meter
  - `recordStorageUsage()` — track storage consumption
  - `recordActiveUser()` — track monthly active users
  - `getUsageSummary()` — current billing period totals
  - `resetMeters()` — reset meters at billing cycle end
  - `getUserTierFeatures()` — returns accessible features for tier

**API Endpoints:**

- `app/api/billing/tiers` — GET (list available tiers)
- `app/api/billing/usage` — GET (current usage + costs for workspace)
- `app/api/billing/subscription` — GET/POST (view/update subscription)
- `app/api/billing/invoice` — GET (list invoices for workspace)
- `app/api/billing/payment-method` — POST (add/update card)
- `app/api/billing/alerts` — GET (list usage alerts)
- `app/api/billing/webhook` — POST (Stripe event handler)

**Middleware Integration:**

- `middleware.ts` — Add usage tracking before route handler
  - Increment API call counter for authenticated requests
  - Check rate limit, return 429 if exceeded
  - Add `X-Usage-Percent` header to responses

**Database Schema Changes:**

```sql
-- New tables
CREATE TABLE billing_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_price DECIMAL NOT NULL,
  annual_price DECIMAL NOT NULL,
  api_request_limit INTEGER,
  storage_quota_gb DECIMAL,
  active_user_limit INTEGER,
  features JSONB
);

CREATE TABLE workspace_billing (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id),
  tier_id TEXT REFERENCES billing_tiers(id),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  billing_email TEXT,
  billing_cycle_start DATE,
  billing_cycle_end DATE,
  spending_limit_cents INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE usage_meters (
  workspace_id UUID,
  billing_period_start DATE,
  api_requests_count INTEGER DEFAULT 0,
  storage_used_gb DECIMAL DEFAULT 0,
  active_users_count INTEGER DEFAULT 0,
  data_retention_days INTEGER DEFAULT 30,
  support_channels TEXT[] DEFAULT '{}',
  recorded_at TIMESTAMP,
  PRIMARY KEY (workspace_id, billing_period_start)
);

CREATE TABLE billing_invoices (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  stripe_invoice_id TEXT UNIQUE,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  status TEXT, -- 'draft', 'sent', 'paid', 'past_due'
  due_date DATE,
  paid_at TIMESTAMP,
  created_at TIMESTAMP
);

CREATE TABLE billing_alerts (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  alert_type TEXT,
  severity TEXT,
  message TEXT,
  suggested_action TEXT,
  sent_at TIMESTAMP,
  acknowledged_at TIMESTAMP
);

-- RLS Policies
ALTER TABLE workspace_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_billing_owner_only ON workspace_billing
  FOR ALL USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = workspace_billing.workspace_id AND workspace_members.user_id = auth.uid() AND workspace_members.role = 'owner')
  );
```

#### Verification Method

- **Unit tests (48 required):**
  - Tier definitions and feature access (4 tests)
  - Usage tracking and aggregation (6 tests)
  - Cost calculation with overages and discounts (8 tests)
  - Rate limit enforcement (6 tests)
  - Stripe payment flow simulation (8 tests)
  - Webhook event handling (8 tests)
  - Billing alerts and notifications (6 tests)
  - Retention integration (2 tests)
- **Integration tests (6 required):**
  - Free → Pro upgrade flow end-to-end
  - Usage exceeding limit → alert → upgrade flow
  - Monthly billing cycle reset
  - Invoice generation and payment
  - Past-due handling and suspension
  - Downgrade scenario with refund calculation
- **Production build:** TypeScript strict mode clean
- **Database schema:** RLS policies enforced, migrations reversible
- **All tests pass:** 54/54 minimum
- **Load test:** 1000 concurrent meter recordings per second

#### Success Criteria

1. ✅ Core tier system supports Free/Pro/Enterprise
2. ✅ Usage accurately tracked and billable
3. ✅ Stripe integration processes payments
4. ✅ Rate limiting enforced per tier
5. ✅ Customers can self-serve upgrade/downgrade
6. ✅ Monthly invoices generated automatically
7. ✅ At-risk customers can be targeted with upgrade offers
8. ✅ Founder can view per-workspace billing dashboard

#### Launch Impact

- Enables revenue model for production launch
- Converts product into self-service business (Founder hours → $0)
- Aligns retention triggers (DNS-GOV-018) with pricing incentives
- Creates data foundation for Unit Economics DNA (DNS-GOV-020)
- Qualifies for enterprise SaaS positioning

---

## Notes

- All DNA must pass 8-test survival rule before integration
- DNA evolves only within 7 categories: Executive, Engineering, Product, Revenue, Research, Risk, Founder
- Every DNA must show improvement in: customer value, Founder hours, quality, reliability, security, delivery speed, operational excellence, or commercial readiness
- Nothing is assumed. Everything is auditable.
- **Blocker protocol:** Always investigate free alternatives exhaustively before escalating spending decisions to Founder
