'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const handleDeleteAccount = async () => {
    if (!deleteConfirmed) {
      setError(
        'You must confirm that you understand this action is permanent.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmed: true,
          reason: deleteReason || 'User requested account deletion',
        }),
        credentials: 'include',
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to delete account. Please try again.'
        );
      }

      // Redirect to homepage after successful deletion
      // Session will be cleared by Supabase auth
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/50">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <Link href="/dashboard" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Account Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-md border border-red-800/60 bg-red-950/30 px-4 py-3 text-red-200">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Account Deletion Section */}
        <div className="rounded-lg border border-red-800/40 bg-red-950/20 p-6">
          <div className="mb-4 flex items-start gap-3">
            <Trash2 className="mt-1 h-6 w-6 text-red-400" />
            <div>
              <h2 className="text-xl font-bold text-red-300">
                Delete Your Account
              </h2>
              <p className="mt-1 text-sm text-red-200/70">
                GDPR Article 17 (Right to Erasure)
              </p>
            </div>
          </div>

          <p className="mb-4 text-sm text-slate-300">
            Deleting your account will permanently remove all your data from
            EURO AI, including:
          </p>
          <ul className="mb-6 space-y-2 text-sm text-slate-400">
            <li className="flex gap-2">
              <span className="text-red-400">•</span>
              <span>Your account and login credentials</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-400">•</span>
              <span>All workspaces you created or own</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-400">•</span>
              <span>
                AI system inventories, assessments, and compliance records
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-400">•</span>
              <span>Evidence documents and remediation plans</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-400">•</span>
              <span>All audit logs and team access records</span>
            </li>
          </ul>

          <div className="mb-6 rounded-md border border-red-800/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            <strong>⚠️ Warning:</strong> This action is permanent and
            irreversible. Once deleted, your data cannot be recovered.
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              disabled={loading}
            >
              Delete My Account
            </button>
          ) : (
            <div className="space-y-4 rounded-md border border-red-700/60 bg-red-950/30 p-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Reason for deletion (optional)
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Help us improve..."
                  className="mt-2 w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-red-700"
                  rows={3}
                />
              </div>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={deleteConfirmed}
                  onChange={(e) => setDeleteConfirmed(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-slate-300">
                  I understand that this action is permanent and will delete all
                  my data. I cannot undo this.
                </span>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmed(false);
                    setDeleteReason('');
                  }}
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
                  disabled={!deleteConfirmed || loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {loading ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Compliance Info */}
        <div className="mt-8 rounded-md border border-blue-800/40 bg-blue-950/20 p-4 text-sm text-blue-200">
          <strong>Data Subject Rights:</strong> EURO AI is committed to your
          privacy and data rights under the GDPR. This deletion feature
          implements your{' '}
          <a
            href="https://gdpr-info.eu/art-17-gdpr/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-300"
          >
            right to erasure (Article 17)
          </a>
          . For other data subject requests (access, portability), contact your
          workspace administrator or legal representative.
        </div>
      </div>
    </div>
  );
}
