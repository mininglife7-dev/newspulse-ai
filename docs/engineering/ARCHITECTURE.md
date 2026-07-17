# System Architecture

**Type**: Reference  
**Audience**: All Engineers, Backend Leads, Architecture Team  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Owner**: Governor Ω

---

## Quick Reference

EURO AI is a multi-tenant, web-based AI governance platform for EU AI Act compliance. Built on Next.js 16 with React 19, TypeScript, Supabase (EU-hosted PostgreSQL), and Row Level Security for tenant isolation.

**Stack**: Next.js 16 (App Router) → React 19 → TypeScript → Supabase (PostgreSQL + Auth)  
**Deployment**: Vercel (with preview environments for PRs)  
**Data**: Supabase PostgreSQL (EU region) with RLS-based workspace isolation

---

## System Components

### Frontend (React 19 + Next.js App Router)

**Purpose**: Customer-facing interface for workspace management, system inventory, assessments, and compliance tracking

**Location**: `/app` directory

**Pages**:

- `/auth/*` — Authentication (sign up, login, password reset)
- `/workspace` — Workspace dashboard and management
- `/inventory` — AI systems inventory and management
- `/assessment` — Risk assessments for AI systems
- `/compliance` — Compliance status and progress
- `/obligations` — Mandatory obligations tracking
- `/evidence` — Evidence linking to obligations
- `/team` — Team member management and roles
- `/governance` — Internal ops dashboard (admin only)

**Key Technologies**:

- React 19 with Hooks for state management
- Next.js App Router (server components default)
- TypeScript (strict mode)
- Supabase client SDK for auth
- CSS Modules for styling
- Responsive design (mobile-first)

### Backend API Routes (Next.js)

**Purpose**: Handle business logic, database queries, and system coordination

**Location**: `/app/api` directory

**Route Structure**:

```
/api/
├── auth/
│   ├── login
│   ├── logout
│   ├── signup
│   └── refresh
├── workspaces/
│   ├── [id]/systems
│   ├── [id]/assessments
│   └── [id]/obligations
├── systems/
│   ├── [id]
│   └── [id]/assessments
├── assessments/
│   ├── [id]
│   └── [id]/obligations
├── obligations/
│   ├── [id]
│   └── [id]/evidence
├── evidence/
│   ├── [id]
│   └── [id]/link
├── health
├── alerts
└── security-scan
```

**Middleware & Auth**:

- Supabase JWT validation on protected routes
- Workspace isolation verification (RLS via JWT claims)
- Role-based authorization (owner/admin/analyst/viewer)

### Domain Logic Library (`/lib`)

**Purpose**: Reusable business logic, utilities, and data access patterns

**Modules**:

1. **`lib/assessment/`** — Risk assessment logic
   - `calculateRiskLevel()` — Determines risk score from answers
   - `generateObligations()` — Creates obligations from risk level
   - Assessment question definitions

2. **`lib/validation/`** — Input validation
   - `validateEmail()`, `validatePassword()`
   - `validateSystemName()`, `validateAssessment()`
   - Form validation schemas

3. **`lib/auth/`** — Authentication helpers
   - `getSession()` — Get current session
   - `requireAuth()` — Protect routes
   - `getUserWorkspace()` — Get user's primary workspace

4. **`lib/database/`** — Database access patterns
   - `getAISystems()` — List workspace systems
   - `createAssessment()` — Create assessment record
   - `linkEvidence()` — Link evidence to obligation
   - Properly uses RLS

5. **`lib/utils/`** — General utilities
   - Date formatting
   - UUID generation
   - Error handling

### Database (Supabase PostgreSQL - EU)

**Purpose**: Persistent storage for all platform data with Row Level Security for tenant isolation

**Hosted**: EU region (compliance requirement)  
**Features**: PostgreSQL 14+, RLS enabled, automatic backups, point-in-time recovery

**Key Tables**:

