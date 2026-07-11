# Phase 3 Implementation Boilerplate Guide

**Purpose:** Ready-to-use code templates for rapid Phase 3 implementation

**Usage:** When Phase 3 candidate is chosen (2026-07-17), use these boilerplates as starting point

**Estimated speedup:** 1-2 days (30-40% faster than building from scratch)

---

## Overview

All 4 Phase 3 candidates share common patterns:
- Database migrations (new tables, indexes, RLS policies)
- API routes (CRUD endpoints, authentication, error handling)
- React components (forms, lists, details, integrations)
- Type definitions (TypeScript interfaces, Zod schemas)
- Tests (unit, integration, E2E)

This guide provides copy-paste boilerplates for each layer.

---

## Template Locations

```
templates/
├── database/
│   ├── migration-template.sql
│   ├── rls-policies-template.sql
│   └── indexes-template.sql
│
├── api/
│   ├── route-template.ts
│   ├── service-template.ts
│   └── types-template.ts
│
├── components/
│   ├── form-template.tsx
│   ├── list-template.tsx
│   ├── detail-template.tsx
│   └── hooks-template.ts
│
└── tests/
    ├── unit-test-template.test.ts
    ├── integration-test-template.test.ts
    ├── api-test-template.test.ts
    └── e2e-test-template.test.ts
```

---

## 1. Database Templates

### 1.1 Migration Template

**File:** `templates/database/migration-template.sql`

```sql
-- Migration: PHASE-3-[CANDIDATE]-TABLES
-- Purpose: Create tables for [Candidate] feature
-- Date: 2026-07-18
-- Author: Governor

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- Example: Create evidence_files table for Evidence-Obligation Linking
CREATE TABLE IF NOT EXISTS evidence_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
  
  -- File metadata
  filename TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_type TEXT NOT NULL, -- 'application/pdf', 'image/jpeg', etc.
  file_hash TEXT NOT NULL UNIQUE, -- SHA-256 for deduplication
  
  -- Storage
  storage_path TEXT NOT NULL, -- supabase://storage-bucket/path/to/file
  storage_bucket TEXT NOT NULL DEFAULT 'compliance-evidence',
  
  -- Metadata
  uploaded_by_id UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scanned_for_virus BOOLEAN NOT NULL DEFAULT FALSE,
  virus_scan_result TEXT DEFAULT NULL, -- 'clean', 'infected', 'error'
  
  -- Indexing
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT file_size_valid CHECK (file_size_bytes > 0 AND file_size_bytes <= 104857600), -- 100 MB max
  CONSTRAINT filename_not_empty CHECK (length(filename) > 0)
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Search by workspace (all files for a workspace)
CREATE INDEX idx_evidence_files_workspace_id ON evidence_files(workspace_id);

-- Search by obligation (all files linked to an obligation)
CREATE INDEX idx_evidence_files_obligation_id ON evidence_files(obligation_id);

-- Search by uploader (track who uploaded what)
CREATE INDEX idx_evidence_files_uploaded_by_id ON evidence_files(uploaded_by_id);

-- Full-text search on filename
CREATE INDEX idx_evidence_files_filename_tsvector 
  ON evidence_files USING gin(to_tsvector('english', filename));

-- Virus scan status (find unscanned files)
CREATE INDEX idx_evidence_files_virus_scan_status 
  ON evidence_files(workspace_id, scanned_for_virus);

-- ============================================================================
-- ENABLE ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;

-- Users can only see evidence files in their workspace
CREATE POLICY evidence_files_select_workspace_users ON evidence_files
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can upload files to their workspace
CREATE POLICY evidence_files_insert_workspace_users ON evidence_files
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    AND uploaded_by_id = auth.uid()
  );

-- Users can delete their own uploaded files
CREATE POLICY evidence_files_delete_own_files ON evidence_files
  FOR DELETE
  USING (
    uploaded_by_id = auth.uid()
  );

-- ============================================================================
-- VERIFY
-- ============================================================================

-- Test: SELECT from evidence_files should work
-- Test: INSERT should check workspace membership via RLS
-- Test: DELETE should check uploaded_by_id
-- Test: Indexes created successfully
-- Test: Row-level security policies active
```

**Usage:**
1. Copy template above
2. Replace `evidence_files` with your table name
3. Replace field definitions with your schema (see PHASE-3-ARCHITECTURE-OPTIONS.md for each candidate)
4. Replace RLS policies with your workspace isolation rules
5. Create migration file: `supabase/migrations/[date]_phase_3_[candidate].sql`
6. Run: `supabase migration up`

### 1.2 RLS Policies Template

**File:** `templates/database/rls-policies-template.sql`

