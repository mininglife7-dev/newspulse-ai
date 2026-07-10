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

### DNA-GOV-002: Production Monitoring
**Status:** Proposed  
**Owner:** Chief Risk Officer + Chief Engineer  
**Priority:** High (needed for commercial readiness)  

Automatically monitor production deployment (after Supabase schema is deployed) to detect failures, performance degradation, or error rates exceeding thresholds.

**Why needed:** We can detect blockers, but we can't know if deployed code is working in production. This is a critical reliability gap.

**Evidence:** No monitoring configured; Founder has no way to know if first customer's auth flow works until they report it.

---

## Notes

- All DNA must pass 8-test survival rule before integration
- DNA evolves only within 7 categories: Executive, Engineering, Product, Revenue, Research, Risk, Founder
- Every DNA must show improvement in: customer value, Founder hours, quality, reliability, security, delivery speed, operational excellence, or commercial readiness
- Nothing is assumed. Everything is auditable.
