# Phase 3 Feature Candidates

**Status:** Pre-implementation research (awaiting checkpoint audit 2026-07-17)  
**Decision Date:** 2026-07-17  
**Ranked by:** Likely adoption signal + implementation complexity

---

## Candidate A: Evidence-Obligation Linking (High Demand Signal Expected)

### What It Does

Connect evidence submissions to the obligations they help fulfill. Teams import evidence (risk assessment reports, audit logs, policy documents) and link them to specific obligations to show progress.

### Why It Might Be Next

- **Signal:** If teams use obligations heavily but ask "which evidence satisfies this obligation?" → Evidence linking is the natural next step
- **User problem:** Right now obligations and evidence are disconnected; teams manually track which evidence supports which obligation

### What Needs to Change

**Database Schema**

```sql
-- New junction table (many-to-many)
CREATE TABLE obligation_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id uuid NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
  evidence_id uuid NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  linked_at timestamp NOT NULL DEFAULT now(),
  linked_by uuid NOT NULL REFERENCES auth.users(id),
  UNIQUE(obligation_id, evidence_id)
);

-- RLS policies: users can link evidence to their workspace's obligations
```

**UI Changes**

- Obligations page: Add "Linked Evidence" count badge on each obligation
- Evidence page: Add "Fulfills Obligations" section showing which obligations are satisfied
- Detail view: Modal to select/unlink evidence for an obligation

**API Endpoints**

```
POST   /api/obligations/:id/evidence    # Link evidence to obligation
DELETE /api/obligations/:id/evidence/:evidenceId  # Unlink
GET    /api/obligations/:id/evidence    # Fetch linked evidence
```

### Effort Estimate

- Schema + RLS: 1–2 hours
- API endpoints: 2–3 hours
- UI implementation: 2–3 hours
- **Total: 5–8 hours (1 day)**

### Risk/Complexity

- Low risk: Additive; no changes to existing workflows
- Moderate complexity: New junction table + bidirectional UI views

### Post-Launch Use Case

"We can now show which evidence we submitted for each obligation, automatically calculating compliance % per obligation based on linked evidence."

---

## Candidate B: Audit Logging (Medium Demand Signal Expected)

### What It Does

Track all changes to obligations (created, status updated, priority changed, due date set, evidence linked). Store immutable change log for compliance audits and team transparency.

### Why It Might Be Next

- **Signal:** If teams ask "who marked this complete?" or "when did we update this?" → Audit logging is critical
- **User problem:** Right now there's no trail of who did what and when; critical for compliance verification

### What Needs to Change

**Database Schema**

```sql
CREATE TABLE obligation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id uuid NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  change_type TEXT NOT NULL, -- 'created', 'status_updated', 'priority_changed', 'due_date_set', etc.
  before_value jsonb,  -- Previous values
  after_value jsonb,   -- New values
  change_reason TEXT,  -- Optional: why the change?
  changed_at timestamp NOT NULL DEFAULT now()
);

-- RLS: members can read logs for their workspace's obligations
-- Immutable: INSERT only, never UPDATE/DELETE
```

**API Changes**

- All obligation mutation endpoints (update status, priority, due date) now log their changes
- New `GET /api/obligations/:id/audit-log` endpoint to fetch change history

**UI Changes**

- Obligations detail view: New "Activity" tab showing full change log
- Change log entry: "Status changed to 'in progress' by Jane Doe on 2026-07-15 14:30 UTC"
- Optional: Reason field in status-update modal ("What's blocking this?")

### Effort Estimate

- Schema + RLS: 1–2 hours
- Logging in mutation endpoints (3 endpoints): 2–3 hours
- Audit log API: 1 hour
- UI (activity tab): 2–3 hours
- **Total: 6–9 hours (1.5 days)**

### Risk/Complexity

- Low risk: Append-only log; no retroactive changes
- High complexity: Must instrument every mutation point + handle schema consistency

### Post-Launch Use Case

"We can verify who completed each obligation and when, producing an immutable audit trail for compliance audits and team accountability."

---

## Candidate C: Template Library Iteration (Low-to-Medium Demand Signal Expected)

### What It Does

Expand and refine the obligation templates based on actual usage patterns. Add industry-specific templates, allow workspace admins to create custom templates, publish templates to workspace library.

### Why It Might Be Next

- **Signal:** If teams heavily customize or extend templates → Templates need to be more granular or flexible
- **User problem:** Pre-built templates might be too generic or misaligned with team's risk profile

### What Needs to Change

**Database Schema**

```sql
-- Allow workspace admins to create and manage templates
CREATE TABLE custom_obligation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT, -- 'critical', 'high', 'medium', 'low'
  category TEXT, -- 'governance', 'documentation', 'testing', etc.
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  is_published BOOLEAN DEFAULT FALSE
);
```

**API Changes**

