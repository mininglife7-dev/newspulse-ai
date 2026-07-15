# Database Schema Architecture

**Purpose:** Comprehensive reference for database structure, data relationships, security model, and design rationale  
**Audience:** Founder, developers, security auditors  
**Version:** 1.0  
**Last Updated:** 2026-07-15  

---

## Executive Summary

The NewsPulse AI database is a multi-tenant PostgreSQL schema in Supabase designed for secure, isolated data storage across independent organizations. All data isolation is enforced at the database layer using Row-Level Security (RLS) policies, not the application layer.

**Key Architecture Decisions:**
- **Multi-tenant by workspace:** Each organization (company) operates within an isolated workspace
- **Database-enforced isolation:** RLS policies prevent unauthorized access even with direct SQL
- **9 tables with hierarchical relationships:** Workspace → Company → AI Systems → Risk/Compliance
- **Optimized indexing:** Strategic indexes on foreign keys and frequently-queried columns
- **Referential integrity:** Cascading deletes prevent orphaned records
- **Role-based access:** Workspace members with roles (owner, admin, member, viewer)

**Security Model:** Zero-trust at the database layer. All SELECT/INSERT/UPDATE operations validated by RLS policies before reaching the application.

---

## Table Structure & Relationships

### 1. `profiles` — User Profile Extension

**Purpose:** Extends Supabase `auth.users` table with application-specific user data

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK, FK auth.users | Unique user identifier (linked to auth) |
| `email` | text | NOT NULL | User email (denormalized for queries) |
| `first_name` | text | | User's first name |
| `last_name` | text | | User's last name |
| `current_workspace_id` | uuid | | Workspace user last accessed |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Account creation timestamp |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Last profile update |

**Indexes:**
- `profiles_email_idx` on `email` — Fast user lookup by email

**Relationships:**
- `auth.users.id` (1:1) — Links to Supabase authentication table
- `workspaces.id` (0:1) — Optional link to most-recent workspace

**RLS Policies:**
- `Users can read their own profile` — SELECT only own profile
- `Users can insert their own profile` — INSERT own profile during signup
- `Users can update their own profile` — UPDATE own profile only

**Data Flow:**
1. User signs up via Supabase Auth → auth.users row created
2. App triggers profile insert → profiles row created with user's auth.uid()
3. User stays in current_workspace for dashboard persistence
4. On logout/workspace-switch, app updates current_workspace_id

---

### 2. `workspaces` — Organization Container

**Purpose:** Top-level tenant isolation boundary. Each organization (company using the product) has exactly one workspace.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Unique workspace identifier |
| `slug` | text | NOT NULL, UNIQUE | URL-friendly identifier (e.g., "acme-corp") |
| `name` | text | NOT NULL | Display name of organization |
| `description` | text | | Workspace description |
| `owner_id` | uuid | NOT NULL, FK auth.users | User who created the workspace |
| `status` | text | NOT NULL, DEFAULT 'active' | active, suspended, deleted |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Workspace creation timestamp |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |

**Indexes:**
- `workspaces_owner_id_idx` on `owner_id` — Find user's workspaces
- `workspaces_slug_idx` on `slug` — Lookup by URL slug (unique query)

**Relationships:**
- `auth.users.id` (M:1) — Workspace owner
- `workspace_members.workspace_id` (1:M) — Members of workspace
- `companies.workspace_id` (1:M) — Companies in workspace

**RLS Policies:**
- `Authenticated users can create workspaces` — CREATE new workspace (must be owner)
- `Owners can read their own workspaces` — SELECT own workspace (for onboarding)
- `Workspace members can read their workspace` — SELECT if member

**Design Rationale:**
- Slug uniqueness ensures URL routing works globally
- owner_id links to creator but isn't primary authorization (members table is)
- Status field allows soft-delete without data loss
- All child tables (companies, ai_systems, etc.) cascade to workspace for cleanup

---

### 3. `workspace_members` — Role-Based Access Control

