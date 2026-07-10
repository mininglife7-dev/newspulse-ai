'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Plus,
  Users,
  Trash2,
  Mail,
} from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'pending' | 'active' | 'removed';
  joined_at: string | null;
  invited_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-red-950/50 text-red-300 border-red-800/60',
  admin: 'bg-purple-950/50 text-purple-300 border-purple-800/60',
  member: 'bg-blue-950/50 text-blue-300 border-blue-800/60',
  viewer: 'bg-slate-800/60 text-slate-400 border-slate-700',
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Full access, cannot be removed',
  admin: 'Can manage team, invite members, edit settings',
  member: 'Can view assessments, upload evidence',
  viewer: 'Read-only access to compliance data',
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    role: 'member' as const,
  });

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/team');
      if (res.status === 401) {
        window.location.href = '/auth/signin?redirect=/team';
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to load');
      setMembers(data.members || []);

      // Check if current user can manage (is admin or owner)
      // We determine this by trying the POST, but for now assume if they can see this page they can manage
      setCanManage(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!form.email.trim()) {
      setFormError('Please enter an email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setFormError('Please enter a valid email address');
      return;
    }
    setInviting(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.toLowerCase().trim(),
          role: form.role,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to invite');
      setForm({ email: '', role: 'member' });
      setShowForm(false);
      await loadMembers();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this member from the workspace?')) return;
    try {
      const res = await fetch(`/api/team/${memberId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove member');
      await loadMembers();
    } catch (err: any) {
      alert(err?.message || 'Failed to remove member');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      await loadMembers();
    } catch (err: any) {
      alert(err?.message || 'Failed to update role');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading team…
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
          Invite colleagues and manage access to your workspace
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {canManage && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {members.filter((m) => m.status !== 'removed').length} member{members.filter((m) => m.status !== 'removed').length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-blue-500/40"
          >
            <Plus className="h-4 w-4" />
            Invite member
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-6"
        >
          {formError && (
            <div className="flex items-center gap-2 rounded-md border border-red-800/60 bg-red-950/30 px-4 py-2 text-sm text-red-200">
              <AlertCircle className="h-4 w-4" /> {formError}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm text-slate-300">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="colleague@company.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="role" className="mb-1 block text-sm text-slate-300">
                Role <span className="text-red-400">*</span>
              </label>
              <select
                id="role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            {ROLE_DESCRIPTIONS[form.role]}
          </p>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={inviting}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-2 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-blue-500/40 disabled:opacity-60"
            >
              {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-700 px-5 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Role Legend */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-6">
        <h3 className="font-semibold text-white mb-4">Role Permissions</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(ROLE_LABELS).map(([role, label]) => (
            <div
              key={role}
              className={`rounded-lg border px-4 py-3 ${ROLE_COLORS[role]}`}
            >
              <div className="font-medium text-sm">{label}</div>
              <div className="text-xs opacity-75 mt-1">
                {ROLE_DESCRIPTIONS[role]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Members List */}
      {members.filter((m) => m.status !== 'removed').length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-12 text-center">
          <Users className="mx-auto mb-4 h-10 w-10 text-slate-600" />
          <h2 className="text-lg font-semibold text-white">Just you for now</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Invite team members to collaborate on compliance assessments and evidence collection.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {members
            .filter((m) => m.status !== 'removed')
            .map((member) => (
              <li
                key={member.id}
                className="rounded-lg border border-slate-800 bg-slate-900/50 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-5 w-5 text-cyan-400" />
                      <span className="font-medium text-white">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs ${ROLE_COLORS[member.role]}`}
                      >
                        {ROLE_LABELS[member.role]}
                      </span>
                      {member.status === 'pending' && (
                        <span className="rounded-full border border-amber-800/60 bg-amber-950/30 px-2.5 py-0.5 text-xs text-amber-300">
                          Invitation pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {member.status === 'active'
                        ? `Joined ${new Date(member.joined_at!).toLocaleDateString()}`
                        : `Invited ${new Date(member.invited_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  {member.role !== 'owner' && canManage && (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="text-slate-400 hover:text-red-400 transition"
                        title="Remove member"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