```sql
-- Pattern 1: Workspace-scoped read/write
CREATE POLICY "[table]_select_workspace" ON [table]
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Pattern 2: Owner-only delete
CREATE POLICY "[table]_delete_owner" ON [table]
  FOR DELETE
  USING (created_by_id = auth.uid());

-- Pattern 3: Admin-only update
CREATE POLICY "[table]_update_admin" ON [table]
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = [table].workspace_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Pattern 4: Immutable audit logs (insert-only, no updates/deletes)
CREATE POLICY "[table]_insert_workspace" ON [table]
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;
-- Note: No UPDATE or DELETE policies = immutable table
```

### 1.3 Indexes Template

**File:** `templates/database/indexes-template.sql`

```sql
-- Always create indexes for:
-- 1. Foreign keys (speed up joins)
CREATE INDEX idx_[table]_workspace_id ON [table](workspace_id);
CREATE INDEX idx_[table]_created_by_id ON [table](created_by_id);

-- 2. Frequently filtered fields
CREATE INDEX idx_[table]_status ON [table](status);
CREATE INDEX idx_[table]_created_at ON [table](created_at DESC);

-- 3. Timestamps for range queries
CREATE INDEX idx_[table]_created_at_range 
  ON [table](workspace_id, created_at DESC);

-- 4. Full-text search (if applicable)
CREATE INDEX idx_[table]_description_tsvector 
  ON [table] USING gin(to_tsvector('english', description));

-- 5. Composite indexes for common WHERE + ORDER BY combinations
CREATE INDEX idx_[table]_workspace_created 
  ON [table](workspace_id, created_at DESC);
```

---

## 2. API Route Templates

### 2.1 API Route Template

**File:** `templates/api/route-template.ts`

```typescript
// app/api/[feature]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Request body schema (validation)
const CreateRequestSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  name: z.string().min(1, 'Name required').max(255),
  description: z.string().optional(),
  // Add fields specific to your feature
});

type CreateRequest = z.infer<typeof CreateRequestSchema>;

// Response type
interface FeatureResponse {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

function errorResponse(status: number, message: string, details?: any) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...(details && { details }),
    },
    { status }
  );
}

// ============================================================================
// POST: CREATE
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await req.json();
    const validatedData = CreateRequestSchema.parse(body);

    // 2. Authenticate user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: () => {}, // Read-only in API routes
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(401, 'Authentication required');
    }

    // 3. Verify workspace membership
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', validatedData.workspaceId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return errorResponse(403, 'Not a member of this workspace');
    }

    // 4. Insert record
    const { data, error } = await supabase
      .from('[table]')
      .insert({
        workspace_id: validatedData.workspaceId,
        name: validatedData.name,
        description: validatedData.description,
        created_by_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return errorResponse(500, 'Failed to create record', error.message);
    }

    // 5. Return success
    const response: FeatureResponse = {
      id: data.id,
      workspaceId: data.workspace_id,
      name: data.name,
      description: data.description,
      createdAt: data.created_at,
      createdBy: data.created_by_id,
    };

    return NextResponse.json({ ok: true, data: response }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request', error.errors);
    }

    console.error('Unexpected error:', error);
    return errorResponse(500, 'Internal server error');
  }
}

// ============================================================================
// GET: LIST
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    // Authenticate
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: () => {},
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(401, 'Authentication required');
    }

    // Extract workspace ID from query params
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      return errorResponse(400, 'workspaceId required');
    }

    // Verify membership (RLS will also check, but verify here for clarity)
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return errorResponse(403, 'Not a member of this workspace');
    }

    // Fetch records (RLS enforces workspace isolation)
    const { data, error } = await supabase
      .from('[table]')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return errorResponse(500, 'Failed to fetch records', error.message);
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse(500, 'Internal server error');
  }
}
```

**Usage:**
1. Copy template
2. Replace `[table]` with your table name
3. Replace `[feature]` with your route path
4. Add/remove fields in schema based on your needs
5. Add GET, PUT, DELETE methods as needed
6. Save as `app/api/[feature]/route.ts`

### 2.2 Service Layer Template

**File:** `templates/api/service-template.ts`

