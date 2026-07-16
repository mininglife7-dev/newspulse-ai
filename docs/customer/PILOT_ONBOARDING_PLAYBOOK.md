# Customer Pilot Onboarding Playbook
## EURO AI Platform — German Enterprise Customer Setup

**Authority:** Governor (Chief Advisor & Chief of Staff)  
**Date:** 2026-07-12  
**Customer:** German Enterprise (Pilot Partner)  
**Duration:** 4 weeks (Week 2 → Week 5 target)  
**Audience:** Founder (Customer Success Lead) + Governor (Autonomous Support)

---

## Executive Summary

This playbook guides the first EURO AI customer through onboarding, feature validation, and pilot completion. Success criteria: Customer can independently manage AI systems, conduct compliance assessments, and maintain audit evidence within 4 weeks.

**Timeline:**
- **Pre-Onboarding (Week 1):** Setup, credentials, training materials
- **Week 2 (Day 0-1):** Account setup, workspace creation, team onboarding
- **Week 2-3 (Days 2-14):** Feature validation (core workflows)
- **Week 4 (Days 15-21):** Pilot refinement, compliance audit
- **Week 5 (Days 22-28):** Production handoff, customer independence

**Pilot Success Criteria:**
- ✅ Customer can independently create AI systems in inventory
- ✅ Customer can assess risk per EU AI Act classification
- ✅ Customer can collect and organize compliance evidence
- ✅ Customer can track remediation actions to completion
- ✅ Customer confirms audit trail is complete and accurate
- ✅ Customer reports no critical issues blocking daily use

---

## PRE-ONBOARDING PHASE (Week 1)

### Founder: Prepare Customer Environment

#### Day 1: Create Dedicated Workspace

```sql
-- (Governor will execute autonomously)
-- Founder provides customer details:
-- - Customer legal name: [Company Name]
-- - Primary contact: [Email]
-- - Expected user count: [N]
-- - AI systems to catalog: [List]

-- Result: Dedicated workspace with:
-- - Customer company profile
-- - Owner account (Founder manages)
-- - Admin account (Customer primary contact)
-- - Audit log initialized
```

**Founder Checklist:**
- [ ] Customer legal name confirmed
- [ ] Primary contact email confirmed
- [ ] Expected user count estimated
- [ ] Contract signed (legal team approval)
- [ ] Customer NDA executed
- [ ] Data processing agreement in place
- [ ] Compliance audit plan agreed with customer

#### Day 2: Prepare Credentials

**What Founder provides to customer:**
1. **Login link:** `https://euro-ai.production.url`
2. **Admin email:** Customer primary contact email
3. **Temporary password:** (one-time, expires after first login)
4. **Setup guide:** Link to this playbook
5. **Support contact:** Governor + Founder channels

**What Founder configures:**
- [ ] EURO AI workspace created in Supabase
- [ ] Customer company profile populated (legal name, sector)
- [ ] Owner + 1 admin account pre-created
- [ ] Workspace data isolation verified (RLS policies)
- [ ] Customer email domain verified (for team members)

#### Day 3: Prepare Training Materials

**Send to customer:**
- [ ] Platform orientation video (2 min) — Overview of EURO AI interface
- [ ] Quick-start guide (1 page) — First 5 steps to get productive
- [ ] Feature tour (5 min) — Walkthrough of each workspace section
- [ ] Compliance framework guide (5 pages) — EU AI Act overview tailored to their sector
- [ ] Example: "AI Inventory" with sample data (shows expected format)
- [ ] FAQ: Common setup questions
- [ ] Emergency support procedures (who to contact, how, escalation path)

**Example Materials Location:**
- Video: (YouTube link, platform overview)
- Quick-start: `/docs/customer/QUICK_START_GUIDE.md`
- Feature tour: PDF embedded in onboarding email
- Compliance guide: Customized per customer sector

#### Day 4: Scheduling & Team Preparation

**Founder actions:**
- [ ] Schedule Week 2 kickoff meeting (1 hour, customer present)
- [ ] Schedule daily check-in calls (15 min, Mon-Fri Week 2-3)
- [ ] Prepare demo account (pre-filled with example data)
- [ ] Brief customer support team (Founder + Governor)
- [ ] Set up shared Slack channel or email for support

**Customer actions (request they complete):**
- [ ] Confirm receipt of all materials
- [ ] Identify 2-3 team members to participate in pilot
- [ ] Prepare list of AI systems they want to catalog (for Week 2)
- [ ] Review compliance framework guide (generate questions for Day 1)

