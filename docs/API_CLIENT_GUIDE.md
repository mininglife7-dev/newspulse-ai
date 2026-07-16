# EURO AI TypeScript API Client Guide

**File:** `lib/api-client.ts`  
**Type-safe:** Yes (full TypeScript support)  
**Framework:** Next.js, React

---

## Quick Start

### Import the Client

```typescript
import { apiClient } from '@/lib/api-client';
```

### Create an Assessment

```typescript
const response = await apiClient.assessments.create({
  ai_system_id: 'system-123',
  risk_level: 'high',
  risk_score: 75,
  assessment_data: {
    model: 'gpt-4',
    training_data: 'proprietary',
    drift_detected: true,
  },
});

if (response.ok && response.data) {
  console.log('Assessment created:', response.data.id);
} else {
  console.error('Error:', response.error);
}
```

### List Assessments

```typescript
const response = await apiClient.assessments.list();

if (response.ok && response.data) {
  response.data.forEach((assessment) => {
    console.log(`${assessment.id}: ${assessment.risk_level}`);
  });
}
```

### Invite Team Member

```typescript
const response = await apiClient.team.invite('workspace-123', {
  email: 'colleague@company.com',
  role: 'member',
});

if (response.ok) {
  console.log('Invitation sent');
}
```

---

## API Reference

### Assessment Client

#### `create(options)`

Create a new risk assessment.

**Parameters:**

```typescript
{
  ai_system_id: string;                    // Required: ID of AI system
  risk_level: 'unacceptable'               // Required: Risk classification
            | 'high'
            | 'medium'
            | 'low';
  risk_score?: number;                     // Optional: 0-100
  assessment_data?: Record<string, any>;   // Optional: Custom data
  status?: 'draft'                         // Optional: Default 'draft'
          | 'in_review'
          | 'finalized';
}
```

**Returns:**

```typescript
Promise<ApiResponse<Assessment>> where Assessment = {
  id: string;
  workspace_id: string;
  ai_system_id: string;
  risk_level: 'unacceptable' | 'high' | 'medium' | 'low';
  risk_score?: number;
  assessment_data?: Record<string, unknown>;
  status: 'draft' | 'in_review' | 'finalized';
  created_at: string;
  updated_at: string;
}
```

**Errors:**

- `400` — Missing required fields or invalid risk_level
- `401` — User not authenticated
- `404` — AI system not found in workspace
- `409` — No workspace (complete company setup first)

---

#### `list()`

Fetch all assessments in user's current workspace.

**Returns:**

```typescript
Promise<ApiResponse<Assessment[]>>;
```

**Errors:**

- `401` — User not authenticated
- `409` — No workspace

---

#### `get(id)`

Fetch a single assessment by ID.

**Parameters:**

- `id: string` — Assessment ID

**Returns:**

```typescript
Promise<ApiResponse<Assessment>>;
```

**Errors:**

- `401` — User not authenticated
- `404` — Assessment not found
- `403` — Access denied (not in workspace)

---

#### `update(id, options)`

Update assessment fields (partial update supported).

**Parameters:**

- `id: string` — Assessment ID
- `options: Partial<Assessment>` — Fields to update

**Example:**

```typescript
await apiClient.assessments.update('assessment-123', {
  risk_level: 'medium',
  status: 'in_review',
});
```

**Returns:**

```typescript
Promise<ApiResponse<Assessment>>;
```

**Errors:**

- `400` — Invalid risk_level
- `401` — User not authenticated
- `404` — Assessment not found
- `403` — Access denied

---

#### `delete(id)`

Delete an assessment.

**Parameters:**

- `id: string` — Assessment ID

**Returns:**

```typescript
Promise<ApiResponse<void>>;
```

**Errors:**

- `401` — User not authenticated
- `404` — Assessment not found
- `403` — Access denied

---

### Team Client

#### `listMembers(workspaceId)`

Fetch all members in a workspace.

**Parameters:**

- `workspaceId: string` — Workspace ID

**Returns:**

```typescript
Promise<ApiResponse<WorkspaceMember[]>> where WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id?: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending';
  joined_at?: string;
  invited_at?: string;
}
```

**Errors:**

- `401` — User not authenticated
- `403` — Not a member of workspace

---

#### `invite(workspaceId, options)`

Invite a new member to workspace.

**Parameters:**

```typescript
{
  email: string;                           // Required: Email address
  role?: 'owner'                           // Optional: Default 'member'
       | 'admin'
       | 'member'
       | 'viewer';
}
```

**Returns:**

```typescript
Promise<ApiResponse<WorkspaceMember>>;
```

**Errors:**

- `400` — Invalid email format
- `401` — User not authenticated
- `403` — Only owner/admin can invite
- `409` — Email already a member

---

#### `acceptInvitation(workspaceId, memberId)`

Accept a pending invitation (invited user only).

**Parameters:**

- `workspaceId: string` — Workspace ID
- `memberId: string` — Membership record ID

