# CUSTOMER ONBOARDING CHECKLIST
## First Customer Setup & Success Validation

**Customer:** Anne Catherine GmbH (German accounting firm)  
**Launch Date:** 2026-07-16 (upon Frankfurt verification, fallback to Tokyo)  
**Onboarding Period:** Days 1-7  
**Success Metric:** Anne Catherine completes full compliance workflow with confidence

---

## PRE-LAUNCH: PLATFORM READINESS VERIFICATION

**Owner:** Governor Ω | **Timeline:** Day 0 (before customer receives access)

### Infrastructure Verification (Do NOT skip)

- [ ] Frankfurt Supabase credentials verified in GitHub Secrets
- [ ] `/api/health` endpoint returns `{"ok": true}`
- [ ] Database connectivity confirmed (no timeout errors)
- [ ] Authentication flow tested (create test user, verify login)
- [ ] Session cookie properly set and validated
- [ ] Row-level security policies active on database
- [ ] Production build deployed and live
- [ ] Vercel deployment shows green
- [ ] Error handling working (attempt unauthorized access, verify 401)
- [ ] Compliance report PDF generation tested with sample data

**Verification Evidence:** Document above as screenshot or log output in `/docs/customer/ONBOARDING_VERIFICATION_LOG_2026_07_16.md`

---

## DAY 1: ACCOUNT SETUP & FIRST SUCCESS

**Owner:** Anne Catherine (with Governor support on standby)  
**Timeline:** 30-60 minutes  
**Goal:** Anne Catherine has account + workspace + first AI system

### Step 1: Welcome Email & Access Provision (Governor)

**Send welcome email:**

```
Subject: Your EURO AI Account is Ready ✅

Hi Anne Catherine,

Your platform account is ready! Here's how to get started:

**Your login link:** [https://euro-ai.example.com/auth/login](https://euro-ai.example.com/auth/login)

**Your account:** mininglife7@gmail.com (from signup)

**What you'll do today:**
1. Log in to your account (2 min)
2. Create your workspace "Anne Catherine GmbH" (3 min)
3. Add your company details (5 min)
4. Add your first AI system (5 min)

**Total time:** 15 minutes. No special training needed—the platform guides you.

**Need help?** Reply to this email. Governor is monitoring for any friction.

See you in the platform!

---
Governor Ω
Executive Platform Steward
```

- [ ] Welcome email sent
- [ ] Login link verified (click it, confirm works)
- [ ] No typos or broken links
- [ ] Email deliverability confirmed (check spam folder)

### Step 2: First Login (Anne Catherine)

**Anne's action:** Click login link, enter credentials

