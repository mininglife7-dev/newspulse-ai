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

---

### DNA-GOV-003: Dependency Health

**Status:** Active  
**Created:** 2026-07-10  
**Owner:** Chief Engineering Officer + Security Engineer  

#### Purpose
Autonomously monitor npm packages for security vulnerabilities and outdated major versions, surfacing them to Founder daily. Unlike code-side testing (which catches logic bugs), this catches supply-chain risks.

#### Problem Discovered
Current npm audit shows 10 vulnerabilities (4 moderate, 5 high, 1 critical). Without automated tracking, vulnerabilities can accumulate silently until a first-customer incident. Major version upgrades are deferred indefinitely, accruing technical debt.

#### Evidence
- **Weakness:** No dependency security monitoring; only manual spot-checks
- **Impact:** Critical vulnerabilities could remain in production undetected
- **Root cause:** No automated scanning of npm security advisories + version tracking
- **Risk:** Supply-chain compromise, zero-day exploit, first customer hit by known vulnerability → reputational damage

#### Inputs
- `npm audit --json` (built-in, no external tokens needed)
- `npm outdated --json` (built-in, no external tokens needed)
- Runs in Node.js runtime; no API keys required

#### Outputs
```typescript
interface DependencyHealthReport {
  ok: boolean
  timestamp: string
  vulnerabilities: VulnerabilityAlert[]
  outdatedMajors: Record<string, { current: string; latest: string }>
  summary: { vulnerablePackages: number; criticalCount: number; highCount: number; outdatedMajors: number }
  alerts: string[]  // [CRITICAL/HIGH/WARNING] messages
}
```

#### Implementation
- `lib/dependency-health.ts` — Dependency health check library (160 LoC)
  - `checkNpmVulnerabilities()` — Parse npm audit for high/critical severities
  - `checkOutdatedMajors()` — Detect major version upgrades available
  - `runDependencyHealthChecks()` — Orchestrate all checks, aggregate results
  - `formatDependencyAlert()` — Human-readable alert formatting
- `app/api/dependency-health/route.ts` — Cron-callable endpoint (20 LoC)
- `tests/dependency-health.test.ts` — 19 tests covering all scenarios

#### Verification Method
- **Unit tests:** 19 tests covering:
  - No vulnerabilities → ok:true
  - Critical/high severities detected → ok:false with alert
  - Low/moderate severities ignored (not surfaced)
  - Major version detection (14 → 16, not 14.1 → 14.2)
  - Minor/patch upgrades ignored
  - Error handling (npm audit failure, invalid JSON)
  - Alert formatting with severity levels
  - Multiple vulnerability aggregation
- **All tests pass:** 19/19 ✅
- **Build verification:** npm run build clean, type-check clean, lint clean
- **Production verification:** Endpoint recognized in build output as `/api/dependency-health`

#### Dependencies
- Vercel cron scheduler (daily at 2 AM UTC)
- No external tokens needed (uses only built-in npm commands)
- Self-contained; no database writes

#### Risks
- **Performance impact:** ~60s to run `npm audit` + `npm outdated` once daily. Negligible.
- **npm command timeout:** Set 30s timeout per command; if exceeded, returns empty (fail-safe).
- **False positives:** Only high/critical severities flagged. Low/moderate ignored to prevent alert fatigue.
- **Missing context:** Npm advisories sometimes require manual assessment (e.g., "affects only CommonJS builds"); alerts are informational, not prescriptive.

#### Rollback Method
- Remove cron entry from `vercel.json`
- Delete `lib/dependency-health.ts` and `app/api/dependency-health/route.ts`
- No data stored; no schema changes; fully reversible

#### Success Metrics
1. **Detection time:** Identify new vulnerabilities within 24 hours
2. **Alert quality:** Specific package names + severity + recommended action
3. **False positive rate:** < 1 per month (only high/critical flagged)
4. **Founder action time:** Alerts logged to console daily; Founder can review + decide on upgrade strategy
5. **Major version visibility:** Track outdated majors; enable planning for upgrade sprints

#### Next Steps
1. **Founder review:** After daily run, review vulnerabilities in production; decide on upgrade strategy
2. **Integrate with error tracking:** Wire to Sentry/monitoring service if vulnerabilities reach production (future phase)
3. **Auto-remediation rules:** Define which updates are auto-mergeable vs. require Founder decision (future phase)
4. **Dependency monitoring dashboard:** Aggregate health history for trends + patterns (future phase)

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
