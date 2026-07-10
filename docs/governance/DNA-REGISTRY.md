# Governor DNA Registry

Permanent record of all DNA (capabilities) that have evolved through disciplined evidence-based processes.

---

## Active DNA

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
  ok: boolean
  timestamp: string
  checks: HealthCheckResult[]  // landing page, signup, API health, DB connection
  summary: { healthy: number; degraded: number; critical: number }
  alerts: string[]  // [CRITICAL/WARNING/PERFORMANCE] messages
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
  timestamp: string
  sessionId: string
  type: 'decision' | 'learning' | 'pattern' | 'fix' | 'risk'
  title: string
  description: string
  evidence: string[]
  impact: 'high' | 'medium' | 'low'
  tags: string[]
  relatedDNA?: string
  resolved?: boolean
}

interface KnowledgeMemory {
  entries: KnowledgeEntry[]
  lastUpdated: string
  sessionsSeen: number
  entriesByTag: Record<string, number>
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

## Experimental DNA

*(None yet)*

---

## Deprecated DNA

*(None yet)*

---

## Failed DNA

*(None yet)*

---

## Pending DNA

*(None yet)*

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

## Notes

- All DNA must pass 8-test survival rule before integration
- DNA evolves only within 7 categories: Executive, Engineering, Product, Revenue, Research, Risk, Founder
- Every DNA must show improvement in: customer value, Founder hours, quality, reliability, security, delivery speed, operational excellence, or commercial readiness
- Nothing is assumed. Everything is auditable.
- **Blocker protocol:** Always investigate free alternatives exhaustively before escalating spending decisions to Founder