```
workspaces
├── id (UUID, primary key)
├── name (String)
├── description (Text, optional)
├── industry (Enum)
├── country (String)
├── owner_id (UUID, FK to users)
└── created_at, updated_at

ai_systems
├── id (UUID, primary key)
├── workspace_id (UUID, FK to workspaces) 🔐 RLS
├── name (String)
├── description (Text, optional)
├── use_case (String)
├── status (Enum: active/inactive/development)
└── created_at, updated_at

assessments
├── id (UUID, primary key)
├── workspace_id (UUID, FK to workspaces) 🔐 RLS
├── system_id (UUID, FK to ai_systems)
├── risk_level (Enum: low/medium/high/critical)
├── status (Enum: draft/completed/in_progress)
└── answers (JSONB for assessment responses)

obligations
├── id (UUID, primary key)
├── workspace_id (UUID, FK to workspaces) 🔐 RLS
├── assessment_id (UUID, FK to assessments)
├── title (String)
├── description (Text)
├── status (Enum: open/in_progress/completed)
└── due_date (Date, optional)

evidence
├── id (UUID, primary key)
├── workspace_id (UUID, FK to workspaces) 🔐 RLS
├── obligation_id (UUID, FK to obligations)
├── title (String)
├── description (Text)
├── status (Enum: submitted/approved/completed)
├── file_url (String, optional)
└── created_at, updated_at

users
├── id (UUID, primary key, FK to auth.users)
├── email (String)
├── full_name (String)
├── created_at

user_workspace_roles
├── user_id (UUID, FK to users)
├── workspace_id (UUID, FK to workspaces)
├── role (Enum: owner/admin/analyst/viewer)
└── created_at
```

**Row Level Security (RLS)**:

- All workspace-scoped tables have RLS enabled
- Policy: `workspace_id = auth.jwt() ->> 'workspace_id'`
- Users cannot query data from other workspaces
- Even direct SQL queries respect RLS

**Indexes**:

- Primary keys (automatic)
- Foreign keys for joins
- `workspace_id` on all tenant tables (RLS enforcement)
- `assessment_id` on obligations (common filter)

### Authentication (Supabase Auth)

**Purpose**: User identity and session management

**Flow**:

1. User signs up with email/password
2. Supabase creates user record + sends verification email
3. User verifies email
4. User can log in
5. Supabase returns JWT token (valid 60 minutes)
6. Token stored in secure HTTP-only cookie
7. Every API request includes token in Authorization header
8. Workspace ID injected into JWT claims by trigger

**Session Management**:

- Tokens refreshed automatically (refresh token stored)
- Expired sessions redirect to login
- Logout clears session and cookies
- Multi-device login allowed (each device gets own session)

---

## Data Flow

### Typical Request Flow

```
User Browser
    ↓
Next.js Frontend (React Component)
    ↓ (API call with JWT in header)
Next.js API Route (Middleware validates JWT)
    ↓ (Query with RLS enforcement)
Supabase PostgreSQL
    ↓ (RLS checks workspace_id matches JWT)
Database returns filtered data
    ↓ (JSON response)
API Route returns response
    ↓
React updates state and re-renders
    ↓
User sees updated UI
```

### Example: Creating an Assessment

```
1. User clicks "Start Assessment" on AI system
2. Frontend: POST /api/assessments
   {
     "system_id": "sys-123",
     "workspace_id": "ws-456"  // From JWT
   }

3. API Route (/app/api/assessments/route.ts)
   - Verify auth (JWT present and valid)
   - Extract workspace_id from JWT
   - Validate system_id belongs to this workspace
   - Call lib/assessment.createAssessment()

4. Library Function
   - Validate input
   - Create record with workspace_id
   - Return created assessment

5. Database (with RLS)
   - INSERT into assessments (id, workspace_id, system_id, ...)
   - RLS policy checked: workspace_id = JWT workspace
   - Allowed: INSERT succeeds

6. Response
   - 201 Created
   - JSON: { id: "ass-789", system_id: "sys-123", ... }

7. Frontend
   - Update state with new assessment
   - Redirect to assessment page
   - Show "Assessment created"
```

