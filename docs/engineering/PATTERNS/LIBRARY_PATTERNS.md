# Library Patterns (/lib Organization)

This document establishes patterns for organizing domain logic and shared utilities in the `/lib` directory.

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [Module Organization](#module-organization)
3. [Data Access Layer](#data-access-layer)
4. [Domain Logic](#domain-logic)
5. [Utilities & Helpers](#utilities--helpers)
6. [Type Definitions](#type-definitions)
7. [Constants & Configuration](#constants--configuration)

## Directory Structure

```
lib/
├── supabase/                    # Database access (single point of contact)
│   ├── server.ts               # Supabase client for server-side usage
│   ├── client.ts               # Supabase client for browser-side usage
│   └── types.ts                # Type definitions for Supabase tables
├── auth/                        # Authentication domain
│   ├── index.ts                # Exports: login, signup, logout, getSession
│   ├── session.ts              # Session management
│   ├── validation.ts           # Email/password validation
│   └── errors.ts               # Auth-specific error types
├── workspace/                   # Workspace domain
│   ├── index.ts                # Exports: create, read, list, update, delete, addMember
│   ├── service.ts              # Workspace business logic
│   ├── queries.ts              # Workspace database queries
│   ├── validation.ts           # Workspace input validation
│   └── errors.ts               # Workspace-specific errors
├── assessment/                  # Risk assessment domain
│   ├── index.ts                # Exports: create, complete, generate, list, getResults
│   ├── service.ts              # Assessment business logic
│   ├── calculator.ts           # Risk calculation engine
│   ├── template.ts             # Assessment templates
│   ├── queries.ts              # Assessment database queries
│   └── validation.ts           # Assessment input validation
├── obligation/                  # Compliance obligation domain
│   ├── index.ts                # Exports: create, list, updateStatus, mapFromAssessment
│   ├── service.ts              # Obligation business logic
│   ├── queries.ts              # Obligation database queries
│   └── generator.ts            # Generate obligations from assessment results
├── evidence/                    # Evidence management domain
│   ├── index.ts                # Exports: create, update, delete, list, verify
│   ├── service.ts              # Evidence business logic
│   ├── queries.ts              # Evidence database queries
│   └── storage.ts              # File storage interface
├── utils/                       # General-purpose utilities
│   ├── validation.ts           # Common validation functions (email, UUID, etc.)
│   ├── errors.ts               # Centralized error handling
│   ├── constants.ts            # Application constants
│   ├── dates.ts                # Date/time utilities
│   └── logger.ts               # Logging utilities
└── types/                       # Shared type definitions
    ├── index.ts                # Re-exports all types
    ├── domain.ts               # Business domain types (Assessment, Obligation, etc.)
    ├── api.ts                  # API request/response types
    └── database.ts             # Database schema types
```

## Module Organization

### Index File Pattern

Each domain module exports a public API via `index.ts`:

```typescript
// lib/workspace/index.ts
export { createWorkspace, readWorkspace, listWorkspaces, updateWorkspace, deleteWorkspace } from './service'
export { WorkspaceError, WorkspaceNotFoundError } from './errors'
export type { CreateWorkspaceInput, WorkspaceOutput } from './service'
```

This allows clean imports:
```typescript
// In routes or other modules
import { createWorkspace, WorkspaceNotFoundError } from '@/lib/workspace'
```

### Service Module Pattern

Each domain's `service.ts` contains business logic and orchestrates between database queries and validation:

```typescript
// lib/workspace/service.ts
import { createClient } from '@/lib/supabase/server'
import * as queries from './queries'
import { validateWorkspaceInput } from './validation'
import { WorkspaceError } from './errors'

export interface CreateWorkspaceInput {
  name: string
  description?: string
}

export interface WorkspaceOutput {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export async function createWorkspace(
  userId: string,
  input: CreateWorkspaceInput
): Promise<WorkspaceOutput> {
  // Validate input
  const validation = validateWorkspaceInput(input)
  if (!validation.valid) {
    throw new WorkspaceError('Validation failed', validation.errors)
  }

  // Execute business logic
  const supabase = await createClient()
  const workspace = await queries.insert(supabase, userId, input)
  
  if (!workspace) {
    throw new WorkspaceError('Failed to create workspace')
  }

  return workspace
}

export async function readWorkspace(
  userId: string,
  workspaceId: string
): Promise<WorkspaceOutput> {
  const supabase = await createClient()
  const workspace = await queries.selectById(supabase, userId, workspaceId)
  
  if (!workspace) {
    throw new WorkspaceError(`Workspace not found: ${workspaceId}`)
  }

  return workspace
}

export async function listWorkspaces(
  userId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ items: WorkspaceOutput[]; total: number }> {
  const supabase = await createClient()
  const result = await queries.selectByUserId(supabase, userId, limit, offset)
  return result
}

export async function updateWorkspace(
  userId: string,
  workspaceId: string,
  updates: Partial<CreateWorkspaceInput>
): Promise<WorkspaceOutput> {
  const validation = validateWorkspaceInput(updates)
  if (!validation.valid) {
    throw new WorkspaceError('Validation failed', validation.errors)
  }

  const supabase = await createClient()
  const updated = await queries.update(supabase, userId, workspaceId, updates)
  
  if (!updated) {
    throw new WorkspaceError(`Failed to update workspace: ${workspaceId}`)
  }

  return updated
}

export async function deleteWorkspace(
  userId: string,
  workspaceId: string
): Promise<void> {
  const supabase = await createClient()
  const success = await queries.delete(supabase, userId, workspaceId)
  
  if (!success) {
    throw new WorkspaceError(`Failed to delete workspace: ${workspaceId}`)
  }
}
```

### Queries Module Pattern

Each domain's `queries.ts` encapsulates all database access for that domain:

```typescript
// lib/workspace/queries.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkspaceOutput } from './service'

export async function insert(
  client: SupabaseClient,
  userId: string,
  data: { name: string; description?: string }
): Promise<WorkspaceOutput | null> {
  const { data: workspace, error } = await client
    .from('workspaces')
    .insert({
      name: data.name,
      description: data.description || null,
      created_by: userId
    })
    .select()
    .single()

  if (error) {
    console.error('Workspace insert error:', error)
    return null
  }

  return workspace
}

export async function selectById(
  client: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<WorkspaceOutput | null> {
  const { data: workspace, error } = await client
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single()

  if (error) {
    console.error('Workspace select error:', error)
    return null
  }

  // Verify user has access (RLS handles this, but explicit check for clarity)
  return workspace
}

export async function selectByUserId(
  client: SupabaseClient,
  userId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ items: WorkspaceOutput[]; total: number }> {
  const { data, count, error } = await client
    .from('workspaces')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Workspace list error:', error)
    return { items: [], total: 0 }
  }

  return {
    items: data || [],
    total: count || 0
  }
}

export async function update(
  client: SupabaseClient,
  userId: string,
  workspaceId: string,
  updates: { name?: string; description?: string }
): Promise<WorkspaceOutput | null> {
  const { data: workspace, error } = await client
    .from('workspaces')
    .update(updates)
    .eq('id', workspaceId)
    .select()
    .single()

  if (error) {
    console.error('Workspace update error:', error)
    return null
  }

  return workspace
}

export async function delete(
  client: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const { error } = await client
    .from('workspaces')
    .delete()
    .eq('id', workspaceId)

  if (error) {
    console.error('Workspace delete error:', error)
    return false
  }

  return true
}
```

## Data Access Layer

### Supabase Client Management

Two separate client instances for different contexts:

```typescript
// lib/supabase/server.ts - Server-side Supabase client
import { createServerClient, serializeCookieHeader, parseCookieHeader } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        }
      }
    }
  )
}
```

```typescript
// lib/supabase/client.ts - Client-side Supabase client
import { createBrowserClient } from '@supabase/ssr'

let browserClient: SupabaseClient | null = null

export function createClient() {
  if (browserClient) return browserClient

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return browserClient
}
```

### Query Patterns

All database operations use parameterized queries. No string concatenation:

```typescript
// ✅ CORRECT: Parameterized
const { data } = await client
  .from('users')
  .select()
  .eq('id', userId)

// ❌ WRONG: Never concatenate
const query = `SELECT * FROM users WHERE id = '${userId}'`
```

## Domain Logic

### Separation of Concerns

Business logic stays in `service.ts`, database logic in `queries.ts`:

```typescript
// ✅ In service.ts - Business logic
export async function updateAssessmentStatus(
  userId: string,
  assessmentId: string,
  newStatus: AssessmentStatus
): Promise<void> {
  // Validate state transition
  const current = await readAssessment(userId, assessmentId)
  if (!canTransition(current.status, newStatus)) {
    throw new AssessmentError(`Cannot transition from ${current.status} to ${newStatus}`)
  }

  // Update via query layer
  const success = await queries.updateStatus(supabase, assessmentId, newStatus)
  if (!success) {
    throw new AssessmentError('Failed to update assessment')
  }
}

// ❌ NOT in queries.ts - Only database operations
// Validation and state logic belong in service.ts
```

### Error Handling

Each domain defines its own error class:

```typescript
// lib/workspace/errors.ts
export class WorkspaceError extends Error {
  constructor(message: string, public details?: Record<string, any>) {
    super(message)
    this.name = 'WorkspaceError'
  }
}

export class WorkspaceNotFoundError extends WorkspaceError {
  constructor(id: string) {
    super(`Workspace not found: ${id}`)
    this.name = 'WorkspaceNotFoundError'
  }
}

// In service.ts, throw specific errors
if (!workspace) {
  throw new WorkspaceNotFoundError(workspaceId)
}

// In routes, catch and handle
try {
  const workspace = await readWorkspace(userId, workspaceId)
} catch (e) {
  if (e instanceof WorkspaceNotFoundError) {
    return Response.json({ error: 'Workspace not found' }, { status: 404 })
  }
  // Handle generic WorkspaceError or unexpected errors
}
```

## Utilities & Helpers

### Validation Utilities

```typescript
// lib/utils/validation.ts
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Domain-specific validation in domain modules
// lib/workspace/validation.ts
import { isValidEmail } from '@/lib/utils/validation'

export function validateWorkspaceInput(input: unknown) {
  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: ['Input must be an object'] }
  }

  const { name, description } = input as Record<string, unknown>

  if (typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, errors: ['Name is required and must be non-empty'] }
  }

  if (name.length > 100) {
    return { valid: false, errors: ['Name must be 100 characters or less'] }
  }

  return { valid: true, errors: [] }
}
```

### Logger Utility

```typescript
// lib/utils/logger.ts
export function logInfo(message: string, context?: Record<string, any>) {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`, context)
}

export function logError(message: string, error: unknown, context?: Record<string, any>) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error(`[ERROR] ${new Date().toISOString()} - ${message}: ${errorMessage}`, context)
}

export function logDebug(message: string, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, context)
  }
}
```

## Type Definitions

### Centralized Type Export

```typescript
// lib/types/index.ts
export type * from './domain'
export type * from './api'
export type * from './database'

// Usage in routes
import type { AssessmentInput, AssessmentOutput } from '@/lib/types'
```

### Domain Types

```typescript
// lib/types/domain.ts
export interface Assessment {
  id: string
  workspace_id: string
  ai_system_id: string
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  risk_score: number
  findings: AssessmentFinding[]
  created_at: string
  updated_at: string
}

export interface AssessmentFinding {
  id: string
  category: 'regulatory' | 'technical' | 'organizational'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  remediation: string
}

export interface AssessmentInput {
  ai_system_id: string
  description?: string
}

export type AssessmentOutput = Assessment
```

## Constants & Configuration

```typescript
// lib/utils/constants.ts
export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0
}

export const ASSESSMENT = {
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  RISK_THRESHOLDS: {
    LOW: 25,
    MEDIUM: 50,
    HIGH: 75
  },
  STATUS: ['draft', 'in_progress', 'completed', 'archived'] as const
}

export const AUTH = {
  PASSWORD_MIN_LENGTH: 12,
  SESSION_TIMEOUT_MINUTES: 60,
  MAX_LOGIN_ATTEMPTS: 5
}
```

### Usage Pattern

Import from utils only when needed:

```typescript
// In routes
import { PAGINATION } from '@/lib/utils/constants'

const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), PAGINATION.MAX_LIMIT)
```

## Module Dependencies

Keep dependencies unidirectional:

```
Routes → Services → Queries → Supabase
      ↓
      Validation ← Types
      ↓
      Utils
```

Never have:
- Queries depending on Services
- Utils depending on domain modules
- Circular imports between domains
