'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  Filter,
  Upload,
  FileText,
  Trash2,
  Download,
} from 'lucide-react';

interface Obligation {
  id: string;
  title: string;
  description: string;
  status: 'identified' | 'in_progress' | 'completed' | 'not_applicable';
  priority: 'critical' | 'high' | 'medium' | 'low';
  due_date?: string;
  created_at: string;
  updated_at: string;
}

interface Evidence {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_by_name: string;
  uploaded_at: string;
  notes?: string;
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  critical: {
    bg: 'bg-red-950/30',
    text: 'text-red-300',
    badge: 'bg-red-900/50 text-red-200',
  },
  high: { bg: 'bg-orange-950/30', text: 'text-orange-300', badge: 'bg-orange-900/50 text-orange-200' },
  medium: {
    bg: 'bg-amber-950/30',
    text: 'text-amber-300',
    badge: 'bg-amber-900/50 text-amber-200',
  },
  low: { bg: 'bg-slate-800/30', text: 'text-slate-300', badge: 'bg-slate-800 text-slate-200' },
};

const STATUS_ICONS: Record<string, { icon: React.ReactNode; text: string; color: string }> = {
  identified: { icon: <Circle className="h-5 w-5" />, text: 'Identified', color: 'text-slate-400' },
  in_progress: {
    icon: <Clock className="h-5 w-5" />,
    text: 'In Progress',
    color: 'text-blue-400',
  },
  completed: { icon: <CheckCircle2 className="h-5 w-5" />, text: 'Completed', color: 'text-green-400' },
  not_applicable: {
    icon: <AlertCircle className="h-5 w-5" />,
    text: 'Not Applicable',
    color: 'text-slate-500',
  },
};