### Cross-Workspace Isolation (Security)

```
Scenario: User in Workspace A tries to access Workspace B data

1. API Request
   GET /api/assessments/ass-999  // From Workspace B
   Authorization: Bearer [JWT with workspace_id = ws-A]

2. RLS Enforcement
   SELECT * FROM assessments
   WHERE id = 'ass-999'
   AND workspace_id = (JWT -> 'workspace_id')  // ws-A

   RLS Policy checks:
   - Is workspace_id = ws-A? No, it's ws-B
   - REJECT: Return empty result

3. Response
   - 404 Not Found
   OR
   - Empty result

User cannot access workspace B's data
```

---

## Architectural Patterns

### Multi-Tenancy via Row Level Security

**Approach**: Database-level isolation using PostgreSQL RLS instead of application-level filtering

**Benefits**:

- Cannot accidentally leak data to wrong customer
- Works even for direct database access
- SQL injection cannot bypass isolation
- Enforced at the data layer (strongest guarantee)

**Implementation**:

```sql
-- Enable RLS on workspace-scoped table
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Create isolation policy
CREATE POLICY "Workspace isolation" ON assessments
  FOR SELECT
  USING (workspace_id = (auth.jwt() ->> 'workspace_id')::uuid);
```

### Stateless API Routes

**Approach**: Each API route is stateless and can be called independently

**Benefits**:

- Easy to scale (routes can run on different servers)
- Easy to test (no shared state)
- Easy to monitor (each request is independent)

**Pattern**:

```typescript
// app/api/assessments/route.ts
export async function POST(request: Request) {
  // 1. Validate auth
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  // 2. Parse & validate input
  const data = await request.json()
  const errors = validateAssessment(data)
  if (errors.length > 0) return new Response(..., { status: 400 })

  // 3. Execute business logic
  const assessment = await createAssessment(session.workspace_id, data)

  // 4. Return result
  return new Response(JSON.stringify(assessment), { status: 201 })
}
```

### Form Validation: Client + Server

**Approach**: Validate on both client (UX) and server (security)

**Client validation**:

- Real-time feedback to user
- Prevent empty submissions
- Better UX

**Server validation** (always required):

- Never trust client input
- Catch injection attacks
- Enforce business rules

```typescript
// lib/validation/assessment.ts
export function validateAssessment(data: unknown): string[] {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return ['Invalid input'];
  }

  if (!data.system_id || typeof data.system_id !== 'string') {
    errors.push('system_id is required');
  }

  if (data.answers && typeof data.answers !== 'object') {
    errors.push('answers must be an object');
  }

  return errors;
}
```

---

## Component Interaction Model

```
┌─────────────────────────────────────────────────────┐
│                    Browser Layer                    │
│  React Components → Next.js Client Components       │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓ (HTTP/REST)
┌─────────────────────────────────────────────────────┐
│               API Layer (Next.js Routes)            │
│  /api/assessments, /api/obligations, etc.           │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓ (SQL via Supabase Client)
┌─────────────────────────────────────────────────────┐
│              Business Logic Layer (/lib)            │
│  calculateRiskLevel(), createAssessment(), etc.     │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓ (SQL)
┌─────────────────────────────────────────────────────┐
│           Database Layer (Supabase PostgreSQL)      │
│  Enforces RLS, Validates Constraints                │
└─────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

### Local Development

```
Developer Machine
  ├── npm run dev
  │   ├── Next.js dev server (localhost:3000)
  │   ├── Hot reload on file changes
  │   └── Local Supabase (optional)
  └── npm test
      └── Run unit/integration tests
```

### Production (Vercel)

```
GitHub Push
  ↓
GitHub Actions CI/CD
  ├── npm run lint (ESLint)
  ├── npm run type-check (TypeScript)
  ├── npm test (Unit/Integration tests)
  └── npm run build (Next.js build)
      ↓
      ↓ (If all pass)
      ↓
