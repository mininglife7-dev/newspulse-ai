'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react';

interface Obligation {
  id: string;
  title: string;
  description: string;
  source: string;
  status: 'identified' | 'in_progress' | 'completed' | 'not_applicable';
  priority: 'critical' | 'high' | 'medium' | 'low';
  due_date: string | null;
  created_at: string;
}

const PRIORITY_COLORS = {
  critical: 'bg-red-950/50 text-red-300 border-red-800/60',
  high: 'bg-orange-950/50 text-orange-300 border-orange-800/60',
  medium: 'bg-amber-950/50 text-amber-300 border-amber-800/60',
  low: 'bg-blue-950/50 text-blue-300 border-blue-800/60',
};

const STATUS_COLORS = {
  completed: 'text-green-400',
  in_progress: 'text-cyan-400',
  identified: 'text-amber-400',
  not_applicable: 'text-slate-400',
};

const STATUS_ICONS = {
  completed: CheckCircle,
  in_progress: Clock,
  identified: AlertTriangle,
  not_applicable: X,
};

export default function ObligationsPage() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadObligations();
  }, []);

  const loadObligations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/obligations?companyId=true');
      if (res.status === 401) {
        window.location.href = '/auth/signin?redirect=/obligations';
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to load');
      setObligations(data.obligations || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load obligations');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (obligationId: string, newStatus: string) => {
    setUpdatingId(obligationId);
    try {
      const res = await fetch(`/api/obligations/${obligationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      if (data.ok) {
        setObligations((prev) =>
          prev.map((o) => (o.id === obligationId ? data.obligation : o))
        );
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update obligation');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredObligations = obligations
    .filter((o) => {
      if (filterStatus && o.status !== filterStatus) return false;
      if (filterPriority && o.priority !== filterPriority) return false;
      if (searchQuery && !o.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 99) - (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 99);
    });

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading obligations…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/compliance"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to compliance
        </Link>
        <h1 className="text-3xl font-bold text-white mt-2">Compliance Obligations</h1>
        <p className="text-slate-400">Manage EU AI Act obligations across your organization</p>
      </div>

      {/* Filters */}
      <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex gap-2">
          <Filter className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Status and Priority Filters */}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="identified">Identified</option>
                  <option value="not_applicable">Not Applicable</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Priority</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">All priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Obligations List */}
      {filteredObligations.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
          {obligations.length === 0 ? 'No obligations yet' : 'No obligations match your filters'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredObligations.map((obligation) => {
            const StatusIcon = STATUS_ICONS[obligation.status];
            return (
              <div
                key={obligation.id}
                className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition"
              >
                <div className="flex items-start gap-4">
                  {/* Priority Badge & Status */}
                  <div className="flex gap-2 flex-shrink-0 pt-1">
                    <div
                      className={`px-2 py-1 rounded text-xs font-semibold border ${PRIORITY_COLORS[obligation.priority]}`}
                    >
                      {obligation.priority.charAt(0).toUpperCase() + obligation.priority.slice(1)}
                    </div>
                    <StatusIcon className={`h-5 w-5 ${STATUS_COLORS[obligation.status]}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{obligation.title}</h3>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{obligation.description}</p>
                    <div className="flex gap-4 text-xs text-slate-500 mt-2">
                      <span>Source: {obligation.source}</span>
                      {obligation.due_date && (
                        <span>Due: {new Date(obligation.due_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Status Actions */}
                  {obligation.status !== 'completed' && obligation.status !== 'not_applicable' && (
                    <div className="flex gap-2 flex-shrink-0">
                      {obligation.status === 'identified' && (
                        <button
                          onClick={() => handleStatusChange(obligation.id, 'in_progress')}
                          disabled={updatingId === obligation.id}
                          className="px-2 py-1 text-xs font-medium rounded bg-cyan-900/50 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/70 disabled:opacity-50"
                        >
                          {updatingId === obligation.id ? 'Starting...' : 'Start'}
                        </button>
                      )}
                      {obligation.status === 'in_progress' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(obligation.id, 'completed')}
                            disabled={updatingId === obligation.id}
                            className="px-2 py-1 text-xs font-medium rounded bg-green-900/50 text-green-300 border border-green-800/60 hover:bg-green-900/70 disabled:opacity-50"
                          >
                            {updatingId === obligation.id ? 'Completing...' : 'Complete'}
                          </button>
                          <button
                            onClick={() => handleStatusChange(obligation.id, 'identified')}
                            disabled={updatingId === obligation.id}
                            className="px-2 py-1 text-xs font-medium rounded bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-800 disabled:opacity-50"
                          >
                            Revert
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Completed/Not Applicable */}
                  {(obligation.status === 'completed' || obligation.status === 'not_applicable') && (
                    <div className="text-xs font-semibold text-slate-400 py-1 px-2">
                      {obligation.status === 'completed' ? '✓ Completed' : 'N/A'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
        Showing {filteredObligations.length} of {obligations.length} obligation
        {obligations.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
