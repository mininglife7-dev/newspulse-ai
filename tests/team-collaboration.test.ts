import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  inviteToWorkspace,
  listWorkspaceMembers,
  getWorkspaceMember,
  updateMemberRole,
  removeMember,
  getAuditLog,
  getRolePermissions,
  hasPermission,
  getAllPermissions,
  validateMemberEmail,
  isValidRole,
  getRoleHierarchy,
  roleOutranks,
  ROLE_PERMISSIONS,
  type WorkspaceRole,
} from '@/lib/team-collaboration';

global.fetch = vi.fn();

describe('Team Collaboration (DNA-GOV-017)', () => {
  const mockWorkspaceId = '550e8400-e29b-41d4-a716-446655440000';
  const mockMemberId = '660e8400-e29b-41d4-a716-446655440001';
  const mockUserId = '770e8400-e29b-41d4-a716-446655440002';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Role permissions', () => {
    it('should have all role types defined', () => {
      expect(ROLE_PERMISSIONS['admin']).toBeDefined();
      expect(ROLE_PERMISSIONS['manager']).toBeDefined();
      expect(ROLE_PERMISSIONS['auditor']).toBeDefined();
      expect(ROLE_PERMISSIONS['contributor']).toBeDefined();
    });

    it('should have correct admin permissions', () => {
      const perms = ROLE_PERMISSIONS['admin'];
      expect(perms.permissions).toContain('workspace:update');
      expect(perms.permissions).toContain('members:invite');
      expect(perms.permissions).toContain('billing:update');
    });

    it('should have correct manager permissions', () => {
      const perms = ROLE_PERMISSIONS['manager'];
      expect(perms.permissions).toContain('assessments:create');
      expect(perms.permissions).toContain('evidence:review');
      expect(perms.permissions).not.toContain('billing:update');
    });

    it('should have correct auditor permissions', () => {
      const perms = ROLE_PERMISSIONS['auditor'];
      expect(perms.permissions).toContain('assessments:view');
      expect(perms.permissions).toContain('audit_log:view');
      expect(perms.permissions).not.toContain('assessments:create');
    });

    it('should have correct contributor permissions', () => {
      const perms = ROLE_PERMISSIONS['contributor'];
      expect(perms.permissions).toContain('assessments:view_own');
      expect(perms.permissions).toContain('evidence:upload');
    });
  });

  describe('getRolePermissions', () => {
    it('should return admin permissions', () => {
      const perms = getRolePermissions('admin');
      expect(perms.role).toBe('admin');
      expect(perms.permissions.length).toBeGreaterThan(0);
    });

    it('should return different permissions for different roles', () => {
      const adminPerms = getRolePermissions('admin');
      const auditorPerms = getRolePermissions('auditor');

      expect(adminPerms.permissions.length).toBeGreaterThan(auditorPerms.permissions.length);
    });
  });

  describe('hasPermission', () => {
    it('should return true for admin with workspace:update', () => {
      expect(hasPermission('admin', 'workspace:update')).toBe(true);
    });

    it('should return false for contributor with workspace:update', () => {
      expect(hasPermission('contributor', 'workspace:update')).toBe(false);
    });

    it('should handle wildcard permissions', () => {
      // admin has 'assessments:*'
      expect(hasPermission('admin', 'assessments:create')).toBe(true);
      expect(hasPermission('admin', 'assessments:update')).toBe(true);
      expect(hasPermission('admin', 'assessments:list')).toBe(true);

      // auditor does not have 'assessments:*'
      expect(hasPermission('auditor', 'assessments:create')).toBe(false);
    });

    it('should handle read permissions for auditor', () => {
      expect(hasPermission('auditor', 'assessments:view')).toBe(true);
      expect(hasPermission('auditor', 'audit_log:view')).toBe(true);
    });

    it('should restrict contributor to view_own', () => {
      expect(hasPermission('contributor', 'assessments:view_own')).toBe(true);
      expect(hasPermission('contributor', 'assessments:view')).toBe(false);
    });
  });

  describe('getAllPermissions', () => {
    it('should return all permissions for admin', () => {
      const perms = getAllPermissions('admin');
      expect(perms.length).toBeGreaterThan(5);
      expect(perms).toContain('workspace:update');
    });

    it('should return fewer permissions for contributor', () => {
      const adminPerms = getAllPermissions('admin');
      const contributorPerms = getAllPermissions('contributor');

      expect(contributorPerms.length).toBeLessThan(adminPerms.length);
    });
  });

  describe('validateMemberEmail', () => {
    it('should accept valid emails', () => {
      expect(validateMemberEmail('user@example.com')).toBe(true);
      expect(validateMemberEmail('john.doe@company.co.uk')).toBe(true);
      expect(validateMemberEmail('team+tag@domain.io')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateMemberEmail('not-an-email')).toBe(false);
      expect(validateMemberEmail('@example.com')).toBe(false);
      expect(validateMemberEmail('user@')).toBe(false);
      expect(validateMemberEmail('user name@example.com')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateMemberEmail('')).toBe(false);
    });
  });

  describe('isValidRole', () => {
    it('should accept valid roles', () => {
      expect(isValidRole('admin')).toBe(true);
      expect(isValidRole('manager')).toBe(true);
      expect(isValidRole('auditor')).toBe(true);
      expect(isValidRole('contributor')).toBe(true);
    });

    it('should reject invalid roles', () => {
      expect(isValidRole('superadmin')).toBe(false);
      expect(isValidRole('user')).toBe(false);
      expect(isValidRole('')).toBe(false);
    });
  });

  describe('getRoleHierarchy', () => {
    it('should return hierarchy in correct order', () => {
      const hierarchy = getRoleHierarchy();
      expect(hierarchy[0]).toBe('admin');
      expect(hierarchy[1]).toBe('manager');
      expect(hierarchy[2]).toBe('auditor');
      expect(hierarchy[3]).toBe('contributor');
    });

    it('should have exactly 4 roles', () => {
      expect(getRoleHierarchy().length).toBe(4);
    });
  });

  describe('roleOutranks', () => {
    it('should return true when first role outranks second', () => {
      expect(roleOutranks('admin', 'contributor')).toBe(true);
      expect(roleOutranks('manager', 'auditor')).toBe(true);
      expect(roleOutranks('admin', 'manager')).toBe(true);
    });

    it('should return false when roles equal', () => {
      expect(roleOutranks('admin', 'admin')).toBe(false);
      expect(roleOutranks('contributor', 'contributor')).toBe(false);
    });

    it('should return false when second role outranks first', () => {
      expect(roleOutranks('contributor', 'admin')).toBe(false);
      expect(roleOutranks('auditor', 'manager')).toBe(false);
    });
  });

  describe('inviteToWorkspace', () => {
    it('should send invitation', async () => {
      const mockInvitation = {
        id: 'inv1',
        workspace_id: mockWorkspaceId,
        email: 'newuser@example.com',
        role: 'manager' as WorkspaceRole,
        invited_by: mockUserId,
        created_at: '2026-07-10T12:00:00Z',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockInvitation,
      });

      const result = await inviteToWorkspace(mockWorkspaceId, 'newuser@example.com', 'manager');

      expect(result?.email).toBe('newuser@example.com');
      expect(result?.role).toBe('manager');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValue({ ok: false });

      const result = await inviteToWorkspace(mockWorkspaceId, 'user@example.com', 'contributor');

      expect(result).toBeNull();
    });
  });

  describe('listWorkspaceMembers', () => {
    it('should list all members', async () => {
      const mockMembers = [
        {
          id: 'm1',
          workspace_id: mockWorkspaceId,
          user_id: 'u1',
          role: 'admin' as WorkspaceRole,
          invited_at: '2026-07-10T12:00:00Z',
          joined_at: '2026-07-10T12:05:00Z',
        },
        {
          id: 'm2',
          workspace_id: mockWorkspaceId,
          user_id: 'u2',
          role: 'manager' as WorkspaceRole,
          invited_at: '2026-07-10T12:00:00Z',
          joined_at: '2026-07-10T12:10:00Z',
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockMembers,
      });

      const result = await listWorkspaceMembers(mockWorkspaceId);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('admin');
      expect(result[1].role).toBe('manager');
    });

    it('should return empty array on error', async () => {
      (global.fetch as any).mockResolvedValue({ ok: false });

      const result = await listWorkspaceMembers(mockWorkspaceId);

      expect(result).toEqual([]);
    });
  });

  describe('getWorkspaceMember', () => {
    it('should get specific member', async () => {
      const mockMember = {
        id: mockMemberId,
        workspace_id: mockWorkspaceId,
        user_id: mockUserId,
        role: 'manager' as WorkspaceRole,
        invited_at: '2026-07-10T12:00:00Z',
        joined_at: '2026-07-10T12:05:00Z',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockMember,
      });

      const result = await getWorkspaceMember(mockWorkspaceId, mockMemberId);

      expect(result?.role).toBe('manager');
      expect(result?.user_id).toBe(mockUserId);
    });

    it('should return null on error', async () => {
      (global.fetch as any).mockResolvedValue({ ok: false });

      const result = await getWorkspaceMember(mockWorkspaceId, mockMemberId);

      expect(result).toBeNull();
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const result = await updateMemberRole(mockWorkspaceId, mockMemberId, 'auditor');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/members/${mockMemberId}`),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('should handle errors gracefully', async () => {
      (global.fetch as any).mockResolvedValue({ ok: false });

      const result = await updateMemberRole(mockWorkspaceId, mockMemberId, 'contributor');

      expect(result).toBe(false);
    });
  });

  describe('removeMember', () => {
    it('should remove member from workspace', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });

      const result = await removeMember(mockWorkspaceId, mockMemberId);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/members/${mockMemberId}`),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should handle errors gracefully', async () => {
      (global.fetch as any).mockResolvedValue({ ok: false });

      const result = await removeMember(mockWorkspaceId, mockMemberId);

      expect(result).toBe(false);
    });
  });

  describe('getAuditLog', () => {
    it('should fetch audit log for workspace', async () => {
      const mockLog = [
        {
          id: 'log1',
          workspace_id: mockWorkspaceId,
          user_id: mockUserId,
          action: 'created',
          resource_type: 'assessment',
          resource_id: 'a1',
          changes: { status: 'draft' },
          created_at: '2026-07-10T12:00:00Z',
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockLog,
      });

      const result = await getAuditLog(mockWorkspaceId);

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('created');
    });

    it('should support filtering by resource type', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      await getAuditLog(mockWorkspaceId, { resource_type: 'assessment' });

      const callUrl = (global.fetch as any).mock.calls[0][0];
      expect(callUrl).toContain('resource_type=assessment');
    });

    it('should support filtering by user_id', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      await getAuditLog(mockWorkspaceId, { user_id: mockUserId });

      const callUrl = (global.fetch as any).mock.calls[0][0];
      expect(callUrl).toContain(`user_id=${mockUserId}`);
    });

    it('should return empty array on error', async () => {
      (global.fetch as any).mockResolvedValue({ ok: false });

      const result = await getAuditLog(mockWorkspaceId);

      expect(result).toEqual([]);
    });
  });

  describe('Integration scenarios', () => {
    it('should manage complete team workflow', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'inv1',
            workspace_id: mockWorkspaceId,
            email: 'john@example.com',
            role: 'manager',
            invited_by: mockUserId,
            created_at: '2026-07-10T12:00:00Z',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: 'm1',
              workspace_id: mockWorkspaceId,
              user_id: mockUserId,
              role: 'admin',
              invited_at: '2026-07-10T12:00:00Z',
              joined_at: '2026-07-10T12:05:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({ ok: true }); // Update role

      // Invite new member
      const invitation = await inviteToWorkspace(
        mockWorkspaceId,
        'john@example.com',
        'manager'
      );
      expect(invitation?.email).toBe('john@example.com');

      // List members
      const members = await listWorkspaceMembers(mockWorkspaceId);
      expect(members.length).toBeGreaterThan(0);

      // Update member role
      const updated = await updateMemberRole(mockWorkspaceId, mockMemberId, 'auditor');
      expect(updated).toBe(true);
    });

    it('should enforce role-based access control', () => {
      // Admin can do everything
      expect(hasPermission('admin', 'workspace:delete')).toBe(true);
      expect(hasPermission('admin', 'members:remove')).toBe(true);

      // Manager can manage assessments but not delete workspace
      expect(hasPermission('manager', 'assessments:create')).toBe(true);
      expect(hasPermission('manager', 'workspace:delete')).toBe(false);

      // Auditor can only view
      expect(hasPermission('auditor', 'assessments:view')).toBe(true);
      expect(hasPermission('auditor', 'assessments:create')).toBe(false);

      // Contributor has minimal permissions
      expect(hasPermission('contributor', 'evidence:upload')).toBe(true);
      expect(hasPermission('contributor', 'members:invite')).toBe(false);
    });

    it('should validate email before inviting', async () => {
      // Valid email should proceed
      expect(validateMemberEmail('user@example.com')).toBe(true);

      // Invalid email should fail
      expect(validateMemberEmail('not-valid')).toBe(false);
    });

    it('should maintain role hierarchy', () => {
      const hierarchy = getRoleHierarchy();

      expect(hierarchy[0]).toBe('admin');
      expect(roleOutranks(hierarchy[0], hierarchy[hierarchy.length - 1])).toBe(true);

      // Admin outranks everyone
      for (let i = 1; i < hierarchy.length; i++) {
        expect(roleOutranks('admin', hierarchy[i])).toBe(true);
      }
    });
  });
});