Vercel Deployment
  ├── Deploy to production
  │   ├── Run migrations (if any)
  │   ├── Restart app
  │   └── Health check
  │
  └── Preview deployments for PRs
      ├── Automatic preview URL
      ├── Same code, test database
      └── Destroyed when PR closed

Production Environment
  ├── Next.js server (on Vercel Edge Network)
  ├── Supabase PostgreSQL (EU-hosted)
  ├── Auth (Supabase Auth)
  └── Storage (if needed, via Supabase Storage)
```

---

## Security Boundaries

### Authenticated Endpoints

All endpoints that access customer data require:

- Valid JWT token in Authorization header
- Token issued by Supabase Auth
- Token contains workspace_id claim
- User must have role in that workspace

### Database-Level Security

- RLS policies prevent cross-workspace data access
- Even admins cannot see other workspace data
- Database user credentials rotated regularly
- SQL injection cannot bypass RLS

### Environment Isolation

- Production database separate from staging
- Secrets stored in Vercel Environment Variables
- No hardcoded credentials in code
- API keys rotated regularly

---

## Scalability Considerations

### Current (Single Workspace)

```
Hundreds of assessments per workspace
Thousands of evidence records
Reasonable query times (<500ms for complex queries)
```

### Future (Many Workspaces)

**Potential bottlenecks**:

- `workspace_id` queries without index (RLS scans all rows)
  - Solution: Index on `(workspace_id)` for each table

- Large workspaces with many AI systems
  - Solution: Pagination, lazy loading

- Complex assessments with many questions
  - Solution: Optimize question definitions storage

- Many users per workspace
  - Solution: Caching, session optimization

**Scaling strategy**:

1. Monitor query performance with EXPLAIN ANALYZE
2. Add indexes on slow queries
3. Consider read replicas for reporting queries
4. Cache frequently accessed data (assessment templates)
5. Archive old assessments to separate table

---

## Related Systems

### External Dependencies

- **Supabase**: Authentication, Database, Storage
  - Dependency: Critical (single point of failure)
  - Mitigation: Backup/restore procedures, monitoring

- **Vercel**: Hosting and Deployment
  - Dependency: Critical (production uptime)
  - Mitigation: CDN caching, fallback procedures

### Future Integrations

Hooks identified for potential future integrations:

- Email service for notifications
- Storage service for evidence files
- Analytics for compliance reporting
- Webhook integrations for external systems

---

## Development Guidelines

### Adding a New Feature

1. **Design**: Document API, database schema changes
2. **Validate**: Create validation functions in `/lib/validation/`
3. **Database**: Create migration file (if needed)
4. **API**: Implement route in `/app/api/`
5. **Business Logic**: Implement in `/lib/` (not in API route)
6. **Frontend**: Create React component in `/app/`
7. **Test**: Write tests for all three layers
8. **Document**: Add to API_REFERENCE.md and DATABASE_SCHEMA.md

### Best Practices

- **Stateless routes**: No in-memory state in API handlers
- **Workspace isolation**: Always include workspace_id in queries
- **Validation everywhere**: Client input validation at API boundary
- **Type safety**: Use TypeScript strict mode
- **Error handling**: Catch errors and return user-friendly messages
- **Monitoring**: Log important operations and errors

---

## Related Documents

- `API_REFERENCE.md` — Full API endpoint documentation
- `DATABASE_SCHEMA.md` — Database tables and relationships
- `PATTERNS/ROUTE_PATTERNS.md` — How to structure API routes
- `PATTERNS/TESTING_PATTERNS.md` — Testing strategies
- `docs/operations/RUNBOOKS/DATABASE_OPERATIONS.md` — Database operations
- `docs/governance/ENGINEERING_STANDARDS.md` — Code quality standards

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.3)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.3 (Engineering Knowledge)