**Purpose:** Defines who has access to a workspace and their role. This is the primary authorization table.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Member record identifier |
| `workspace_id` | uuid | NOT NULL, FK workspaces | Workspace being accessed |
| `user_id` | uuid | NOT NULL, FK auth.users | User granted access |
| `role` | text | NOT NULL | owner, admin, member, viewer (enum) |
| `email` | text | NOT NULL | User's email (for invitations) |
| `invited_at` | timestamptz | NOT NULL, DEFAULT now() | When invitation sent |
| `joined_at` | timestamptz | | When user accepted invitation |
| `status` | text | NOT NULL, DEFAULT 'pending' | pending, active, removed |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Record creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Record update |

**Constraints:**
- UNIQUE(workspace_id, user_id) — Each user can be member of workspace once

**Indexes:**
- `workspace_members_workspace_idx` on `workspace_id` — Find members of workspace
- `workspace_members_user_idx` on `user_id` — Find user's memberships

**Relationships:**
- `workspaces.id` (M:1) — Which workspace
- `auth.users.id` (M:1) — Which user

**RLS Policies:**
- `Users can read their own memberships` — SELECT own membership
- `Owners can add themselves as members` — INSERT during workspace creation

**Authorization Model:**
All RLS policies for child tables (companies, ai_systems, etc.) check:
```sql
exists (
    select 1 from public.workspace_members
    where workspace_id = <table>.workspace_id
    and user_id = auth.uid()
    and status = 'active'  -- Must be active member
)
```

This prevents:
- Removed members from accessing data
- Pending members (invited but not yet joined) from accessing data
- Users not in workspace_members from seeing any workspace data

**Design Rationale:**
- Status=pending/active/removed allows invitation workflow without immediate access
- Role field enables future permission granularity (e.g., owner can delete, viewer can read-only)
- Email stored for invitation/notification lookup

---

### 4. `companies` — Organization Profile

**Purpose:** The company being assessed for AI governance compliance. Each workspace typically has one company (the company evaluating their AI systems).

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Company record identifier |
| `workspace_id` | uuid | NOT NULL, FK workspaces | Which workspace owns this |
| `name` | text | NOT NULL | Company display name |
| `legal_name` | text | | Official company name (for compliance) |
| `country` | text | | Country of operation (ISO or text) |
| `industry` | text | | Industry sector (e.g., healthcare, finance) |
| `employees_range` | text | | Company size category (e.g., '51-200') |
| `website` | text | | Company website URL |
| `governance_priorities` | text | | Custom compliance focus areas |
| `status` | text | NOT NULL, DEFAULT 'active' | active, suspended, archived |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Record creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Record update |

**Indexes:**
- `companies_workspace_idx` on `workspace_id` — Find companies in workspace

**Relationships:**
- `workspaces.id` (M:1) — Parent workspace
- `ai_systems.company_id` (1:M) — AI systems in this company
- `risk_assessments.company_id` (1:M) — Risk assessments for this company
- `obligations.company_id` (1:M) — Compliance obligations
- `evidence.company_id` (1:M) — Supporting documentation
- `remediation_plans.company_id` (1:M) — Action plans

**RLS Policies:**
- `Members can read workspace companies` — SELECT if member of workspace
- `Members can insert workspace companies` — CREATE if member of workspace

**Design Rationale:**
- Workspace-scoped to enforce tenant isolation
- Supports multiple companies per workspace (future feature)
- Status allows archiving without deletion
- Legal name separate from display name for compliance documents

---

### 5. `ai_systems` — AI System Inventory

**Purpose:** Records all AI systems in use at a company. These are the primary compliance targets.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | System identifier |
| `company_id` | uuid | NOT NULL, FK companies | Which company operates this |
| `workspace_id` | uuid | NOT NULL, FK workspaces | Which workspace (denormalized) |
| `name` | text | NOT NULL | System name (e.g., "ChatGPT-4 Support Bot") |
| `description` | text | | What the system does |
| `system_type` | text | | large_language_model, generative_ai, classification_system, recommendation_system, computer_vision, biometric, decision_support, other |
| `vendor` | text | | Provider (e.g., "OpenAI", "AWS") |
| `purpose` | text | | Business use case (e.g., "customer support") |
| `data_categories` | text[] | | Array of data types processed (personal_data, financial_data, health_data, etc.) |
| `status` | text | NOT NULL, DEFAULT 'active' | active, pilot, deprecated |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Record creation |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Record update |

