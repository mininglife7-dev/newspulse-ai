# Next.js API Route Patterns

This document establishes standard patterns for structuring API routes in the EURO AI platform.

## Table of Contents

1. [Route Structure](#route-structure)
2. [Authentication & Authorization](#authentication--authorization)
3. [Request Validation](#request-validation)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)
6. [CORS & Security Headers](#cors--security-headers)
7. [Common Patterns](#common-patterns)

## Route Structure

### Directory Layout

```
app/api/
├── auth/                    # Authentication routes
│   ├── login/route.ts
│   ├── signup/route.ts
│   ├── logout/route.ts
│   └── refresh/route.ts
├── workspace/               # Workspace management
│   ├── route.ts            # GET /api/workspace, POST /api/workspace
│   ├── [id]/
│   │   └── route.ts        # GET /api/workspace/[id], PUT /api/workspace/[id]
│   └── [id]/team/
│       └── route.ts        # Team endpoints scoped to workspace
├── ai-systems/              # AI system inventory
│   ├── route.ts
│   ├── [id]/route.ts
│   └── [id]/assessments/   # Nested assessments
│       └── route.ts
└── health/
    └── route.ts            # Monitoring endpoint
```

### File Naming

- Use `route.ts` for handler files (not `index.ts`)
- Suffix handler files with method: `route.ts` handles all methods for that path
- Use `[id]` for dynamic segments matching database column names
- Use `[workspace_id]` when explicitly needed for clarity

### HTTP Methods

One handler file per path supports all applicable HTTP methods:

```typescript
export async function GET(request: NextRequest) {
  /* ... */
}
export async function POST(request: NextRequest) {
  /* ... */
}
export async function PUT(request: NextRequest) {
  /* ... */
}
export async function DELETE(request: NextRequest) {
  /* ... */
}
```

## Authentication & Authorization

### Session Verification Pattern

Every non-public route must verify the user session:

```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Proceed with authenticated request
}
```

### Workspace Authorization Pattern

Routes accessing workspace resources must verify workspace membership:

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is member of workspace
  const { data: membership, error: memberError } = await supabase
    .from('user_workspace_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('workspace_id', params.id)
    .single();

  if (memberError || !membership) {
    return Response.json({ error: 'Access Denied' }, { status: 403 });
  }

  // Role-based checks if needed
  if (membership.role === 'viewer') {
    return Response.json(
      { error: 'Insufficient Permissions' },
      { status: 403 }
    );
  }

  // Proceed with authorized request
}
```

### Public Routes

Mark public routes with a comment for clarity:

```typescript
// PUBLIC: No authentication required
export async function GET(request: NextRequest) {
  return Response.json({ status: 'ok' });
}
```

## Request Validation

### Parsing Request Body

Always validate and parse request bodies:

```typescript
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  // Validate with zod or similar
  const validation = createAiSystemSchema.safeParse(body);
  if (!validation.success) {
    return Response.json(
      { error: 'Validation failed', details: validation.error.flatten() },
      { status: 400 }
    );
  }

  // Use validated data
  const { name, description } = validation.data;
}
```

### Query Parameters

Extract and validate query parameters:

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get('limit') ?? '10';
  const offset = searchParams.get('offset') ?? '0';

  // Validate and parse
  const parsedLimit = Math.min(parseInt(limit, 10), 100);
  const parsedOffset = Math.max(parseInt(offset, 10), 0);

  if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
    return Response.json(
      { error: 'Invalid pagination parameters' },
      { status: 400 }
    );
  }
}
```

### URL Parameters (Dynamic Routes)

Access dynamic parameters from the params object:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { workspace_id: string; id: string } }
) {
  const { workspace_id, id } = params;

  // Validate IDs are UUIDs
  if (!isValidUUID(workspace_id) || !isValidUUID(id)) {
    return Response.json({ error: 'Invalid ID format' }, { status: 400 });
  }
}
```

## Response Format

### Success Response

Standard JSON response with data:

```typescript
return Response.json(
  {
    data: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'My Workspace',
      created_at: '2026-07-16T10:00:00Z',
    },
  },
  { status: 200 }
);
```

### List Response

Include pagination metadata:

```typescript
return Response.json(
  {
    data: [
      { id: 'id1', name: 'Item 1' },
      { id: 'id2', name: 'Item 2' },
    ],
    pagination: {
      total: 42,
      limit: 10,
      offset: 0,
      has_more: true,
    },
  },
  { status: 200 }
);
```

### Created Response

Include Location header and created resource:

```typescript
return Response.json(
  {
    data: {
      id: 'new-id',
      name: 'New Item',
      created_at: '2026-07-16T10:00:00Z',
    },
  },
  {
    status: 201,
    headers: {
      Location: `/api/items/${newId}`,
    },
  }
);
```

### No Content Response

For DELETE or successful operations with no return data:

```typescript
return new Response(null, { status: 204 });
```

## Error Handling

### Standard Error Response

Use consistent error format:

```typescript
return Response.json(
  {
    error: 'Resource not found',
    code: 'NOT_FOUND',
    details: {
      resource_type: 'workspace',
      resource_id: 'invalid-id',
    },
  },
  { status: 404 }
);
```

### Error Codes

Common error codes and HTTP status mappings:

| Code                | HTTP | Description                                 |
| ------------------- | ---- | ------------------------------------------- |
| INVALID_REQUEST     | 400  | Malformed request                           |
| VALIDATION_ERROR    | 400  | Request data validation failed              |
| UNAUTHORIZED        | 401  | Authentication required                     |
| FORBIDDEN           | 403  | User lacks permission                       |
| NOT_FOUND           | 404  | Resource does not exist                     |
| CONFLICT            | 409  | Resource conflict (duplicate, stale update) |
| RATE_LIMITED        | 429  | Too many requests                           |
| INTERNAL_ERROR      | 500  | Server error                                |
| SERVICE_UNAVAILABLE | 503  | Service temporarily down                    |

### Try-Catch Wrapper Pattern

Wrap database operations in try-catch blocks:

```typescript
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('items').select();

    if (error) {
      console.error('Database error:', error);
      return Response.json(
        { error: 'Database operation failed' },
        { status: 500 }
      );
    }

    return Response.json({ data });
  } catch (e) {
    console.error('Unexpected error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## CORS & Security Headers

### Default Security Headers

All responses include security headers via Next.js middleware, but route-specific headers:

```typescript
const headers = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

return Response.json({ data }, { headers });
```

### CORS for API Routes

API routes are server-to-server; CORS is not required. If cross-origin requests needed, implement in middleware, not route handlers.

## Common Patterns

### List with Filtering and Pagination

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { workspace_id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0);
  const status = searchParams.get('status');

  let query = supabase
    .from('ai_systems')
    .select('*', { count: 'exact' })
    .eq('workspace_id', params.workspace_id);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return Response.json({ error: 'Query failed' }, { status: 500 });
  }

  return Response.json({
    data,
    pagination: {
      total: count ?? 0,
      limit,
      offset,
      has_more: (count ?? 0) > offset + limit,
    },
  });
}
```

### Create with Validation

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { workspace_id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validation = createSystemSchema.safeParse(body);

  if (!validation.success) {
    return Response.json(
      { error: 'Validation failed', details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('ai_systems')
    .insert({
      workspace_id: params.workspace_id,
      ...validation.data,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'Duplicate system name' }, { status: 409 });
    }
    return Response.json({ error: 'Creation failed' }, { status: 500 });
  }

  return Response.json(
    { data },
    { status: 201, headers: { Location: `/api/ai-systems/${data.id}` } }
  );
}
```

### Update with Concurrency Control

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { updated_at: client_updated_at, ...updates } = body;

  // Check for concurrent updates
  const { data: current } = await supabase
    .from('items')
    .select('updated_at')
    .eq('id', params.id)
    .single();

  if (current && current.updated_at !== client_updated_at) {
    return Response.json(
      { error: 'Resource was modified by another request' },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: 'Update failed' }, { status: 500 });
  }

  return Response.json({ data });
}
```

### Delete with Cascade Handling

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if safe to delete (no dependent records)
  const { data: dependents } = await supabase
    .from('assessments')
    .select('id')
    .eq('ai_system_id', params.id)
    .limit(1);

  if (dependents && dependents.length > 0) {
    return Response.json(
      { error: 'Cannot delete: has associated assessments' },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from('ai_systems')
    .delete()
    .eq('id', params.id);

  if (error) {
    return Response.json({ error: 'Deletion failed' }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
```

## Middleware & Shared Logic

For shared validation, error handling, or logging, use middleware rather than duplicating in routes.

See [LIBRARY_PATTERNS.md](LIBRARY_PATTERNS.md) for organizing shared logic in `/lib`.
