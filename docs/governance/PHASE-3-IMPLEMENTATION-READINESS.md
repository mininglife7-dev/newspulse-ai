# Phase 3 Implementation Readiness

**Status:** Ready for autonomous implementation upon Founder approval  
**Date:** 2026-07-15  
**Decision Checkpoint:** 2026-07-17 (after first customer signals)

---

## Executive Summary

All Phase 3 candidate features (Evidence Linking, Audit Logging, Template Iteration, Advanced Analytics) have been analyzed, architected, and prepared for rapid implementation. Code skeletons, database schema designs, API contracts, and UI component layouts are documented below. Upon Founder approval of the chosen feature, implementation can begin within 2 hours of planning.

**What's Ready:**

- ✅ Complete database schema designs (with RLS policies)
- ✅ API endpoint contracts and request/response specs
- ✅ React component structure and data flow diagrams
- ✅ TypeScript type definitions (ready to copy-paste)
- ✅ Test strategy and example test cases
- ✅ Estimated effort broken down by task
- ✅ Risk assessment and rollback procedures

---

## Phase 3 Feature Comparison Matrix

| Feature                | Priority | Effort     | Complexity | Adoption Signal                    | Friction Level | Blocks Next Feature               |
| ---------------------- | -------- | ---------- | ---------- | ---------------------------------- | -------------- | --------------------------------- |
| **Evidence Linking**   | 1        | 1 day      | Low        | High (team asks "which evidence?") | High           | Yes—enables Evidence Collection   |
| **Audit Logging**      | 2        | 1.5 days   | High       | High (compliance trail)            | Medium         | Yes—enables Change Reconciliation |
| **Template Iteration** | 3        | 1.5 days   | Low        | Medium (customization)             | Medium         | No                                |
| **Advanced Analytics** | 4        | 1.5–2 days | Medium     | Medium (trends)                    | Low            | No                                |

**Recommendation:** Start with **Evidence Linking** if customer uses obligations heavily + asks "which evidence satisfies this?" Proceed to **Audit Logging** if they ask "who marked this complete?" and have compliance concerns.

---

## Feature 1: Evidence Linking (RECOMMENDED FIRST)

### Problem Statement

Teams manage obligations and evidence separately. No connection between them. Teams manually track "Which evidence supports which obligation?" in spreadsheets.

### Solution Overview

Add junction table (`obligation_evidence`) linking obligations to evidence. Show evidence counts on obligation cards. Let teams link/unlink evidence via modal. Calculate obligation completion % based on linked evidence.

### Database Schema

```sql
-- Evidence linking junction table
create table if not exists public.obligation_evidence (
    id uuid primary key default gen_random_uuid(),
    obligation_id uuid not null references public.obligations(id) on delete cascade,
    evidence_id uuid not null references public.evidence(id) on delete cascade,
    linked_at timestamptz not null default now(),
    linked_by uuid not null references auth.users(id),
    link_reason text,  -- Optional: why this evidence supports the obligation
    created_at timestamptz not null default now(),
    unique(obligation_id, evidence_id)
);

-- Indexes for common queries
create index if not exists obligation_evidence_obligation_idx on public.obligation_evidence (obligation_id);
create index if not exists obligation_evidence_evidence_idx on public.obligation_evidence (evidence_id);

-- RLS Policy: Users can link evidence to their workspace's obligations
alter table public.obligation_evidence enable row level security;

create policy "Users can link evidence to workspace obligations"
  on public.obligation_evidence
  for all
  using (
    exists(
      select 1 from public.obligations o
      where o.id = obligation_evidence.obligation_id
        and o.workspace_id in (
          select workspace_id from public.workspace_members
          where user_id = auth.uid()
        )
    )
  );

-- Update: Add evidence count materialized view for performance
create or replace view obligation_evidence_counts as
  select
    obligation_id,
    count(*) as evidence_count,
    max(linked_at) as last_linked_at
  from public.obligation_evidence
  group by obligation_id;
```

### API Endpoints

#### Link Evidence to Obligation

```
POST /api/obligations/:id/evidence
Content-Type: application/json

Request:
{
  "evidenceId": "uuid",
  "linkReason": "This audit report shows we completed the access control review"
}

Response: 201
{
  "obligationId": "uuid",
  "evidenceId": "uuid",
  "linkedAt": "2026-07-15T14:30:00Z",
  "linkedBy": "user-uuid",
  "linkReason": "..."
}

Errors:
- 404: Obligation not found
- 403: User lacks permission
- 409: Evidence already linked (unique constraint)
```

#### Fetch Linked Evidence