**Indexes:**
- `ai_systems_company_idx` on `company_id` — Find systems for a company
- `ai_systems_workspace_idx` on `workspace_id` — Find systems in workspace

**Relationships:**
- `companies.id` (M:1) — Parent company
- `workspaces.id` (M:1) — Parent workspace (denormalized for RLS)
- `risk_assessments.ai_system_id` (1:M) — Risk assessments for this system

**RLS Policies:**
- `Members can read workspace ai_systems` — SELECT if member
- `Members can insert workspace ai_systems` — CREATE if member
- `Members can update workspace ai_systems` — UPDATE if member

**Design Rationale:**
- workspace_id denormalized for faster RLS checks (avoid 2-table join in policy)
- system_type is enum-like (validated in application)
- data_categories as array for fast filtering of high-risk systems
- Status allows phasing out systems without deletion

---

### 6. `risk_assessments` — AI Act Compliance Assessment

**Purpose:** Compliance assessment for each AI system under EU AI Act.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Assessment identifier |
| `ai_system_id` | uuid | NOT NULL, FK ai_systems | Which system assessed |
| `company_id` | uuid | NOT NULL, FK companies | Which company (for RLS) |
| `workspace_id` | uuid | NOT NULL, FK workspaces | Which workspace (for RLS) |
| `risk_level` | text | NOT NULL | unacceptable, high, medium, low |
| `risk_score` | float | | Numerical score (0-100 typical) |
| `assessment_data` | jsonb | NOT NULL, DEFAULT '{}' | Structured assessment details |
| `status` | text | NOT NULL, DEFAULT 'draft' | draft, in_review, finalized |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Created |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Updated |

**Indexes:**
- `risk_assessments_ai_system_idx` on `ai_system_id` — Find assessments for system
- `risk_assessments_company_idx` on `company_id` — Find assessments for company

**Relationships:**
- `ai_systems.id` (M:1) — System being assessed
- `companies.id` (M:1) — Company context (for RLS)
- `workspaces.id` (M:1) — Workspace context (for RLS)

**RLS Policies:**
- Follow same pattern: check user is active member of workspace

**Design Rationale:**
- company_id and workspace_id denormalized for efficient RLS
- jsonb for flexible assessment schema (can evolve without migration)
- Status allows draft assessments before finalization

---

### 7. `obligations` — Compliance Obligations

**Purpose:** Specific obligations identified for the company under EU AI Act and other regulations.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Obligation identifier |
| `company_id` | uuid | NOT NULL, FK companies | Which company |
| `workspace_id` | uuid | NOT NULL, FK workspaces | Which workspace (for RLS) |
| `title` | text | NOT NULL | Obligation name |
| `description` | text | | Details about the obligation |
| `source` | text | | EU_AI_ACT, GDPR, LOCAL_REGULATION, etc. |
| `status` | text | NOT NULL, DEFAULT 'identified' | identified, in_progress, completed, not_applicable |
| `priority` | text | | critical, high, medium, low |
| `due_date` | date | | Completion deadline |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Created |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Updated |

**Indexes:**
- `obligations_company_idx` on `company_id` — Find obligations for company
- `obligations_status_idx` on `status` — Find obligations by status (for dashboards)

**Relationships:**
- `companies.id` (M:1) — Parent company
- `evidence.obligation_id` (1:M) — Supporting evidence
- `remediation_plans.obligation_id` (1:M) — Action plans

**Design Rationale:**
- Status/priority enable tracking progress
- Source field tracks regulation source (audit trail)
- due_date enables deadline management

---

### 8. `evidence` — Compliance Evidence

