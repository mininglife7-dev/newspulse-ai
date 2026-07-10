'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, Plus, Trash2, CheckCircle, Clock } from 'lucide-react';

interface WorkspaceMember {
  id: string;
  email: string;
  role: 'viewer' | 'member' | 'admin' | 'owner';
  status: 'pending' | 'active' | 'removed';
  created_at: string;
  joined_at: string | null;
}

const ROLE_LABELS: Record<string, { label: string; color: string; description: string }> = {
  owner: { label: 'Owner', color: 'text-red-400', description: 'Full access, manage team' },
  admin: { label: 'Admin', color: 'text-orange-400', description: 'Manage members, all features' },
  member: { label: 'Member', color: 'text-blue-400', description: 'Create and edit assessments' },
  viewer: { label: 'Viewer', color: 'text-slate-400', description: 'Read-only access' },
};

const ROLE_OPTIONS = ['viewer', 'member', 'admin', 'owner'] as const;

export default function TeamPage() {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'member' | 'admin'>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [updatingRoles, setUpdatingRoles] = useState<Record<string, boolean>>({});
  const [deletingMembers, setDeletingMembers] = useState<Record<string, boolean>>({});
  const [showInviteForm, setShowInviteForm] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/workspace/members');

      if (res.status === 401) {
        window.location.href = '/auth/signin?redirect=/team';
        return;
      }

      if (res.status === 409) {
        setError('Complete workspace setup first');
        return;
      }

      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || 'Failed to load members');
      }

      setMembers(data.members || []);
      setCurrentUserRole(data.currentUserRole || null);
    } catch (err: any) {
      setError(err?.message || 'Could not load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setInviteError(null);
    try {
      const res = await fetch('/api/workspace/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to invite member');
      }

      setMembers([...members, data.member]);
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);
    } catch (err: any) {
      setInviteError(err?.message || 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    setUpdatingRoles({ ...updatingRoles, [memberId]: true });
    try {
      const res = await fetch(`/api/workspace/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to update role');
      }

      setMembers(members.map(m => (m.id === memberId ? { ...m, role: newRole as any } : m)));
    } catch (err: any) {
      setError(err?.message || 'Failed to update role');
    } finally {
      setUpdatingRoles({ ...updatingRoles, [memberId]: false });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure? This will remove the member from the workspace.')) return;

    setDeletingMembers({ ...deletingMembers, [memberId]: true });
    try {
      const res = await fetch(`/api/workspace/members/${memberId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to remove member');
      }

      setMembers(members.filter(m => m.id !== memberId));
    } catch (err: any) {
      setError(err?.message || 'Failed to remove member');
    } finally {
      setDeletingMembers({ ...deletingMembers, [memberId]: false });
    }
  };

  const canManageTeam = currentUserRole === 'admin' || currentUserRole === 'owner';
  const activeMemberCount = members.filter(m => m.status === 'active').length;
  const pendingInvitesCount = members.filter(m => m.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading team...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold text-white">Team Management</h1>
        <p className="text-slate-400">
          Manage workspace members, roles, and permissions
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div>
              <div className="text-sm text-slate-400">Active Members</div>
              <div className="text-2xl font-bold text-white">{activeMemberCount}</div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-400" />
            <div>
              <div className="text-sm text-slate-400">Pending Invites</div>
              <div className="text-2xl font-bold text-white">{pendingInvitesCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Form */}
      {canManageTeam && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Invite Member</h2>
            {!showInviteForm && (
              <button
                onClick={() => setShowInviteForm(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Invite
              </button>
            )}
          </div>

          {showInviteForm && (
            <form onSubmit={handleInvite} className="space-y-4">
              {inviteError && (
                <div className="rounded-lg border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">
                  {inviteError}
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-3">
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {inviting ? 'Inviting...' : 'Send Invite'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                {ROLE_LABELS[inviteRole].description}
              </p>
            </form>
          )}
        </div>
      )}

      {/* Members Table */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Workspace Members</h2>
        </div>

        {members.length > 0 ? (
          <div className="divide-y divide-slate-700">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 hover:bg-slate-700/50 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {member.email[0].toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{member.email}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs font-medium ${ROLE_LABELS[member.role].color}`}>
                          {ROLE_LABELS[member.role].label}
                        </span>
                        {member.status === 'pending' && (
                          <span className="text-xs font-medium text-amber-400">Pending</span>
                        )}
                        {member.status === 'removed' && (
                          <span className="text-xs font-medium text-red-400">Removed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {canManageTeam && member.status === 'active' && (
                  <div className="flex gap-2 ml-4">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                      disabled={updatingRoles[member.id]}
                      className="rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role].label}
                        </option>
                      ))}
                    </select>
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={deletingMembers[member.id]}
                        className="rounded-lg border border-red-800/60 bg-red-950/30 px-2 py-1 text-red-300 hover:bg-red-950/60 transition disabled:opacity-50"
                        title="Remove member"
                      >
                        {deletingMembers[member.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-400">No team members yet</p>
          </div>
        )}
      </div>

      {/* Role Reference */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Role Permissions</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {Object.entries(ROLE_LABELS).map(([role, info]) => (
            <div key={role} className="text-sm">
              <p className={`font-medium ${info.color}`}>{info.label}</p>
              <p className="text-slate-400">{info.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
