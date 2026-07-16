# React Component Patterns

This document establishes patterns for building React components in EURO AI with React 19 and Next.js 16.

## Table of Contents

1. [Component Structure](#component-structure)
2. [Server vs Client Components](#server-vs-client-components)
3. [State Management](#state-management)
4. [Forms & Validation](#forms--validation)
5. [Data Fetching](#data-fetching)
6. [Composition Patterns](#composition-patterns)
7. [Accessibility](#accessibility)

## Component Structure

### File Organization

```
app/workspace/
├── page.tsx                   # Route component
├── layout.tsx                 # Layout wrapper
├── components/                # Page-specific components
│   ├── WorkspaceCard.tsx      # Single-purpose reusable
│   ├── WorkspaceList.tsx      # Composite component
│   ├── CreateWorkspaceForm.tsx
│   └── __tests__/
│       └── WorkspaceCard.test.tsx
└── [id]/                      # Dynamic route
    ├── page.tsx
    ├── layout.tsx
    └── components/
```

### Component Template

```typescript
// app/workspace/components/WorkspaceCard.tsx
'use client'

import { ReactNode } from 'react'

interface WorkspaceCardProps {
  id: string
  name: string
  description?: string | null
  createdAt: string
  onSelect?: (id: string) => void
}

export default function WorkspaceCard({
  id,
  name,
  description,
  createdAt,
  onSelect
}: WorkspaceCardProps) {
  return (
    <article
      className="card"
      onClick={() => onSelect?.(id)}
      role="button"
      tabIndex={0}
    >
      <h3>{name}</h3>
      {description && <p>{description}</p>}
      <time dateTime={createdAt}>
        {new Date(createdAt).toLocaleDateString()}
      </time>
    </article>
  )
}
```

### Naming Conventions

- **Components**: PascalCase, descriptive names (`WorkspaceCard`, `AssessmentForm`, `RiskIndicator`)
- **Props interfaces**: `{ComponentName}Props`
- **Event handlers**: `on{EventName}` pattern (`onSelect`, `onSubmit`, `onChange`)
- **Files**: Same as component name (`WorkspaceCard.tsx`)

## Server vs Client Components

### Server Components (Default)

Use server components for:
- Fetching data from databases
- Accessing environment variables
- Working with sensitive API keys
- Large dependencies (rendering 100+ items)

```typescript
// app/workspace/page.tsx
import { createClient } from '@/lib/supabase/server'
import WorkspaceList from './components/WorkspaceList'

export default async function WorkspacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Please sign in</div>
  }

  // Fetch data server-side
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select()
    .eq('user_id', user.id)

  // Pass to client component for interactivity
  return <WorkspaceList workspaces={workspaces ?? []} />
}
```

### Client Components

Use client components for:
- Interactivity (clicks, form inputs, state changes)
- Browser APIs (localStorage, window, DOM events)
- React hooks (useState, useEffect, useCallback)
- Real-time updates (WebSockets, polling)

Mark with `'use client'` directive at top of file:

```typescript
'use client'

import { useState } from 'react'
import { createWorkspace } from '@/lib/workspace'

export default function CreateWorkspaceForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
      const workspace = await createWorkspace({
        name: formData.get('name') as string,
        description: formData.get('description') as string
      })
      // Handle success (navigate, show toast, etc.)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <textarea name="description" />
      {error && <div className="error">{error}</div>}
      <button disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
```

### Hybrid Pattern

Server component fetches data, passes to client component for interactivity:

```typescript
// app/workspace/[id]/page.tsx (Server)
import { createClient } from '@/lib/supabase/server'
import WorkspaceDetails from './components/WorkspaceDetails'

export default async function WorkspaceDetailPage({
  params
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: workspace } = await supabase
    .from('workspaces')
    .select()
    .eq('id', params.id)
    .single()

  if (!workspace) return <div>Not found</div>

  return <WorkspaceDetails workspace={workspace} />
}

// app/workspace/[id]/components/WorkspaceDetails.tsx (Client)
'use client'

interface WorkspaceDetailsProps {
  workspace: {
    id: string
    name: string
    description: string | null
  }
}

export default function WorkspaceDetails({ workspace }: WorkspaceDetailsProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div>
      <h1>{workspace.name}</h1>
      <button onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? 'Done' : 'Edit'}
      </button>
      {isEditing && <WorkspaceForm workspace={workspace} />}
    </div>
  )
}
```

## State Management

### Local State (useState)

Use for UI-only state:

```typescript
'use client'

import { useState } from 'react'

export default function Tabs() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div>
      <div className="tabs">
        {['overview', 'settings', 'team'].map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      {/* Tab content based on activeTab */}
    </div>
  )
}
```

### Derived State (Computed Values)

Avoid useState for values derived from props:

```typescript
// ❌ DON'T: Derived state
export default function List({ items }) {
  const [count, setCount] = useState(items.length)
  useEffect(() => setCount(items.length), [items])
  // ...
}

// ✅ DO: Compute directly
export default function List({ items }) {
  const count = items.length
  // ...
}
```

### State Lifting

Lift state to common parent for shared state:

```typescript
// Parent
'use client'

import { useState } from 'react'
import Tab1 from './Tab1'
import Tab2 from './Tab2'

export default function TabContainer() {
  const [data, setData] = useState(null)

  return (
    <>
      <Tab1 data={data} onDataChange={setData} />
      <Tab2 data={data} onDataChange={setData} />
    </>
  )
}

// Tab components receive data and callback as props
```

### Context for Deep Props

Use Context for values needed across many levels:

```typescript
// lib/context/WorkspaceContext.tsx
'use client'

import { createContext, useContext, ReactNode } from 'react'

interface WorkspaceContextType {
  workspaceId: string
  userId: string
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({
  workspaceId,
  userId,
  children
}: {
  workspaceId: string
  userId: string
  children: ReactNode
}) {
  return (
    <WorkspaceContext.Provider value={{ workspaceId, userId }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return context
}

// Usage
'use client'

import { useWorkspace } from '@/lib/context/WorkspaceContext'

export default function AssessmentForm() {
  const { workspaceId } = useWorkspace()
  // Use workspaceId without prop drilling
}
```

## Forms & Validation

### Form Component Pattern

```typescript
'use client'

import { FormEvent, useState } from 'react'
import { validateWorkspaceInput } from '@/lib/workspace/validation'

interface CreateWorkspaceFormProps {
  onSuccess?: (workspaceId: string) => void
}

export default function CreateWorkspaceForm({ onSuccess }: CreateWorkspaceFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const input = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || undefined
    }

    // Client-side validation
    const validation = validateWorkspaceInput(input)
    if (!validation.valid) {
      setErrors({
        form: 'Please fix the errors below'
      })
      setIsLoading(false)
      return
    }

    try {
      // Server action or API call
      const response = await fetch('/api/workspace', {
        method: 'POST',
        body: JSON.stringify(input)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Failed to create workspace')
      }

      const { data: workspace } = await response.json()
      onSuccess?.(workspace.id)
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Failed to create workspace'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.submit && (
        <div className="error-message" role="alert">
          {errors.submit}
        </div>
      )}

      <div>
        <label htmlFor="name">Workspace Name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={100}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <span id="name-error" className="error-text">
            {errors.name}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          maxLength={500}
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Workspace'}
      </button>
    </form>
  )
}
```

## Data Fetching

### API Route Pattern

```typescript
'use client'

import { useEffect, useState } from 'react'

interface Workspace {
  id: string
  name: string
}

export default function WorkspaceList() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const response = await fetch('/api/workspace')
        if (!response.ok) throw new Error('Failed to fetch')
        const { data } = await response.json()
        setWorkspaces(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkspaces()
  }, [])

  if (isLoading) return <div>Loading...</div>
  if (error) return <div className="error">{error}</div>
  if (workspaces.length === 0) return <div>No workspaces</div>

  return (
    <div>
      {workspaces.map(ws => (
        <div key={ws.id}>{ws.name}</div>
      ))}
    </div>
  )
}
```

### Pagination Pattern

```typescript
'use client'

import { useEffect, useState } from 'react'

const LIMIT = 10

export default function PaginatedList() {
  const [items, setItems] = useState<any[]>([])
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function fetchItems() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/items?limit=${LIMIT}&offset=${offset}`)
        const { data, pagination } = await response.json()
        setItems(data)
        setTotal(pagination.total)
      } finally {
        setIsLoading(false)
      }
    }

    fetchItems()
  }, [offset])

  const hasMore = offset + LIMIT < total

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}

      <div className="pagination">
        <button
          disabled={offset === 0 || isLoading}
          onClick={() => setOffset(Math.max(0, offset - LIMIT))}
        >
          Previous
        </button>
        <span>{Math.floor(offset / LIMIT) + 1} / {Math.ceil(total / LIMIT)}</span>
        <button
          disabled={!hasMore || isLoading}
          onClick={() => setOffset(offset + LIMIT)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
```

## Composition Patterns

### Container/Presentational Pattern

```typescript
// Container: Handles data, logic
'use client'

import { useEffect, useState } from 'react'
import { WorkspaceList } from './WorkspaceList'

export default function WorkspaceContainer() {
  const [workspaces, setWorkspaces] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch logic
  }, [])

  return (
    <WorkspaceList
      workspaces={workspaces}
      isLoading={isLoading}
      onSelect={(id) => {
        // Handle selection
      }}
    />
  )
}