**Purpose:** Documentation and artifacts supporting compliance with obligations.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Evidence record identifier |
| `company_id` | uuid | NOT NULL, FK companies | Which company |
| `workspace_id` | uuid | NOT NULL, FK workspaces | Which workspace (for RLS) |
| `obligation_id` | uuid | FK obligations | Related obligation (optional) |
| `title` | text | NOT NULL | Evidence name |
| `description` | text | | What the evidence shows |
| `file_url` | text | | URL to stored file (in cloud storage) |
| `file_type` | text | | PDF, docx, image, etc. |
| `file_size` | integer | | File size in bytes |
| `uploaded_by` | uuid | FK auth.users | Who uploaded it |
| `status` | text | NOT NULL, DEFAULT 'submitted' | submitted, under_review, approved, rejected |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Created |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Updated |

**Indexes:**
- `evidence_company_idx` on `company_id` — Find evidence for company
- `evidence_obligation_idx` on `obligation_id` — Find evidence for obligation

**Relationships:**
- `companies.id` (M:1) — Parent company
- `obligations.id` (M:1, optional) — Related obligation
- `auth.users.id` (M:1, optional) — Who uploaded

**Design Rationale:**
- file_url points to external storage (Supabase Storage, S3, etc.)
- file_type/size metadata enables client-side preview
- uploaded_by tracks audit trail
- Status enables review workflow

---

### 9. `remediation_plans` — Action Plans

**Purpose:** Tracks action plans to address compliance gaps.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | Plan identifier |
| `company_id` | uuid | NOT NULL, FK companies | Which company |
| `workspace_id` | uuid | NOT NULL, FK workspaces | Which workspace (for RLS) |
| `obligation_id` | uuid | FK obligations | Related obligation (optional) |
| `title` | text | NOT NULL | Plan name |
| `description` | text | | Plan overview |
| `action_items` | jsonb | NOT NULL, DEFAULT '[]' | Array of action steps |
| `owner` | text | | Responsible person/team |
| `status` | text | NOT NULL, DEFAULT 'planned' | planned, in_progress, completed, on_hold |
| `target_date` | date | | Planned completion date |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Created |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Updated |

**Indexes:**
- `remediation_plans_company_idx` on `company_id` — Find plans for company
- `remediation_plans_status_idx` on `status` — Dashboard queries

**Relationships:**
- `companies.id` (M:1) — Parent company
- `obligations.id` (M:1, optional) — Related obligation

**Design Rationale:**
- action_items as jsonb for flexible structure
- Status enables workflow tracking
- target_date enables timeline management

---

## Multi-Tenant Isolation Model

### Isolation Boundary: Workspace

**All user data is scoped to a workspace.** A user can be member of multiple workspaces, but their data in each is completely isolated.

```
Workspace A (Company X)
├── Companies (only Company X's company records)
├── AI Systems (only Company X's AI systems)
├── Risk Assessments (only for Company X's systems)
└── Obligations, Evidence, Plans (only for Company X)

Workspace B (Company Y)
├── Companies (only Company Y's company records)
├── AI Systems (only Company Y's AI systems)
├── Risk Assessments (only for Company Y's systems)
└── Obligations, Evidence, Plans (only for Company Y)

User Z can be member of both Workspace A and B, but:
- Can only see Company X data in Workspace A
- Can only see Company Y data in Workspace B
- Direct SQL query for Company X data FROM workspace B returns 0 rows (RLS blocks it)
```

### RLS Policy Strategy

All 9 tables have RLS enabled. The pattern is:

```sql
create policy "Members can read" on table_name for select using (
    exists (
        select 1 from workspace_members
        where workspace_id = table_name.workspace_id
        and user_id = auth.uid()
        and status = 'active'
    )
);
```

