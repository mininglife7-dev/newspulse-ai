# Database Schema Reference

**Type**: Reference  
**Audience**: Backend Engineers, Database Administrators  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Owner**: Governor Ω

---

## Quick Reference

Supabase PostgreSQL schema for EURO AI multi-tenant platform. All workspace-scoped tables enforce Row Level Security (RLS) to prevent cross-tenant data access.

**Database**: Supabase (EU-hosted PostgreSQL 14+)  
**Multi-tenancy**: RLS-based (workspace isolation)  
**Migrations**: Managed by Supabase CLI in `/supabase/migrations/`

---

## Core Tables

### workspaces

**Purpose**: Tenant root entity representing customer organizations

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Workspace identification
  name TEXT NOT NULL,
  description TEXT,

  -- Workspace configuration
  industry TEXT,  -- e.g., "finance", "healthcare", "tech"
  country TEXT,   -- e.g., "DE", "FR", "NL"

  -- Ownership
  owner_id UUID NOT NULL,  -- FK to auth.users

  -- Compliance & audit
  data_residency TEXT DEFAULT 'EU',  -- EU-only (required)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX idx_workspaces_owner_id ON workspaces(owner_id);
```

**RLS Policies**: None needed (owned by Supabase Auth)

**Access Pattern**:

```typescript
// List user's workspaces
const { data } = await supabase
  .from('workspaces')
  .select('*')
  .eq('owner_id', user.id);
```

### users (via Supabase Auth)

Supabase Auth manages the `auth.users` table. The application creates a user profile:

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### user_workspace_roles

**Purpose**: Maps users to workspaces with role-based access control

```sql
CREATE TABLE user_workspace_roles (
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  role TEXT NOT NULL,  -- owner | admin | analyst | viewer

  PRIMARY KEY (user_id, workspace_id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_workspace_roles_workspace_id
  ON user_workspace_roles(workspace_id);
```

**RLS Policies**: None (team management is admin-only)

**Role Definitions**:

- **Owner**: Full access, can invite/remove users, manage workspace
- **Admin**: Can manage systems, run assessments, create obligations
- **Analyst**: Can view and comment on assessments
- **Viewer**: Read-only access to dashboards

### ai_systems

**Purpose**: Inventory of AI systems under assessment

```sql
CREATE TABLE ai_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,

  -- System identification
  name TEXT NOT NULL,
  description TEXT,
  use_case TEXT,  -- e.g., "Recommendation engine", "Risk scoring"

  -- System metadata
  status TEXT DEFAULT 'active',  -- active | inactive | development
  data_types JSONB,  -- ["customer_data", "behavioral", "financial"]
  deployment_environment TEXT,  -- "cloud", "on-premise", "hybrid"

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_systems_workspace_id ON ai_systems(workspace_id);
CREATE INDEX idx_ai_systems_status ON ai_systems(workspace_id, status);
```

**RLS Policy**:

```sql
ALTER TABLE ai_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace isolation" ON ai_systems
  FOR SELECT
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "Workspace modification" ON ai_systems
  FOR INSERT WITH CHECK (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "Workspace update" ON ai_systems
  FOR UPDATE
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid)
  WITH CHECK (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "Workspace delete" ON ai_systems
  FOR DELETE
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);
```

### assessments

**Purpose**: Risk assessments for AI systems

```sql
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  system_id UUID NOT NULL,

  -- Assessment state
  status TEXT DEFAULT 'draft',  -- draft | in_progress | completed
  risk_level TEXT,  -- low | medium | high | critical

  -- Assessment data
  answers JSONB DEFAULT '{}',  -- Assessment responses

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (system_id) REFERENCES ai_systems(id) ON DELETE CASCADE
);

CREATE INDEX idx_assessments_workspace_id ON assessments(workspace_id);
CREATE INDEX idx_assessments_system_id ON assessments(system_id);
CREATE INDEX idx_assessments_status ON assessments(workspace_id, status);
```

**RLS Policy**:

```sql
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace isolation" ON assessments
  FOR SELECT
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "Workspace modification" ON assessments
  FOR INSERT WITH CHECK (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "Workspace update" ON assessments
  FOR UPDATE
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid)
  WITH CHECK (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);
```

### obligations

**Purpose**: Obligations (requirements) created from risk assessments

```sql
CREATE TABLE obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  assessment_id UUID NOT NULL,

  -- Obligation identification
  title TEXT NOT NULL,
  description TEXT,

  -- Obligation state
  status TEXT DEFAULT 'open',  -- open | in_progress | completed
  due_date DATE,

  -- EU AI Act reference
  category TEXT,  -- e.g., "risk_management", "transparency", "human_oversight"
  requirement_type TEXT,  -- e.g., "documentation", "process", "technical"

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

CREATE INDEX idx_obligations_workspace_id ON obligations(workspace_id);
CREATE INDEX idx_obligations_assessment_id ON obligations(assessment_id);
CREATE INDEX idx_obligations_status ON obligations(workspace_id, status);
```

**RLS Policy**:

```sql
ALTER TABLE obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace isolation" ON obligations
  FOR SELECT
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "Workspace modification" ON obligations
  FOR INSERT WITH CHECK (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "Workspace update" ON obligations
  FOR UPDATE
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid)
  WITH CHECK (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);
```

### evidence

**Purpose**: Evidence supporting compliance with obligations

```sql
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  obligation_id UUID NOT NULL,

  -- Evidence identification
  title TEXT NOT NULL,
  description TEXT,

  -- Evidence content
  file_url TEXT,  -- URL to evidence file (if stored)
  content TEXT,   -- Evidence content (if text)
  content_type TEXT,  -- "document", "procedure", "screenshot", "measurement"

  -- Evidence state
  status TEXT DEFAULT 'submitted',  -- submitted | approved | completed

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (obligation_id) REFERENCES obligations(id) ON DELETE CASCADE
);

