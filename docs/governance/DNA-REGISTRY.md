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

### DNA-GOV-007: Session Knowledge Memory

**Status:** Active  
**Created:** 2026-07-10  
**Owner:** Chief Learning Officer + Chief Architect  

#### Purpose
Persistent organizational memory across Governor sessions. Prevents redundant discovery and enables exponential learning through institutional knowledge.

#### Problem Discovered
Governor knowledge is ephemeral (lost between sessions). Each session rediscovers pain points independently. No institutional memory of what was discovered, tried, failed, or succeeded. Prevents exponential improvement across multi-session engagement.

#### Evidence
- **Weakness:** Zero cross-session memory
- **Impact:** Repeated analysis in each session, no learning curve, no institutional knowledge
- **Root cause:** No persistent knowledge store
- **Discovery method:** Observed during DNA-GOV-008 and DNS-GOV-007 implementation that same issues (Vercel hobby tier limit) were re-analyzed independently

#### Inputs
- Discoveries (problems, weaknesses, architectural insights)
- Decisions (what to do, what not to do, trade-offs)
- Metrics (session performance, DNA effectiveness)
- Session context (what was learned, what remains unknown)

#### Outputs
```typescript
interface KnowledgeEntry {
  id: string
  domain: 'architecture' | 'security' | 'performance' | 'reliability' | 'operational' | 'business'
  type: 'discovery' | 'decision' | 'action' | 'outcome' | 'metric'
  key: string // Searchable identifier
  value: unknown // Domain-specific data
  description: string
  discoveredAt: string
  sessionId: string
  impact: 'critical' | 'high' | 'medium' | 'low'
  status: 'active' | 'superseded' | 'deprecated'
  relatedKeys?: string[] // Cross-references
}
```

#### Implementation
- `lib/session-knowledge-memory.ts` — In-memory knowledge store (170 LoC)
  - `InMemoryKnowledgeStore` — Implements KnowledgeMemoryStore interface
  - Store/retrieve by key, domain, type, keyword
  - Lifecycle: deprecate, supersede, mark-active
  - Export/import for Supabase integration
  - Helper functions: `recordDiscovery()`, `recordDecision()`
- `tests/session-knowledge-memory.test.ts` — 18 comprehensive tests

#### Verification Method
- **Unit tests:** 18 tests covering:
  - Store and retrieve entries by key
  - Query by domain, type, keyword
  - Entry lifecycle (deprecate, supersede, mark-active)
  - Session metrics tracking
  - Export/import for persistence
  - Singleton pattern with persistence
  - Helper function behavior
- **All tests pass:** 18/18 ✅
- **Full suite:** 201/201 (baseline 183 + 18 new)

#### Dependencies
- None (MVP: in-memory only)
- Future: Supabase `governor_knowledge` table for cross-session persistence
- Future: API endpoint for querying knowledge from other services

#### Risks
- **Memory usage:** In-memory store grows unbounded if not cleared. Mitigated by Supabase migration for production.
- **Single-session scope:** Current MVP only persists within one session. Founder action required to enable cross-session storage.
- **No validation:** Knowledge entries are not validated against predefined schemas. Mitigated by type hints and documentation.

#### Rollback Method
- Delete `lib/session-knowledge-memory.ts` and test file
- No data stored (MVP); no database changes; fully reversible

#### Success Metrics
1. **Cross-session learning:** Future sessions can query discoveries made in prior sessions
2. **Redundancy elimination:** Same problem analyzed once, reused across sessions
3. **Knowledge accessibility:** Any DNA can ask "has anyone discovered X before?"
4. **Institutional memory:** 3+ months of Governor operations create searchable knowledge base

#### Next Steps
1. **Wire to Supabase:** Create `governor_knowledge` table (schema in migration)
2. **Integrate with DNA:** Each DNA records discoveries automatically
3. **Implement query service:** API endpoint to search knowledge store
4. **Enable cross-session access:** Populate new sessions with prior discoveries
5. **Track knowledge drift:** Deprecated/superseded entries show evolution of understanding

### DNA-GOV-008: Dependency Security Scanning

**Status:** Active  
**Created:** 2026-07-10  
**Owner:** Chief Security Officer + Chief Engineer  

