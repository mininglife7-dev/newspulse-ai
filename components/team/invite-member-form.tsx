'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface InviteMemberFormProps {
  workspaceId: string;
  onSuccess?: () => void;
}

const ROLES = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access except workspace deletion',
  },
  {
    value: 'member',
    label: 'Member',
    description: 'Can create and manage content',
  },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

export function InviteMemberForm({
  workspaceId,
  onSuccess,
}: InviteMemberFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'member',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!formData.email) {
        throw new Error('Email is required');
      }

      if (!formData.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      const response = await fetch('/api/workspace/invite-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          email: formData.email,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite member');
      }

      setSuccess(true);
      setFormData({
        email: '',
        role: 'member',
      });

      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Email Address *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="colleague@example.com"
          required
          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
        />
      </div>

      {/* Role Selection */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Role *
        </label>
        <div className="space-y-3">
          {ROLES.map((role) => (
            <label
              key={role.value}
              className={`block p-4 rounded-lg border-2 cursor-pointer transition ${
                formData.role === role.value
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={formData.role === role.value}
                  onChange={handleChange}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-white">{role.label}</p>
                  <p className="text-sm text-slate-400">{role.description}</p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="rounded-lg border border-green-800/50 bg-green-900/20 p-4 flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-300 text-sm">
            Invitation sent successfully!
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
      >
        {loading && <Loader className="w-4 h-4 animate-spin" />}
        {loading ? 'Sending...' : 'Send Invitation'}
      </button>
    </form>
  );
}