#### Day 5: Final Pre-Flight Check

**Verification checklist:**
- [ ] Production Supabase schema deployed (✅ Founder completes)
- [ ] Customer workspace created and data isolated
- [ ] Admin account created and email verified
- [ ] RLS policies enforced (security test passed)
- [ ] Audit log initialized (empty, ready for customer actions)
- [ ] Governor monitoring enabled (daily health checks active)
- [ ] Support procedures documented and team trained
- [ ] Escalation paths defined (issue → Founder → Governor → Root cause)

**Sign-off:**
Founder certifies: "Pilot workspace ready for customer onboarding"

---

## WEEK 2: CUSTOMER ONBOARDING (Days 1-7)

### Day 1: Kickoff Meeting (Week 2, Monday)

**Duration:** 1 hour  
**Attendees:** Founder (host), Customer primary contact, Customer team lead, Governor (monitoring)

**Agenda:**
1. Welcome & platform overview (10 min)
2. Q&A on compliance framework (10 min)
3. Guided walkthrough of interface (20 min)
4. First-steps task assignment (10 min)
5. Support procedures & escalation (10 min)

**First-Steps Tasks for Customer (Week 2, Days 1-2):**
1. Login and confirm account access
2. Update profile (name, title, photo optional)
3. Create workspace name/description
4. Invite team members (send invitations)
5. Review workspace settings (data privacy, region)

**Governor Actions (Autonomous):**
- Monitor: Customer first login
- Verify: Profile created automatically (trigger test)
- Verify: RLS policies enforcing (user can only see own data)
- Alert: If any step fails

**Success Metric:** Customer team all logged in and workspace settings reviewed.

### Day 2-3: Feature Walkthrough (Week 2, Tue-Wed)

**Daily 15-minute check-in call with customer**

#### Day 2: AI Inventory Walkthrough

**Feature:** Add AI system to inventory

**Customer Task:**
1. Navigate to "AI Systems" section
2. Click "Add AI System"
3. Fill form:
   - System name (e.g., "ChatGPT-powered customer support bot")
   - Vendor (e.g., "OpenAI")
   - Use case (customer selects from predefined categories)
   - Risk classification (EU AI Act: Prohibited / High Risk / Limited Risk / Minimal Risk)
   - Key features (text input)
4. Save and verify record created

**Expected Outcome:**
- ✅ Form submissions work (data persists)
- ✅ Record visible in inventory list
- ✅ Cannot see other workspaces' data (isolation verified)
- ✅ Audit trail records the creation

**Governor Actions:**
- Monitor: Form submission + database insert
- Verify: Record created in correct workspace (isolation check)
- Verify: Audit log entry recorded
- Check: Performance (query <500ms)

**Troubleshooting (if fails):**
- Q: Form won't submit? → Check browser console for errors
- Q: Record not visible after save? → Refresh page, check RLS policy logs
- Q: Cannot access AI Systems section? → Verify workspace member role

### Day 4-5: Risk Assessment (Week 2, Thu-Fri)

**Feature:** Create risk assessment

**Customer Task:**
1. Navigate to "Risk Assessments"
2. Create new assessment linked to AI system (from Day 2)
3. Workflow:
   - Classification: Select risk level (EU AI Act alignment)
   - Questions: Answer compliance questionnaire (10-15 questions)
   - Findings: Record any compliance gaps identified
   - Save and mark "In Review"

**Expected Outcome:**
- ✅ Multi-step form workflow functions correctly
- ✅ Validation: Required fields enforced
- ✅ Data persistence: All answers saved correctly
- ✅ Status tracking: "In Review" state persists
- ✅ Audit trail: Full assessment creation and updates logged

**Governor Actions:**
- Monitor: Form state preservation (multi-step)
- Verify: Data validation working (required fields)
- Check: Database consistency (all child records created)
- Verify: Audit log comprehensive (step-by-step creation)

**Troubleshooting:**
- Q: Form loses answers when navigating? → Check local storage / session persistence
- Q: Can't save as "In Review"? → Check field validation or permission issue
- Q: Assessment not visible after save? → Refresh, verify RLS policies

### Day 6-7: Evidence Collection (Week 2, Sat-Sun / Week 3, Mon-Tue)

**Feature:** Upload compliance evidence

**Customer Task:**
1. Navigate to "Evidence" section
2. Create evidence record linked to assessment
3. Upload document (PDF/image):
   - Document type (e.g., "Internal AI governance policy")
   - Description (e.g., "Policy document covering oversight procedures")
   - Link to assessment (dropdown)