CREATE INDEX idx_evidence_workspace_id ON evidence(workspace_id);
CREATE INDEX idx_evidence_obligation_id ON evidence(obligation_id);
CREATE INDEX idx_evidence_status ON evidence(workspace_id, status);
```

**RLS Policy**:

```sql
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace isolation" ON evidence
  FOR SELECT
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "Workspace modification" ON evidence
  FOR INSERT WITH CHECK (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "Workspace update" ON evidence
  FOR UPDATE
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid)
  WITH CHECK (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);

CREATE POLICY "Workspace delete" ON evidence
  FOR DELETE
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);
```

---

## Data Relationships

```
workspaces (1)
  ├─ (N) ai_systems
  │   └─ (N) assessments
  │       ├─ (N) obligations
  │       │   └─ (N) evidence
  │       └─ (generated risk_level)
  │
  ├─ (N) user_workspace_roles
  │   └─ (1) users
  │
  └─ (N) obligations (created from assessments)
      └─ (N) evidence
```

---

## Common Access Patterns

### Get all systems for a workspace

```typescript
const { data: systems } = await supabase
  .from('ai_systems')
  .select('*')
  .eq('workspace_id', workspaceId)
  .eq('status', 'active');
```

### Get assessments for a system

```typescript
const { data: assessments } = await supabase
  .from('assessments')
  .select('*, obligations(*), evidence(*)')
  .eq('system_id', systemId)
  .order('created_at', { ascending: false });
```

### Get obligations with evidence

```typescript
const { data: obligations } = await supabase
  .from('obligations')
  .select('*, evidence(*)')
  .eq('workspace_id', workspaceId)
  .eq('status', 'open')
  .order('due_date');
```

### Get evidence for obligation

```typescript
const { data: evidence } = await supabase
  .from('evidence')
  .select('*')
  .eq('obligation_id', obligationId)
  .order('created_at', { ascending: false });
```

---

## RLS Enforcement

### How RLS Works

```
User in Workspace A tries to query Workspace B data:

1. SELECT * FROM ai_systems WHERE id = 'sys-from-workspace-b'
2. RLS Policy applied: workspace_id = (auth.jwt() ->> 'workspace_id')
3. Check: does sys-from-workspace-b have workspace_id = 'workspace-a'?
   → No. RLS policy blocks access.
4. Result: 0 rows returned (access denied)
```

### Verifying RLS

```sql
-- Enable RLS on table
ALTER TABLE ai_systems ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'ai_systems';
-- Output: ai_systems | true

-- View all RLS policies
SELECT tablename, policyname, qual
FROM pg_policies
WHERE tablename = 'ai_systems';
```

### Testing RLS

```sql
-- Set JWT context for workspace A
SELECT set_config('request.jwt.claims', '{"workspace_id": "ws-a"}', false);