// Presentational: Only renders props
interface WorkspaceListProps {
  workspaces: Array<{ id: string; name: string }>
  isLoading: boolean
  onSelect: (id: string) => void
}

export function WorkspaceList({
  workspaces,
  isLoading,
  onSelect
}: WorkspaceListProps) {
  if (isLoading) return <div>Loading...</div>

  return (
    <ul>
      {workspaces.map(ws => (
        <li key={ws.id} onClick={() => onSelect(ws.id)}>
          {ws.name}
        </li>
      ))}
    </ul>
  )
}
```

### Render Props Pattern

For complex conditional rendering:

```typescript
interface ConditionalRenderProps {
  condition: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function ConditionalRender({
  condition,
  fallback,
  children
}: ConditionalRenderProps) {
  if (!condition) return fallback ?? null
  return children
}

// Usage
<ConditionalRender
  condition={hasPermission}
  fallback={<div>No permission</div>}
>
  <AdminPanel />
</ConditionalRender>
```

## Accessibility

### Semantic HTML

Always use semantic elements:

```typescript
// ✅ GOOD
<article>
  <h2>Workspace Title</h2>
  <p>Description</p>
  <button>Action</button>
</article>

// ❌ AVOID
<div onClick={() => {}}>
  <div>Workspace Title</div>
  <div>Description</div>
  <div>Action</div>
</div>
```

### ARIA Attributes

Use ARIA for complex interactive components:

```typescript
export default function TabPanel() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div>
      <div role="tablist">
        {['Tab 1', 'Tab 2', 'Tab 3'].map((label, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === activeTab}
            aria-controls={`panel-${i}`}
            onClick={() => setActiveTab(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {['Tab 1', 'Tab 2', 'Tab 3'].map((label, i) => (
        <div
          key={i}
          id={`panel-${i}`}
          role="tabpanel"
          aria-labelledby={`tab-${i}`}
          hidden={i !== activeTab}
        >
          Content for {label}
        </div>
      ))}
    </div>
  )
}
```

### Forms Accessibility

```typescript
export default function AccessibleForm() {
  return (
    <form>
      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          name="email"
          required
          aria-required="true"
          aria-describedby="email-hint"
        />
        <p id="email-hint" className="hint">
          We'll never share your email
        </p>
      </div>

      <fieldset>
        <legend>Assessment Type</legend>
        <div>
          <input
            id="type-full"
            type="radio"
            name="type"
            value="full"
          />
          <label htmlFor="type-full">Full Assessment</label>
        </div>
        <div>
          <input
            id="type-quick"
            type="radio"
            name="type"
            value="quick"
          />
          <label htmlFor="type-quick">Quick Assessment</label>
        </div>
      </fieldset>
    </form>
  )
}
```