4. Verify upload successful

**Expected Outcome:**
- ✅ File upload works (small test file, <5MB)
- ✅ Metadata captured (filename, upload timestamp)
- ✅ Association to assessment works (linked correctly)
- ✅ Evidence visible in evidence list
- ✅ Audit trail records upload

**Governor Actions:**
- Monitor: File upload + storage
- Verify: File accessible via API (metadata query)
- Check: Storage permissions (service-role upload working)
- Verify: Audit log records file metadata

**Troubleshooting:**
- Q: Upload fails? → Check file size/format, browser console errors
- Q: Evidence not visible? → Refresh, verify it's in the correct workspace
- Q: Cannot link to assessment? → Verify assessment exists in same workspace

---

## WEEK 3-4: FEATURE VALIDATION & REFINEMENT (Days 8-21)

### Week 3: Customer Independence

**Governor shifts to background monitoring** (daily checks, but customer leads)

**Customer Task:** Independently add more AI systems

**Target:** Catalog at least 5 AI systems using same workflow as Day 2

**Success Criteria:**
- ✅ Customer can add systems without guidance
- ✅ No errors or performance issues
- ✅ All records created with accurate data
- ✅ Customer feels comfortable with interface

**Governor Monitoring:**
- Daily health checks (all systems operational)
- Database query performance (indexes working)
- RLS policy enforcement (no cross-workspace data leaks)
- Error rate (should remain <1%)

**Founder Role:** Respond to customer questions async (email/Slack)

### Week 3-4: Assessment Completion

**Customer Task:** Complete risk assessments for at least 3 AI systems

**Expected Workflow:**
1. Create assessment linked to AI system
2. Answer compliance questionnaire (15-20 questions per assessment)
3. Document findings (compliance gaps identified)
4. Save evidence documents
5. Mark as "Finalized" (ready for compliance team review)

**Success Criteria:**
- ✅ Customer comfortable with assessment process
- ✅ No data loss (all answers persist)
- ✅ Multi-step workflow reliable
- ✅ Customer can navigate between assessments without issues
- ✅ Audit trail shows complete assessment history

**Governor Monitoring:**
- Form submission success rate (should be 100%)
- Average form completion time (benchmark for future customers)
- Error handling (graceful degradation if failures occur)
- Database query performance (complex joins working)

**Founder Role:** Review assessments for accuracy, provide compliance feedback

### End of Week 4: Compliance Audit

**Founder conducts audit with customer:**

Checklist:
- [ ] All AI systems catalogued completely
- [ ] Risk assessments match actual risk levels (accuracy review)
- [ ] Evidence documents complete and organized
- [ ] Audit trail is comprehensive and accurate
- [ ] No data errors or inconsistencies
- [ ] Customer understands how to maintain records
- [ ] Customer confident in continuing independently

**Governor Automated Audit:**
```
- Total AI systems catalogued: [N]
- Total assessments completed: [M]
- Total evidence documents uploaded: [K]
- Audit trail entries: [X] (all operations logged)
- Data consistency checks: [PASS/FAIL]
- RLS isolation verified: [PASS/FAIL]
- Performance baseline: [metrics]
```

---

## WEEK 5: PRODUCTION HANDOFF (Days 22-28)

### Founder: Prepare for Independence

**Customer Success Checklist:**
- [ ] Customer can independently add/edit AI systems
- [ ] Customer can create and manage risk assessments
- [ ] Customer understands evidence collection and organization
- [ ] Customer knows how to run compliance reports
- [ ] Customer has escalation contacts (Founder + support)
- [ ] Customer has backup of their data (export function available)
- [ ] Customer signed customer satisfaction survey

### Governor: Production Monitoring Begins

**Transition to routine monitoring (daily checks):**
- Health endpoint: System operational, no errors
- Query performance: Stable and predictable
- RLS isolation: No cross-workspace leaks
- Audit trail: Comprehensive and accurate
- Data consistency: No orphaned records

**Weekly deep-dive review:**
- Customer usage patterns (are they using all features?)
- Performance baseline comparison
- Incident detection (any issues?)
- Feature adoption (which workflows most used?)
- Customer satisfaction (feedback from Founder)

### Founder: Schedule Follow-up Calls

**Post-Pilot Schedule:**
- Week 6: Customer feedback & feature requests
- Week 8: Performance review & optimization recommendations
- Week 12: Pilot completion assessment (go/no-go for scale)

**Decision Gate (Week 5, End):**