export default function ObligationsPage() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [filteredObligations, setFilteredObligations] = useState<Obligation[]>([]);
  const [evidence, setEvidence] = useState<Record<string, Evidence[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadEvidence = useCallback(async (obligationId: string) => {
    try {
      const res = await fetch(`/api/evidence?obligation_id=${obligationId}`);
      const data = await res.json();

      if (res.ok && data.ok) {
        setEvidence((prev) => ({ ...prev, [obligationId]: data.evidence || [] }));
      }
    } catch (err) {
      console.error('Failed to load evidence:', err);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/obligations');
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to load obligations');
      }

      setObligations(data.obligations || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load obligations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load evidence when obligation is expanded
  useEffect(() => {
    if (expandedId) {
      loadEvidence(expandedId);
    }
  }, [expandedId, loadEvidence]);

  // Apply filters
  useEffect(() => {
    let filtered = [...obligations];

    if (statusFilter) {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter((o) => o.priority === priorityFilter);
    }

    setFilteredObligations(filtered);
  }, [obligations, statusFilter, priorityFilter]);

  const handleStatusUpdate = async (obligationId: string, newStatus: string) => {
    setUpdatingId(obligationId);
    try {
      const res = await fetch(`/api/obligations/${obligationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);

      setObligations(
        obligations.map((o) => (o.id === obligationId ? { ...o, status: newStatus as any } : o))
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to update obligation');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleFileUpload = async (obligationId: string, file: File, notes?: string) => {
    setUploadingId(obligationId);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('obligation_id', obligationId);
      formData.append('file', file);
      if (notes) formData.append('notes', notes);

      const res = await fetch('/api/evidence', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to upload evidence');

      await loadEvidence(obligationId);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload file');
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteEvidence = async (obligationId: string, evidenceId: string) => {
    try {
      const res = await fetch(`/api/evidence?evidence_id=${evidenceId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to delete evidence');

      await loadEvidence(obligationId);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete evidence');
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch('/api/reports/compliance-pdf');
      if (!res.ok) throw new Error('Failed to generate report');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        res.headers.get('content-disposition')?.split('filename="')[1]?.slice(0, -1) ||
        'compliance-report.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Failed to download report');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getCompletionStats = () => {
    const total = obligations.length;
    const completed = obligations.filter((o) => o.status === 'completed').length;
    const inProgress = obligations.filter((o) => o.status === 'in_progress').length;
    const critical = obligations.filter((o) => o.priority === 'critical').length;
    const criticalComplete = obligations.filter(
      (o) => o.priority === 'critical' && o.status === 'completed'
    ).length;

    return { total, completed, inProgress, critical, criticalComplete };
  };

  const stats = getCompletionStats();
  const completionPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

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
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          {stats.total > 0 && (
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-cyan-500/40 disabled:opacity-60"
            >
              {downloadingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating PDF…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export Report
                </>
              )}
            </button>
          )}
        </div>
        <h1 className="text-3xl font-bold text-white">Compliance Obligations</h1>
        <p className="text-slate-400">
          Track and manage EU AI Act compliance obligations across your organization.
        </p>
      </div>

      {/* Progress Summary */}
      {stats.total > 0 && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-sm text-slate-400">Total Obligations</div>
            <div className="mt-2 text-2xl font-bold text-white">{stats.total}</div>
          </div>

          <div className="rounded-lg border border-green-800/60 bg-green-950/30 p-4">
            <div className="text-sm text-green-300">Completed</div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-2xl font-bold text-green-300">{stats.completed}</div>
              <div className="text-sm text-green-400">({completionPercent}%)</div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-800/60 bg-blue-950/30 p-4">
            <div className="text-sm text-blue-300">In Progress</div>
            <div className="mt-2 text-2xl font-bold text-blue-300">{stats.inProgress}</div>
          </div>

          <div className="rounded-lg border border-red-800/60 bg-red-950/30 p-4">
            <div className="text-sm text-red-300">Critical</div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-2xl font-bold text-red-300">{stats.criticalComplete}</div>
              <div className="text-sm text-red-400">/{stats.critical}</div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {stats.total > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Overall Progress</span>
            <span className="text-sm text-slate-400">{completionPercent}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-800">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      {stats.total > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter(null)}
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition ${
              statusFilter === null
                ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
            }`}
          >
            <Filter className="h-4 w-4" />
            All Status
          </button>

          {['identified', 'in_progress', 'completed', 'not_applicable'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? null : status)}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                statusFilter === status
                  ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                  : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
              }`}
            >
              {STATUS_ICONS[status].text}
            </button>
          ))}

          <div className="ml-auto flex flex-wrap gap-2">
            {['critical', 'high', 'medium', 'low'].map((priority) => (
              <button
                key={priority}
                onClick={() => setPriorityFilter(priorityFilter === priority ? null : priority)}
                className={`rounded-lg border px-3 py-2 text-sm capitalize transition ${
                  priorityFilter === priority
                    ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                    : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                }`}
              >
                {priority}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Obligations List */}
      {filteredObligations.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-8 w-8 text-slate-500" />
          <p className="text-slate-300">
            {obligations.length === 0
              ? 'No obligations yet. Complete a risk assessment to generate obligations.'
              : 'No obligations match your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredObligations.map((obligation) => {
            const priorityColor = PRIORITY_COLORS[obligation.priority];
            const statusIcon = STATUS_ICONS[obligation.status];
            const isExpanded = expandedId === obligation.id;

            return (
              <div
                key={obligation.id}
                className="rounded-lg border border-slate-800 bg-slate-900/50 transition hover:border-slate-700"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : obligation.id)}
                  className="w-full px-5 py-4 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 ${statusIcon.color}`}>{statusIcon.icon}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-2">
                        <h3 className="font-semibold text-white">{obligation.title}</h3>
                        <span
                          className={`whitespace-nowrap rounded px-2 py-1 text-xs font-semibold ${priorityColor.badge}`}
                        >
                          {obligation.priority.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-sm text-slate-400 mb-2">{obligation.description}</p>

                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        <div>{statusIcon.text}</div>
                        {obligation.due_date && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due: {new Date(obligation.due_date).toLocaleDateString()}
                          </div>
                        )}
                        <div>Created: {new Date(obligation.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <ChevronDown
                      className={`h-5 w-5 flex-shrink-0 text-slate-500 transition ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-800 px-5 py-4 space-y-4">
                    {/* Status Update */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Update Status
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['identified', 'in_progress', 'completed', 'not_applicable'].map((status) => (
                          <button
                            key={status}
                            onClick={() => handleStatusUpdate(obligation.id, status)}
                            disabled={updatingId === obligation.id}
                            className={`rounded-lg border px-3 py-2 text-sm transition disabled:opacity-50 ${
                              obligation.status === status
                                ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                                : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            {updatingId === obligation.id ? (
                              <Loader2 className="inline h-4 w-4 animate-spin" />
                            ) : (
                              STATUS_ICONS[status].text
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-slate-400">Priority</div>
                        <div className="text-white capitalize">{obligation.priority}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Status</div>
                        <div className="text-white">{statusIcon.text}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Created</div>
                        <div className="text-white">{new Date(obligation.created_at).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Last Updated</div>
                        <div className="text-white">{new Date(obligation.updated_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {/* Evidence Section */}
                    <div className="border-t border-slate-800 pt-4">
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                          Compliance Evidence
                        </label>
                        <p className="text-xs text-slate-400 mb-3">
                          Attach screenshots, documents, or reports proving this obligation is complete.
                        </p>

                        {uploadError && (
                          <div className="mb-3 rounded-lg border border-red-800/60 bg-red-950/30 p-2 text-xs text-red-200">
                            {uploadError}
                          </div>
                        )}

                        {/* Upload Input */}
                        <label className="flex items-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/30 px-4 py-3 text-sm text-slate-400 transition cursor-pointer hover:border-blue-500/50 hover:text-slate-300">
                          <Upload className="h-4 w-4" />
                          <span>
                            {uploadingId === obligation.id ? 'Uploading...' : 'Click to upload evidence'}
                          </span>
                          <input
                            type="file"
                            disabled={uploadingId === obligation.id}
                            onChange={(e) => {
                              const file = e.currentTarget.files?.[0];
                              if (file) {
                                handleFileUpload(obligation.id, file);
                                e.currentTarget.value = '';
                              }
                            }}
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.doc,.docx"
                          />
                        </label>
                      </div>

                      {/* Evidence List */}
                      {(evidence[obligation.id] || []).length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-sm text-slate-400">
                            {(evidence[obligation.id] || []).length} file
                            {(evidence[obligation.id] || []).length === 1 ? '' : 's'} uploaded
                          </div>
                          {(evidence[obligation.id] || []).map((ev) => (
                            <div
                              key={ev.id}
                              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <FileText className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-sm text-white truncate">{ev.file_name}</div>
                                  <div className="text-xs text-slate-500">
                                    {(ev.file_size / 1024).toFixed(1)} KB · {ev.uploaded_by_name} ·{' '}
                                    {new Date(ev.uploaded_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteEvidence(obligation.id, ev.id)}
                                className="ml-2 p-1.5 text-slate-500 transition hover:text-red-400 flex-shrink-0"
                                title="Delete evidence"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