```typescript
// lib/services/[feature]-service.ts
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';

type FeatureTable = Database['public']['Tables']['[table]']['Row'];

export class FeatureService {
  private supabase: ReturnType<typeof createServerClient>;
  private userId: string;
  private workspaceId: string;

  constructor(supabase: ReturnType<typeof createServerClient>, userId: string, workspaceId: string) {
    this.supabase = supabase;
    this.userId = userId;
    this.workspaceId = workspaceId;
  }

  // Business logic: create
  async create(data: Partial<FeatureTable>) {
    const { data: result, error } = await this.supabase
      .from('[table]')
      .insert({
        ...data,
        workspace_id: this.workspaceId,
        created_by_id: this.userId,
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // Business logic: read
  async getById(id: string) {
    const { data, error } = await this.supabase
      .from('[table]')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', this.workspaceId)
      .single();

    if (error) throw error;
    return data;
  }

  // Business logic: list with pagination
  async listPaginated(page: number = 1, pageSize: number = 20) {
    const offset = (page - 1) * pageSize;

    const { data, error, count } = await this.supabase
      .from('[table]')
      .select('*', { count: 'exact' })
      .eq('workspace_id', this.workspaceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    return {
      items: data,
      total: count || 0,
      page,
      pageSize,
      hasNextPage: offset + pageSize < (count || 0),
    };
  }

  // Business logic: update
  async update(id: string, updates: Partial<FeatureTable>) {
    const { data, error } = await this.supabase
      .from('[table]')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id)
      .eq('workspace_id', this.workspaceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Business logic: delete
  async delete(id: string) {
    const { error } = await this.supabase
      .from('[table]')
      .delete()
      .eq('id', id)
      .eq('workspace_id', this.workspaceId);

    if (error) throw error;
  }
}
```

---

## 3. React Component Templates

### 3.1 Form Component Template

**File:** `templates/components/form-template.tsx`

```typescript
// app/[feature]/components/CreateForm.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';

interface CreateFormProps {
  workspaceId: string;
  onSuccess?: () => void;
}

export function CreateForm({ workspaceId, onSuccess }: CreateFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/[feature]', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name: formData.name,
          description: formData.description,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create');
      }

      // Success
      setFormData({ name: '', description: '' });
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name *
        </label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter name"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter description"
          disabled={loading}
          rows={4}
        />
      </div>

      <Button type="submit" disabled={loading || !formData.name}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? 'Creating...' : 'Create'}
      </Button>
    </form>
  );
}
```

### 3.2 List Component Template

**File:** `templates/components/list-template.tsx`

```typescript
// app/[feature]/components/FeatureList.tsx
'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Feature {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
}

interface ListProps {
  workspaceId: string;
  onDelete?: () => void;
}

export function FeatureList({ workspaceId, onDelete }: ListProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const loadFeatures = async () => {
      try {
        const response = await fetch(`/api/[feature]?workspaceId=${workspaceId}`);
        if (!response.ok) throw new Error('Failed to load');

        const { data } = await response.json();
        setFeatures(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    loadFeatures();
  }, [workspaceId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/[feature]/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      setFeatures((prev) => prev.filter((f) => f.id !== id));
      onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-700">
        <AlertCircle className="h-4 w-4" />
        {error}
      </div>
    );
  }

  if (features.length === 0) {
    return <p className="text-sm text-gray-500">No items yet.</p>;
  }

  return (
    <div className="space-y-2">
      {features.map((feature) => (
        <div key={feature.id} className="flex items-start justify-between rounded-md border p-3">
          <div>
            <h3 className="font-medium">{feature.name}</h3>
            {feature.description && <p className="text-sm text-gray-600">{feature.description}</p>}
            <p className="text-xs text-gray-400">{new Date(feature.createdAt).toLocaleDateString()}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(feature.id)}
            disabled={deleting === feature.id}
          >
            {deleting === feature.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
```

---

## 4. Test Templates

### 4.1 Unit Test Template

**File:** `templates/tests/unit-test-template.test.ts`

```typescript
// lib/services/__tests__/feature-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureService } from '../feature-service';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: { getUser: vi.fn() },
};

describe('FeatureService', () => {
  let service: FeatureService;

  beforeEach(() => {
    service = new FeatureService(mockSupabase as any, 'user-123', 'workspace-456');
  });

  it('should create a feature', async () => {
    const mockData = { id: 'feature-1', name: 'Test', workspace_id: 'workspace-456' };
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const result = await service.create({ name: 'Test' });

    expect(result).toEqual(mockData);
    expect(mockSupabase.from).toHaveBeenCalledWith('[table]');
  });

  it('should throw on database error', async () => {
    const mockError = new Error('DB error');
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
    });

    await expect(service.create({ name: 'Test' })).rejects.toThrow('DB error');
  });

  it('should list items paginated', async () => {
    const mockData = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 25 }),
    });

    const result = await service.listPaginated(1, 20);

    expect(result.items).toEqual(mockData);
    expect(result.total).toBe(25);
    expect(result.hasNextPage).toBe(true);
  });
});
```

### 4.2 API Test Template

**File:** `templates/tests/api-test-template.test.ts`

```typescript
// tests/api/feature.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Import your route handler
import { POST, GET } from '@/app/api/[feature]/route';

describe('POST /api/[feature]', () => {
  it('should create with valid data', async () => {
    const request = new NextRequest('http://localhost:3000/api/[feature]', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: 'workspace-123',
        name: 'Test Feature',
      }),
    });

    // Mock auth and database
    // const response = await POST(request);
    // expect(response.status).toBe(201);
  });

  it('should validate required fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/[feature]', {
      method: 'POST',
      body: JSON.stringify({
        // Missing workspaceId
        name: 'Test Feature',
      }),
    });

    // const response = await POST(request);
    // expect(response.status).toBe(400);
  });
});

describe('GET /api/[feature]', () => {
  it('should list features for workspace', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/[feature]?workspaceId=workspace-123'
    );

    // const response = await GET(request);
    // expect(response.status).toBe(200);
  });
});
```

