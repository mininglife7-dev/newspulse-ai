# Phase 3 Implementation Templates

**Purpose:** Ready-to-use boilerplate code to accelerate Phase 3 implementation

**Status:** Ready to use once Phase 3 candidate is chosen (2026-07-17)

**Expected speedup:** 1-2 days (30-40% faster implementation)

---

## Quick Start

1. **Read:** `PHASE-3-IMPLEMENTATION-BOILERPLATE.md` (comprehensive guide)
2. **Choose:** One of the 4 Phase 3 candidates (decided 2026-07-17)
3. **Copy:** Templates from subdirectories
4. **Customize:** Replace placeholders with your feature details
5. **Implement:** Follow the template structure for all layers

---

## Template Files

### Database Layer

- `database/migration.sql.template` — Create tables with RLS policies and indexes

**Usage:**
```bash
# Copy template
cp templates/database/migration.sql.template supabase/migrations/2026_07_18_phase_3_[candidate].sql

# Edit file and replace placeholders
nano supabase/migrations/2026_07_18_phase_3_[candidate].sql

# Run migration
supabase migration up
```

### API Layer

- `api/route.ts.template` — REST API endpoint (POST for create, GET for list)

**Usage:**
```bash
# Copy template
mkdir -p app/api/[feature]
cp templates/api/route.ts.template app/api/[feature]/route.ts

# Edit and customize
nano app/api/[feature]/route.ts

# Test
npm run dev
# Visit: http://localhost:3000/api/[feature]
```

### Component Layer

- `components/FormComponent.tsx.template` — React form for creating items

**Usage:**
```bash
# Copy template
mkdir -p app/[feature]/components
cp templates/components/FormComponent.tsx.template app/[feature]/components/CreateForm.tsx

# Edit and customize
nano app/[feature]/components/CreateForm.tsx

# Test in dev server
npm run dev
```

### Test Layer

- `tests/api.test.ts.template` — API endpoint tests

**Usage:**
```bash
# Copy template
mkdir -p tests/api
cp templates/tests/api.test.ts.template tests/api/[feature].test.ts

# Edit and customize
nano tests/api/[feature].test.ts

# Run tests
npm test
```

---

## Customization Checklist

For each template, fill in these placeholders:

```
[feature]       → Your feature route name (e.g., evidence-files, audit-logs)
[table]         → Your database table name (e.g., evidence_files, audit_logs)
[Table]         → CamelCase table name (e.g., EvidenceFile, AuditLog)
[CANDIDATE]     → Your Phase 3 candidate (e.g., EVIDENCE_LINKING, AUDIT_LOGGING)
[DATE]          → Today's date (e.g., 2026_07_18)
```

**Example for Evidence-Obligation Linking:**

```bash
# Database
[table] → evidence_files
[TABLE_NAME] → evidence_files
[CANDIDATE] → EVIDENCE_LINKING

# API
[feature] → evidence-files
[table] → evidence_files

# Components
[feature] → evidence-files

# Tests
[feature] → evidence-files
```

---

## Template Structure

### 1. Database Migration Template

**What it does:**
- Creates table with fields from your architecture
- Adds indexes for common queries
- Enables RLS (Row-Level Security)
- Defines workspace isolation policies

**Customize:**
- Table name and fields (from PHASE-3-ARCHITECTURE-OPTIONS.md)
- Foreign key relationships
- RLS policies for your use case

**Test:**
- `SELECT * FROM [table]` should return data
- `INSERT` should enforce workspace membership
- `DELETE` should enforce ownership

### 2. API Route Template

**What it does:**
- POST endpoint for creating records
- GET endpoint for listing records
- Validates request data with Zod
- Enforces authentication and authorization
- Returns consistent JSON responses

**Customize:**
- Request schema (add/remove fields)
- Error messages
- Additional endpoints (PUT, DELETE, etc.)
- Business logic

**Test:**
- Create with valid data → 201 Created
- Create with invalid data → 400 Bad Request
- List without auth → 401 Unauthorized
- List from different workspace → 403 Forbidden

### 3. Component Template

**What it does:**
- React form for creating records
- Client-side validation
- API integration via fetch
- Error handling and loading states
- Success callbacks

**Customize:**
- Form fields (add/remove based on schema)
- API endpoint URL
- Success behavior (redirect, refresh, etc.)
- Styling (Tailwind CSS)

**Test:**
- Fill form and submit → Record created
- Submit with missing required field → Error shown
- Submit while loading → Button disabled
- Navigate after creation → Redirects correctly

### 4. Test Template

**What it does:**
- Unit tests for API endpoints
- Integration tests for full workflows
- Error scenario coverage
- Mock data setup

**Customize:**
- Test cases specific to your feature
- Mock data for your table schema
- Error conditions to test
- User scenarios

**Test:**
- `npm test` should pass all tests
- Coverage > 80% for new code

---

## Implementation Timeline

Using these templates, Phase 3 can be implemented in 6-8 days (vs. 7-10 without):