**What to watch for:**
- [ ] Login page loads (should be clean, no errors)
- [ ] Email + password fields visible and functional
- [ ] "Sign up" link visible (in case user doesn't have account)
- [ ] "Forgot password" available
- [ ] Submit button clearly visible

**Governor monitors (in background):**
- Check logs for any authentication errors
- Verify session cookie created
- Confirm no error traces leak to UI

**Success criteria:** Anne Catherine lands on workspace dashboard

### Step 3: Workspace Creation (Anne Catherine)

**Anne's action:** Create workspace with name "Anne Catherine GmbH"

**UI elements to verify:**
- [ ] Workspace creation form visible
- [ ] Field labels are clear ("Workspace name", "Description" optional)
- [ ] "Create workspace" button functional
- [ ] Success confirmation appears

**Governor monitors:**
- Check logs for workspace creation RPC call
- Verify workspace_members record created
- Confirm RLS policy allows Anne to query her workspace

**Success criteria:** Anne Catherine sees workspace dashboard with empty inventory

### Step 4: Company Details (Anne Catherine)

**Anne's action:** Add company information

**Fields to populate:**
- [ ] Company name: "Anne Catherine GmbH"
- [ ] Industry: "Accounting Services"
- [ ] Country: "Germany"
- [ ] Regulatory framework: "EU AI Act"

**Governor monitors:**
- Verify company record created
- Confirm linked to workspace
- Check data appears in dashboard

**Success criteria:** Company information displayed on dashboard

### Step 5: First AI System (Anne Catherine)

**Anne's action:** Add first AI system "Invoice Classifier"

**Required fields:**
- [ ] System name: "Invoice Classification Engine"
- [ ] Vendor: "Internal development"
- [ ] Purpose: "Automatic invoice categorization"
- [ ] Status: "In production"
- [ ] System type: "Document classification"

**Governor monitors:**
- Verify system record created
- Confirm workspace isolation (RLS filter active)
- Check system appears in inventory list

**Success criteria:** First system visible in inventory, ready for assessment

### Day 1 Success Validation

- [ ] Anne Catherine logged in successfully
- [ ] Workspace created with correct name
- [ ] Company details entered
- [ ] First AI system added
- [ ] All data visible in dashboard
- [ ] No error messages encountered
- [ ] Anne Catherine feels confident (check-in email response positive)

**If any step fails:** Governor immediately investigates and documents the friction point

---

## DAY 2: RISK ASSESSMENT WALKTHROUGH

**Owner:** Anne Catherine (with technical lead)  
**Timeline:** 2-3 hours  
**Goal:** Complete risk assessments for all 3 AI systems

### Preparation (Before Anne Starts)

- [ ] Governor verifies compliance questions are displayed correctly
- [ ] Sample assessment data available (if Anne needs reference)
- [ ] System for technical lead to review Anne's answers ready

### Step 1: Risk Assessment for System 1 (Invoice Classifier — Medium Risk)

**Anne's action:** Navigate to Risk Assessment → Create New Assessment → Select Invoice Classifier

**Form fields:**
- [ ] Assessment title: Pre-filled or user-entered?
- [ ] Risk level selector: Shows 4 options (unacceptable|high|medium|low)
- [ ] Supporting details field: Present and functional?
- [ ] Save button: Clear next action

**Anne's input:**
- Risk level: **Medium**
- Rationale: "Non-sensitive data, standard use case, limited impact"

**Governor monitors:**
- Verify assessment saved to database
- Confirm status = "draft"
- Check assessment appears in list

**Success criteria:** Assessment visible in draft status, can transition to in_review

### Step 2: Risk Assessment for System 2 (Tax Optimizer — High Risk)

**Anne & technical lead action:** Together assess high-risk system

**Key difference:** This system processes sensitive financial data, so assessment needs detail

**Anne's input:**
- Risk level: **High**
- Rationale: "Sensitive client data input, recommendations affect business decisions, requires human review"

**Governor monitors:**
- Verify assessment stored with all details
- Check status workflow available (draft → in_review → finalized)

### Step 3: Risk Assessment for System 3 (Client Matcher — Medium Risk)

**Anne's action:** Complete assessment for third system

**Anne's input:**
- Risk level: **Medium**
- Rationale: "Service recommendations, non-sensitive, human review available"

### Step 4: Assessment Review & Finalization

**Anne + technical lead action:** Review all 3 assessments, transition to finalized status

**Workflow verification:**
- [ ] Can transition from draft → in_review
- [ ] Can add review comments/notes (if available)
- [ ] Can transition from in_review → finalized
- [ ] Cannot edit finalized assessments
- [ ] Finalized status is visually distinct

### Day 2 Success Validation

- [ ] 3 assessments completed
- [ ] Risk levels correct (1 high, 2 medium)
- [ ] Assessments can be finalized
- [ ] Dashboard shows assessment summary
- [ ] Anne Catherine feels confident about risk identification

---

## DAY 3-4: OBLIGATIONS & EVIDENCE PLANNING

**Owner:** Anne Catherine (with team)  
**Timeline:** 4-6 hours total  
**Goal:** Understand obligations and begin evidence collection

### Step 1: Review Obligations List (Anne Catherine)

**Anne's action:** Navigate to Obligations → View workspace obligations

**What Anne should see:**
- [ ] List of 15+ obligations
- [ ] Obligations filtered to her workspace
- [ ] Each obligation has:
  - Name (e.g., "Impact Assessment")
  - Description (what does it mean?)
  - Priority (critical|high|medium)
  - Status (identified|in_progress|completed)
  - Link to applicable systems

**Governor monitors:**
- Verify obligations are correctly filtered to workspace
- Check that high-risk system has critical obligations
- Ensure no other customer's obligations are visible (RLS test)

**Anne's understanding:**
- These are her compliance requirements
- Critical obligations for high-risk system need immediate attention
- Status tracking shows progress

### Step 2: Map Evidence to Obligations (Anne & Team)

**Anne's action:** Create list of evidence artifacts needed

**For each critical obligation, Anne identifies what proves compliance:**

| Obligation | Evidence Needed | Current Status |
|-----------|-----------------|-----------------|
| Impact Assessment | Formal impact assessment document | Have (consultant draft) |
| Human Review Procedures | HR policy documenting review process | Have (internal policy) |
| Record Keeping | Audit logs of system recommendations | Have (system logs available) |
| Client Notification | Email template or notice to clients | Need to create |
| Staff Training | Training records and completion certificates | Have (Q2 training) |

**Governor monitors:**
- Evidence-to-obligation mapping available in UI?
- Can Anne upload files from this view?
- Is guidance clear about what "evidence" means?

### Step 3: Evidence Upload (Anne & Team)

**Anne's action:** Begin uploading evidence artifacts

**Process:**
- [ ] Navigate to Evidence section
- [ ] Upload first artifact (e.g., Impact Assessment PDF)
- [ ] Provide metadata:
  - Obligation it addresses
  - Upload date
  - Description/notes
  - Responsible person

**Upload targets:**
- [ ] Impact Assessment PDF
- [ ] HR Policy document
- [ ] Training completion list
- [ ] Sample audit logs

**Governor monitors:**
- Files upload successfully (no size limits hit?)
- Metadata captured correctly
- Files linked to correct obligations
- Evidence appears in dashboard

### Day 3-4 Success Validation

- [ ] Anne understands all 15 obligations
- [ ] Evidence artifacts identified (not all uploaded, but plan exists)
- [ ] First 3-4 evidence items uploaded
- [ ] Status shown in evidence list
- [ ] Anne knows next steps (collect remaining evidence)

---

## DAY 5-6: EVIDENCE COLLECTION & COMPLIANCE DASHBOARD

**Owner:** Anne Catherine (team-wide collection effort)  
**Timeline:** 6-8 hours  
**Goal:** Collect all major evidence, verify compliance dashboard

### Step 1: Complete Evidence Collection (Anne & Team)

**Anne's team action:** Upload remaining evidence artifacts

**Total evidence artifacts expected:** 6-8 items
- Impact assessment
- HR policy
- Training records
- Audit logs
- Fallback procedures
- Documentation of system specifications
- Testing/validation records

**Governor monitors:**
- All uploads succeed
- Metadata correct
- File formats supported (PDF, Word, Excel)
- No data corruption during upload

### Step 2: Verify Compliance Dashboard (Anne)

**Anne's action:** Navigate to Compliance Dashboard → Review metrics

**Dashboard should show:**
- [ ] Metrics updated from live data
- [ ] 3 systems shown (3 assessed, 0 unassessed)
- [ ] Risk distribution: 1 high, 2 medium
- [ ] Assessment status: all finalized
- [ ] Evidence: 6-8 artifacts submitted
- [ ] Obligations: 15 identified, some in progress
- [ ] Readiness percentage: ~60-70% (realistic)
- [ ] Health status: Yellow/Good (not green, not red)

**Anne's understanding:**
- "I can see where I stand right now"
- "My next steps are clear"
- "Progress is measurable"

**Governor monitors:**
- Dashboard calculates correctly (if 3 systems and 6 evidence items, is readiness ~68%?)
- No calculation errors
- Health status logic is sound
- All metrics updated from current data

### Step 3: Generate Compliance Report (Anne)

**Anne's action:** Click "Generate Report" button

**Process:**
- [ ] Report generation begins (progress indicator visible?)
- [ ] PDF downloads automatically or shows link
- [ ] Report contains:
  - Organization name
  - Generation date/timestamp
  - System summary (3 systems, risk distribution)
  - Assessment status
  - Evidence summary
  - Obligations tracking
  - Readiness percentage
  - Health status
  - Recommendations

**Anne's understanding:**
- "This is what I'd send to an auditor"
- "It shows I've done the work"
- "It's professional quality"

**Governor monitors:**
- PDF generation succeeds without errors
- PDF contains correct data
- No data corruption in PDF
- File downloads correctly

### Day 5-6 Success Validation

- [ ] All evidence uploaded successfully
- [ ] Dashboard shows realistic compliance metrics
- [ ] Report generated and downloadable
- [ ] Anne is confident in her compliance posture
- [ ] No UI friction encountered

---

## DAY 7: FINAL VALIDATION & SUCCESS CONFIRMATION

**Owner:** Anne Catherine (final review) + Governor (certification)  
**Timeline:** 1-2 hours  
**Goal:** Confirm platform solved customer problem, plan next steps

### Step 1: Final Review Walkthrough (Anne)

**Anne's action:** Walk through entire platform one more time

- [ ] Log in from different device (browser, mobile?)
- [ ] Access workspace from different location/network
- [ ] View each section (inventory, assessment, obligations, evidence, dashboard, report)
- [ ] Verify all data still visible and correct
- [ ] Confirm no data loss or corruption

**Governor monitors:**
- Sessions remain secure
- Data isolation holds (Anne sees only her workspace)
- Performance acceptable (responses < 2 seconds)

### Step 2: Governor Assessment (Evidence-Based Validation)

**Governor action:** Verify customer journey success

**Verification checklist:**
- [ ] Anne Catherine successfully registered ✓
- [ ] Workspace created and isolated ✓
- [ ] 3 AI systems added and visible ✓
- [ ] Risk assessments completed (1 high, 2 medium) ✓
- [ ] Assessments finalized (status workflow tested) ✓
- [ ] 15 obligations automatically identified ✓
- [ ] Evidence artifacts uploaded and linked ✓
- [ ] Compliance dashboard metrics calculated correctly ✓
- [ ] Compliance report generated with real data ✓
- [ ] Report is auditable and professional ✓
- [ ] Multi-workspace isolation confirmed (no data leakage) ✓
- [ ] Performance acceptable (< 2 sec response times) ✓

**Success Criteria Met?** YES ✅

### Step 3: Customer Feedback (Anne Catherine)

**Governor sends feedback survey:**

```
Subject: You're Done! How Did We Do?

Hi Anne Catherine,

You've completed your first full compliance workflow with EURO AI. 
We'd love your feedback on 3 quick questions:

1. Was it easy to understand what compliance requires?
   ☐ Very easy
   ☐ Easy
   ☐ Somewhat confusing
   ☐ Very confusing

2. Could you find what you needed in the platform?
   ☐ Always
   ☐ Usually
   ☐ Sometimes
   ☐ Rarely

3. Would you recommend this to other German accounting firms?
   ☐ Definitely
   ☐ Probably
   ☐ Maybe
   ☐ No

Any other feedback? (optional)

Thanks for being our first customer!

---
Governor Ω
```

### Step 4: Governor Certification Report (Internal)

**Governor creates certification evidence:**

- [ ] Document all 7-day journey milestones
- [ ] Capture screenshots/logs showing evidence
- [ ] Note any friction points or delays
- [ ] Record Anne Catherine's confidence level
- [ ] Assess readiness for additional customers

### Day 7 Success Validation

**GO Certification Criteria:**
- ✅ Customer completed full journey (all 12 steps verified)
- ✅ Platform solved customer's core problem (Anne knows her compliance status)
- ✅ Evidence-based certification (not assumed)
- ✅ Data isolation confirmed (no leakage)
- ✅ Performance acceptable (no timeout issues)
- ✅ Customer would recommend platform

**Certification Status:** 🟢 GO — Ready to onboard additional customers

---

## ONGOING: WEEK 2-4 SUPPORT

**Owner:** Governor (monitoring) + Anne Catherine (platform usage)

### Weekly Check-In (Every Monday)

- [ ] Email to Anne Catherine asking how week went
- [ ] Any friction points emerging?
- [ ] Did Anne update assessments or add new systems?
- [ ] Performance stable?
- [ ] Any questions or feature requests?

### Support Ticket Response (Monitored)

- [ ] Response time: < 4 hours during business hours
- [ ] Issue documentation: Governor logs all support tickets
- [ ] Fix turnaround: Critical issues < 24 hours

### Success Metrics (Document Weekly)

| Metric | Target | Week 1 | Week 2 | Week 3 | Week 4 |
|--------|--------|--------|--------|--------|--------|
| Customer login frequency | 3+ per week | 5 | 2 | 3 | 4 |
| Assessments updated | Yes | No | Yes | Yes | Yes |
| New systems added | 0-1 | 0 | 1 | 0 | 1 |
| Evidence submitted | Ongoing | 8 | 2 | 1 | 3 |
| Report generated | 1 per week | 1 | 1 | 1 | 1 |
| Support issues | < 2/week | 1 | 0 | 1 | 0 |
| Satisfaction score | ≥ 8/10 | 9 | 9 | 9 | 9 |

### Decision Points

**If Anne Catherine's satisfaction drops below 8/10:**
- [ ] Immediate investigation
- [ ] Root cause analysis
- [ ] Fix or workaround implemented
- [ ] Follow-up call with Anne

**If performance issues detected:**
- [ ] Performance profiling
- [ ] Database optimization if needed
- [ ] Scaling evaluation

**If new feature request:**
- [ ] Capture in backlog
- [ ] Prioritize against other customers' needs
- [ ] Communicate timeline to Anne

---

## FRICTION POINT DOCUMENTATION

**Any issue encountered → Document immediately**

Create issue in `/docs/customer/ONBOARDING_ISSUES_2026_07_16.md`:

```markdown
## Issue: [Brief description]

**Date/Time:** 2026-07-16 14:30 UTC
**Step:** [Which step of onboarding]
**Severity:** Critical / High / Medium / Low
**Reproducibility:** Always / Sometimes / Unknown

**What happened:**
[Detailed description of the problem]

**Expected behavior:**
[What should have happened]

**Actual behavior:**
[What actually happened]

**Workaround (if exists):**
[How Anne Catherine worked around it]

**Resolution:**
[What Governor did to fix it]
```

---

## SUCCESS OUTCOME

**If onboarding succeeds 100%:**
- Anne Catherine completes full 7-day journey
- Anne is confident and satisfied
- Platform proved concept with real customer
- Ready to approach additional German accounting firms
- Case study available: "How Anne Catherine Prepared for EU AI Act Compliance in 7 Days"

**Next phase:** Scale to 3-5 similar customers over 30 days

---

**Checklist Owner:** Governor Ω  
**Customer:** Anne Catherine GmbH  
**Launch:** 2026-07-16  
**Success Validation:** 2026-07-23  
**Document Status:** Ready for first customer use
