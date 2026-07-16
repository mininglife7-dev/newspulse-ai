# Security Patterns

This document establishes security-focused patterns for EURO AI, covering authentication, authorization, input validation, and data protection.

## Table of Contents

1. [Authentication](#authentication)
2. [Authorization](#authorization)
3. [Input Validation](#input-validation)
4. [Row Level Security (RLS)](#row-level-security)
5. [Secrets & Configuration](#secrets--configuration)
6. [Rate Limiting](#rate-limiting)
7. [Logging & Monitoring](#logging--monitoring)

## Authentication

### Session Management

Always verify session before processing requests:

```typescript
// lib/auth/session.ts
import { createClient } from '@/lib/supabase/server'

export async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized: No valid session')
  }

  return user
}

// app/api/workspace/route.ts
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    // User is authenticated, proceed
  } catch (error) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

### Session Verification Checklist

```typescript
// Every protected route must:
export async function PUT(request: NextRequest) {
  // 1. Verify user session
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Verify workspace membership
  const { workspace_id } = params
  const { data: membership } = await supabase
    .from('user_workspace_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('workspace_id', workspace_id)
    .single()

  if (!membership) {
    return Response.json({ error: 'Access Denied' }, { status: 403 })
  }

  // 3. Verify role has required permission
  if (membership.role === 'viewer') {
    return Response.json({ error: 'Insufficient Permissions' }, { status: 403 })
  }

  // 4. Proceed with request
}
```

## Authorization

### Role-Based Access Control (RBAC)

Define roles and their permissions:

```typescript
// lib/auth/roles.ts
export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer'

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: ['workspace:*', 'team:*', 'assessment:*', 'obligation:*', 'evidence:*'],
  admin: ['team:*', 'assessment:*', 'obligation:*', 'evidence:*'],
  editor: ['assessment:*', 'obligation:*', 'evidence:*'],
  viewer: ['assessment:read', 'obligation:read', 'evidence:read']
}

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  if (!permissions) return false

  // Handle wildcard permissions
  return permissions.some(p => {
    if (p === '*' || p === permission) return true
    if (p.endsWith('*')) {
      const prefix = p.slice(0, -1)
      return permission.startsWith(prefix)
    }
    return false
  })
}
```

### Authorization Check Pattern

```typescript
// lib/auth/authorize.ts
import { createClient } from '@/lib/supabase/server'
import { hasPermission } from './roles'

export async function requirePermission(
  workspaceId: string,
  permission: string
): Promise<{ user_id: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Get user's role in workspace
  const { data: membership, error: memberError } = await supabase
    .from('user_workspace_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId)
    .single()

  if (memberError || !membership) {
    throw new Error('Access Denied')
  }

  if (!hasPermission(membership.role, permission)) {
    throw new Error('Insufficient Permissions')
  }

  return { user_id: user.id }
}

// Usage in routes
export async function DELETE(
  request: NextRequest,
  { params }: { params: { workspace_id: string; id: string } }
) {
  try {
    const { user_id } = await requirePermission(
      params.workspace_id,
      'assessment:delete'
    )

    // Proceed with deletion
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Access Denied') {
      return Response.json({ error: 'Access Denied' }, { status: 403 })
    }
    if (error instanceof Error && error.message === 'Insufficient Permissions') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
}
```

## Input Validation

### Validation First

Always validate input BEFORE database operations:

```typescript
// ❌ WRONG: Database operation without validation
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { data } = await supabase.from('items').insert(body)
}

// ✅ CORRECT: Validate first
export async function POST(request: NextRequest) {
  const body = await request.json()

  const validation = createItemSchema.safeParse(body)
  if (!validation.success) {
    return Response.json(
      { error: 'Validation failed', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const { data } = await supabase.from('items').insert(validation.data)
}
```

### Validation with Zod

Define schemas for all inputs:

```typescript
// lib/workspace/validation.ts
import { z } from 'zod'

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional()
})

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional()
})

export const createAssessmentSchema = z.object({
  ai_system_id: z.string().uuid(),
  description: z.string().max(1000).optional(),
  type: z.enum(['full', 'quick']).optional()
})

// Usage
const validation = createWorkspaceSchema.safeParse(body)
if (!validation.success) {
  return Response.json(
    { error: 'Validation failed', details: validation.error.flatten() },
    { status: 400 }
  )
}
```

### Server & Client Validation

Validate on both client and server:

```typescript
// lib/utils/validation.ts - Shared validation
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return emailRegex.test(email)
}

// components/Form.tsx - Client validation
'use client'

import { emailRegex } from '@/lib/utils/validation'

export default function SignupForm() {
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    // Client-side validation
    const newErrors: Record<string, string> = {}
    if (!emailRegex.test(email)) {
      newErrors.email = 'Invalid email address'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Server-side validation happens too
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email })
    })

    if (!response.ok) {
      const data = await response.json()
      setErrors({ submit: data.error })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" />
      {errors.email && <span>{errors.email}</span>}
    </form>
  )
}

// app/api/auth/signup/route.ts - Server validation
export async function POST(request: NextRequest) {
  const body = await request.json()

  // Server-side validation
  const validation = signupSchema.safeParse(body)
  if (!validation.success) {
    return Response.json(
      { error: 'Validation failed' },
      { status: 400 }
    )
  }

  // Database operation
}
```

### Sanitization

Avoid HTML/SQL injection with parameterized queries:

```typescript
// ✅ CORRECT: Parameterized query
const { data } = await supabase
  .from('items')
  .select()
  .eq('name', userInput)

// ❌ WRONG: String concatenation
// Never do this:
// const query = `SELECT * FROM items WHERE name = '${userInput}'`

// ✅ For rich text, use a safe HTML parser
import DOMPurify from 'dompurify'

const sanitized = DOMPurify.sanitize(userHtml)
```

## Row Level Security (RLS)

### RLS Policy Patterns

All workspace-scoped tables must enforce workspace isolation:

```sql
-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own workspaces
CREATE POLICY workspace_select_own
  ON workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_workspace_roles
      WHERE user_workspace_roles.workspace_id = workspaces.id
      AND user_workspace_roles.user_id = auth.uid()
    )
  );

