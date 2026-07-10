# Phase 3 Architecture Options — Pre-Planning for Rapid Execution

**Status:** Pre-planning (ready to execute immediately after checkpoint audit on 2026-07-17)

**Purpose:** Have architectural designs ready so Founder can decide on 2026-07-17 and Governor can begin implementation without delay.

---

## Context

**Phase 2 Status:** Complete, deployed, live on production  
**Current State:** Pause-and-Measure window (2026-07-10 to 2026-07-17)  
**Checkpoint Audit:** 2026-07-17  
**Decision Window:** Results + Recommendation delivered by end of 2026-07-17  
**Implementation Window:** 2026-07-18 onwards (if Phase 3 approved)

Four candidates compete for Phase 3 prioritization. This document provides architectural detail for each so Founder can decide without waiting for analysis.

---

## Candidate 1: Evidence-Obligation Linking

### Problem Solved

Current state: Obligations exist (28 templates), assessments exist (questions for AI systems), but they're disconnected. Compliance officers have no way to:
- Link evidence (uploaded files, documentation) to specific obligations
- Track which obligations are "satisfied" by which evidence
- Build an audit trail showing compliance proof for each obligation

### Architecture

**Data Model:**
```typescript
// New tables in Supabase
table obligations_evidence (
  id uuid primary key,
  workspace_id uuid foreign key,
  obligation_id uuid foreign key (obligations),
  evidence_id uuid foreign key (evidence),
  created_by uuid,
  created_at timestamp,
  notes text,
  confidence_level 'high' | 'medium' | 'low',
  last_verified_at timestamp
);

table evidence (
  id uuid primary key,
  workspace_id uuid,
  title text,
  description text,
  file_url text,
  file_type text,
  uploaded_by uuid,
  uploaded_at timestamp,
  tags text[],
  linked_obligations_count integer,
  ai_extracted_topics text[]
);
```

**UI Components:**
- Evidence upload widget (drag-drop, file preview)
- "Link to Obligation" modal (multi-select obligations)
- Obligation detail page → "Evidence" tab showing all linked evidence
- Dashboard → "Compliance Coverage" metric (% obligations with evidence ≥ confidence_level)

**API Endpoints:**
- `POST /api/evidence` — Upload evidence file
- `POST /api/obligations/{id}/link-evidence` — Link evidence to obligation
- `DELETE /api/obligations/{id}/evidence/{evId}` — Unlink evidence
- `GET /api/workspace/compliance-coverage` — Calculate % obligations satisfied
- `GET /api/evidence/search?tags=[]` — Search evidence by tag/title

**Estimated Effort:** 4-5 days  
**Key Dependencies:** File storage (Supabase Storage or S3), optional: AI extraction of key points from uploaded documents

**Impact:**
- ✅ Compliance officers can prove obligation fulfillment
- ✅ Audit trail for regulators
- ✅ Closes "we have obligations but no proof" gap
- ⚠️ Doesn't automate evidence collection; still manual upload

**Risk:** File storage quota, permission/compliance issues with storing customer evidence

---

## Candidate 2: Audit Logging

### Problem Solved

Current state: Obligations can be created, updated, marked complete, but there's no record of WHO changed WHAT and WHEN. For compliance audits, this is a critical gap.

Compliance officers need:
- Complete change history: "On 2026-07-01, User X marked Obligation Y complete with evidence Z"
- Accountability: Who is responsible for each status change?
- Rollback capability: Revert accidental changes (e.g., marked complete by mistake)

### Architecture

**Data Model:**
```typescript
// Append-only audit log
table audit_logs (
  id uuid primary key,
  workspace_id uuid,
  entity_type 'obligation' | 'assessment' | 'evidence' | 'user',
  entity_id uuid,
  entity_name text,
  action 'created' | 'updated' | 'deleted' | 'status_changed' | 'linked' | 'linked_evidence',
  actor_id uuid,
  actor_email text,
  changes json,  // { field: 'status', old_value: 'identified', new_value: 'completed' }
  timestamp timestamp,
  ip_address text,
  user_agent text,
  approved_by uuid,  // For gated actions
  approval_timestamp timestamp
);

index on (workspace_id, entity_id, timestamp);
index on (actor_id, timestamp);
```

**UI Components:**
- Obligation detail page → "Audit Trail" tab showing all changes in reverse chronological order
- Search/filter audit logs by date, actor, entity type, action
- Export audit report (CSV/PDF) for compliance review

**API Endpoints:**
- `GET /api/audit-logs/entity/{entityType}/{entityId}` — Get history for one entity
- `GET /api/audit-logs/search` — Query with filters (actor, date range, action type)
- `POST /api/audit-logs/export` — Generate compliance report
- `DELETE /api/audit-logs/{id}` — (Admin-only, rare) Redact sensitive entries

**RLS Policies:**
- Only workspace members can view workspace audit logs
- Only workspace admins can export/filter comprehensive logs
- Users can view only their own actions (unless admin)