```
GET /api/obligations/:id/evidence?limit=20&offset=0

Response: 200
{
  "obligationId": "uuid",
  "linkedEvidence": [
    {
      "evidenceId": "uuid",
      "title": "Security Audit 2026",
      "type": "audit-report",
      "linkedAt": "2026-07-15T14:30:00Z",
      "linkedBy": {"id": "...", "email": "jane@company.com"},
      "linkReason": "..."
    }
  ],
  "totalCount": 1,
  "coveragePercent": 65
}
```

#### Unlink Evidence

```
DELETE /api/obligations/:id/evidence/:evidenceId

Response: 204 (No Content)
```

### React Components

#### ObligationCard (Enhanced)

```typescript
// app/components/obligations/ObligationCard.tsx
interface Props {
  obligation: Obligation;
  linkedEvidenceCount?: number;
  onLinkEvidence?: () => void;
}

export function ObligationCard({ obligation, linkedEvidenceCount = 0, onLinkEvidence }: Props) {
  return (
    <div className="card">
      <h3>{obligation.title}</h3>
      <p>{obligation.description}</p>

      {/* NEW: Evidence badge showing linked count */}
      <div className="flex gap-2 items-center mt-4">
        <span className={`badge ${linkedEvidenceCount > 0 ? 'success' : 'secondary'}`}>
          📎 {linkedEvidenceCount} Evidence
        </span>
        <button onClick={onLinkEvidence} className="btn btn-sm">
          Link Evidence
        </button>
      </div>

      {/* Coverage indicator */}
      {linkedEvidenceCount > 0 && (
        <div className="mt-2">
          <div className="text-sm text-gray-600">Coverage</div>
          <div className="progress mt-1">
            <div className="progress-bar" style={{width: `${calculateCoverage(linkedEvidenceCount)}%`}}/>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### EvidenceLinkModal (New)

```typescript
// app/components/obligations/EvidenceLinkModal.tsx
interface Props {
  obligationId: string;
  isOpen: boolean;
  onClose: () => void;
  onLinked: () => void;  // Refresh parent
}

