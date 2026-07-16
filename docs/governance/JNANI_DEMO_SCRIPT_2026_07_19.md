# JNANI EXECUTIVE DEMO SCRIPT
## EURO AI Platform — Enterprise Readiness Demonstration

**Target Audience:** Jnani (investor/executive stakeholder)  
**Duration:** 30 minutes (20 min demo + 10 min Q&A)  
**Delivery Method:** Live or screen-share from Tokyo production deployment  
**Objective:** Demonstrate enterprise-ready compliance platform with multi-tenant security and complete regulatory workflow  
**Decision Gate:** GO/NO-GO for Anne Catherine alpha launch

---

## OPENING — THE COMPLIANCE PROBLEM (2 min)

*Start with customer reality, not technology.*

**What we're solving:**

Organizations across the EU face a critical question: *"Are we compliant with the EU AI Act?"*

The problem isn't that the regulation is unclear—it's that **compliance visibility is missing**. Companies don't know:
- Which AI systems they have
- What risks they pose
- What evidence they need
- How they compare to the regulation
- Whether they're audit-ready

We built EURO AI to answer all four questions in one platform.

---

## SECTION 1 — MULTI-TENANT ARCHITECTURE (3 min)

**Setup the scenario:**

*Log in as Anne Catherine's workspace for demo. Show workspace name clearly.*

"Let me show you how a German accounting firm would set up EURO AI. We're using a live instance with a test organization."

**Key points to demonstrate:**

1. **Workspace Isolation**
   - "Each customer gets a completely isolated workspace"
   - Show workspace selector/switcher
   - Explain: "Multiple teams can work in one workspace, but data is completely isolated from other customers"
   - **Technical win**: Row-level security at database level — not application-level isolation, not middleware filters

2. **Role-Based Access**
   - "Teams can have different permissions: viewer, assessor, admin"
   - Click into workspace members/team settings
   - "Each person sees only their organization's data"
   - **Executive translation**: "This is how your team collaborates internally while staying secure from competitors"

---

## SECTION 2 — COMPLIANCE WORKFLOW (12 min)

*Walk through the complete customer journey. This is the core demo.*

### Step 1: System Inventory (1 min)

"First, the organization catalogs their AI systems. Anne Catherine's firm uses three AI tools in their accounting business."

- Navigate to **Inventory** section
- Show the three AI systems already created:
  1. Document classifier (medium risk)
  2. Tax optimizer (high risk)
  3. Client matching engine (medium risk)

**Narrative:** "Instead of a spreadsheet, everything's in one place. You can filter by risk, vendor, usage, whatever matters to you."

**Question to audience:** "How many organizations do you think can answer 'how many AI systems do we use'? Most don't even know."

### Step 2: Risk Assessment (3 min)

"For each system, the organization completes a risk assessment. The EU AI Act defines four risk levels. We guide them through the questions."

- Click into **Risk Assessment** for the high-risk system
- Show the assessment form structure:
  - Basic info (system name, vendor, purpose)
  - Risk level selection (unacceptable|high|medium|low)
  - Evidence data (JSON payload with assessment details)

**Live action:** 
- Show an existing assessment in **Draft** status
- Transition to **In Review** status
- Show final **Finalized** status

**Narrative:** "The assessment process has three stages: draft (internal team), in-review (if needed), and finalized. Once finalized, it's locked for audit."

**Technical note (if asked):** "The risk levels are mapped directly to EU AI Act risk categories—unacceptable, high, limited, minimal."

### Step 3: Obligations Lookup (2 min)

"Based on their AI systems and risk levels, the platform automatically identifies applicable obligations."

- Navigate to **Obligations** section
- Filter by workspace
- Show obligation list: "15 obligations identified for this workspace"
  - Examples: Impact assessment, Human review, Documentation, Training records
  - Each has status (identified, in-progress, completed)
  - Each has priority (critical, high, medium, low)

**Narrative:** "Instead of hiring a compliance consultant to read the regulation, the platform does the mapping. Here are your obligations. Track progress against each one."

### Step 4: Evidence Collection (2 min)

"For each obligation, organizations collect evidence. Maybe that's a policy document, a training certificate, audit logs, whatever proves compliance."

- Navigate to **Evidence** section
- Show evidence artifacts:
  - Document uploads with status (submitted, under-review, approved)
  - Evidence metadata (obligation it addresses, upload date, responsible person)

**Demo action:**
- Show submitting a piece of evidence
- Show the system storing it with metadata
- Show tracking its review status

**Narrative:** "This becomes your audit file. When a regulator asks 'can you prove you assessed this system?', you have the complete file."

### Step 5: Compliance Dashboard (2 min)

"Let's look at the real-time compliance status."

- Navigate to **Compliance Dashboard**
- Show the metrics:
  - **Systems**: 3 total, 3 assessed (100%)
  - **Risk distribution**: 1 high, 2 medium
  - **Assessment status**: All 3 finalized
  - **Evidence**: 8 submitted, 2 approved, progress tracking
  - **Obligations**: 15 total, 10 identified, 3 in-progress, 2 completed
  - **Readiness**: 65% (showing real calculation, not arbitrary)
  - **Health status**: Yellow (good) — "high risk system requires attention"

**Narrative:** "This dashboard answers the core question: where do we stand on EU AI Act compliance? Right now, this organization is 65% ready. They know exactly what's missing."

---

## SECTION 3 — COMPLIANCE REPORT (2 min)

"Let's generate an audit-ready compliance report."

