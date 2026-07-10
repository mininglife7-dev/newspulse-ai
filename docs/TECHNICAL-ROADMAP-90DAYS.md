# 90-Day Technical Roadmap

**Period:** 2026-07-10 to 2026-10-08  
**Owner:** Governor (Autonomous Engineering) + Founder (Strategic Decisions)  
**Status:** Ready to execute

---

## Overview

This roadmap sequences all remaining technical work for the next 90 days, from current state (MVP complete, infrastructure pending) through customer launch, early adoption, and German localization rollout.

**Key phases:**
1. **Infrastructure & Launch** (Week 1) — Founder actions + staging verification
2. **Customer Pilot** (Weeks 2-3) — First customer onboarding and feedback
3. **Early Adoption** (Weeks 4-6) — Scale to 3-5 customers
4. **German Localization Phase 1** (Weeks 7-8) — i18n infrastructure
5. **German Translation** (Weeks 9-10) — Professional translator + QA
6. **German Launch** (Weeks 11-12) — Enable German UI, monitor metrics

---

## Week 1: Infrastructure & Launch Readiness

### Founder Actions (Blocking) — Est. 20-30 min total
- [ ] Configure Vercel `github-token` secret (5 min)
  - **Impact:** Enables PR #48 preview deployment
  - **How:** Follow DEPLOYMENT-CHECKLIST.md step 1
  - **Verify:** PR #48 shows ✅ Ready in Vercel

- [ ] Deploy Supabase schema.sql (10 min)
  - **Impact:** Creates tables for production customer data
  - **How:** Follow DEPLOYMENT-CHECKLIST.md step 2
  - **Verify:** 4 tables visible in Supabase console

- [ ] Enable Supabase email auth (5 min)
  - **Impact:** Customers receive verification emails
  - **How:** Follow DEPLOYMENT-CHECKLIST.md step 3
  - **Verify:** Send test email, check inbox

- [ ] Verify Supabase region is EU (2 min)
  - **Impact:** GDPR compliance for German customers
  - **How:** Follow DEPLOYMENT-CHECKLIST.md step 4
  - **Verify:** Region shows Frankfurt/Ireland/London, not US

### Engineering Tasks (After Founder completes above)

**Monday-Wednesday:**
- [ ] Run staging verification (1-2 hours)
  - Use STAGING-VERIFICATION.md quick-start or full path
  - Document any issues found
  - Sign-off checklist complete

- [ ] Verify E2E tests against staging
  - Run `npm run test:e2e` against preview URL
  - All customer journey tests pass
  - Document any environment-specific issues

**Thursday-Friday:**
- [ ] Merge PR #48 to main
  - Approve and merge after staging verification passes
  - Verify production deployment builds successfully
  - Monitor production URL for errors

- [ ] Production verification
  - Quick test: signup → verify email → company setup → add system → risk assessment
  - All 3 steps work end-to-end in production
  - No errors in production logs

**Exit criteria:**
- ✅ PR #48 merged to main
- ✅ Production deployment successful
- ✅ All 3-step journey works in production
- ✅ Ready for first customer invite

---

## Weeks 2-3: Customer Pilot Phase

### Founder Responsibilities
- [ ] Invite first German customer (Monday of Week 2)
  - Use template from CUSTOMER-SUCCESS-PLAYBOOK.md
  - Assign onboarding specialist (could be Founder initially)

- [ ] Daily monitoring
  - Each morning: Check any support requests
  - Customer progress: Which step are they on?
  - Any errors in their journey? (check logs)

- [ ] Collect feedback
  - Weekly check-in call (30 min)
  - Ask: Was each step clear? Any friction? Missing features?
  - Document in GitHub issues

### Engineering Responsibilities
- [ ] Monitor for bugs
  - Set up daily log review process
  - Create GitHub issues for any bugs found
  - Prioritize by customer impact

- [ ] Quick fixes if needed
  - If customer hits bug, fix priority is "critical"
  - Hotfix SLA: 2 hours max
  - Deploy to production same day