-- Policy: Users can only update their own workspaces (as owner)
CREATE POLICY workspace_update_own
  ON workspaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_workspace_roles
      WHERE user_workspace_roles.workspace_id = workspaces.id
      AND user_workspace_roles.user_id = auth.uid()
      AND user_workspace_roles.role = 'owner'
    )
  );

-- All workspace child tables follow same pattern
-- Example: assessments table
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY assessment_select
  ON assessments FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspace_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY assessment_insert
  ON assessments FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM user_workspace_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY assessment_update
  ON assessments FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspace_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY assessment_delete
  ON assessments FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspace_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );
```

### RLS Testing

Always test RLS policies:

```typescript
// lib/__tests__/rls.test.ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@/lib/supabase/server'

describe('RLS Enforcement', () => {
  it('user cannot read another user workspace', async () => {
    const userAClient = await createClient() // authenticated as user-a
    const userBClient = await createClient() // authenticated as user-b

    // User A creates workspace
    const { data: workspaceA } = await userAClient
      .from('workspaces')
      .insert({ name: 'User A Workspace' })
      .select()
      .single()

    // User B tries to read User A's workspace
    const { data, error } = await userBClient
      .from('workspaces')
      .select()
      .eq('id', workspaceA.id)
      .single()

    // RLS should prevent access
    expect(error).toBeDefined()
    expect(data).toBeNull()
  })

  it('user cannot insert into workspace without membership', async () => {
    const userClient = await createClient()

    const { error } = await userClient
      .from('assessments')
      .insert({
        workspace_id: 'unauthorized-workspace-id',
        ai_system_id: 'system-id'
      })

    // RLS should prevent insertion
    expect(error).toBeDefined()
  })

  it('user with viewer role cannot update assessment', async () => {
    // Setup: Create user with viewer role
    // Attempt to update assessment
    // Expect error due to RLS policy
  })
})
```

## Secrets & Configuration

### Environment Variables

Never commit secrets; use environment variables:

```typescript
// ✅ CORRECT: Use environment variables
const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const databaseUrl = process.env.DATABASE_URL