**Returns:**

```typescript
Promise<ApiResponse<WorkspaceMember>>;
```

**Errors:**

- `401` — User not authenticated
- `404` — Invitation not found
- `409` — Invitation not pending

---

#### `rejectInvitation(workspaceId, memberId)`

Reject or delete an invitation.

**Parameters:**

- `workspaceId: string` — Workspace ID
- `memberId: string` — Membership record ID

**Returns:**

```typescript
Promise<ApiResponse<void>>;
```

**Errors:**

- `401` — User not authenticated
- `404` — Invitation not found

---

#### `removeMember(workspaceId, memberId)`

Remove a member from workspace (owner/admin only).

**Parameters:**

- `workspaceId: string` — Workspace ID
- `memberId: string` — Membership record ID

**Returns:**

```typescript
Promise<ApiResponse<void>>;
```

**Errors:**

- `401` — User not authenticated
- `403` — Only owner/admin can remove
- `409` — Cannot remove yourself
- `404` — Member not found

---

#### `changeRole(workspaceId, memberId, role)`

Change member's role (owner only).

**Parameters:**

- `workspaceId: string` — Workspace ID
- `memberId: string` — Membership record ID
- `role: 'admin' | 'member' | 'viewer'` — New role

**Returns:**

```typescript
Promise<ApiResponse<WorkspaceMember>>;
```

**Errors:**

- `400` — Invalid role
- `401` — User not authenticated
- `403` — Only owner can change roles
- `404` — Member not found
- `409` — Cannot change owner role

---

## React Component Examples

### Assessment List Component

```typescript
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Assessment } from '@/lib/api-client';

export function AssessmentList() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const response = await apiClient.assessments.list();
        if (response.ok && response.data) {
          setAssessments(response.data);
        } else {
          setError(response.error || 'Failed to load assessments');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div>
      <h2>Assessments ({assessments.length})</h2>
      <ul>
        {assessments.map(a => (
          <li key={a.id}>
            {a.id}: {a.risk_level} (score: {a.risk_score})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Team Members Component

```typescript
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { WorkspaceMember } from '@/lib/api-client';

export function TeamMembers({ workspaceId }: { workspaceId: string }) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleInvite() {
    setLoading(true);
    try {
      const response = await apiClient.team.invite(workspaceId, {
        email: inviteEmail,
        role: 'member',
      });
      if (response.ok) {
        setInviteEmail('');
        // Refresh list
        const list = await apiClient.team.listMembers(workspaceId);
        if (list.ok && list.data) setMembers(list.data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(memberId: string) {
    await apiClient.team.removeMember(workspaceId, memberId);
    const list = await apiClient.team.listMembers(workspaceId);
    if (list.ok && list.data) setMembers(list.data);
  }

  return (
    <div>
      <h2>Team Members</h2>
      <div className="mb-4">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="colleague@company.com"
        />
        <button onClick={handleInvite} disabled={loading}>
          Invite
        </button>
      </div>
      <ul>
        {members.map(m => (
          <li key={m.id}>
            {m.email} ({m.role}) - {m.status}
            {m.status === 'active' && (
              <button onClick={() => handleRemove(m.id)}>Remove</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Assessment Creation Component

```typescript
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export function CreateAssessment({ aiSystemId }: { aiSystemId: string }) {
  const [riskLevel, setRiskLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const [riskScore, setRiskScore] = useState(50);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiClient.assessments.create({
        ai_system_id: aiSystemId,
        risk_level: riskLevel,
        risk_score: riskScore,
        status: 'draft',
      });
      if (response.ok) {
        setMessage(`Assessment created: ${response.data?.id}`);
      } else {
        setMessage(`Error: ${response.error}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Risk Level:
        <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as any)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <label>
        Risk Score:
        <input
          type="range"
          min="0"
          max="100"
          value={riskScore}
          onChange={(e) => setRiskScore(Number(e.target.value))}
        />
        {riskScore}
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Assessment'}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

---

## Error Handling Pattern

```typescript
import { handleApiError } from '@/lib/api-client';

async function doSomething() {
  const response = await apiClient.assessments.create({...});

  const error = handleApiError(response);
  if (error) {
    console.error('API Error:', error.message);
    // Handle error: show toast, update UI, etc.
    return;
  }

  // Use response.data safely
  if (response.data) {
    console.log('Success:', response.data);
  }
}
```

---

## TypeScript Support

All methods are fully typed. TypeScript will catch errors at compile time:

```typescript
// ✅ This is valid
await apiClient.assessments.create({
  ai_system_id: 'sys-1',
  risk_level: 'high', // Literal type, not string
});

// ❌ TypeScript error: 'invalid' is not assignable
await apiClient.assessments.create({
  ai_system_id: 'sys-1',
  risk_level: 'invalid', // Compile error
});
```

---

## Testing

See `tests/api-client.test.ts` for comprehensive usage examples and test patterns.

---

_Last Updated: 2026-07-15_