export function EvidenceLinkModal({ obligationId, isOpen, onClose, onLinked }: Props) {
  const [search, setSearch] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [linkReason, setLinkReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    setLoading(true);
    try {
      for (const evidenceId of selectedEvidence) {
        await fetch(`/api/obligations/${obligationId}/evidence`, {
          method: 'POST',
          body: JSON.stringify({
            evidenceId,
            linkReason
          })
        });
      }
      onLinked();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Link Evidence">
      <div className="space-y-4">
        <SearchInput
          placeholder="Search evidence by title..."
          value={search}
          onChange={setSearch}
        />

        <EvidenceSelector
          search={search}
          selectedIds={selectedEvidence}
          onSelect={setSelectedEvidence}
        />

        <textarea
          placeholder="Why does this evidence support the obligation? (optional)"
          value={linkReason}
          onChange={(e) => setLinkReason(e.target.value)}
          className="input w-full"
        />

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button
            onClick={handleLink}
            disabled={selectedEvidence.length === 0 || loading}
            className="btn btn-primary"
          >
            {loading ? 'Linking...' : `Link ${selectedEvidence.length} Evidence`}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
```

#### LinkedEvidenceList (New)

```typescript
// app/components/obligations/LinkedEvidenceList.tsx
interface Props {
  obligationId: string;
  evidence: LinkedEvidence[];
  onUnlink: (evidenceId: string) => void;
}

export function LinkedEvidenceList({ obligationId, evidence, onUnlink }: Props) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Linked Evidence ({evidence.length})</h4>
      {evidence.length === 0 ? (
        <p className="text-sm text-gray-500">No evidence linked yet</p>
      ) : (
        <ul className="space-y-2">
          {evidence.map((e) => (
            <li key={e.evidenceId} className="flex items-start justify-between p-2 bg-gray-50 rounded">
              <div className="flex-1">
                <p className="font-medium text-sm">{e.title}</p>
                <p className="text-xs text-gray-600">
                  Linked by {e.linkedBy.email} on {formatDate(e.linkedAt)}
                </p>
                {e.linkReason && (
                  <p className="text-xs text-gray-700 mt-1 italic">"{e.linkReason}"</p>
                )}
              </div>
              <button
                onClick={() => onUnlink(e.evidenceId)}
                className="btn btn-xs btn-ghost"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Implementation Checklist

- [ ] **Database (30 min)**
  - [ ] Create `obligation_evidence` table with unique constraint
  - [ ] Create indexes on `obligation_id` and `evidence_id`
  - [ ] Enable RLS and create policy
  - [ ] Create materialized view for evidence counts
  - [ ] Test schema: Link 2 evidence to 1 obligation, verify counts

- [ ] **API Layer (90 min)**
  - [ ] `POST /api/obligations/:id/evidence` — Link endpoint
  - [ ] `GET /api/obligations/:id/evidence` — Fetch linked evidence
  - [ ] `DELETE /api/obligations/:id/evidence/:evidenceId` — Unlink endpoint
  - [ ] Input validation (required fields, UUID formats)
  - [ ] Error handling (404, 403, 409)
  - [ ] Write 12 tests (4 per endpoint)

- [ ] **React Components (120 min)**
  - [ ] Create `EvidenceLinkModal` component with search + selection
  - [ ] Create `LinkedEvidenceList` component for detail view
  - [ ] Update `ObligationCard` to show evidence badge
  - [ ] Update `ObligationDetail` page to use new components
  - [ ] Integrate `useQuery`/`useMutation` for API calls
  - [ ] Add loading/error states
  - [ ] Write component tests (accessibility, interactions)

- [ ] **Integration (60 min)**
  - [ ] Update obligation list view to show evidence counts
  - [ ] Update obligation detail page with evidence section
  - [ ] Add "Link Evidence" button to obligation cards
  - [ ] Test full flow: Create obligation → Link evidence → See count
  - [ ] Test unlinking and re-linking
  - [ ] Verify RLS policies (user from workspace A can't link to workspace B)

- [ ] **Testing (60 min)**
  - [ ] Unit tests for API handlers
  - [ ] Integration tests for full link/unlink flow
  - [ ] E2E test: Create obligation, link evidence, unlink, verify state
  - [ ] Edge cases: Duplicate links, permission checks, missing data
  - [ ] Performance: Verify evidence count query is indexed

- [ ] **Documentation (30 min)**
  - [ ] Update API documentation
  - [ ] Add user guide: "How to link evidence to obligations"
  - [ ] Update changelog with new feature

**Total Estimated Time: 1 day (8 hours)**

### Success Metrics

- ✅ Evidence counts show on obligation cards
- ✅ Users can link/unlink evidence via modal
- ✅ Coverage % calculated from evidence count
- ✅ All RLS policies enforced
- ✅ 24 new tests, all passing
- ✅ 0 regressions in existing tests
- ✅ Performance: Evidence count query <100ms

---

## Feature 2: Audit Logging

### Problem Statement

Teams cannot answer "Who changed this?" or "When was this completed?" No immutable record of changes. Critical for compliance audits.

### Solution Overview

Create `obligation_audit_log` table. Instrument all mutation endpoints to log changes. Provide `GET /api/obligations/:id/audit-log` endpoint. Show activity timeline on obligation detail page.

### Database Schema

```sql
create table if not exists public.obligation_audit_log (
    id uuid primary key default gen_random_uuid(),
    obligation_id uuid not null references public.obligations(id) on delete cascade,
    workspace_id uuid not null references public.workspaces(id),
    changed_by uuid not null references auth.users(id),
    change_type text not null check (change_type in ('created', 'status_updated', 'priority_changed', 'due_date_set', 'description_updated')),
    before_value jsonb,
    after_value jsonb,
    change_reason text,
    changed_at timestamptz not null default now()
);

create index if not exists obligation_audit_log_obligation_idx on public.obligation_audit_log (obligation_id);
create index if not exists obligation_audit_log_workspace_idx on public.obligation_audit_log (workspace_id);
create index if not exists obligation_audit_log_changed_at_idx on public.obligation_audit_log (changed_at desc);

alter table public.obligation_audit_log enable row level security;

create policy "Users can read audit log for workspace obligations"
  on public.obligation_audit_log
  for select
  using (workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  ));
```

### Implementation Notes

- **Immutable:** INSERT-only table; no UPDATE/DELETE (enforced via trigger)
- **Trigger:** Auto-log on obligation creation
- **Instrumentation:** Wrap all update endpoints with logging helper
- **Queries:** Indexed for fast audit trail retrieval

### Estimated Effort: 1.5 days

---

## Feature 3: Template Iteration

### Problem Statement

Pre-built templates are one-size-fits-all. Teams want custom templates for their industry/risk profile.

### Solution Overview

Create `custom_obligation_templates` table. Let workspace admins create/manage templates. Filter obligations import modal to show custom + built-in templates.

### Database Schema

```sql
create table if not exists public.custom_obligation_templates (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id),
    title text not null,
    description text,
    priority text check (priority in ('critical', 'high', 'medium', 'low')),
    category text,
    created_by uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    is_published boolean default false,
    unique(workspace_id, title)
);

alter table public.custom_obligation_templates enable row level security;

create policy "Admins can manage workspace templates"
  on public.custom_obligation_templates
  for all
  using (
    exists(
      select 1 from public.workspace_members
      where workspace_id = custom_obligation_templates.workspace_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );
```

### Estimated Effort: 1.5 days

---

## Feature 4: Advanced Analytics

### Problem Statement

No visibility into obligation completion velocity, risk remediation speed, or burndown trends.

### Solution Overview

Compute analytics from existing obligation data. Provide endpoints for velocity, risk breakdown, team comparison, predictions. Dashboard with charts showing trends.

### No Schema Changes Required

Analytics queries off existing `obligations`, `obligation_audit_log`, and `obligation_evidence` tables.

### Example Analytics Endpoints

```
GET /api/analytics/obligations/velocity
  → Completions per day/week/month (trend line)

GET /api/analytics/obligations/by-risk-level
  → % complete broken down by risk tier

GET /api/analytics/obligations/burndown
  → Created vs. completed over time (burndown chart)

GET /api/analytics/obligations/predictions
  → Estimated completion dates (linear regression)
```

### Estimated Effort: 1.5–2 days

---

## Implementation Sequence Recommendation

### Scenario A: Customer Heavily Uses Obligations

**Sequence:** Evidence Linking → Audit Logging → Advanced Analytics

**Rationale:**

1. Evidence Linking removes immediate friction ("Which evidence supports this?")
2. Audit Logging enables compliance trail ("Who completed it?")
3. Advanced Analytics provides leadership visibility into velocity

**Timeline:** 4–5 days (1 + 1.5 + 1.5)

### Scenario B: Customer Has Compliance Requirements

**Sequence:** Audit Logging → Evidence Linking → Template Iteration

**Rationale:**

1. Audit Logging critical for regulatory audits
2. Evidence Linking strengthens compliance trail
3. Template Iteration improves adoption

**Timeline:** 4–5 days (1.5 + 1 + 1.5)

### Scenario C: Customer Asks for Customization

**Sequence:** Template Iteration → Evidence Linking → Audit Logging

**Rationale:**

1. Custom templates remove adoption friction
2. Evidence Linking enables compliance workflows
3. Audit Logging provides audit trail

**Timeline:** 4–5 days (1.5 + 1 + 1.5)

---

## Quick-Start Implementation Playbook

### Once Founder Approves Feature Choice:

**Phase 1: Preparation (2 hours)**

- [ ] Read this document's feature section completely
- [ ] Copy database schema into Supabase migrations folder
- [ ] Copy API endpoint skeletons into `app/api/`
- [ ] Copy React component templates into `app/components/`

**Phase 2: Implementation (6–8 hours)**

- [ ] Database: Create table, indexes, policies
- [ ] API: Implement endpoints, validation, error handling
- [ ] React: Build components, integrate with API
- [ ] Tests: Write 15–20 tests covering happy path + edge cases

**Phase 3: Integration (2–3 hours)**

- [ ] Wire components into existing pages
- [ ] Test full user flow end-to-end
- [ ] Manual testing in preview deployment
- [ ] Verify RLS policies work correctly

**Phase 4: Polish (1–2 hours)**

- [ ] Fix accessibility issues
- [ ] Add loading/error states
- [ ] Optimize queries (ensure indexes are used)
- [ ] Write user documentation

**Phase 5: Deploy (1 hour)**

- [ ] Run full test suite (verify no regressions)
- [ ] Create PR with comprehensive description
- [ ] Monitor production for 24 hours

**Total: 12–16 hours (1.5–2 days)**

---

## Decision Framework for Founder

**Ask yourself after first customer conversation:**

1. **Do they ask "Which evidence supports this obligation?"**
   → Choose **Evidence Linking**

2. **Do they ask "Who marked this complete?" or have audit requirements?**
   → Choose **Audit Logging**

3. **Do they heavily customize templates or ask for custom ones?**
   → Choose **Template Iteration**

4. **Do they have 100+ obligations and want to see trends?**
   → Choose **Advanced Analytics**

**If multiple signals:**

- High friction + adoption blocker → **Evidence Linking** (1 day, unlocks more features)
- Compliance requirement → **Audit Logging** (1.5 days, regulatory necessity)
- Otherwise → **Evidence Linking** (highest friction removal, fastest to value)

---

## Success Criteria for Phase 3

- ✅ Feature deployed to production
- ✅ All tests passing (no regressions)
- ✅ Customer using feature within 24 hours of deployment
- ✅ Customer provides feedback on UX within 48 hours
- ✅ Zero critical bugs; max 2 minor issues for follow-up sprint

---

**Status:** Ready for autonomous implementation. Awaiting Founder signal from first customer (ETA: 2026-07-17).