#### Purpose
Autonomously detect npm security advisories and surface CVE exposure. Prevents vulnerabilities from accumulating invisibly in the software supply chain.

#### Problem Discovered
No automated detection of vulnerability advisories in dependencies. On 2026-07-10, the system carried 10 undetected vulnerabilities (1 critical, 5 high, 4 moderate) due to Next.js version. Without autonomous scanning, new CVEs can accumulate undetected for weeks or months.

#### Evidence
- **Weakness:** Zero monitoring of dependency vulnerabilities
- **Impact:** Production deployment with unknown security exposure
- **Current state:** 10 vulnerabilities sit undetected (npm audit shows them, but no automated scanning)
- **Root cause:** No continuous dependency health scanning
- **Discovery method:** Manual `npm audit --omit=dev` during system state assessment

#### Inputs
- npm lockfile (package-lock.json)
- Environment: Production dependencies only (--omit=dev)

#### Outputs
```typescript
interface DependencySecurityReport {
  ok: boolean
  timestamp: string
  vulnerabilityCount: {
    critical: number
    high: number
    moderate: number
    low: number
    total: number
  }
  vulnerabilities: VulnerabilityAdvisory[]
  alerts: string[]
  recommendation?: string
}
```

#### Implementation
- `lib/dependency-security-scanner.ts` — Vulnerability detection engine (110 LoC)
  - `scanDependencies()` — Runs `npm audit --omit=dev --json` and parses results
  - `formatDependencySecurityAlert()` — Formats report for Founder alerts
  - `isCriticalSecurityIssue()` — Determines if action is urgent
- `app/api/dependency-security/route.ts` — Cron-callable endpoint (30 LoC)
- `tests/dependency-security-scanner.test.ts` — 18 comprehensive tests
- `vercel.json` — Scheduled every 6 hours (0 */6 * * *)

#### Verification Method
- **Unit tests:** 18 tests covering:
  - Healthy state (no vulnerabilities) → ok:true
  - Critical detection (1+ critical) → ok:false + alert
  - High-severity detection (1+ high) → ok:false + alert
  - Moderate-only (no action required) → ok:true
  - Advisory detail extraction (title, URL, range, installed version)
  - Error handling (npm audit network failures)
  - Alert formatting (all required fields present)
  - Timestamp inclusion (immutable record)
  - Multiple vulnerabilities per package
- **All tests pass:** 18/18 ✅
- **Build verification:** npm run build clean, lint clean, type-check clean
- **Integration:** Verified with 10 real vulnerabilities currently present in production code

#### Dependencies
- Vercel cron scheduler (every 6 hours)
- No external tokens needed (npm audit is local)
- Self-contained; no database writes

#### Risks
- **CPU impact:** `npm audit` is expensive (takes 10-30s). Mitigated by 6-hour schedule (4 runs/day, minimal impact).
- **False positives:** None; npm audit is authoritative source.
- **Coverage:** Only checks production dependencies (dev-only vulnerabilities not alerted). Design choice: acceptable for now.

#### Rollback Method
- Remove cron entry from `vercel.json`
- Delete `lib/dependency-security-scanner.ts`, `app/api/dependency-security/route.ts`, and test file
- No data stored; no schema changes; fully reversible

#### Success Metrics
1. **Detection latency:** Surface new CVEs within 6 hours of npm advisory publication
2. **Alert quality:** Specific advisory title, URL, affected version range, recommended action
3. **False positive rate:** 0 (npm audit is authoritative)
4. **Founder response time:** Alert logged to console; Founder can act within hours of detection

#### Next Steps
1. **Run in production:** Verify endpoint works on deployed instance (post-credential setup)
2. **Track trends:** Archive reports to identify patterns (dependency drift, update lag)
3. **Auto-remediation:** Future DNA could auto-create PRs for patch updates
4. **Dependabot integration:** Consider bridging with GitHub's Dependabot for richer context
5. **Severity-based actions:** Future: auto-disable or auto-update critical vulnerabilities

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

## Notes

- All DNA must pass 8-test survival rule before integration
- DNA evolves only within 7 categories: Executive, Engineering, Product, Revenue, Research, Risk, Founder
- Every DNA must show improvement in: customer value, Founder hours, quality, reliability, security, delivery speed, operational excellence, or commercial readiness
- Nothing is assumed. Everything is auditable.