- [ ] Success metrics tracking
  - Signup → verify email (target ≥95%)
  - Email verify → company setup (target ≥90%)
  - Company setup → AI inventory (target ≥85%)
  - Inventory → risk assessment (target ≥75%)

**Exit criteria:**
- ✅ First customer completes all 3 steps
- ✅ Zero critical bugs
- ✅ Feedback collected and documented
- ✅ Metrics show healthy conversion rates

---

## Weeks 4-6: Early Adoption Phase

### Scale to 3-5 Customers
- [ ] Invite 3 more customers (stagger by 2-3 days)
  - Week 4: Customers 2 & 3
  - Week 5: Customers 4 & 5

### Weekly Monitoring
- [ ] Monday: Review logs, check metrics
- [ ] Wednesday: Customer check-in calls
- [ ] Friday: Compile weekly metrics, plan fixes

### Metrics to Track (Weekly)
| Metric | Week 4 | Week 5 | Week 6 |
|--------|--------|--------|--------|
| Total signups | 3-4 | 4-5 | 5+ |
| % completing all 3 steps | 50%+ | 60%+ | 70%+ |
| Time to completion | <45min | <40min | <30min |
| Support tickets | <2/week | <2/week | <2/week |
| Error rate | <0.1% | <0.1% | <0.1% |
| Uptime | ≥99.5% | ≥99.5% | ≥99.5% |

### Feature Feedback
- [ ] Collect requests from customers
- [ ] Prioritize by impact and effort
- [ ] Create GitHub issues for Phase 2+ features

**Exit criteria:**
- ✅ 5 customers completed onboarding
- ✅ Metrics consistently healthy
- ✅ No critical issues requiring hotfix
- ✅ Clear product insights from customer feedback

---

## Weeks 7-8: Phase 1 - i18n Infrastructure

### Technical Implementation
**Approved by Founder, Week 7 begins:**

**Day 1-2: Routing & Middleware**
- [ ] Install next-intl package
- [ ] Configure middleware for locale detection
- [ ] Reorganize routes under `[locale]` directory
- [ ] Test both `/en/` and `/de/` routes work

**Day 3-4: String Extraction & Components**
- [ ] Extract all 99 strings into `messages/en.json`
- [ ] Create German skeleton `messages/de.json`
- [ ] Create language switcher component
- [ ] Refactor all pages to use `useTranslations()`

**Day 5: Type Safety & Build**
- [ ] Add TypeScript i18n types
- [ ] Verify build process includes both locales
- [ ] Run verification checklist
- [ ] All tests pass, no TypeScript errors

**Week 8: Testing & Documentation**
- [ ] E2E tests for both locales
  - Test `/en/` routes work
  - Test `/de/` routes work (English strings shown)
  - Language switcher switches correctly

- [ ] Documentation for Phase 2 handoff
  - Export `messages/en.json` for translator
  - Document string context for translator
  - Prepare testing checklist for Phase 3

**Deliverable at end of Week 8:**
- ✅ Both `/en/` and `/de/` routes functional
- ✅ Language switcher visible and working
- ✅ Strings extracted and ready for translator
- ✅ Production build includes both locales
- ✅ Zero TypeScript errors
- ✅ E2E tests passing for both locales

**Exit criteria:**
- ✅ Phase 1 complete per PHASE-1-I18N-SPEC.md
- ✅ Strings exported for Phase 2
- ✅ No code regressions (all existing tests pass)
- ✅ Ready for translator to begin Phase 2

---

## Weeks 9-10: Phase 2 - Professional Translation

### Parallel Work (Customer Operations Continue)

**Engineering side:**
- [ ] Monitor customer journey (ongoing)
- [ ] Any quick fixes needed (ad-hoc)
- [ ] Prepare Phase 3 QA procedures

