# Phase 3 Quick Reference Card

**One-page cheat sheet for Phase 3 timeline**

---

## 🚀 FOUNDER — What to Do Now

**TODAY (2026-07-11):**
1. Read: `PHASE-3-READINESS-SUMMARY-2026-07-11.md` (10 min)
2. Fix 3 infrastructure blockers using `FOUNDER-ACTION-SUMMARY-2026-07-10.md` (~9 min)
   - GitHub Actions (2-3 min)
   - Supabase schema (5 min)
   - Email auth (2 min)

**BEFORE 2026-07-17:**
- Skim: `PHASE-3-ARCHITECTURE-OPTIONS.md` (which candidate do you like?)
- Review: `PHASE-3-CANDIDATE-COMPARISON-MATRIX.md` (summary comparison)

**ON 2026-07-17, 17:00 UTC:**
- Attend Phase 3 decision meeting (20-30 min)
- Approve Phase 3 candidate (recommendation: Audit Logging)
- Confirm sprint dates and success criteria

---

## 🔄 GOVERNOR — What to Do Daily

**EVERY DAY, 09:00 UTC (2026-07-11 to 2026-07-17):**
```bash
npm run checkpoint:collect
# Collects adoption metrics
# Results go to: CHECKPOINT-DAILY-LOG.md
```

**EVERY FRIDAY, 10:00 UTC:**
- Review CHECKPOINT-DAILY-LOG.md
- Scan Slack for Phase 3 keywords
- Contact 1-2 teams for feedback
- Record qualitative findings

**ON 2026-07-17:**
- Prepare decision meeting (15 min)
- Facilitate decision with Founder (30 min)
- Document decision in PHASE-3-DECISION-2026-07-17.md

**STARTING 2026-07-18:**
- Run Phase 3 sprint kickoff (30 min)
- Facilitate daily standups (15 min each day at 09:15 UTC)
- Use `PHASE-3-QUICK-START-IMPLEMENTATION.md` as master checklist
- Coordinate team, unblock issues, track progress

**ON 2026-07-25:**
- Verify all CI checks pass
- Merge PR to main
- Monitor Vercel deployment
- Verify post-deployment checklist

---

## 👥 TEAM — What to Do When

**BEFORE 2026-07-18:**
- Read: `CLAUDE.md` (project overview)
- Skim: `PHASE-3-ARCHITECTURE-OPTIONS.md` (understand 4 options)
- Optional: Review `PHASE-3-QUICK-START-IMPLEMENTATION.md`

**ON 2026-07-18, 09:00 UTC:**
- Attend sprint kickoff (30 min)
- Verify: Dependencies installed, env vars set, tools working
- Confirm: 7-day sprint timeline (Days 1-7: 2026-07-18 to 2026-07-24)

**DAYS 1-7 (2026-07-18 to 2026-07-24):**

| Day | Task | Estimated Time |
|-----|------|-----------------|
| 1 | Database layer (tables, indexes, RLS) | 2-3 hours |
| 2-3 | API layer (POST, GET, validation) | 3-4 hours |
| 3-5 | Frontend layer (forms, lists, pages) | 4-5 hours |
| 5-6 | Testing (unit, integration, E2E) | 6-8 hours |
| 6 | Documentation (guides, README) | 2-3 hours |
| 7-10 | Deployment (final verification, merge, monitor) | 3-4 hours |

**Every day, 09:15 UTC:**
- 15-min standup (what we built, blockers, next)
- Share progress against checklist
- Escalate blockers to Governor

**REFERENCE:**
- Follow: `PHASE-3-QUICK-START-IMPLEMENTATION.md` (day-by-day playbook)
- Copy: Templates from `templates/` directory
- Refer: `PHASE-3-IMPLEMENTATION-BOILERPLATE.md` (code examples)

**ON 2026-07-25:**
- Merge PR to main (all checks must pass)
- Monitor deployment on Vercel (~2 min)
- Verify: Feature loads, forms work, lists display
- Follow: `PHASE-3-DEPLOYMENT-VERIFICATION.md` (80-item checklist)

---

## 📅 Key Dates

