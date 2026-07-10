'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  EU_AI_ACT_QUESTIONS,
  calculateRiskLevel,
  type RiskLevel,
} from '@/lib/risk-assessments';

interface AiSystem {
  id: string;
  name: string;
  system_type: string | null;
}

interface Assessment {
  id: string;
  ai_system_id: string;
  risk_level: RiskLevel;
  risk_score: number;
  status: string;
  created_at: string;
  ai_systems?: { id: string; name: string };
}

const RISK_BADGE: Record<RiskLevel, { bg: string; text: string; icon: typeof AlertOctagon }> = {
  unacceptable: { bg: 'bg-red-950/50 text-red-300 border-red-800/60', text: 'Unacceptable', icon: AlertOctagon },
  high: { bg: 'bg-orange-950/50 text-orange-300 border-orange-800/60', text: 'High', icon: AlertTriangle },
  medium: { bg: 'bg-amber-950/50 text-amber-300 border-amber-800/60', text: 'Medium', icon: AlertTriangle },
  low: { bg: 'bg-green-950/50 text-green-300 border-green-800/60', text: 'Low', icon: CheckCircle },
};

export default function RiskAssessmentsPage() {
  const [systems, setSystems] = useState<AiSystem[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    fundamental_rights: true,
    safety: false,
    bias_discrimination: false,
    transparency: false,
    accountability: false,
  });

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [systemsRes, assessmentRes] = await Promise.all([
        fetch('/api/ai-systems'),
        fetch('/api/risk-assessments'),
      ]);

      if (systemsRes.status === 401 || assessmentRes.status === 401) {
        window.location.href = '/auth/signin?redirect=/risk-assessments';
        return;
      }

      if (systemsRes.status === 409 || assessmentRes.status === 409) {
        setNeedsSetup(true);
        setSystems([]);
        setAssessments([]);
        return;
      }

      const systemsData = await systemsRes.json();
      const assessmentData = await assessmentRes.json();

      if (!systemsRes.ok || !systemsData.ok) throw new Error(systemsData.error);
      if (!assessmentRes.ok || !assessmentData.ok) throw new Error(assessmentData.error);

      setSystems(systemsData.systems);
      setAssessments(assessmentData.assessments);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load risk assessments');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedSystem = systems.find((s) => s.id === selectedSystemId);
  const existingAssessment = assessments.find((a) => a.ai_system_id === selectedSystemId);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSystemId) return;

    setFormError(null);
    setSaving(true);

    try {
      const res = await fetch('/api/risk-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiSystemId: selectedSystemId,
          answers,
          status: 'draft',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save');

      setAnswers({});
      setSelectedSystemId(null);
      await load();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const categories = ['fundamental_rights', 'safety', 'bias_discrimination', 'transparency', 'accountability'] as const;
  const categoryLabels: Record<(typeof categories)[number], string> = {
    fundamental_rights: 'Fundamental Rights',
    safety: 'Safety',
    bias_discrimination: 'Bias & Discrimination',
    transparency: 'Transparency',
    accountability: 'Accountability',
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold text-white">EU AI Act Risk Assessment</h1>
        <p className="text-slate-300">
          Evaluate each AI system against EU AI Act compliance requirements. The
          questionnaire classifies risk as low, medium, high, or unacceptable.
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
            and inventory an AI system first — start with the{' '}
            <Link href="/inventory" className="underline hover:text-amber-100">
              AI Systems Inventory
            </Link>
            .
          </div>
        </div>
      )}

      {loadError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>{loadError}</div>
        </div>
      )}

      {!needsSetup && systems.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Systems List */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">AI Systems</h2>
            <ul className="space-y-2">
              {systems.map((system) => {
                const hasAssessment = assessments.some((a) => a.ai_system_id === system.id);
                return (
                  <li key={system.id}>
                    <button
                      onClick={() => setSelectedSystemId(system.id)}
                      className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                        selectedSystemId === system.id
                          ? 'border-blue-500 bg-blue-950/30'
                          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">{system.name}</div>
                          {system.system_type && (
                            <div className="text-xs text-slate-400">{system.system_type}</div>
                          )}
                        </div>
                        {hasAssessment && <CheckCircle className="h-4 w-4 text-green-400" />}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Assessment Form */}
          {selectedSystem && !existingAssessment && (
            <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Assess: {selectedSystem.name}
                </h3>
                {formError && (
                  <div className="mb-4 flex items-center gap-2 rounded-md border border-red-800/60 bg-red-950/30 px-4 py-2 text-sm text-red-200">
                    <AlertCircle className="h-4 w-4" /> {formError}
                  </div>
                )}

                <div className="space-y-4">
                  {categories.map((category) => {
                    const categoryQuestions = EU_AI_ACT_QUESTIONS.filter((q) => q.category === category);
                    const isExpanded = expandedCategories[category];

                    return (
                      <div key={category} className="border border-slate-700/50 rounded-lg">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCategories({
                              ...expandedCategories,
                              [category]: !isExpanded,
                            })
                          }
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/30 transition"
                          aria-expanded={isExpanded}
                          aria-label={`${categoryLabels[category]} questions (${isExpanded ? 'expanded' : 'collapsed'})`}
                        >
                          <span className="font-medium text-white">
                            {categoryLabels[category]} ({categoryQuestions.length})
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="space-y-3 px-4 py-3 border-t border-slate-700/50">
                            {categoryQuestions.map((q) => (
                              <label key={q.id} className="flex items-start gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={answers[q.id] ?? false}
                                  onChange={(e) =>
                                    setAnswers({
                                      ...answers,
                                      [q.id]: e.target.checked,
                                    })
                                  }
                                  className="mt-1 rounded border-slate-700 text-blue-500"
                                />
                                <div>
                                  <div className="text-sm font-medium text-white">{q.question}</div>
                                  {q.description && (
                                    <div className="text-xs text-slate-400 mt-1">{q.description}</div>
                                  )}
                                  <div className="text-xs text-slate-500 mt-1">
                                    Severity: <span className="capitalize">{q.severity}</span>
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-2 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-blue-500/40 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Assessing…' : 'Submit Assessment'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSystemId(null)}
                  className="rounded-lg border border-slate-700 px-5 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {existingAssessment && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Assessment: {selectedSystem?.name}
                  </h3>
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                      RISK_BADGE[existingAssessment.risk_level].bg
                    }`}
                  >
                    {(() => {
                      const Icon = RISK_BADGE[existingAssessment.risk_level].icon;
                      return <Icon className="h-4 w-4" />;
                    })()}
                    {RISK_BADGE[existingAssessment.risk_level].text}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-slate-400">Risk Score</div>
                  <div className="text-3xl font-bold text-white">{existingAssessment.risk_score}</div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        existingAssessment.risk_level === 'unacceptable'
                          ? 'bg-red-500'
                          : existingAssessment.risk_level === 'high'
                            ? 'bg-orange-500'
                            : existingAssessment.risk_level === 'medium'
                              ? 'bg-amber-500'
                              : 'bg-green-500'
                      }`}
                      style={{ width: `${existingAssessment.risk_score}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSystemId(null)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
                >
                  Assess Another System
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!needsSetup && assessments.length === 0 && systems.length === 0 && !loadError && (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-slate-600" />
          <h2 className="text-lg font-semibold text-white">No AI systems yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Start by inventorying your AI systems, then assess each one for EU AI Act
            compliance.
          </p>
          <Link href="/inventory" className="inline-block mt-4 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition">
            Go to Inventory
          </Link>
        </div>
      )}

      {/* Summary section when assessments exist */}
      {assessments.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Assessment Summary</h2>
          <div className="grid gap-4 md:grid-cols-4">
            {(['unacceptable', 'high', 'medium', 'low'] as const).map((level) => {
              const count = assessments.filter((a) => a.risk_level === level).length;
              return (
                <div key={level} className="rounded-lg bg-slate-800/50 p-4">
                  <div className={`text-sm font-medium ${RISK_BADGE[level].text}`}>
                    {RISK_BADGE[level].text}
                  </div>
                  <div className="text-2xl font-bold text-white mt-2">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