-- Try to access workspace B data
SELECT * FROM ai_systems WHERE workspace_id = 'ws-b';
-- Result: 0 rows (RLS blocked)

-- Access workspace A data
SELECT * FROM ai_systems WHERE workspace_id = 'ws-a';
-- Result: rows visible
```

---

## Indexes

**Critical Indexes** (for RLS enforcement and common queries):

| Table                | Index         | Purpose                          |
| -------------------- | ------------- | -------------------------------- |
| ai_systems           | workspace_id  | RLS filtering                    |
| assessments          | workspace_id  | RLS filtering                    |
| assessments          | system_id     | Find assessments for system      |
| obligations          | workspace_id  | RLS filtering                    |
| obligations          | assessment_id | Find obligations from assessment |
| evidence             | workspace_id  | RLS filtering                    |
| evidence             | obligation_id | Find evidence for obligation     |
| user_workspace_roles | workspace_id  | Find users in workspace          |

**Performance Indexes** (for common filters):

| Table       | Index                  | Purpose                      |
| ----------- | ---------------------- | ---------------------------- |
| ai_systems  | (workspace_id, status) | List active systems          |
| assessments | (workspace_id, status) | List in-progress assessments |
| obligations | (workspace_id, status) | List open obligations        |
| evidence    | (workspace_id, status) | List submitted evidence      |

---

## Migrations

All schema changes are managed via migrations in `/supabase/migrations/`

**Creating a migration**:

```bash
npx supabase migration new add_column_to_evidence
```

This creates: `supabase/migrations/[timestamp]_add_column_to_evidence.sql`

**Best practices**:

- One logical change per migration file
- Include comments explaining WHY
- Test locally before deployment
- Never use DROP CASCADE
- Always include RLS policies for new tables

**Deploying migrations**:

```bash
# Test locally
npx supabase db reset

# Verify schema changed
npx supabase db pull

# Deploy to production (runs automatically during Vercel deployment)
git push origin main
```

---

## Data Integrity

### Foreign Key Constraints

All foreign keys have `ON DELETE CASCADE` to maintain referential integrity:

- Deleting workspace → deletes systems, assessments, obligations, evidence
- Deleting assessment → deletes obligations, evidence
- Deleting user → deletes workspace roles

**Verify constraints**:

```sql
SELECT constraint_name, table_name, column_name, foreign_table_name
FROM information_schema.key_column_usage
WHERE table_schema = 'public' AND foreign_table_name IS NOT NULL;
```

### Orphaned Records Check

Verify no orphaned records exist:

```sql
-- Check for evidence without obligation
SELECT COUNT(*) FROM evidence
WHERE obligation_id IS NOT NULL
AND obligation_id NOT IN (SELECT id FROM obligations);
-- Should return: 0

-- Check for obligations without assessment
SELECT COUNT(*) FROM obligations
WHERE assessment_id NOT IN (SELECT id FROM assessments);
-- Should return: 0
```

---

## Storage Considerations

### Current Storage Usage

```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Growth Projections

Based on usage patterns:

- **Evidence table**: Grows with ~10-100 records per obligation
- **Assessments table**: Grows with ~1-5 per system per year
- **Obligations table**: Grows with ~5-50 per assessment

For 100 customers with 50 systems each: ~250K records (manageable)

### Archive Strategy

For long-term retention:

1. Assessments >1 year old → archive to separate table
2. Evidence >2 years old → archive or delete
3. Completed obligations → keep (audit requirement)

---

## Backup & Recovery

**Automatic Backups**: Supabase retains 7-day daily backups + 4-week weekly backups

**Restore Procedures**: See `docs/operations/RUNBOOKS/DATABASE_OPERATIONS.md`

**Point-in-Time Recovery**: Available up to 30 days in the past

---

## Related Documents

- `ARCHITECTURE.md` — System design and data flow
- `API_REFERENCE.md` — How to query this schema via API
- `docs/operations/RUNBOOKS/DATABASE_OPERATIONS.md` — Database operational procedures
- `docs/operations/PROCEDURES/VERIFICATION_STEPS.md` — Data integrity verification

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.3)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.3 (Engineering Knowledge)