| Date | Event | Time | Duration | Attendees |
|------|-------|------|----------|-----------|
| 2026-07-11 | Fix blockers | Now | ~9 min | Founder |
| 2026-07-11-17 | Daily checkpoint collection | 09:00 UTC | 5 min | Governor |
| 2026-07-17 | Phase 3 decision meeting | 17:00 UTC | 30 min | Founder + Governor |
| 2026-07-18 | Sprint kickoff | 09:00 UTC | 30 min | Team + Governor |
| 2026-07-18-24 | Daily standups | 09:15 UTC | 15 min | Team + Governor |
| 2026-07-25 | Production deployment | ~11:00 UTC | ~2 min | Governor + Vercel |
| 2026-07-25 | Hour 1 active monitoring | 11:00-12:00 UTC | 60 min | Governor + Ops |
| 2026-07-25-26 | 24-hour monitoring | Continuous | Varies | Ops team |

---

## 🎯 Success Criteria

Phase 3 launch succeeds if:

- ✅ All tests pass (80%+ coverage)
- ✅ Feature deployed to production (no rollback)
- ✅ Error rate < 1% in first hour
- ✅ 20%+ of teams use feature in first week
- ✅ API latency < 5s p99
- ✅ RLS prevents cross-workspace access
- ✅ Early adopter feedback positive

---

## 📚 Most Important Documents

**By Role:**

| Role | Document 1 | Document 2 | Document 3 |
|------|-----------|-----------|-----------|
| **Founder** | PHASE-3-READINESS-SUMMARY-2026-07-11.md | FOUNDER-ACTION-SUMMARY-2026-07-10.md | PHASE-3-CANDIDATE-COMPARISON-MATRIX.md |
| **Governor** | PHASE-3-LAUNCH-RUNBOOK.md | PHASE-3-QUICK-START-IMPLEMENTATION.md | CHECKPOINT-AUDIT-FRAMEWORK-2026-07-17.md |
| **Engineers** | PHASE-3-QUICK-START-IMPLEMENTATION.md | PHASE-3-IMPLEMENTATION-BOILERPLATE.md | templates/README.md |
| **QA** | PHASE-3-DEPLOYMENT-VERIFICATION.md | PHASE-3-EXECUTION-CHECKLIST.md | PHASE-3-QUICK-START-IMPLEMENTATION.md |
| **Ops** | DNA-GOV-001-DEPLOYMENT-OPERATIONS.md | PHASE-3-DEPLOYMENT-VERIFICATION.md | POST-PHASE-3-MONITORING-PLAN.md |

---

## 🚨 Critical Blockers (Fix ASAP)

**GitHub Actions down:**
- Impact: Can't verify code
- Fix: Check GitHub billing (2-3 min)
- Link: FOUNDER-ACTION-SUMMARY-2026-07-10.md

**Supabase schema not deployed:**
- Impact: Can't run checkpoint collection or deploy Phase 3
- Fix: Execute supabase/schema.sql in SQL Editor (5 min)
- Link: FOUNDER-ACTION-SUMMARY-2026-07-10.md

**Email auth not enabled:**
- Impact: Customers can't sign up
- Fix: Toggle in Supabase Settings (2 min)
- Link: FOUNDER-ACTION-SUMMARY-2026-07-10.md

**TOTAL EFFORT: ~9 minutes**

---

## ⚡ Quick Commands

```bash
# Founder
# Nothing to run - just fix 3 blockers in Supabase/GitHub UI

# Governor (Daily)
npm run checkpoint:collect

# Governor (Sprint)
npm run dna:monitor  # Check infrastructure health

# Team (Before starting)
npm install
npm run type-check
npm run lint
npm run build
npm run test

# Team (During sprint)
npm run dev         # Local development
npm test            # Run tests
npm run test:e2e    # Run E2E tests

# Team (Before deploying)
npm run type-check && npm run lint && npm test && npm run build
git push -u origin phase-3-[candidate]
```

---

## 📞 Quick Support

**Question?** **Answer:**
|---|---|
| Which Phase 3 candidate? | Audit Logging (recommended) — fastest, lowest risk |
| When do we start? | 2026-07-18, 09:00 UTC |
| How long does it take? | 7-10 days to production |
| What if we hit a blocker? | Escalate to Governor immediately |
| What if deployment fails? | Rollback and post-mortem (procedure in PHASE-3-LAUNCH-RUNBOOK.md) |
| Where's the timeline? | PHASE-3-LAUNCH-RUNBOOK.md |
| Where are the templates? | templates/ directory + PHASE-3-IMPLEMENTATION-BOILERPLATE.md |
| What's the checklist? | PHASE-3-QUICK-START-IMPLEMENTATION.md (day-by-day) |

---

**Print this page and post it in Slack / team space**

**Last Updated:** 2026-07-11  
**Owner:** Governor  
**Format:** One-page reference card (fits on a single printed page)