**This enforces:**
1. User must exist in workspace_members table
2. Must be marked as status='active' (pending invites don't get access)
3. Check happens at the database layer (before row is returned to app)

**Attack scenario blocked:**
```
Attacker: "SELECT * FROM ai_systems WHERE id = <Company Y system>"
Database: "Check RLS... user not member of that workspace... DENY"
Result: 0 rows returned (even if attacker knows the exact ID)
```

---

## Indexing Strategy

### Primary Indexes (on foreign keys)

Every foreign key has an index for efficient lookups:

```sql
companies_workspace_idx
ai_systems_company_idx
ai_systems_workspace_idx
workspace_members_workspace_idx
workspace_members_user_idx
risk_assessments_ai_system_idx
risk_assessments_company_idx
obligations_company_idx
evidence_company_idx
remediation_plans_company_idx
```

**Why:** RLS policies and JOIN queries filter by workspace/company/user. Indexes make these O(log n) instead of O(n).

### Secondary Indexes (on query columns)

```sql
profiles_email_idx       -- Fast user lookup by email
workspaces_owner_id_idx  -- Find user's workspaces
workspaces_slug_idx      -- URL routing lookup (unique)
obligations_status_idx   -- Dashboard filtering
remediation_plans_status_idx  -- Dashboard filtering
```

**Why:** Dashboard queries filter by status to show open/in-progress items. Status index makes COUNT queries fast.

### Missing Indexes (intentional)

No indexes on:
- Text columns like `name`, `description` (full-text search not required for MVP)
- Data array columns like `data_categories` (queries filter these in app, not DB)

---

## Data Integrity & Relationships

### Referential Integrity

All foreign keys use `on delete cascade`:

```sql
profiles.id -> auth.users.id (cascade)
workspaces.owner_id -> auth.users.id (cascade)
workspace_members.workspace_id -> workspaces.id (cascade)
companies.workspace_id -> workspaces.id (cascade)
ai_systems.company_id -> companies.id (cascade)
...
```

**Effect:** Deleting a workspace deletes all child records (companies, AI systems, assessments, etc.). This prevents orphaned data.

### Unique Constraints

```sql
profiles (id) -- PK
workspaces (id) -- PK
workspaces (slug) -- UNIQUE globally
workspace_members (workspace_id, user_id) -- UNIQUE per workspace
```

**Effect:** Prevents duplicate memberships, ensures slug-based URL routing works.

---

## Performance Characteristics

### Query Performance

**Fast queries (< 10ms):**
```sql
SELECT * FROM ai_systems WHERE workspace_id = ? -- indexed, RLS fast
SELECT * FROM companies WHERE workspace_id = ? -- indexed
SELECT COUNT(*) FROM obligations WHERE status = 'in_progress' -- indexed
```

**Medium queries (10-100ms):**
```sql
SELECT * FROM risk_assessments WHERE ai_system_id = ? JOIN ai_systems -- 1 join, 2 indexes
SELECT * FROM evidence WHERE obligation_id = ? -- optional FK, may have no results
```

**Slow queries (100ms+):**
```sql
SELECT * FROM ai_systems WHERE description LIKE '%keyword%' -- no index, full table scan
SELECT * FROM evidence WHERE file_type = 'pdf' -- text match, not indexed
```

**Recommendations:**
- For MVP, assume all queries are fast (small datasets)
- As scale increases, add full-text indexes on name/description
- Monitor slow queries via Supabase dashboard

### Storage Efficiency

**Estimated row counts (at 1000 users, 500 companies, 2500 AI systems):**
- profiles: 1,000 rows × ~200 bytes = 200 KB
- workspaces: 500 rows × ~150 bytes = 75 KB
- workspace_members: 1,500 rows × ~200 bytes = 300 KB
- companies: 500 rows × ~400 bytes = 200 KB
- ai_systems: 2,500 rows × ~500 bytes = 1.2 MB
- risk_assessments: 2,500 rows × ~1 KB = 2.5 MB (jsonb)
- obligations: 5,000 rows × ~300 bytes = 1.5 MB
- evidence: 10,000 rows × ~400 bytes = 4 MB
- remediation_plans: 2,500 rows × ~600 bytes = 1.5 MB

**Total: ~11 MB** — Well within Supabase free tier (500 MB) and easily scales to 10GB+ tier.

---

## Schema Evolution & Migrations

### Adding a Column

```sql
alter table public.ai_systems add column confidence_score float;
-- App code: new fields optional, old data NULL
```

### Adding a Table

```sql
create table public.compliance_reports (
    id uuid primary key,
    workspace_id uuid not null references workspaces(id) on delete cascade,
    ...
);
alter table public.compliance_reports enable row level security;
create policy "Members can read" on public.compliance_reports for select using (
    exists (select 1 from workspace_members where workspace_id = compliance_reports.workspace_id and user_id = auth.uid() and status = 'active')
);
```

### Removing a Column (Rare)

```sql
alter table public.ai_systems drop column deprecated_field;
-- App code: remove references
```

**Versioning Strategy:**
- No explicit schema versioning in code
- Supabase provides automatic backups (point-in-time recovery)
- Major changes deployed to staging environment first

---

## Disaster Recovery

### Backup Strategy

**Supabase handles backups automatically:**
- Automated daily backups (retained 30 days)
- Point-in-time recovery available (within retention window)
- Backups stored in geographically separate regions

**Recovery procedure (if needed):**
1. Go to Supabase dashboard → Backups
2. Select restore point
3. Confirm recovery (selects new database instance)
4. Update app connection string
5. Run RLS audit to verify integrity

**Recovery time objective (RTO):** ~30 minutes (restoration + verification)  
**Recovery point objective (RPO):** ~24 hours (daily backup frequency)

### Data Validation

Run RLS audit quarterly to verify:
- No data leaks between workspaces
- SQL injection prevention still working
- RLS policies match current schema

See `docs/RLS_POLICY_AUDIT.md` for detailed procedures.

---

## Security Considerations

### SQL Injection Prevention

**Supabase Postgres driver uses parameterized queries:**
```javascript
// Safe - parameter is escaped
const { data } = await supabase
    .from('ai_systems')
    .select()
    .eq('workspace_id', workspaceId)

// Unsafe (avoided in codebase)
const query = `SELECT * FROM ai_systems WHERE workspace_id = '${workspaceId}'`
```

RLS policies provide additional protection:
- Even if SQL injection succeeds, RLS policy checks execute before row is returned
- Attacker cannot bypass workspace isolation

### Admin Access

**Supabase service role key (SUPABASE_SERVICE_ROLE_KEY):**
- Stored in server-only module (`lib/supabase-admin.ts`)
- 'server-only' directive enforces build-time check (no client access)
- Used only for admin operations (e.g., creating profiles during signup)
- Never exposed in API responses or logs

### Data at Rest

**Supabase PostgreSQL encryption:**
- All database files encrypted using AES-256
- Encryption handled by Supabase (user has no key management)
- Encryption transparent to application code

**Sensitive data:**
- Passwords: stored by Supabase Auth (hashed with bcrypt)
- Tokens: stored in auth.sessions (encrypted at rest)
- Application data: no additional encryption needed (workspace isolation sufficient)

---

## Testing & Verification

### Unit Test Coverage

See `tests/validation.test.ts` for:
- Schema constraint validation
- RLS policy enforcement tests
- Data isolation verification

### Integration Test Coverage

See `tests/e2e/critical-flows.spec.ts` for:
- Multi-user data isolation
- Rate limiting enforcement
- Security headers verification

### Manual RLS Audit

See `docs/RLS_POLICY_AUDIT.md` for:
- Step-by-step policy verification
- SQL injection prevention testing
- Multi-tenant isolation validation

---

## Deployment Checklist

**Before going to production:**

- [ ] All 9 tables created in Supabase
- [ ] All RLS policies enabled
- [ ] All indexes created (verify with `pg_stat_user_indexes`)
- [ ] Foreign key constraints verified
- [ ] Email auth enabled in Supabase Auth
- [ ] Test signup flow (auth.users + profiles created together)
- [ ] Test workspace creation (cascading behavior)
- [ ] Test RLS blocking unauthorized access
- [ ] Backup retention set to 30+ days
- [ ] Point-in-time recovery tested with staging data

**Verification script:**
```sql
-- Check all tables exist
SELECT schemaname, tablename FROM pg_tables 
WHERE schemaname = 'public' ORDER BY tablename;

-- Check RLS enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Check indexes exist
SELECT indexname FROM pg_stat_user_indexes 
WHERE schemaname = 'public' ORDER BY indexname;
```

---

## Document Approvals

**Prepared by:** Governor, Chief of Staff  
**Reviewed by:** [Pending - requires Founder review post-deployment]  
**Created:** 2026-07-15  
**Last Updated:** 2026-07-15  

---

**This document is the definitive reference for the database architecture. Updates required after schema changes.**
