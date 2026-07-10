/**
 * DNA-GOV-017: Team Collaboration
 *
 * Multi-user workspace management, role-based access control, activity auditing.
 *
 * Purpose: Enable teams to collaborate securely on compliance management.
 */

export type WorkspaceRole = 'admin' | 'manager' | 'auditor' | 'contributor';

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_at: string;
  joined_at?: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  invited_by: string;
  created_at: string;
  accepted_at?: string;
  expires_at: string;
}

export interface AuditLogEntry {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes: Record<string, any>;
  created_at: string;
}

export interface RolePermissions {
  role: WorkspaceRole;
  permissions: string[];
  description: string;
}

// Role-based access control definitions
export const ROLE_PERMISSIONS: Record<WorkspaceRole, RolePermissions> = {
  admin: {
    role: 'admin',
    permissions: [
      'workspace:update',
      'workspace:delete',
      'members:invite',
      'members:update',
      'members:remove',
      'billing:update',
      'assessments:*',
      'evidence:*',
      'reports:*',
      'audit_log:view',
    ],
    description: 'Full workspace control, billing, member management',
  },
  manager: {
    role: 'manager',
    permissions: [
      'assessments:create',
      'assessments:update',
      'assessments:list',
      'evidence:upload',
      'evidence:review',
      'evidence:approve',
      'reports:generate',
      'reports:export',
      'members:list',
      'audit_log:view',
    ],
    description: 'Assessment oversight, evidence review, team reporting',
  },
  auditor: {
    role: 'auditor',
    permissions: [
      'assessments:view',
      'evidence:view',
      'reports:view',
      'members:list',
      'audit_log:view',
    ],
    description: 'Read-only access to assessments and evidence',
  },
  contributor: {
    role: 'contributor',
    permissions: [
      'assessments:view_own',
      'evidence:upload',
      'evidence:view_own',
    ],
    description: 'Create evidence, update own assessments',
  },
};

/**
 * Invite user to workspace
 */
export async function inviteToWorkspace(
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
  expiresIn = 7 * 24 * 60 * 60 * 1000 // 7 days
): Promise<WorkspaceInvitation | null> {
  try {
    const response = await fetch('/api/workspace/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        email,
        role,
        expires_at: new Date(Date.now() + expiresIn).toISOString(),
      }),
    });

    if (!response.ok) return null;

    return response.json();
  } catch (err) {
    console.error('[team-collaboration] Failed to invite user:', err);
    return null;
  }
}

/**
 * List workspace members
 */
export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  try {
    const response = await fetch(`/api/workspace/${workspaceId}/members`);

    if (!response.ok) return [];

    return response.json();
  } catch (err) {
    console.error('[team-collaboration] Failed to list members:', err);
    return [];
  }
}

/**
 * Get member by ID
 */
export async function getWorkspaceMember(
  workspaceId: string,
  memberId: string
): Promise<WorkspaceMember | null> {
  try {
    const response = await fetch(`/api/workspace/${workspaceId}/members/${memberId}`);

    if (!response.ok) return null;

    return response.json();
  } catch (err) {
    console.error('[team-collaboration] Failed to get member:', err);
    return null;
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  newRole: WorkspaceRole
): Promise<boolean> {
  try {
    const response = await fetch(`/api/workspace/${workspaceId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });

    return response.ok;
  } catch (err) {
    console.error('[team-collaboration] Failed to update member role:', err);
    return false;
  }
}

/**
 * Remove member from workspace
 */
export async function removeMember(workspaceId: string, memberId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/workspace/${workspaceId}/members/${memberId}`, {
      method: 'DELETE',
    });

    return response.ok;
  } catch (err) {
    console.error('[team-collaboration] Failed to remove member:', err);
    return false;
  }
}

/**
 * Get audit log for workspace
 */
export async function getAuditLog(
  workspaceId: string,
  options?: {
    resource_type?: string;
    user_id?: string;
    limit?: number;
  }
): Promise<AuditLogEntry[]> {
  try {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (options?.resource_type) params.append('resource_type', options.resource_type);
    if (options?.user_id) params.append('user_id', options.user_id);
    if (options?.limit) params.append('limit', String(options.limit));

    const response = await fetch(`/api/workspace/audit-log?${params}`);

    if (!response.ok) return [];

    return response.json();
  } catch (err) {
    console.error('[team-collaboration] Failed to get audit log:', err);
    return [];
  }
}

/**
 * Get role permissions
 */
export function getRolePermissions(role: WorkspaceRole): RolePermissions {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if role has permission
 */
export function hasPermission(role: WorkspaceRole, permission: string): boolean {
  const rolePerms = ROLE_PERMISSIONS[role];
  return rolePerms.permissions.some((p) => {
    if (p === '*' || p.endsWith(':*')) {
      // Wildcard match: e.g., 'assessments:*' matches 'assessments:create'
      const prefix = p.slice(0, -1); // Remove *
      return permission.startsWith(prefix);
    }
    return p === permission;
  });
}

/**
 * Get all permissions for a role
 */
export function getAllPermissions(role: WorkspaceRole): string[] {
  return ROLE_PERMISSIONS[role].permissions;
}

/**
 * Validate member email
 */
export function validateMemberEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if role is valid
 */
export function isValidRole(role: string): role is WorkspaceRole {
  return ['admin', 'manager', 'auditor', 'contributor'].includes(role);
}

/**
 * Get role hierarchy (higher roles have more permissions)
 */
export function getRoleHierarchy(): WorkspaceRole[] {
  return ['admin', 'manager', 'auditor', 'contributor'];
}

/**
 * Check if one role outranks another
 */
export function roleOutranks(role1: WorkspaceRole, role2: WorkspaceRole): boolean {
  const hierarchy = getRoleHierarchy();
  return hierarchy.indexOf(role1) < hierarchy.indexOf(role2);
}