### 4.3 E2E Test Template

**File:** `templates/tests/e2e-test-template.test.ts`

```typescript
// tests/e2e/feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('[Feature] E2E Tests', () => {
  test('should create and list features', async ({ page }) => {
    // 1. Navigate to feature page
    await page.goto('/[feature]');

    // 2. Fill form
    await page.fill('input[name="name"]', 'My Feature');
    await page.fill('textarea[name="description"]', 'Test description');

    // 3. Submit
    await page.click('button:has-text("Create")');

    // 4. Verify creation
    await expect(page.locator('text=My Feature')).toBeVisible();

    // 5. Verify it appears in list
    await expect(page.locator('h3:has-text("My Feature")')).toBeVisible();
  });

  test('should delete feature', async ({ page }) => {
    // 1. Navigate to feature page
    await page.goto('/[feature]');

    // 2. Create a feature first (or assume one exists)
    await page.fill('input[name="name"]', 'Feature to Delete');
    await page.click('button:has-text("Create")');
    await expect(page.locator('text=Feature to Delete')).toBeVisible();

    // 3. Click delete button
    const featureRow = page.locator(':has-text("Feature to Delete")').first().locator('..');
    await featureRow.locator('button').last().click();

    // 4. Confirm deletion
    await page.on('dialog', (dialog) => dialog.accept());

    // 5. Verify it's gone
    await expect(page.locator('text=Feature to Delete')).not.toBeVisible();
  });
});
```

---

## Usage Workflow

### Step 1: Decide Phase 3 Candidate (2026-07-17)
Choose one of: Evidence-Obligation Linking, Audit Logging, Advanced Analytics, Template Library Iteration

### Step 2: Copy Templates

```bash
# Database layer
cp templates/database/migration-template.sql \
   supabase/migrations/[date]_phase_3_[candidate].sql

# API layer
mkdir -p app/api/[feature]
cp templates/api/route-template.ts app/api/[feature]/route.ts
cp templates/api/service-template.ts lib/services/[feature]-service.ts

# Components
mkdir -p app/[feature]/components
cp templates/components/form-template.tsx app/[feature]/components/CreateForm.tsx
cp templates/components/list-template.tsx app/[feature]/components/List.tsx

# Tests
cp templates/tests/unit-test-template.test.ts tests/lib/services/[feature]-service.test.ts
cp templates/tests/api-test-template.test.ts tests/api/[feature].test.ts
cp templates/tests/e2e-test-template.test.ts tests/e2e/[feature].spec.ts
```

### Step 3: Customize

1. Replace `[table]` with table name (from PHASE-3-ARCHITECTURE-OPTIONS.md)
2. Replace `[feature]` with feature route path
3. Add/remove fields based on architecture
4. Add business logic specific to candidate

### Step 4: Test & Implement

1. Run tests: `npm test`
2. Implement additional features
3. Add more endpoints as needed
4. Test locally: `npm run dev`

---

## Customization Checklist

For each layer, fill in:

**Database:**
- [ ] Table name and fields (from architecture)
- [ ] Foreign keys and relationships
- [ ] Indexes for common queries
- [ ] RLS policies for workspace isolation

**API:**
- [ ] Route path (`/api/[feature]`)
- [ ] Request/response types
- [ ] Validation schemas (Zod)
- [ ] Error handling
- [ ] Authorization checks

**Components:**
- [ ] Form fields
- [ ] Validation messages
- [ ] API endpoint URLs
- [ ] Success/error handling
- [ ] Tailwind styling

**Tests:**
- [ ] Mock data for unit tests
- [ ] API request/response shapes
- [ ] Error scenarios
- [ ] User flows for E2E

---

## Performance Tips

1. **Database:**
   - Index on `(workspace_id, created_at)` for most queries
   - Use pagination for large result sets
   - Consider materialized views for expensive aggregations

2. **API:**
   - Use `.select()` to return only needed fields
   - Implement pagination (default 20 items per page)
   - Cache if data doesn't change frequently

3. **Components:**
   - Use `useCallback` for event handlers
   - Implement optimistic updates
   - Lazy-load modals/details

4. **Tests:**
   - Mock external dependencies (Supabase, etc.)
   - Test error paths, not just happy path
   - Use fixtures for repeated test data

---

**Status:** Ready to use once Phase 3 candidate is chosen  
**Expected time savings:** 1-2 days (~30-40% faster implementation)  
**Last Updated:** 2026-07-10