Founder determines: Continue to full production or iterate design?

**GO Decision Criteria:**
- ✅ Customer reported no critical blockers
- ✅ Customer satisfied with core workflows
- ✅ Data accuracy verified (audit trail complete)
- ✅ Performance acceptable (<1s response time)
- ✅ No security issues identified
- ✅ Customer wants to continue beyond pilot

**NO-GO Decision Criteria (if any):**
- ❌ Critical features not working
- ❌ Customer unable to complete basic workflows
- ❌ Performance unacceptable (>5s response time)
- ❌ Security or data isolation issues found
- ❌ Customer requests major design changes

---

## SUCCESS METRICS & KPIs

### Customer Engagement

| Metric | Target | How Measured |
|--------|--------|--------------|
| First login within 24h | 100% | Audit log timestamp |
| Workspace setup complete by Day 2 | 100% | Setup checklist |
| ≥5 AI systems catalogued by Week 3 | YES | Inventory count |
| ≥3 risk assessments completed by Week 4 | YES | Assessment count |
| ≥3 evidence documents uploaded | YES | Evidence count |
| Customer independence by Week 4 | YES | Founder observation |

### Platform Reliability

| Metric | Target | How Measured |
|--------|--------|--------------|
| System uptime | 99.5% | Monitoring dashboard |
| API response time (p95) | <500ms | Performance baseline |
| Error rate | <1% | Error rate monitoring |
| Form submission success rate | 100% | Transaction logs |
| Data consistency | 100% | Audit trail verification |
| RLS policy enforcement | 100% | Security tests |

### Customer Satisfaction

| Metric | Target | How Measured |
|--------|--------|--------------|
| Feature usability (1-5 scale) | ≥4 | Post-pilot survey |
| Support response time | <4 hours | Support ticket SLA |
| Would recommend to peer? | YES | Survey question |
| Likelihood to convert to paying | HIGH | Founder assessment |

---

## TROUBLESHOOTING GUIDE

### Login Issues

**Problem:** Customer cannot log in  
**Diagnosis:**
1. Check: Email verification complete? (check email inbox + spam)
2. Check: Password reset link works?
3. Check: Browser cookies enabled?
4. Check: Is account locked? (too many failed attempts)

**Resolution:**
- Send password reset link
- Clear browser cookies, try incognito window
- Contact admin to unlock account

---

### Data Entry Issues

**Problem:** Form won't submit  
**Diagnosis:**
1. Check: All required fields filled? (validation errors shown)
2. Check: Browser console for JavaScript errors
3. Check: Network connectivity stable?
4. Check: Session still valid? (long form time-out)

**Resolution:**
- Fill all required fields (error messages indicate which)
- Refresh page and try again
- Check network connection
- Save form to local file, contact support if persistent

---

### Data Visibility Issues

**Problem:** Created record not visible  
**Diagnosis:**
1. Check: Record belongs to correct workspace?
2. Check: Page refreshed (data might be cached)?
3. Check: RLS permission issue? (user role might be missing)
4. Check: Filter applied? (record might be outside current filter)

**Resolution:**
- Navigate to the record directly (if URL available)
- Refresh page (Ctrl+R / Cmd+R)
- Check user role in workspace settings
- Clear any applied filters

---

### Performance Issues

**Problem:** Pages loading slowly  
**Diagnosis:**
1. Check: How many records in workspace? (large datasets slower)
2. Check: Network speed (broadband vs. mobile)?
3. Check: Browser tab using lots of CPU?
4. Check: Is there a server-side issue? (check status page)

**Resolution:**
- Use faster network if possible
- Close unnecessary browser tabs
- Use pagination if dataset is large (load specific date ranges)
- Contact Governor if server issue suspected

---

### Escalation Procedures

**Critical Issues (System Down / Data Loss):**
→ Contact: Founder (immediate phone call)  
→ Then: Governor (for automated recovery)  
→ SLA: 1-hour response time

**High Issues (Core Feature Broken / Data Incorrect):**
→ Contact: Founder (email or Slack)  
→ SLA: 4-hour response time

**Medium Issues (Non-core Feature / Slow Performance):**
→ Contact: Governor (async support)  
→ SLA: 24-hour response time

**Low Issues (UI Confusing / Documentation Gap):**
→ Contact: Founder (feature request)  
→ SLA: 1-week response time

---

## CUSTOMER COMMUNICATION TEMPLATE

### Week 1: Pre-Onboarding Email

