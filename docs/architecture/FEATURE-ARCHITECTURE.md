# EURO AI Feature Architecture

**Purpose:** Design patterns and architectural decisions for core features.  
**Status:** Foundation document for Q3 feature sprints  
**Last updated:** 2026-07-10 (Governor bootstrap)

---

## Feature Roadmap (Planned)

### Phase 1: Governance Platform (Current)
- ✅ Authentication + workspace setup
- ✅ Dashboard landing
- 🔄 AI System Inventory (in progress)
- 🔄 Risk Assessment Questionnaire (planned)

### Phase 2: Compliance (Q3)
- Evidence collection + annotation
- Compliance reporting
- Audit trail

### Phase 3: Revenue (Q4)
- Billing/subscription
- Premium features
- Organization hierarchy

---

## Core Architectural Patterns

### 1. Authentication & Authorization

**Pattern:** Supabase session management + Row Level Security (RLS)

```typescript
// Middleware: All requests validated for session
middleware.ts
  ↓
  validateSession() → JWT refresh if needed
  ↓
  Request proceeds with session context

// API routes: Protected by RLS policies
POST /api/workspace
  ↓
  supabase.from('workspace_members').insert()
  ↓
  RLS: INSERT allowed only if user owns workspace
```

**RLS Policies (in schema.sql):**
- `workspace_members`: Users can only access their own workspaces
- `companies`: Users can only access companies in their workspaces
- `profiles`: Users can only read/update their own profile

**Key decision:** No application-level authorization checks; all enforcement at DB layer. This makes bugs visible (query returns 0 rows = RLS rejection, not silent failure).

---

### 2. Workspace-Scoped Data Model

**Pattern:** All user data belongs to a workspace. Users have roles (owner, member, viewer).

```sql
-- Core tables
workspaces (id, name, created_by, created_at)
workspace_members (workspace_id, user_id, role: owner|member|viewer)
companies (id, workspace_id, name, ...)
ai_systems (id, workspace_id, company_id, name, ...)
governance_records (id, workspace_id, ai_system_id, ...)

-- Access path
user → workspace_members → workspace_id → all data scoped by workspace_id
```

**API design consequence:** All endpoints must validate user has access to requested workspace.

```typescript
async function getWorkspace(workspaceId: string, userId: string) {
  // Check: does user belong to this workspace?
  const membership = await supabase
    .from('workspace_members')
    .select('role')
    .match({ workspace_id: workspaceId, user_id: userId })
    .single()
  
  if (!membership) throw new Error('Forbidden')
  return membership.role
}
```

---

### 3. AI System Inventory Feature

**Domain:** Users register all AI systems their organization uses (internal + external).

**Data model:**
```sql
ai_systems {
  id: uuid
  workspace_id: uuid (RLS scoping)
  company_id: uuid (which company owns this system)
  name: string (e.g., "Customer Support ChatBot")
  vendor: string (e.g., "OpenAI" | "In-house")
  description: text
  purpose: text (e.g., "Handle tier-1 support tickets")
  created_at, updated_at
}

ai_system_tags {
  id: uuid
  ai_system_id: uuid
  tag: enum['nlp', 'cv', 'recommendation', 'automated-decision', 'biometric', ...]
}
```

**User flows:**

1. **Add system** → `/workspace/[id]/inventory/add`
   ```
   → Form: name, vendor, description, purpose, tags
   → POST /api/ai-systems { workspace_id, company_id, ... }
   → Supabase RLS enforces user owns workspace
   → Redirect to inventory list
   ```

2. **Edit system** → `/workspace/[id]/inventory/[system-id]/edit`
   ```
   → GET /api/ai-systems/[id] (fetch for form)
   → POST /api/ai-systems/[id] (update)
   → RLS + ownership validation on both
   ```

3. **View inventory** → `/workspace/[id]/inventory`
   ```
   → GET /api/ai-systems?workspace_id=X
   → RLS returns only systems in user's workspace
   ```

**Error handling (honest):**
- If system not found: 404 (not "access denied" to avoid leaking workspace IDs)
- If user not in workspace: 401 (auth required)
- If validation fails: 400 with field-level errors

---

### 4. Risk Assessment Questionnaire

**Domain:** Interactive form to assess compliance risk for each AI system.

**Pattern:** Multi-step wizard with conditional branches.

**Data model:**
```sql
governance_assessments {
  id: uuid
  workspace_id: uuid
  ai_system_id: uuid
  assessment_type: enum['eu-ai-act', 'iso-42001', 'custom']
  status: enum['draft', 'completed']
  responses: jsonb  -- {question_id: answer_value, ...}
  created_at, updated_at
}

assessment_questions {
  id: uuid
  assessment_type: enum
  question_text: string
  question_type: enum['yes-no', 'multiple-choice', 'text', 'scale-1-5']
  condition: jsonb (optional; if previous_question = X, show this one)
  scoring: jsonb (optional; how to score this question)
}
```

**API design:**

```typescript
// Start assessment
POST /api/assessments {
  workspace_id, ai_system_id, assessment_type
}
→ Returns: assessment_id + first question(s)

// Submit responses
POST /api/assessments/[id]/responses {
  question_id, answer
}
→ Evaluates conditions
→ Returns: next question(s) or completion summary

// Get assessment summary
GET /api/assessments/[id]
→ Returns: current status, completed questions, risk score
```

---

### 5. Evidence Collection

**Domain:** Users upload documents, annotations, compliance evidence.

