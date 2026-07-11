# Phase 3 Quick Start Implementation Guide

**Purpose:** After Phase 3 candidate is chosen (2026-07-17), this guide enables zero-delay sprint start on 2026-07-18 with exact commands, file paths, and decisions pre-made.

**Timeline:** 7-10 days to production deployment (using templates saves 1-2 days)

**Owner:** Governor

**Trigger:** Immediately after 2026-07-17 Phase 3 decision

---

## Pre-Implementation Checklist (Before Sprint Starts)

### Team Readiness (30 minutes)

- [ ] **Team briefing completed**
  ```
  Participants: Full engineering team
  Duration: 30 minutes
  Topics:
    1. Phase 3 candidate chosen (Evidence/Audit/Analytics/Templates)
    2. Architecture overview (from PHASE-3-ARCHITECTURE-OPTIONS.md)
    3. Timeline: 7-10 days to production
    4. Success criteria: 20%+ adoption, <1% error rate, <5s p99 latency
    5. Deploy day: [Date ~2026-07-25]
  ```

- [ ] **Branch setup confirmed**
  ```bash
  # Verify feature branch exists and is up-to-date
  git branch -a | grep phase-3
  git fetch origin
  git checkout -b phase-3-[candidate] origin/main
  # Example: git checkout -b phase-3-audit-logging origin/main
  ```

- [ ] **Environment validated**
  ```bash
  # Verify all critical env vars are set
  npm run scripts/check-env.mjs
  
  # Expected output:
  # ✓ SUPABASE_URL
  # ✓ SUPABASE_ANON_KEY
  # ✓ GITHUB_TOKEN
  # ✓ VERCEL_TOKEN
  ```

- [ ] **Dependencies installed**
  ```bash
  npm install
  npm run type-check  # Should pass with 0 errors
  npm run lint        # Should pass with 0 errors
  npm run build       # Should complete successfully
  ```

### Infrastructure Validation (15 minutes)

- [ ] **Supabase accessible**
  ```bash
  # Test Supabase connection
  npm run supabase:status
  
  # Expected: Connected to project [project-name]
  ```

- [ ] **Vercel deployment pipeline active**
  ```bash
  # Verify Vercel can access repo
  git push -u origin phase-3-[candidate]
  # Watch: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai
  # Expected: Preview deployment starts within 1 minute
  ```

- [ ] **CI/CD working**
  ```bash
  # Push small commit to verify CI
  echo "# Phase 3 Sprint" >> README.md
  git add README.md
  git commit -m "docs: Phase 3 sprint start"
  git push origin phase-3-[candidate]
  
  # Watch GitHub Actions: https://github.com/mininglife7-dev/newspulse-ai/actions
  # Expected: Lint & Build, E2E smoke tests pass (green ✓)
  # If failed: Investigate and fix before sprint
  ```

- [ ] **Slack/communication channel ready**
  ```
  Channel: #phase-3-sprint
  Daily standups: 09:00 UTC
  Deployment day communication plan: Documented
  ```

---

## Phase 3 Candidate Quick Ref

| Candidate | Est. Days | Key Tasks | Files to Create |
|-----------|-----------|-----------|-----------------|
| **Evidence-Obligation Linking** | 4-5 | File upload + linking UI + storage setup | 12 files |
| **Audit Logging** | 3-4 ⭐ | Log table + API endpoints + log viewer UI | 8 files |
| **Advanced Analytics** | 5-6 | Aggregates + chart components + trend queries | 10 files |
| **Template Iteration** | 5-6 | Template CRUD + industry categories + browser UI | 10 files |

**Chosen candidate:** [SELECT ONE AT 2026-07-17 DECISION]

---

## Day-by-Day Implementation Sprint

### Day 1: Database Layer (2-3 hours)

#### 1.1 Copy & Customize Database Migration

```bash
# Step 1: Create migration file
cp templates/database/migration.sql.template \
   supabase/migrations/2026_07_18_phase_3_[candidate].sql

# Step 2: Edit migration file
nano supabase/migrations/2026_07_18_phase_3_[candidate].sql
```

**Customization checklist:**
- [ ] Replace `[TABLE_NAME]` with actual table name
- [ ] Replace `[table]` with snake_case name
- [ ] Update field list based on architecture (see PHASE-3-ARCHITECTURE-OPTIONS.md)
- [ ] Verify indexes are correct (always index: workspace_id, created_at, created_by_id)
- [ ] Verify RLS policies are complete (SELECT, INSERT, UPDATE, DELETE)
- [ ] Check foreign key constraints