- `POST /api/templates` — Create custom template
- `GET /api/templates?workspace=true` — Fetch workspace's templates (built-in + custom)
- `PUT /api/templates/:id` — Edit custom template
- `DELETE /api/templates/:id` — Archive template

**UI Changes**

- Templates page (new): Browse built-in + custom templates
- Create template modal: Guided workflow for admins to build templates
- Import modal: Filter by category + workspace scope
- Obligations import: Show custom templates alongside built-in

### Effort Estimate

- Schema + RLS: 1–2 hours
- API endpoints: 2–3 hours
- Template management UI: 3–4 hours
- **Total: 6–9 hours (1.5 days)**

### Risk/Complexity

- Low-medium risk: Additive feature; existing templates unaffected
- Low complexity: Straightforward CRUD operations

### Post-Launch Use Case

"Admins can create and share obligation templates specific to their industry/risk profile, making the library a living resource that evolves with the team's compliance maturity."

---

## Candidate D: Advanced Analytics (Medium-to-High Demand Signal Expected)

### What It Does

Compliance trends dashboard showing: obligation completion velocity, risk remediation speed by level, team performance on obligations, predictive alerts (at current pace, will you meet your deadline?).

### Why It Might Be Next

- **Signal:** If teams track many obligations and ask "how are we progressing?" → Analytics unlock insights
- **User problem:** Right now there's no visibility into team velocity or remediation trends

### What Needs to Change

**No schema changes** — analytics work off existing data

**API Endpoints**

```
GET /api/analytics/obligations/velocity        -- Completions per day/week/month
GET /api/analytics/obligations/by-risk-level   -- Progress broken down by risk tier
GET /api/analytics/obligations/by-team         -- Which teams are fastest/slowest
GET /api/analytics/obligations/trends          -- Burndown chart, trends
GET /api/analytics/obligations/predictions     -- Estimated completion dates
```

**UI Changes**

- New `/analytics` page with dashboard:
  - Obligation burndown chart (created vs. completed over time)
  - Velocity metric (obligations/week trending)
  - Risk level breakdown (% complete by unacceptable/high/medium/low)
  - Team comparison (leaderboard)
  - Predictive alerts ("At current pace, high-risk obligations will be done in 3 weeks")

### Effort Estimate

- Query logic + calculations: 2–3 hours
- API endpoints (5 endpoints): 2–3 hours
- Dashboard UI + charts: 3–4 hours
- **Total: 7–10 hours (1.5–2 days)**

### Risk/Complexity

- Low risk: Read-only; no mutations
- Medium complexity: Complex date math and trend calculations

### Post-Launch Use Case

"Leadership can see compliance progress trends, identify bottleneck risk levels, and predict when the team will achieve full obligation completion."

---

## Decision Framework (Applied at Checkpoint)

### Rank by These Signals

| Feature            | Adoption Signal                       | Friction Signal | Complexity | Effort     |
| ------------------ | ------------------------------------- | --------------- | ---------- | ---------- |
| Evidence Linking   | High (team asks "which evidence?")    | High            | Low        | 1 day      |
| Audit Logging      | High (team asks "who changed it?")    | High            | High       | 1.5 days   |
| Template Iteration | Medium (teams customize a lot)        | Medium          | Low        | 1.5 days   |
| Advanced Analytics | Medium (team tracks many obligations) | Medium          | Medium     | 1.5–2 days |

### Recommendation Priority

1. **Evidence Linking** — If teams use obligations heavily + high friction point
2. **Audit Logging** — If teams ask for compliance trail + governance concern
3. **Advanced Analytics** — If team has 100+ obligations and wants trend visibility
4. **Template Iteration** — If templates are blocking adoption or causing confusion

### Selection Criteria

- Pick the feature that **removes the most friction** for the highest-adoption use case
- If multiple features have equal friction, pick the one with **lowest complexity**
- If tie remains, pick the one that **unlocks the next feature** (evidence linking → evidence collection flow)

---

## Implementation Plan (Post-Decision)

### Standard Flow

1. Founder approves Phase 3 candidate (2026-07-17)
2. Governor plans implementation (2 hours)
3. Governor implements + tests (1–2 days)
4. Comprehensive verification (1 hour)
5. Deploy to production (30 min)
6. Monitor for errors (1 day)

### Estimated Timeline

- Single candidate: 2–3 days total
- Two candidates in sequence: 4–6 days total

---

## Post-Phase-3 Opportunities (Phase 4 and Beyond)

- **Evidence Collection** — Drag-and-drop upload + auto-categorization of compliance evidence
- **Risk Reassessment Workflow** — After completing obligations, re-run risk assessment to measure improvement
- **Integration with GRC Platforms** — Export obligations to ServiceNow/Workiva for enterprise teams
- **Multi-team Governance** — Cross-team obligation reviews and approval workflows
- **AI-powered Obligation Recommendations** — ML-based suggestions for additional obligations based on system description