**Translator side (External):**
- [ ] Translator receives `messages/en.json`
- [ ] Translates 99 strings to professional German
- [ ] Returns `messages/de.json` with German UI text
- [ ] Timeline: 1-2 weeks (depends on translator availability)

**Cost:** €300-500 (professional translator)

**Exit criteria:**
- ✅ `messages/de.json` complete and reviewed
- ✅ No professional translation errors (reviewed by Founder or German speaker)
- ✅ Ready for Phase 3 QA

---

## Weeks 11-12: Phase 3 - German QA & Launch

### Merge & Test German Translations

**Week 11: Integration & Testing**
- [ ] Merge `messages/de.json` into main
- [ ] Verify `/de/` routes show German UI
- [ ] Run full customer journey in German
  - Signup → verify email → company setup → inventory → risk assessment
  - All UI elements in German
  - No English text should be visible

- [ ] Accessibility audit in German
  - Font sizes, contrast still work
  - No text overflow issues
  - WCAG AA still passes

- [ ] Browser/mobile testing in German
  - Desktop: Chrome, Firefox, Safari
  - Mobile: Chrome, Safari

**Week 12: Launch & Monitor**
- [ ] Enable German locale in production
  - `[locale]` routing now serves German to `/de/` visitors
  - Language switcher fully functional

- [ ] Invite German-speaking customers
  - Send invitation with German option
  - Monitor their signup in German

- [ ] Monitor metrics Week 1 of German launch
  - Signup → verify rate (should match English)
  - Onboarding completion rate (should match English)
  - Support tickets (should stay low)

- [ ] Measure business impact
  - Number of German customer signups
  - NPS from German customers
  - Feature requests specific to German market

**Exit criteria:**
- ✅ German UI fully functional and tested
- ✅ No regressions in English version
- ✅ German customers successfully onboarding
- ✅ Support requests manageable
- ✅ Ready for scale Phase 4+

---

## Parallel Workstreams (Throughout 90 Days)

### Customer Success (Ongoing)

**Every week:**
- [ ] Monitor error logs
- [ ] Customer health check calls
- [ ] Metrics dashboard updated

**Every month:**
- [ ] Backup testing
- [ ] Security audit (npm audit)
- [ ] Performance review (Lighthouse)

### Monitoring & Operations

**Daily:**
- [ ] Production health check (5 min)
- [ ] Error rate < 0.1%?
- [ ] Uptime check

**Weekly:**
- [ ] Performance metrics
- [ ] Customer feedback synthesis
- [ ] Planning for next sprint

### Product Feedback Loop

**From customers:**
- [ ] Document feature requests (GitHub issues)
- [ ] Prioritize by customer impact
- [ ] Plan Phase 4+ roadmap

**Post-German Launch:**
- [ ] Feature requests from German customers
- [ ] Team management requests
- [ ] Evidence collection requests
- [ ] Remediation tracking requests

---

## Work Item Backlog (Post-90 Days)

These are known and documented but outside 90-day scope:

### Phase 4: Team Management
- Add team members to workspaces
- RBAC (Role-Based Access Control)
- Workspace invitations and onboarding

### Phase 5: Advanced Features
- Evidence collection: Upload/link compliance evidence
- Remediation tracking: Plan and monitor remediation actions
- Custom compliance frameworks: Beyond EU AI Act

### Roadmap Items
- German legal compliance (privacy policy, terms, T&Cs in German)
- Mobile app (iOS/Android)
- API access for customers
- Advanced reporting and analytics

---

## Success Metrics for 90-Day Period

### Launch Success (Week 1)
- [ ] Infrastructure tasks complete (Founder)
- [ ] Staging verification passed
- [ ] Production deployment successful

### Customer Adoption (Weeks 2-6)
- [ ] ≥5 customers successfully onboarded
- [ ] ≥70% completing all 3 steps
- [ ] ≤2 support tickets per week
- [ ] <0.1% error rate maintained

### Localization (Weeks 7-10)
- [ ] Phase 1 (i18n) complete and tested
- [ ] Phase 2 (translation) complete and reviewed
- [ ] No regressions in English version