// ❌ WRONG: Hardcoded secrets
const apiKey = 'sk-1234567890...'
```

### Public vs Secret Environment Variables

```typescript
// Next.js automatically exposes NEXT_PUBLIC_* to browser
process.env.NEXT_PUBLIC_SUPABASE_URL // ✅ Safe for browser
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // ✅ Anon key safe

// Secret variables - server-only
process.env.SUPABASE_SERVICE_ROLE_KEY // ❌ Never expose to browser
process.env.DATABASE_PASSWORD // ❌ Never expose to browser
```

### Accessing Secrets Safely

```typescript
// lib/config.ts
// Only import in server components and API routes

export function getSupabaseServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
  }
  return key
}

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL not configured')
  }
  return url
}

// This function only works in server components/routes
'use server'

export async function adminOperation() {
  const key = getSupabaseServiceRoleKey()
  // Use key for admin operations
}
```

## Rate Limiting

### Rate Limit Middleware

```typescript
// lib/middleware/rateLimit.ts
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const record = requestCounts.get(identifier)

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

// app/api/auth/login/route.ts
export async function POST(request: NextRequest) {
  const clientIp = request.ip || 'unknown'

  if (!rateLimit(`login:${clientIp}`, 5, 15 * 60 * 1000)) {
    return Response.json(
      { error: 'Too many login attempts. Try again later.' },
      { status: 429 }
    )
  }

  // Process login
}
```

### Rate Limit Headers

Always include rate limit headers in responses:

```typescript
export async function GET(request: NextRequest) {
  const userId = getCurrentUserId(request)

  if (!rateLimit(`api:${userId}`, 60, 60 * 1000)) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'Retry-After': '60'
        }
      }
    )
  }

  return Response.json(
    { data: [...] },
    {
      headers: {
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '59',
        'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
      }
    }
  )
}
```

## Logging & Monitoring

### Security Event Logging

Log security-relevant events:

```typescript
// lib/utils/logger.ts
export function logSecurityEvent(
  event: string,
  details: Record<string, any>,
  severity: 'info' | 'warning' | 'critical' = 'info'
) {
  const timestamp = new Date().toISOString()
  console.log(
    JSON.stringify({
      type: 'SECURITY_EVENT',
      timestamp,
      event,
      severity,
      details
    })
  )
}

// Usage in routes
export async function DELETE(request: NextRequest) {
  try {
    const { user_id } = await requirePermission(workspace_id, 'workspace:delete')

    await supabase.from('workspaces').delete().eq('id', workspace_id)

    logSecurityEvent('workspace_deleted', {
      user_id,
      workspace_id,
      timestamp: new Date().toISOString()
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    logSecurityEvent('unauthorized_delete_attempt', {
      workspace_id,
      error: error instanceof Error ? error.message : 'Unknown',
      timestamp: new Date().toISOString()
    }, 'warning')

    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

### Failed Authentication Logging

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, password } = body

  const result = await authenticateUser(email, password)

  if (!result.success) {
    logSecurityEvent('failed_login_attempt', {
      email,
      reason: result.reason,
      ip: request.ip,
      timestamp: new Date().toISOString()
    }, 'warning')

    return Response.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }

  return Response.json({
    data: { session: result.session }
  })
}
```

### Monitoring Security Alerts

Set up alerts for security events:

```typescript
// lib/monitoring/alerts.ts
export async function checkSecurityAlerts() {
  // Query security event logs
  // Check for patterns:
  // - Multiple failed login attempts from same IP
  // - Unusual access patterns
  // - Unauthorized operations
  // - RLS bypass attempts

  const failedLogins = await getFailedLoginAttempts(
    lastHour: true,
    minAttempts: 5
  )

  if (failedLogins.length > 0) {
    alertOps('Multiple failed login attempts detected', {
      count: failedLogins.length,
      ips: [...new Set(failedLogins.map(l => l.ip))]
    })
  }
}
```