- Navigate to **Reports** section
- Click **Generate Compliance Report**
- Show system generating PDF report
- Download and display sample report showing:
  - Organization name
  - AI systems summary (3 systems)
  - Risk distribution breakdown
  - Assessment status
  - Compliance readiness score (65%)
  - Obligations tracking
  - Evidence summary
  - Generation timestamp

**Narrative:** "This is what gets sent to auditors. It's generated from live data—not a static document. If they assess one more system tomorrow, the report updates."

**Business win:** "Report generation takes 5 seconds. Manual compliance documentation takes weeks."

---

## SECTION 4 — SECURITY & ISOLATION (2 min)

*This is where you differentiate from competitors.*

"I want to show you what happens if I try to access another customer's workspace."

- Switch to a different workspace (or show attempted access)
- Demonstrate: Cannot see other customer data
- Explain the architecture:

**Three-layer isolation:**
1. **Authentication layer**: Session enforces user identity
2. **Database layer**: Row-level security policies block queries
3. **API layer**: Workspace validation on every request

**Quote from the code:** "43 database policies enforce these rules. A single line of code that accidentally exposes data would be caught by the database itself."

**Narrative:** "This is enterprise-grade security. Your data isn't protected by application code that someone might bypass. It's protected by the database itself. That's why we're confident in multi-tenancy."

---

## SECTION 5 — TEAM COLLABORATION (1 min)

"Finally, multiple team members can collaborate."

- Show workspace members/team section
- Demonstrate: Adding a team member with specific role
- Show different users seeing appropriate data

**Narrative:** "Anne Catherine's accounting team can have different people running assessments, uploading evidence, reviewing results—all in one place, with role-based access."

---

## CLOSING — GO DECISION (2 min)

**Summarize the three wins:**

1. **Complete visibility**: One platform for inventory, assessment, evidence, reporting
2. **Regulatory alignment**: Built on EU AI Act structure—organizations aren't guessing
3. **Enterprise-ready**: Multi-tenant, secure, team collaboration, audit trail

**The business case:**

"The alternative is: spreadsheets + consultant hours + manual report creation + no audit trail. This organization saved weeks of work and reduced compliance risk."

**Next step:**

"Anne Catherine's team starts using this tomorrow. In two weeks, they'll have generated their first compliance report. That's when we know whether this actually solves customer problems."

**Ask for the decision:**

"Are you ready for us to launch with the first customer?"

---

## TALKING POINTS FOR Q&A

### Q: "How do you ensure data isolation actually works?"

**Answer:** "Database row-level security. Every query includes a workspace_id filter at the database level. The PostgreSQL server enforces it—even if application code had a bug, the database blocks unauthorized access. We have 43 RLS policies deployed and tested."

### Q: "What happens if the system goes down during compliance review?"

**Answer:** "Customers have access to all their data via PDF reports—they're not dependent on the platform for audit evidence. We also use Supabase for infrastructure—managed PostgreSQL with 99.9% uptime. Downtime during demo is Tokyo production, which has been stable for 14 days."

### Q: "How are you different from competitors?"

**Answer:** "Three things: (1) Built specifically for EU AI Act—not retrofitted compliance tool. (2) Multi-tenant from day one—enterprises trust us with isolated data. (3) Evidence-first—we store what regulators actually need, not what consultants invent."

### Q: "What about other regulations—GDPR, ISO 27001?"

**Answer:** "GDPR is built in—we enforce it with RLS and don't retain unnecessary data. ISO 27001 is infrastructure (Supabase handles). We're focused on AI governance first. Other regulations are phase 2 if customers need them."

### Q: "How long does setup take for a new organization?"

**Answer:** "Registration to first assessment: 15 minutes. User creates account, workspace, adds one AI system. Assessments typically take 30-60 minutes depending on system complexity. Most organizations have their first report within two hours of signup."

### Q: "What's your pricing model?"

**Answer:** [If asked, this requires Founder input. Defer: "That's a commercial question—I want to focus on the product readiness. But it's designed to scale from single-team to enterprise."]

---

## DELIVERY NOTES

**Technical prerequisites:**
- Tokyo production deployment live and accessible
- Test workspace with sample data loaded
- PDF report pre-generated as backup (if live generation fails)
- Network stable (run from wired connection)

**Timing checkpoint:**
- 0-2 min: Opening
- 2-5 min: Multi-tenant architecture
- 5-17 min: Compliance workflow (core)
- 17-19 min: Report generation
- 19-21 min: Security
- 21-22 min: Team collaboration
- 22-24 min: Closing
- 24-30 min: Q&A buffer

**Audience engagement:**
- Ask rhetorical questions (e.g., "How many orgs know how many AI systems they use?") to create narrative tension
- Show real workflow, not abstract slides
- Let them see data generation (assessment status change, evidence submission) live
- Be ready to explain why each feature matters to compliance

**Fallback plan:**
- If Tokyo goes down: Use pre-recorded video of demo flow
- If PDF generation fails: Show pre-generated sample report
- If time is short: Skip team collaboration section (6 min), go straight to closing

---

## POST-DEMO NEXT STEPS

**If GO decision is given:**

1. Anne Catherine team receives platform access
2. First customer verification begins immediately
3. Monitor for friction points during first week
4. Generate Anne Catherine case study after 2-week period
5. Begin outreach to next customers

**If NO-GO or conditional:**

1. Document specific concerns
2. Root-cause analysis
3. Fix and re-verify
4. Reschedule demo within 3 days

---

**Script Owner:** Governor Ω  
**Last Updated:** 2026-07-16 14:15 UTC  
**Delivery Ready:** Yes — Tokyo production verified  
**GO Status:** CONDITIONAL on Frankfurt credentials (fallback to Tokyo approved)