| Day | Task | Using Templates | Without Templates |
|-----|------|-----------------|-------------------|
| 1 | Database layer | 2 hours | 4 hours |
| 2 | API layer | 3 hours | 5 hours |
| 3 | Frontend layer | 4 hours | 6 hours |
| 4-5 | Testing | 6 hours | 8 hours |
| 6 | Documentation | 2 hours | 3 hours |
| 7-8 | Deployment prep | 3 hours | 4 hours |

**Total with templates:** ~22 hours (3 days intensive)  
**Total without templates:** ~33 hours (5 days intensive)

**Estimated savings:** 1-2 days of development time

---

## Full Workflow Example

### Scenario: Implementing Audit Logging (Phase 3 candidate chosen)

#### Step 1: Create Database Migration

```bash
# Copy template
cp templates/database/migration.sql.template supabase/migrations/2026_07_18_audit_logging.sql

# Edit the file
# Replace [TABLE_NAME] with 'audit_logs'
# Add fields: action TEXT, entity_type TEXT, changes JSONB
# Create indexes on (workspace_id, created_at), (entity_type)

# Run migration
supabase migration up

# Verify in Supabase dashboard
```

#### Step 2: Create API Route

```bash
# Copy template
mkdir -p app/api/audit-logs
cp templates/api/route.ts.template app/api/audit-logs/route.ts

# Customize
# Replace [feature] with 'audit-logs'
# Replace [table] with 'audit_logs'
# Add fields to CreateRequestSchema: action, entity_type, changes

# Test manually
npm run dev
curl -X POST http://localhost:3000/api/audit-logs \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "...","name": "Test", ...}'
```

#### Step 3: Create Frontend Component

```bash
# Copy template
mkdir -p app/audit-logs/components
cp templates/components/FormComponent.tsx.template app/audit-logs/components/CreateForm.tsx

# Customize
# Update form fields to match audit log schema
# Update API endpoint to /api/audit-logs

# Create list component
cp templates/components/FormComponent.tsx.template app/audit-logs/components/AuditLogList.tsx
# Modify to show list instead of form
```

#### Step 4: Write Tests

```bash
# Copy template
mkdir -p tests/api
cp templates/tests/api.test.ts.template tests/api/audit-logs.test.ts

# Customize
# Add tests for audit log specific logic
# Mock audit_logs table

# Run tests
npm test tests/api/audit-logs.test.ts
```

#### Step 5: Build Main Page

```typescript
// app/audit-logs/page.tsx
import { CreateForm } from './components/CreateForm';
import { AuditLogList } from './components/AuditLogList';

export default function AuditLogsPage() {
  const workspaceId = 'workspace-123'; // Get from session

  return (
    <div className="space-y-6">
      <h1>Audit Logs</h1>
      <CreateForm workspaceId={workspaceId} />
      <AuditLogList workspaceId={workspaceId} />
    </div>
  );
}
```

#### Step 6: Test & Deploy

```bash
# Run all tests
npm run type-check && npm run lint && npm test

# Build
npm run build

# Deploy to Vercel
git add .
git commit -m "feat(phase-3): Audit Logging implementation"
git push origin main
# Vercel auto-deploys
```

**Total time: ~2-3 days** (using templates)

---

## Tips for Success

### Database Design

- Always index `workspace_id` (filter by workspace)
- Always index `created_by_id` (track who made changes)
- Always index `created_at` (sort by date)
- Use composite indexes for common WHERE + ORDER BY
- Enable RLS from the start (don't add it later)

### API Development

- Use Zod for request validation (type-safe)
- Return consistent JSON shapes
- Use proper HTTP status codes (201 for create, 400 for validation error, 403 for unauthorized)
- Log errors but don't expose internals to client
- Test both success and error paths

### Component Development

- Use React hooks for state management
- Implement optimistic updates (show success before API response)
- Show loading states (disable buttons, spinners)
- Show error messages clearly
- Handle network failures gracefully

### Testing

- Test database queries directly (SQL)
- Test API endpoints with mocked database
- Test React components with Vitest + React Testing Library
- Test user workflows with Playwright (E2E)
- Aim for > 80% code coverage

---

## Common Mistakes to Avoid

1. ❌ Forgetting RLS policies → Data leaks between workspaces
2. ❌ Not validating request data → SQL injection risks
3. ❌ Hardcoding workspace IDs → Data isolation breaks
4. ❌ Missing error handling → User-facing error messages confusing
5. ❌ Not testing → Bugs appear in production
6. ❌ Large file copies without customization → Templates left as-is with placeholders

---

## Getting Help

- **Database questions:** See `PHASE-3-ARCHITECTURE-OPTIONS.md` for your candidate's schema
- **API patterns:** See `app/api/` for existing route examples
- **Component patterns:** See `app/dashboard/components/` for existing components
- **Test patterns:** See `tests/` for existing test examples
- **Tailwind styling:** See existing components for style patterns

---

**Status:** Ready to use  
**Last Updated:** 2026-07-10  
**Maintained By:** Governor  
**Expected Use Date:** 2026-07-18 (after Phase 3 decision)
