'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, Calendar, User, FileText } from 'lucide-react';
import { getActionDescription } from '@/lib/audit-log';

interface AuditEntry {
  id: string;
  action_type: string;
  entity_type: string;
  entity_name: string | null;
  created_at: string;
  user_id: string | null;
}

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  assessment_created: { bg: 'bg-blue-900/20', text: 'text-blue-300' },
  assessment_finalized: { bg: 'bg-blue-900/20', text: 'text-blue-300' },
  evidence_submitted: { bg: 'bg-purple-900/20', text: 'text-purple-300' },
  evidence_reviewed: { bg: 'bg-amber-900/20', text: 'text-amber-300' },
  evidence_approved: { bg: 'bg-green-900/20', text: 'text-green-300' },
  evidence_rejected: { bg: 'bg-red-900/20', text: 'text-red-300' },
  plan_created: { bg: 'bg-cyan-900/20', text: 'text-cyan-300' },
  plan_updated: { bg: 'bg-cyan-900/20', text: 'text-cyan-300' },
  plan_status_changed: { bg: 'bg-cyan-900/20', text: 'text-cyan-300' },
  plan_completed: { bg: 'bg-green-900/20', text: 'text-green-300' },
  obligation_identified: { bg: 'bg-slate-900/20', text: 'text-slate-300' },
  obligation_completed: { bg: 'bg-green-900/20', text: 'text-green-300' },
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  useEffect(() => {
    const loadAuditLog = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (actionFilter) params.append('action_type', actionFilter);
        if (entityFilter) params.append('entity_type', entityFilter);
        params.append('limit', '100');

        const res = await fetch(`/api/audit-log?${params.toString()}`);

        if (res.status === 401) {
          window.location.href = '/auth/signin?redirect=/audit-log';
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
          throw new Error(data.error || 'Failed to load audit log');
        }

        setEntries(data.entries || []);
      } catch (err: any) {
        setError(err?.message || 'Could not load audit log');
      } finally {
        setLoading(false);
      }
    };

    loadAuditLog();
  }, [actionFilter, entityFilter]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading audit log...
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
        <h1 className="text-3xl font-bold text-white">Audit Log</h1>
        <p className="text-slate-400">
          Track all compliance actions and changes for regulatory requirements
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Action Type</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            <option value="">All actions</option>
            <option value="assessment_created">Assessment Created</option>
            <option value="evidence_submitted">Evidence Submitted</option>
            <option value="evidence_approved">Evidence Approved</option>
            <option value="evidence_rejected">Evidence Rejected</option>
            <option value="plan_created">Plan Created</option>
            <option value="plan_status_changed">Plan Status Changed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Entity Type</label>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            <option value="">All entities</option>
            <option value="risk_assessment">Risk Assessment</option>
            <option value="evidence">Evidence</option>
            <option value="remediation_plan">Remediation Plan</option>
            <option value="obligation">Obligation</option>
          </select>
        </div>
      </div>

      {/* Audit Log Entries */}
      <div className="space-y-2">
        {entries.length > 0 ? (
          entries.map((entry) => {
            const colors = ACTION_COLORS[entry.action_type] || { bg: 'bg-slate-900/20', text: 'text-slate-300' };
            const description = getActionDescription(entry.action_type as any, entry.entity_name);

            return (
              <div
                key={entry.id}
                className={`rounded-lg border border-slate-700 ${colors.bg} p-4`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${colors.text}`}>{description}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(entry.created_at).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {entry.entity_type}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/20 p-8 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-400">No audit log entries found</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4 text-center">
        <p className="text-xs text-slate-400">
          Audit log shows compliance actions for regulatory verification and accountability
        </p>
      </div>
    </div>
  );
}
