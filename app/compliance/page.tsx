'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2, Plus, AlertTriangle } from 'lucide-react';

interface Obligation {
  id: string;
  text: string;
  source_assessment_id: string;
  source_system_name: string;
}

interface RemediationPlan {
  id: string;
  title: string;
  description: string | null;
  owner: string | null;
  target_date: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold';
  created_at: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  planned: {
    bg: 'bg-slate-900/30',
    text: 'text-slate-400',
    icon: AlertCircle,
  },
  in_progress: {
    bg: 'bg-blue-900/30',
    text: 'text-blue-300',
    icon: Loader2,
  },
  completed: {
    bg: 'bg-green-900/30',
    text: 'text-green-300',
    icon: CheckCircle2,
  },
  on_hold: {
    bg: 'bg-orange-900/30',
    text: 'text-orange-300',
    icon: AlertTriangle,
  },
};

export default function CompliancePage() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [plans, setPlans] = useState<RemediationPlan[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [newPlanData, setNewPlanData] = useState({
    title: '',
    description: '',
    owner: '',
    target_date: '',
    obligation_text: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [obsRes, plansRes] = await Promise.all([
        fetch('/api/obligations'),
        fetch('/api/remediation-plans'),
      ]);

      if (obsRes.status === 401 || plansRes.status === 401) {
        window.location.href = '/auth/signin?redirect=/compliance';
        return;
      }

      if (obsRes.status === 409 || plansRes.status === 409) {
        setLoadError('Complete workspace setup first');
        setObligations([]);
        setPlans([]);
        return;
      }

      const [obsData, plansData] = await Promise.all([
        obsRes.json().catch(() => ({ ok: false, error: 'Server error' })),
        plansRes.json().catch(() => ({ ok: false, error: 'Server error' })),
      ]);

      if (!obsData.ok || !plansData.ok) {
        throw new Error('Failed to load data');
      }

      setObligations(obsData.obligations || []);
      setPlans(plansData.plans || []);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load compliance data');
      setObligations([]);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanData.title.trim()) {
      setCreateError('Title is required');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/remediation-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPlanData.title,
          description: newPlanData.description || undefined,
          owner: newPlanData.owner || undefined,
          target_date: newPlanData.target_date || undefined,
          obligation_text: newPlanData.obligation_text || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to create plan' }));
        throw new Error(data.error || `Error: ${res.status}`);
      }

      setNewPlanData({ title: '', description: '', owner: '', target_date: '', obligation_text: '' });
      setShowCreatePlan(false);
      await loadData();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create remediation plan');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading compliance data...
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
        <h1 className="text-3xl font-bold text-white">Compliance Management</h1>
        <p className="text-slate-400">
          Track compliance obligations and remediation plans from your risk assessments
        </p>
      </div>

      {loadError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>{loadError}</div>
        </div>
      )}

      {!loadError && obligations.length === 0 && plans.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-12 text-center">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-slate-600" />
          <h2 className="text-lg font-semibold text-white">No obligations yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Start by assessing your AI systems to identify compliance obligations.
          </p>
          <Link
            href="/risk-assessment"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-2 text-sm font-medium text-white transition hover:shadow-lg"
          >
            Begin Risk Assessment
          </Link>
        </div>
      )}

      {(obligations.length > 0 || plans.length > 0) && (
        <>
          {/* Obligations Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Identified Obligations ({obligations.length})</h2>
            </div>

            {obligations.length > 0 ? (
              <div className="space-y-3">
                {obligations.map((obligation) => (
                  <div
                    key={obligation.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-white">{obligation.text}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          From: {obligation.source_system_name}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setNewPlanData({ ...newPlanData, obligation_text: obligation.text });
                          setShowCreatePlan(true);
                        }}
                        className="flex-shrink-0 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                      >
                        Create Plan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No obligations identified yet</p>
            )}
          </div>

          {/* Remediation Plans Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Remediation Plans ({plans.length})</h2>
              <button
                onClick={() => {
                  setNewPlanData({ title: '', description: '', owner: '', target_date: '', obligation_text: '' });
                  setShowCreatePlan(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:shadow-lg"
              >
                <Plus className="h-4 w-4" />
                New Plan
              </button>
            </div>

            {plans.length > 0 ? (
              <div className="space-y-3">
                {plans.map((plan) => {
                  const statusColor = STATUS_COLORS[plan.status];
                  const StatusIcon = statusColor.icon;
                  return (
                    <div
                      key={plan.id}
                      className={`rounded-lg border ${statusColor.bg} p-4`}
                    >
                      <div className="flex items-start gap-3">
                        <StatusIcon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${statusColor.text}`} />
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{plan.title}</h3>
                          {plan.description && (
                            <p className="mt-1 text-sm text-slate-300">{plan.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
                            {plan.owner && <span>Owner: {plan.owner}</span>}
                            {plan.target_date && (
                              <span>Due: {new Date(plan.target_date).toLocaleDateString()}</span>
                            )}
                            <span>Created: {new Date(plan.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColor.text} ${statusColor.bg}`}>
                            {plan.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No remediation plans yet</p>
            )}
          </div>

          {/* Create Plan Modal */}
          {showCreatePlan && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-4">Create Remediation Plan</h3>

                {createError && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-800/60 bg-red-950/30 p-3 text-red-200">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{createError}</p>
                  </div>
                )}

                <form onSubmit={handleCreatePlan} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Plan Title *
                    </label>
                    <input
                      type="text"
                      value={newPlanData.title}
                      onChange={(e) => setNewPlanData({ ...newPlanData, title: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      placeholder="e.g., Implement automated bias testing"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newPlanData.description}
                      onChange={(e) => setNewPlanData({ ...newPlanData, description: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      placeholder="Details about this remediation plan"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Owner
                    </label>
                    <input
                      type="text"
                      value={newPlanData.owner}
                      onChange={(e) => setNewPlanData({ ...newPlanData, owner: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      placeholder="Name of responsible person"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={newPlanData.target_date}
                      onChange={(e) => setNewPlanData({ ...newPlanData, target_date: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {newPlanData.obligation_text && (
                    <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700">
                      <p className="text-xs font-medium text-slate-400">Related to:</p>
                      <p className="mt-1 text-sm text-slate-300">{newPlanData.obligation_text}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreatePlan(false)}
                      className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {creating ? 'Creating...' : 'Create Plan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