**Estimated Effort:** 3-4 days  
**Key Dependencies:** Structured logging middleware in API routes, timestamp accuracy

**Impact:**
- ✅ Compliance-ready audit trail
- ✅ Accountability for every change
- ✅ Fraud/tamper detection
- ✅ Regulatory proof ("we can show who changed what and when")
- ⚠️ Doesn't prevent bad changes, just records them

**Risk:** Log storage growth over time (implement rotation/archival), user confusion about what "audit" means (educate)

---

## Candidate 3: Advanced Analytics

### Problem Solved

Current state: Compliance dashboard shows static metrics (obligations completed, assessment progress) but no trends or predictive insights.

Compliance leaders need:
- Trend analysis: "Is our compliance velocity improving or declining?"
- Benchmarking: "How does our risk profile compare to similar companies?"
- Predictive alerts: "At current pace, we'll miss this deadline"
- Export reports: "Show executive team our progress"

### Architecture

**Data Model:**
```typescript
// Daily snapshot of compliance state (for trend analysis)
table compliance_snapshots (
  id uuid primary key,
  workspace_id uuid,
  snapshot_date date,
  total_obligations integer,
  completed_obligations integer,
  in_progress_obligations integer,
  overdue_obligations integer,
  total_assessments integer,
  completed_assessments integer,
  critical_obligations_incomplete integer,
  compliance_velocity float,  // (completed today - completed yesterday)
  created_at timestamp
);

// Risk distribution over time
table risk_distribution_snapshots (
  id uuid primary key,
  workspace_id uuid,
  snapshot_date date,
  risk_level 'unacceptable' | 'high' | 'medium' | 'low',
  ai_systems_count integer,
  trend_direction 'improving' | 'stable' | 'declining'
);
```

**UI Components:**
- Analytics dashboard page (`/analytics` or tab in compliance)
- Chart 1: Compliance progress over time (line graph, cumulative vs. velocity)
- Chart 2: Risk distribution (pie chart showing % systems in each risk tier)
- Chart 3: Obligation completion by due date (trend of on-time vs. late)
- Chart 4: Team velocity (obligations closed per week)
- Export widget: Download as PDF report

**API Endpoints:**
- `GET /api/analytics/compliance-trend?days=90` — Get 90-day trend data
- `GET /api/analytics/risk-distribution` — Current and historical risk mix
- `GET /api/analytics/team-velocity` — Obligations completed per week
- `POST /api/analytics/export-report` — Generate PDF compliance report
- `GET /api/analytics/benchmarks` — (future) Compare to industry benchmarks

**Data Pipeline:**
- Cron job daily at 00:00 UTC: Snapshot current compliance state → compliance_snapshots table
- Materialized view for quick trend queries

**Estimated Effort:** 5-6 days  
**Key Dependencies:** Charting library (Recharts, Chart.js), PDF generation (pdfkit or similar), scheduled cron job

**Impact:**
- ✅ Executive visibility into compliance progress
- ✅ Predictive alerts (miss deadline detection)
- ✅ Velocity tracking (are we getting faster?)
- ✅ Regulatory reporting (quarterly/annual compliance reports)
- ⚠️ Doesn't improve compliance, just measures it

**Risk:** Misleading trend lines (if snapshot frequency too low), export complexity, performance impact of trend queries on large datasets

---

## Candidate 4: Template Library Iteration

### Problem Solved