**Example for Audit Logging:**
```sql
-- Candidate: Audit Logging
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  action TEXT NOT NULL,  -- e.g., "created", "updated", "deleted"
  entity_type TEXT NOT NULL,  -- e.g., "obligation", "assessment"
  entity_id UUID NOT NULL,  -- ID of the entity being acted upon
  changes JSONB,  -- What changed (before/after)
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT valid_action CHECK (action IN ('created', 'updated', 'deleted', 'viewed'))
);

CREATE INDEX idx_audit_logs_workspace_created 
  ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity 
  ON audit_logs(entity_type, entity_id, workspace_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see audit logs for their workspace"
  ON audit_logs FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
```

#### 1.2 Deploy Migration

```bash
# Step 3: Run migration locally for testing
supabase migration up

# Expected output:
# Applying migration 2026_07_18_phase_3_[candidate].sql
# Migration completed successfully

# Step 4: Verify schema in Supabase dashboard
# Go to: https://supabase.com/dashboard → SQL Editor
# Run: SELECT table_name FROM information_schema.tables 
#      WHERE table_schema = 'public' AND table_name = '[table]'
# Expected: Your table name appears in results

# Step 5: Commit migration
git add supabase/migrations/2026_07_18_phase_3_[candidate].sql
git commit -m "db(phase-3): Add [table] table with RLS policies and indexes"
git push origin phase-3-[candidate]
```

#### 1.3 Verify Database Layer

```bash
# Test table creation
supabase migration test

# Test RLS policies
# (Full test queries provided in PHASE-3-ARCHITECTURE-OPTIONS.md)

# Check indexes exist
npm run supabase:shell
# In Supabase SQL Editor:
# SELECT indexname FROM pg_indexes WHERE tablename = '[table]';
```

**Day 1 Deliverable:** ✅ Database table created with RLS policies and indexes

---

### Day 2: API Layer (3-4 hours)

#### 2.1 Copy & Customize API Routes

```bash
# Step 1: Create API directory
mkdir -p app/api/[feature]

# Step 2: Copy template
cp templates/api/route.ts.template app/api/[feature]/route.ts

# Step 3: Edit route file
nano app/api/[feature]/route.ts
```

**Customization checklist:**
- [ ] Replace `[feature]` with route name (e.g., `audit-logs`)
- [ ] Replace `[table]` with table name
- [ ] Update request schema fields (Zod validation)
- [ ] Update response schema
- [ ] Add business logic for your feature
- [ ] Verify error messages are generic (don't leak data)
- [ ] Add any feature-specific validation

**Example for Audit Logging:**
```typescript
// app/api/audit-logs/route.ts
import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CreateRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  action: z.enum(['created', 'updated', 'deleted', 'viewed']),
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  changes: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Parse and validate request
    const body = await request.json();
    const validated = CreateRequestSchema.parse(body);
    
    // Verify workspace membership
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', validated.workspaceId)
      .eq('user_id', user.id)
      .single();
    
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    // Insert audit log
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        workspace_id: validated.workspaceId,
        action: validated.action,
        entity_type: validated.entityType,
        entity_id: validated.entityId,
        changes: validated.changes,
        user_id: user.id,
      })
      .select()
      .single();
    
    if (error) return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
    
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Verify workspace membership (RLS will enforce, but check early)
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();
    
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
    // List audit logs (RLS policies enforce workspace isolation)
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### 2.2 Test API Endpoints

```bash
# Step 4: Run dev server
npm run dev

# Expected output:
# ▲ Next.js 14.0.0
# - ready started server on 0.0.0.0:3000

# Step 5: Test in another terminal
curl -X GET http://localhost:3000/api/health
# Expected: { "ok": true, "timestamp": "..." }

# Step 6: Test your feature endpoint
curl -X POST http://localhost:3000/api/[feature] \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "test-workspace", ...}'

# Expected: 401 Unauthorized (no auth token) or 201 Created (if token valid)
```

#### 2.3 Verify API Layer

```bash
# Run unit tests (test template provided)
npm test tests/api/[feature].test.ts

# Expected: All tests pass (or TODO marked as pending)
```

**Day 2 Deliverable:** ✅ API routes created with validation, auth, error handling

---

### Day 3: Frontend Layer (4-5 hours)

#### 3.1 Copy & Customize Components

```bash
# Step 1: Create components directory
mkdir -p app/[feature]/components

# Step 2: Copy form component
cp templates/components/FormComponent.tsx.template \
   app/[feature]/components/CreateForm.tsx

# Step 3: Edit form component
nano app/[feature]/components/CreateForm.tsx
```

**Customization checklist:**
- [ ] Replace `[feature]` with route name
- [ ] Update form fields based on schema
- [ ] Update API endpoint URL
- [ ] Update success callback behavior
- [ ] Verify Tailwind styling matches existing components
- [ ] Add any feature-specific validation

**Example for Audit Logging:**
```typescript
// app/audit-logs/components/AuditLogList.tsx
'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, any> | null;
  created_at: string;
}