```
Subject: Welcome to EURO AI — Your Pilot Program Begins!

Hi [Customer Name],

We're excited to have you join us for the EURO AI pilot program. Over the next 4 weeks, 
we'll work together to establish a production-ready AI governance platform tailored to 
your organization.

What you need to know:

1. **This week (Week 1):** We're preparing your environment and training materials.
   - Kickoff meeting scheduled: [Date/Time]
   - You'll receive: login credentials, setup guide, training materials
   - Action from you: Review the compliance framework guide (attached)

2. **Next week (Week 2):** We'll onboard your team step-by-step.
   - Monday: Kickoff meeting (1 hour)
   - Tue-Fri: Daily 15-min check-ins as you explore the platform
   - Tasks: Create workspace, add AI systems, start risk assessments

3. **Weeks 3-4:** You'll work independently with support from our team.
   - Daily support available (Slack channel: [link])
   - Weekly check-in calls to review progress
   - Founder will audit your compliance work

4. **Week 5:** We'll finalize the pilot and plan for full production.

Key contacts:
- Founder: [email] (strategy & escalations)
- Governor: [email] (technical support)
- Support Slack: [channel link]

Questions before we start? Reply to this email.

Looking forward to partnering with you!

Best regards,  
[Founder Name]  
EURO AI Team
```

### Week 2: Kickoff Confirmation Email

```
Subject: EURO AI Kickoff Meeting — Tomorrow at [Time]

Hi [Customer Name],

Confirmed for tomorrow's EURO AI pilot kickoff meeting!

📅 When: [Day], [Date], [Time] UTC  
🔗 Meeting link: [Zoom/Teams link]  
⏱️ Duration: 1 hour  

What we'll cover:
1. Platform overview & key features
2. Your compliance framework (Q&A)
3. Live walkthrough of the interface
4. Your first tasks (what you'll do this week)
5. Support procedures & escalation paths

Please bring:
- List of AI systems you want to catalog (3-5 examples)
- Any compliance questions you'd like to discuss
- Team members who will be participating in the pilot

See you tomorrow!

[Founder Name]
```

---

## APPENDIX: FEATURE TOUR SCRIPT

### "First Login" Experience (5 minutes)

**What customer sees on landing page:**

```
Welcome to EURO AI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AI Governance Made Simple

Transform your AI governance from compliance checklist 
into strategic advantage. Meet EU AI Act obligations 
with confidence.

🚀 Get Started
   ├─ Dashboard (view at a glance)
   ├─ AI Systems (inventory)
   ├─ Risk Assessments (evaluate)
   ├─ Evidence (collect)
   └─ Remediation (track)

📚 Learn
   ├─ Quick-start guide
   ├─ Feature tour
   └─ Compliance framework

🎯 Your Mission
   Get your first AI system into the inventory today!
```

### Workspace Dashboard (Customer View)

```
EURO AI Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Workspace: [Customer Company Name]
Role: Admin

📊 Quick Stats
   AI Systems:        5
   Risk Assessments:  3
   Evidence Items:   12
   Audit Entries:    87

🎯 Recent Activity
   ├─ You created "ChatGPT Integration" (Today 09:15 AM)
   ├─ You uploaded "Vendor Contract.pdf" (Today 08:30 AM)
   ├─ Alice joined the workspace (Yesterday 3:45 PM)
   └─ Assessment "Email Sorting Bot" finalized (Yesterday 2:20 PM)

💡 Next Steps
   ├─ Add 2 more AI systems to complete inventory
   ├─ Complete risk assessment for "Document Analysis Tool"
   └─ Review audit trail for compliance verification

🔗 Quick Links
   ├─ Start new assessment
   ├─ Upload evidence
   └─ View compliance report
```

---

## SIGN-OFF

**Prepared by:** Governor (Chief Advisor & Chief of Staff)  
**Authority:** Customer Success & Pilot Operations  
**Status:** READY FOR WEEK 2 DEPLOYMENT

**Founder Responsibility:**
- [ ] Review this playbook
- [ ] Customize for specific customer (legal name, sector, industry)
- [ ] Schedule all meetings/calls
- [ ] Prepare demo/example data
- [ ] Brief support team

**Governor Responsibility:**
- [ ] Monitor all customer actions
- [ ] Daily health checks
- [ ] Verify platform behavior
- [ ] Record metrics
- [ ] Alert on any issues

**Next Step:** Founder initiates "Pre-Onboarding Phase (Week 1)" with customer upon receiving this document.

---

*This playbook is living documentation. Update with learnings from each customer pilot. Success patterns become repeatable processes; issues drive product improvements.*