### German Launch (Weeks 11-12)
- [ ] German UI fully live and tested
- [ ] ≥2 German customers onboarded
- [ ] German metrics match English baselines
- [ ] Ready for scale Phase 4+

---

## Risk Mitigation

| Risk | Week | Impact | Mitigation |
|------|------|--------|-----------|
| Founder delays infrastructure | 1 | Launch blocked | **Weekly check-in** to unblock |
| Customer can't verify email | 2-3 | Pilot failure | Email auth troubleshooting guide ready |
| Critical bug in production | 2+ | Customer churn | Hotfix SLA: 2 hours response |
| Translator delivers late | 9-10 | German launch slips | Have backup translator identified |
| German QA finds issues | 11 | Launch delayed | 1-week buffer built in |
| Unexpected feature requests | 2-6 | Scope creep | Document but plan for Phase 4+ |

---

## Team & Responsibilities

### Founder
- Week 1: Infrastructure setup (critical path)
- Weeks 2-6: Customer success (daily monitoring, calls)
- Weeks 7+: Strategic decisions on roadmap

### Engineering (Governor)
- Week 1: Verification + production readiness
- Weeks 2-6: Bug fixes, operations monitoring
- Weeks 7-10: Phase 1 implementation + customer support
- Weeks 11-12: German QA + launch monitoring

### External
- Weeks 9-10: Professional translator (estimated €300-500)

---

## Decision Gates

**Gate 1: Proceed to Weeks 2-3 (Week 1 end)**
- [ ] All infrastructure tasks complete
- [ ] Staging verification passed
- [ ] Production deployment successful
- **Decision:** Invite first customer? YES/NO

**Gate 2: Proceed to Phase 1 (Week 6 end)**
- [ ] 5 customers successfully onboarded
- [ ] Metrics healthy (70%+ completion rate)
- [ ] Feedback documented
- **Decision:** Begin i18n Phase 1? YES/NO

**Gate 3: Proceed to Phase 2 (Week 8 end)**
- [ ] Phase 1 complete and tested
- [ ] No regressions in English
- [ ] Strings exported and ready
- **Decision:** Submit to translator? YES/NO

**Gate 4: Proceed to German Launch (Week 12 end)**
- [ ] Phase 3 QA complete
- [ ] German UI fully tested
- [ ] No regressions in English
- **Decision:** Enable German locale in production? YES/NO

---

## Success Criteria (90-Day Exit)

The product will be considered "successfully launched" when:

✅ **Infrastructure complete:**
- Vercel configured
- Supabase deployed
- Email auth working
- EU region verified

✅ **MVP validated with customers:**
- ≥5 customers through full onboarding
- ≥70% completing all 3 steps
- <2 support tickets/week
- Net positive feedback

✅ **Localization ready for German:**
- i18n infrastructure implemented
- 99 strings extracted
- Professional translation obtained
- German UI tested and verified

✅ **Operational excellence:**
- <0.1% error rate
- ≥99.5% uptime
- <4 hour support response time
- Weekly metrics reviewed

✅ **Team & Process:**
- Operations playbook documented and followed
- Customer success procedures in place
- Monitoring and alerting configured

---

## Communication Plan

### Weekly Status (Every Friday)
- Metrics dashboard updated
- Issues/risks surfaced
- Next week preview

### Bi-weekly Sync (Founder + Engineering)
- 30-min strategic check-in
- Decision gates reviewed
- Course corrections if needed

### Monthly Review (All stakeholders)
- 60-min deep dive on metrics
- Customer feedback synthesis
- Roadmap planning for next 30 days

---

**Document Status:** 90-Day Roadmap Complete  
**Ready to Execute:** Yes, starting Week 1  
**Next Review:** Weekly (every Friday)

---

This roadmap is your guide for the next 90 days. Adjust based on actual progress, customer feedback, and business priorities — but maintain the overall structure and critical path.

**Let's launch. 🚀**