interface AuditLogListProps {
  workspaceId: string;
}

export function AuditLogList({ workspaceId }: AuditLogListProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`/api/audit-logs?workspaceId=${workspaceId}`);
        if (!response.ok) throw new Error('Failed to fetch logs');
        
        const data = await response.json();
        setLogs(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [workspaceId]);

  if (loading) {
    return <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Loading logs...</div>;
  }

  if (error) {
    return <div className="flex items-start gap-3 bg-red-50 p-3 text-red-700">
      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div>{error}</div>
    </div>;
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Audit Logs ({logs.length})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="border border-gray-200 p-2 text-left">Timestamp</th>
              <th className="border border-gray-200 p-2 text-left">Action</th>
              <th className="border border-gray-200 p-2 text-left">Entity</th>
              <th className="border border-gray-200 p-2 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 p-2">{new Date(log.created_at).toLocaleString()}</td>
                <td className="border border-gray-200 p-2"><span className="inline-block bg-blue-100 px-2 py-1 rounded text-xs">{log.action}</span></td>
                <td className="border border-gray-200 p-2">{log.entity_type}: {log.entity_id}</td>
                <td className="border border-gray-200 p-2">{log.changes && JSON.stringify(log.changes).slice(0, 50)}...</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

#### 3.2 Create Main Page

```bash
# Step 4: Create main page
cat > app/[feature]/page.tsx << 'EOF'
'use client';

import { useSession } from '@/lib/hooks/useSession';
import { CreateForm } from './components/CreateForm';
import { AuditLogList } from './components/AuditLogList';

export default function [Feature]Page() {
  const { workspace } = useSession();

  if (!workspace) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">[Feature]</h1>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold mb-4">Create</h2>
          <CreateForm workspaceId={workspace.id} />
        </div>
        
        <div>
          <AuditLogList workspaceId={workspace.id} />
        </div>
      </div>
    </div>
  );
}
EOF
```

#### 3.3 Test Frontend

```bash
# Step 5: Start dev server and test in browser
npm run dev

# Open: http://localhost:3000/[feature]
# Expected: Form renders, no errors in console
# Try: Fill form and submit
# Expected: Success message, item appears in list
```

**Day 3 Deliverable:** ✅ Frontend components created with forms, lists, error handling

---

### Days 4-5: Testing (6-8 hours)

#### 4.1 Write Unit Tests

```bash
# Copy test template
mkdir -p tests/api
cp templates/tests/api.test.ts.template tests/api/[feature].test.ts

# Edit test file
nano tests/api/[feature].test.ts
```

**Test checklist:**
- [ ] POST with valid data → 201
- [ ] POST with invalid data → 400
- [ ] POST unauthenticated → 401
- [ ] POST not in workspace → 403
- [ ] GET list → 200 with data
- [ ] GET missing workspace → 400
- [ ] GET unauthenticated → 401
- [ ] GET different workspace → 403

```bash
# Run tests
npm test

# Expected: All tests pass (or marked as TODO)
# Coverage: ≥ 80% for new code
```

#### 4.2 Run E2E Smoke Tests

```bash
# Run Playwright E2E tests
npm run test:e2e

# Expected: Golden path tests pass
# Test: Navigate to feature → Create item → See in list → Verify data integrity
```

#### 4.3 Manual Integration Testing

```
Checklist:
- [ ] Create record with valid data → appears in list
- [ ] Submit with missing required field → shows error
- [ ] Try duplicate (if applicable) → shows constraint error
- [ ] Edit record → updates list
- [ ] Delete record → removed from list
- [ ] Workspace isolation: Create in workspace A, switch to B, verify not visible
- [ ] RLS: Try accessing via API with wrong workspace ID → 403
```

**Days 4-5 Deliverable:** ✅ Unit tests, E2E tests, manual integration tests all pass

---

### Day 6: Documentation (2-3 hours)

#### 5.1 Write User Guide

```bash
cat > docs/features/[FEATURE].md << 'EOF'
# [Feature Name] Guide

## Overview
[Brief description of the feature and why it matters]

## Getting Started

### Create
1. Navigate to [Feature] page
2. Fill form with required fields
3. Click "Create"
4. See confirmation message

### View
1. [Feature] page shows list of all records
2. Click on record for details
3. View change history (if applicable)

## Use Cases

### Use Case 1: [Example]
[Step-by-step walkthrough]

### Use Case 2: [Example]
[Step-by-step walkthrough]

## Troubleshooting

**Q: Why doesn't my record appear?**
A: Check that you're in the correct workspace.

**Q: Can I see records from other workspaces?**
A: No, records are isolated per workspace for security.

## API Reference

### POST /api/[feature]
Create new record.

Request:
```json
{
  "workspaceId": "uuid",
  "field1": "value1",
  ...
}
```

Response (201):
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "field1": "value1",
    ...
  }
}
```

### GET /api/[feature]?workspaceId=uuid
List records for workspace.

Response (200):
```json
{
  "ok": true,
  "data": [...]
}
```
EOF
```

#### 5.2 Write Developer Docs

```bash
cat > docs/development/[FEATURE]-DEVELOPMENT.md << 'EOF'
# [Feature] Development Guide

## Architecture

### Database
- Table: `[table]`
- RLS: Workspace isolation enforced
- Indexes: workspace_id, created_at

### API Routes
- POST /api/[feature] — Create
- GET /api/[feature] — List

### Components
- CreateForm — Input form with validation
- [Feature]List — Table view with sorting

## Adding New Fields

1. Add field to migration SQL
2. Update Zod schema in API route
3. Update component form
4. Add test case

## Testing Changes

```bash
npm run type-check && npm run lint && npm test
npm run build
npm run test:e2e
```

## Deployment Checklist

- [ ] All tests pass
- [ ] No console errors
- [ ] Error messages generic (no data leakage)
- [ ] RLS policies tested
- [ ] Documentation updated
EOF
```

#### 5.3 Update README

```bash
# Add feature to main README.md under "Features"
# Example:
# - **[Feature Name]** — [Brief description]. Automatically [value proposition].
```

**Day 6 Deliverable:** ✅ User guide, developer docs, README updated

---

### Day 7: Deployment Preparation (2-3 hours)

#### 6.1 Final Verification

```bash
# Run complete test suite
npm run type-check
npm run lint
npm test
npm run test:e2e
npm run build

# Expected: All pass, no errors
```

#### 6.2 Commit & Push

```bash
# Review all changes
git status

# Stage all changes
git add .

# Create comprehensive commit
git commit -m "feat(phase-3): Implement [Feature]

Adds complete [Feature] functionality:
- Database table with RLS policies and indexes
- API endpoints (POST create, GET list) with auth & validation
- React components (form, list) with error handling
- Unit tests (80%+ coverage)
- E2E smoke tests
- User guide and developer documentation

Architecture: [Candidate name]
Database: [table name]
Routes: /api/[feature], /[feature]

Success criteria met:
✓ Type checking passes (0 errors)
✓ Linting passes (0 errors)
✓ Tests pass (X/X passing, >80% coverage)
✓ Build succeeds
✓ E2E tests pass
✓ RLS policies enforced
✓ Workspace isolation verified
✓ Error handling comprehensive
✓ Documentation complete

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YX1762TgcFVnS3143AJDC8"
```

#### 6.3 Push & Create PR

```bash
# Push to feature branch
git push origin phase-3-[candidate]

# Create PR (if not already exists)
# Should auto-deploy preview on Vercel
# Wait for: Lint & Build ✓, E2E smoke ✓

# Check status at:
# - https://github.com/mininglife7-dev/newspulse-ai/pulls
# - https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai
```

**Day 7 Deliverable:** ✅ All tests pass, PR created, preview deployed

---

### Days 8-10: Final Review & Deployment (3-4 hours)

#### 7.1 Merge to Main

```bash
# Verify all CI checks pass
# Verify no merge conflicts

# Merge PR
# GitHub → PR #[number] → Squash and merge

# Delete feature branch
git branch -d phase-3-[candidate]
```

#### 7.2 Production Deployment

```bash
# Vercel auto-deploys on merge to main
# Monitor at: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai

# Wait for: Deployment "Ready" status
# Expected deployment time: < 2 minutes
```

#### 7.3 Post-Deployment Verification

Follow **PHASE-3-DEPLOYMENT-VERIFICATION.md** checklist:

- [ ] Pre-deployment checks passed
- [ ] Vercel deployment succeeded
- [ ] Site loads without errors
- [ ] Feature page accessible
- [ ] Create workflow works (forms, validation, data saved)
- [ ] Read workflow works (list, sorting, filtering)
- [ ] Update/Delete workflows work (if implemented)
- [ ] Multi-tenant isolation enforced
- [ ] RLS policies verified
- [ ] API response times < 5s
- [ ] Page load time < 5s
- [ ] Error rate < 1% in first hour
- [ ] No security issues found
- [ ] Monitoring alerts active
- [ ] Founder + team notified
- [ ] Early adopter feedback collected

**Days 8-10 Deliverable:** ✅ Feature deployed to production, verified, monitoring active

---

## Emergency Procedures

### If Build Fails

```bash
# 1. Check error messages
npm run build

# 2. Fix type errors
npm run type-check

# 3. Fix lint errors
npm run lint -- --fix

# 4. Retry
npm run build
```

### If Tests Fail

```bash
# 1. Run failing test in isolation
npm test -- [test-name]

# 2. Debug with console.log or debugger
# 3. Fix the issue
# 4. Rerun tests
npm test

# 5. If still failing, investigate database/auth mocks
```

### If Deployment Fails

```bash
# 1. Check Vercel logs
# https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai → Logs

# 2. Common causes:
#    - Environment variables not set
#    - Build command timeout
#    - Supabase connection issue

# 3. Fix and re-push
git push origin phase-3-[candidate]

# 4. Vercel will auto-redeploy
```

### If Rollback Needed

```bash
# 1. On production issue:
git revert [commit-sha]
git push origin main

# 2. Monitor:
# https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai

# 3. Vercel auto-deploys previous version
```

---

## Success Criteria Verification

By end of Day 10, verify:

✅ **Feature complete**
- [ ] Database layer: Table created with RLS, indexes, migrations
- [ ] API layer: Endpoints working, auth enforced, validation present
- [ ] Frontend layer: Components rendering, forms submitting, lists displaying
- [ ] Testing: 80%+ coverage, unit + E2E tests passing

✅ **Quality gates**
- [ ] Type checking: 0 errors
- [ ] Linting: 0 errors
- [ ] Tests: 100% pass rate
- [ ] Build: Succeeds in < 2 min
- [ ] Deployment: Vercel preview + production

✅ **Security & performance**
- [ ] Auth: Only logged-in users can access
- [ ] Authorization: Workspace isolation enforced via RLS
- [ ] Input validation: All user inputs validated
- [ ] Error handling: No data leakage in errors
- [ ] Performance: API < 1s (target), < 5s (max)

✅ **Documentation**
- [ ] User guide: How to use the feature
- [ ] Developer guide: How to modify/extend
- [ ] Deployment notes: Any special setup needed
- [ ] README updated: Feature listed

✅ **Monitoring**
- [ ] Error tracking: Sentry/monitoring active
- [ ] Performance: Vercel Analytics tracking
- [ ] Alerts: Configured for > 5% error rate or > 10s latency
- [ ] Logs: Accessible and reviewed

---

## Links to Reference Docs

- **Architecture & Design:** `PHASE-3-ARCHITECTURE-OPTIONS.md`
- **Execution Checklist:** `PHASE-3-EXECUTION-CHECKLIST.md`
- **Deployment Verification:** `PHASE-3-DEPLOYMENT-VERIFICATION.md`
- **Implementation Boilerplate:** `PHASE-3-IMPLEMENTATION-BOILERPLATE.md`
- **Templates:** `templates/` directory (database, API, components, tests)

---

**Status:** Ready for Phase 3 sprint (2026-07-18)  
**Owner:** Governor  
**Updated:** 2026-07-11  
**Use After:** 2026-07-17 Phase 3 decision made