Current state: 28 hard-coded obligation templates cover broad EU AI Act requirements, but they're:
- Generic (not tailored to specific industries or use cases)
- Incomplete (missing some regulations in specific geographies)
- Not user-customizable (teams can't edit or create custom obligations)

Compliance officers need:
- Industry-specific templates (finance templates differ from healthcare)
- Geography-specific options (GDPR + local regulations)
- Custom obligation creation UI (teams can define their own obligations)
- Template tagging/search (browse templates by category)
- Versioning (old template versions preserved for historical compliance)

### Architecture

**Data Model:**
```typescript
// Built-in templates (shipped with product)
table obligation_templates (
  id uuid primary key,
  name text,
  description text,
  source 'eu_ai_act' | 'gdpr' | 'custom_user',
  risk_level 'unacceptable' | 'high' | 'medium' | 'low',
  category text,  // 'model-development' | 'deployment' | 'monitoring' | etc.
  industry_tags text[],  // 'finance' | 'healthcare' | 'retail'
  geography text[],  // 'EU' | 'UK' | 'US', etc.
  compliance_framework text,  // 'EU AI Act' | 'GDPR' | 'CCPA'
  estimated_effort_hours integer,
  created_by text,  // 'system' | 'workspace_id'
  created_at timestamp,
  version integer,
  is_active boolean
);

// Custom templates created by workspace users
table custom_obligation_templates (
  id uuid primary key,
  workspace_id uuid,
  name text,
  description text,
  created_by uuid,
  created_at timestamp,
  based_on_template_id uuid,  // Reference to standard template it was customized from
  customizations json
);

// Template usage tracking (for analytics)
table template_usage (
  workspace_id uuid,
  template_id uuid,
  imported_count integer,
  imported_at timestamp,
  index on (template_id, imported_count) for "most popular templates"
);
```

**UI Components:**
- Template browser page (`/templates`)
  - Filter by: industry, geography, risk level, compliance framework
  - Search by name
  - "Create custom template" button
- Template import flow (similar to current, but with filters)
- Custom template editor (create/edit UI)
- Template marketplace (view popular templates, community templates)

**API Endpoints:**
- `GET /api/templates` — List templates with filters (industry, geography, risk_level, framework)
- `POST /api/templates/{id}/import` — Import template for workspace
- `POST /api/templates/custom` — Create custom template
- `GET /api/templates/usage-stats` — Which templates are most/least used
- `PUT /api/templates/custom/{id}` — Update custom template
- `DELETE /api/templates/custom/{id}` — Delete custom template

**Estimated Effort:** 5-6 days  
**Key Dependencies:** Enhanced UI filtering, template versioning logic, community/marketplace infrastructure (if public sharing intended)

**Impact:**
- ✅ Faster onboarding for new teams (pre-built templates)
- ✅ Customization for specific industries/geographies
- ✅ Higher template adoption (users find what's relevant to them)
- ✅ Community growth (users share templates, product becomes network effect)
- ⚠️ Increased complexity (template versions, customization)

**Risk:** Explosion of poor-quality custom templates, marketplace moderation overhead, confusion between built-in and custom templates

---

## Decision Framework for Founder

### Scoring Table

| Candidate | Effort | Timeline | Customer Value | Regulatory Impact | Complexity | Dependency | Best If... |
|-----------|--------|----------|-----------------|------------------|-----------|-----------|-----------|
| **Evidence-Obligation Linking** | 4-5d | Fast | High | High | Medium | File storage | Teams need to prove compliance immediately |
| **Audit Logging** | 3-4d | Fastest | Medium | Critical | Low | Logging MW | Regulatory audit required soon |
| **Advanced Analytics** | 5-6d | Moderate | Medium | Medium | High | Charting lib | Executive visibility is priority |
| **Template Iteration** | 5-6d | Moderate | Medium | Low | High | UI complexity | User growth & adoption is priority |

### Questions to Guide Choice

1. **Immediate customer pain:** What's the first thing customers complain about after using Phase 2 for 1 week?
   - Evidence-Obligation Linking ← "How do we prove we're compliant?"
   - Audit Logging ← "Who changed this? When?"
   - Advanced Analytics ← "Are we on track?"
   - Template Iteration ← "Your templates don't fit our industry"

2. **Regulatory pressure:** Any upcoming compliance audits or requirements?
   - Audit Logging and Evidence-Obligation Linking address this best

3. **Growth bottleneck:** What blocks more customers from signing up?
   - Template Iteration (industry-specific templates attract new verticals)
   - Advanced Analytics (reporting attracts executives)

4. **Technical risk tolerance:** How much complexity can we absorb?
   - Audit Logging (lowest risk, most proven pattern)
   - Evidence-Obligation Linking (medium, well-understood)
   - Advanced Analytics (higher risk, more data pipeline complexity)
   - Template Iteration (highest, UI complexity)

---

## Implementation Plan (Post-Decision)

Once Founder chooses one candidate on 2026-07-17:

### Day 1 (2026-07-18): Architecture Spike
- Governor reviews selected architecture in detail
- Identifies database schema changes
- Lists API endpoints
- Drafts component structure
- Estimated 2-3 hours

### Days 2-5: Implementation
- Database migrations deployed
- API endpoints implemented
- UI components built
- Tests written (aim for 80%+ coverage)
- Estimated 3-5 days depending on candidate

### Day 6: Verification & Deployment
- Full test suite green
- E2E tests passing
- Vercel preview deployment verified
- Merge to main → production deploy
- Estimated 1 day

### Day 7: Post-Launch Monitoring
- Watch error rates (DNA-GOV-003)
- Monitor performance (DNA-GOV-009)
- Gather user feedback
- Document learnings

**Total timeline: 7-10 days from decision to production**

---

## Next Steps

1. **2026-07-10 to 2026-07-17:** Teams use Phase 2 system; Governor collects adoption data
2. **2026-07-17:** Checkpoint audit executed; results analyzed
3. **2026-07-17 afternoon:** Founder decides which Phase 3 candidate to pursue
4. **2026-07-18 onwards:** Governor executes immediately using this architecture

---

## Appendix: Database Migration Strategy

For any selected candidate, schema migrations will follow this pattern:

```sql
-- 1. Create new tables (won't affect existing queries)
CREATE TABLE IF NOT EXISTS new_table (...)

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_name ON table(...)

-- 3. Run in Supabase migration system (idempotent, reversible)
-- 4. Verify no data loss
-- 5. Deploy API code that uses new tables
-- 6. Monitor for issues 24h
-- 7. Delete migration rollback option
```

All migrations are **reversible** within the 24-hour observation window.
