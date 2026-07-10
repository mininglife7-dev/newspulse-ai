'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Loader2,
  Plus,
  TrendingDown,
} from 'lucide-react';

interface AiSystem {
  id: string;
  name: string;
  description: string | null;
  system_type: string | null;
  vendor: string | null;
  purpose: string | null;
  status: string;
  created_at: string;
}

interface AssessmentStatus {
  status?: 'draft' | 'in_review' | 'finalized';
  risk_level?: string;
  risk_score?: number;
}

const SYSTEM_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'large_language_model', label: 'Large Language Model' },
  { value: 'generative_ai', label: 'Generative AI' },
  { value: 'classification_system', label: 'Classification System' },
  { value: 'recommendation_system', label: 'Recommendation System' },
  { value: 'computer_vision', label: 'Computer Vision' },
  { value: 'biometric_system', label: 'Biometric System' },
  { value: 'decision_support', label: 'Decision Support' },
  { value: 'other', label: 'Other' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-950/50 text-green-300 border-green-800/60',
  pilot: 'bg-amber-950/50 text-amber-300 border-amber-800/60',
  deprecated: 'bg-slate-800/60 text-slate-400 border-slate-700',
};

export default function InventoryPage() {
  const [systems, setSystems] = useState<AiSystem[] | null>(null);
  const [assessments, setAssessments] = useState<Record<string, AssessmentStatus>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    systemType: '',
    vendor: '',
    purpose: '',
    status: 'active',
  });

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/ai-systems');
      if (res.status === 401) {
        window.location.href = '/auth/signin?redirect=/inventory';
        return;
      }
      const data = await res.json();
      if (res.status === 409) {
        setNeedsSetup(true);
        setSystems([]);
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to load');
      setSystems(data.systems);

      // Load assessments for each system
      if (data.systems?.length > 0) {
        const assessmentMap: Record<string, AssessmentStatus> = {};
        for (const system of data.systems) {
          try {
            const assessRes = await fetch(`/api/risk-assessments?ai_system_id=${system.id}`);
            const assessData = await assessRes.json();
            if (assessRes.ok && assessData.ok && assessData.assessment) {
              assessmentMap[system.id] = assessData.assessment;
            }
          } catch {
            // Silently skip assessment load errors
          }
        }
        setAssessments(assessmentMap);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load your AI systems');
      setSystems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Please give the system a name');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/ai-systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save');
      setForm({ name: '', systemType: '', vendor: '', purpose: '', status: 'active' });
      setShowForm(false);
      await load();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-white">AI Systems Inventory</h1>
        <p className="text-slate-400">
          Every AI system your organization uses, in one register — the
          foundation for EU AI Act risk classification.
        </p>
      </div>

      {needsSetup && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-800/60 bg-amber-950/30 p-5 text-amber-200">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            Complete your{' '}
            <Link href="/workspace/setup" className="underline hover:text-amber-100">
              company setup
            </Link>{' '}
            first — the inventory belongs to your workspace.
          </div>
        </div>
      )}

      {loadError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>{loadError}</div>
        </div>
      )}

      {!needsSetup && systems !== null && (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {systems.length === 0
                ? 'No systems registered yet'
                : `${systems.length} system${systems.length === 1 ? '' : 's'} registered`}
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-blue-500/40"
            >
              <Plus className="h-4 w-4" />
              Add AI system
            </button>
          </div>

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
                  <label htmlFor="name" className="mb-1 block text-sm text-slate-300">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Customer-support chatbot"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="systemType" className="mb-1 block text-sm text-slate-300">
                    Type
                  </label>
                  <select
                    id="systemType"
                    value={form.systemType}
                    onChange={(e) => setForm({ ...form, systemType: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select…</option>
                    {SYSTEM_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="vendor" className="mb-1 block text-sm text-slate-300">
                    Vendor / provider
                  </label>
                  <input
                    id="vendor"
                    value={form.vendor}
                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    placeholder="e.g. OpenAI, internal"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="status" className="mb-1 block text-sm text-slate-300">
                    Status
                  </label>
                  <select
                    id="status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="pilot">Pilot</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="purpose" className="mb-1 block text-sm text-slate-300">
                  Purpose
                </label>
                <textarea
                  id="purpose"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder="What is this system used for?"
                  rows={2}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-2 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-blue-500/40 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Saving…' : 'Save system'}
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

          {systems.length === 0 && !showForm ? (
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-12 text-center">
              <Cpu className="mx-auto mb-4 h-10 w-10 text-slate-600" />
              <h2 className="text-lg font-semibold text-white">
                Start your AI inventory
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                Register the AI systems your organization uses — chatbots,
                scoring models, recommendation engines. Each one becomes the
                subject of a risk assessment in the next step.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {systems.map((s) => {
                const assessment = assessments[s.id];
                const isAssessmentComplete = assessment?.status === 'finalized';

                return (
                  <li
                    key={s.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/50 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Cpu className="h-5 w-5 text-cyan-400" />
                        <span className="font-semibold text-white">{s.name}</span>
                        {s.system_type && (
                          <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-xs text-slate-300">
                            {SYSTEM_TYPE_OPTIONS.find((o) => o.value === s.system_type)?.label ??
                              s.system_type}
                          </span>
                        )}
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS_BADGE[s.status] ?? STATUS_BADGE.deprecated}`}
                      >
                        {s.status}
                      </span>
                    </div>
                    {(s.vendor || s.purpose) && (
                      <div className="mt-2 text-sm text-slate-400">
                        {s.vendor && <span className="mr-4">Vendor: {s.vendor}</span>}
                        {s.purpose && <span>{s.purpose}</span>}
                      </div>
                    )}

                    {/* Assessment status */}
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {isAssessmentComplete ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                            <span className="text-xs text-green-300">
                              Risk: <span className="font-semibold">{assessment?.risk_level}</span> (
                              {assessment?.risk_score}/100)
                            </span>
                          </>
                        ) : assessment ? (
                          <span className="text-xs text-amber-300">
                            Assessment in progress ({assessment.status})
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">No assessment started</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isAssessmentComplete && (
                          <Link
                            href={`/assessment-progress?ai_system_id=${s.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:border-emerald-500 hover:bg-emerald-950/50"
                          >
                            <TrendingDown className="h-3 w-3" />
                            View Progress
                          </Link>
                        )}
                        <Link
                          href={`/assessment?ai_system_id=${s.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-600/40 bg-blue-950/30 px-3 py-1.5 text-xs font-medium text-blue-300 transition hover:border-blue-500 hover:bg-blue-950/50"
                        >
                          {isAssessmentComplete ? 'Review' : assessment ? 'Continue' : 'Start'} Assessment
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {systems === null && !loadError && (
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading inventory…
        </div>
      )}
    </div>
  );
}