**Data model:**
```sql
evidence_items {
  id: uuid
  workspace_id: uuid
  assessment_id: uuid
  type: enum['document', 'url', 'policy-number', 'audit-report']
  title: string
  url: string (for uploaded files, points to Supabase Storage)
  notes: text
  created_at
}

evidence_annotations {
  id: uuid
  evidence_item_id: uuid
  page_number: int (optional; for PDFs)
  annotation_text: text
  created_by: uuid (user)
  created_at
}
```

**API design:**

```typescript
// Upload evidence
POST /api/evidence/upload {
  workspace_id, assessment_id, type, title, file
}
→ Supabase Storage: save to /workspaces/{id}/evidence/{uuid}
→ Create evidence_items DB record with signed URL

// Add annotation
POST /api/evidence/[id]/annotate {
  annotation_text, page_number
}
→ Create annotation in DB
```

**Security consideration:** All evidence items are RLS-scoped by workspace_id. Signed URLs expire after 1 week; refresh on access.

---

### 6. Compliance Reporting

**Domain:** Generate reports showing assessment progress, risk profile, missing evidence.

**Data model:**
```sql
compliance_reports {
  id: uuid
  workspace_id: uuid
  generated_at: timestamp
  period_start, period_end: date
  summary: jsonb {
    total_ai_systems: int
    assessments_completed: int
    risk_score: 0-100
    missing_evidence: int
  }
  details: jsonb (per-system breakdown)
}
```

**Report generation (stateless, computed on-demand):**

```typescript
GET /api/reports/compliance?workspace_id=X
→ Aggregate ai_systems (count)
→ Count governance_assessments where status = 'completed'
→ Calculate risk_score from assessment responses
→ Count missing evidence for each system
→ Return JSON or HTML (for PDF export via third-party service)
```

---

## Error Handling Strategy

**Principle:** Honest errors. No silent failures, no fabricated success.

```typescript
// ✅ Good: specific errors
if (!membership) throw { code: 'FORBIDDEN', message: 'No access to this workspace' }
if (!assessment) throw { code: 'NOT_FOUND', message: 'Assessment not found' }
if (validation.fails) throw { code: 'VALIDATION_ERROR', details: [...] }

// ❌ Bad: silent failures
if (!membership) return null  // Caller can't tell if it's "not found" vs "forbidden"
if (!assessment) return {}    // Empty object looks like success
```

**API response format:**

```json
{
  "ok": true,
  "data": {...} OR "error": {...}
}

{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [
      { "field": "name", "message": "Required" }
    ]
  }
}
```

---

## Database Schema: Version Control

**Pattern:** Schema lives in `supabase/schema.sql`; migrations tracked as comments.

```sql
-- Migration 2026-07-10: EURO AI integration
-- ✅ workspace, workspace_members, companies
-- ✅ ai_systems, ai_system_tags
-- ✅ RLS policies for all tables
-- ✅ E2E test: workspace setup → invite member → create AI system

-- Migration 2026-08-01: Assessments (planned)
-- - governance_assessments, assessment_questions
-- - RLS policies
-- - E2E test: start assessment → answer questions → view summary
```

---

## Performance Considerations

### N+1 Query Prevention

**Problem:** Fetching 100 AI systems, then for each, fetching tags = 101 queries.

**Solution:** Use Supabase `select()` with joins:

```typescript
// Bad: N+1
const systems = await supabase.from('ai_systems').select()
for (const sys of systems) {
  sys.tags = await supabase.from('ai_system_tags').select().eq('ai_system_id', sys.id)
}

// Good: Single query with join
const systems = await supabase.from('ai_systems').select(`
  *, 
  ai_system_tags (tag)
`)
```

### Pagination

All list endpoints support `?page=1&limit=50`:

```typescript
const query = supabase.from('ai_systems')
  .select()
  .eq('workspace_id', workspaceId)
  .range((page - 1) * limit, page * limit - 1)
```

---

## Testing Strategy

### Unit Tests
- Workspace authorization logic
- Assessment scoring algorithms
- Validation rules

### Integration Tests
- Workspace setup flow (create workspace → add member → create AI system)
- Assessment completion flow (start → answer questions → get report)
- Evidence upload + annotation

### E2E Tests (Chromium browser)
- Full customer onboarding: sign-up → verify email → create workspace → dashboard
- Create AI system → start assessment → upload evidence → view report

---

## Internationalization (i18n)

**Current:** English only (to launch fast)  
**Next phase:** German + English (for German customer)

**Approach:**
- UI strings in `/i18n/locales/[lang].json`
- Next.js middleware: detect language from URL slug or Accept-Language header
- Date/time: use Intl.DateTimeFormat for locale-aware formatting

```typescript
// Future structure
/i18n
  /locales
    en.json (e.g., { "workspace.create": "Create workspace", ... })
    de.json (e.g., { "workspace.create": "Arbeitsbereich erstellen", ... })
  i18n.ts (exports useTranslation hook)
```

---

## Next Steps

1. **Phase 1 (This sprint):** Implement AI System Inventory + Risk Assessment
2. **Phase 2 (Next sprint):** Evidence collection + Compliance Reporting
3. **Phase 3 (Q4):** Billing integration + Premium features
4. **Ongoing:** DNA evolution (dependency health, cost monitoring, deployment verification)

---

**Owner:** Governor (Chief Engineering Officer)  
**Last reviewed:** 2026-07-10  
**Next review:** After Phase 1 implementation (2026-07-24)
