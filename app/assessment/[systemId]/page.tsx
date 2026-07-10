'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { AssessmentQuestion, RiskAssessmentResult } from '@/lib/risk-assessment';
import { getRiskLevelColor, getRiskLevelLabel } from '@/lib/risk-assessment';

interface AISystem {
  id: string;
  name: string;
  description: string | null;
  system_type: string | null;
}

interface Assessment {
  id: string;
  ai_system_id: string;
  risk_level: string;
  risk_score: number;
  assessment_data: {
    answers: Record<string, any>;
    classification: RiskAssessmentResult;
    completedAt: string;
  };
  status: string;
}

interface Obligation {
  id: string;
  title: string;
  description: string;
  source: string;
  status: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  due_date: string | null;
  created_at: string;
}

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const systemId = params.systemId as string;

  const [system, setSystem] = useState<AISystem | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingObligation, setUpdatingObligation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RiskAssessmentResult | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Load system and existing assessment
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // Load system details
        const systemRes = await fetch(`/api/ai-systems?id=${systemId}`);
        if (!systemRes.ok) throw new Error('Failed to load system');
        const systemData = await systemRes.json();
        if (!systemData.ok || !systemData.systems?.[0]) {
          throw new Error('System not found');
        }
        setSystem(systemData.systems[0]);

        // Load questions
        const qRes = await fetch('/api/assessments/questions');
        if (!qRes.ok) throw new Error('Failed to load questions');
        const qData = await qRes.json();
        setQuestions(qData.questions || []);

        // Load existing assessment if any
        const aRes = await fetch(`/api/assessments?systemId=${systemId}`);
        if (!aRes.ok) throw new Error('Failed to load assessment');
        const aData = await aRes.json();

        if (aData.ok && aData.assessment) {
          setAssessment(aData.assessment);
          setAnswers(aData.assessment.assessment_data?.answers || {});
          if (aData.assessment.assessment_data?.classification) {
            setResult(aData.assessment.assessment_data.classification);
          }

          // Load auto-generated obligations for this assessment
          try {
            const obRes = await fetch(`/api/obligations?assessmentId=${aData.assessment.id}`);
            if (obRes.ok) {
              const obData = await obRes.json();
              if (obData.ok && obData.obligations) {
                setObligations(obData.obligations);
              }
            }
          } catch {
            // Silently skip obligation loading errors
          }
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load assessment');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [systemId]);

  const handleUpdateObligationStatus = async (
    obligationId: string,
    newStatus: string
  ) => {
    setUpdatingObligation(obligationId);
    try {
      const res = await fetch(`/api/obligations/${obligationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to update');

      // Update local state
      setObligations((prev) =>
        prev.map((ob) =>
          ob.id === obligationId ? { ...ob, status: newStatus } : ob
        )
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to update obligation status');
    } finally {
      setUpdatingObligation(null);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiSystemId: systemId,
          answers,
          status: 'draft',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save');

      setAssessment(data.assessment);
      setResult(data.classification);
    } catch (err: any) {
      setError(err?.message || 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!assessment) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/assessments/${assessment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'finalized' }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to finalize');

      setAssessment(data.assessment);
      // Redirect to inventory after finalization
      setTimeout(() => router.push('/inventory'), 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to finalize assessment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!system) {
    return (
      <div className="space-y-4">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inventory
        </Link>
        <div className="rounded-lg border border-red-800/60 bg-red-950/30 p-4 text-red-200">
          AI system not found
        </div>
      </div>
    );
  }

  // Get visible questions based on conditional logic
  const answersMap = new Map(Object.entries(answers));
  const visibleQuestions = questions.filter((q) => {
    if (!q.showIf) return true;
    return q.showIf(answersMap);
  });

  // Group questions by category
  const categories = Array.from(
    new Map(
      visibleQuestions.map((q) => [
        q.category,
        visibleQuestions.filter((x) => x.category === q.category),
      ])
    )
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inventory
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Risk Assessment</h1>
          <p className="text-slate-400">{system.name}</p>
          {system.description && (
            <p className="text-sm text-slate-500 mt-1">{system.description}</p>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-4 text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Result Display (if finalized) */}
      {result && (
        <div
          className={`rounded-lg border-2 p-6 ${
            result.riskLevel === 'unacceptable'
              ? 'border-red-600/50 bg-red-950/20'
              : result.riskLevel === 'high'
                ? 'border-orange-600/50 bg-orange-950/20'
                : result.riskLevel === 'medium'
                  ? 'border-amber-600/50 bg-amber-950/20'
                  : 'border-green-600/50 bg-green-950/20'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {result.riskLevel === 'unacceptable' ? (
                <AlertTriangle className="h-6 w-6 text-red-400" />
              ) : result.riskLevel === 'high' ? (
                <AlertTriangle className="h-6 w-6 text-orange-400" />
              ) : result.riskLevel === 'medium' ? (
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-400" />
              )}
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {getRiskLevelLabel(result.riskLevel)} Classification
                </h2>
                <p
                  className={`text-sm ${
                    result.riskLevel === 'unacceptable'
                      ? 'text-red-300'
                      : result.riskLevel === 'high'
                        ? 'text-orange-300'
                        : result.riskLevel === 'medium'
                          ? 'text-amber-300'
                          : 'text-green-300'
                  }`}
                >
                  Risk Score: {result.riskScore}/100
                </p>
              </div>
            </div>

            {/* Reasoning */}
            {result.reasoning.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-white">Assessment Findings</h3>
                <ul className="space-y-1 text-sm text-slate-300">
                  {result.reasoning.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-slate-500">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-white">Recommendations</h3>
                <ul className="space-y-1 text-sm text-slate-300">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-slate-500">→</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto-Generated Obligations */}
      {obligations.length > 0 && (
        <div className="rounded-lg border border-blue-800/60 bg-blue-950/30 p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Generated Compliance Obligations</h2>
              <p className="text-sm text-slate-400 mt-1">
                Based on this assessment, the following compliance obligations were automatically identified
              </p>
            </div>

            <div className="space-y-3">
              {obligations.map((ob) => {
                const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
                  critical: { bg: 'bg-red-900/40', text: 'text-red-300', border: 'border-red-800/60' },
                  high: { bg: 'bg-orange-900/40', text: 'text-orange-300', border: 'border-orange-800/60' },
                  medium: { bg: 'bg-amber-900/40', text: 'text-amber-300', border: 'border-amber-800/60' },
                  low: { bg: 'bg-green-900/40', text: 'text-green-300', border: 'border-green-800/60' },
                };
                const colors = priorityColors[ob.priority] || priorityColors.medium;

                const statusColors: Record<string, string> = {
                  identified: 'bg-slate-700/50 text-slate-300',
                  in_progress: 'bg-blue-700/50 text-blue-300',
                  completed: 'bg-green-700/50 text-green-300',
                  not_applicable: 'bg-slate-600/50 text-slate-400',
                };

                return (
                  <div
                    key={ob.id}
                    className={`rounded-lg border p-4 ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`${colors.text} text-xs font-semibold uppercase`}>
                            {ob.priority} Priority
                          </span>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${statusColors[ob.status] || statusColors.identified}`}>
                            {ob.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <h3 className={`${colors.text} font-medium mb-1`}>{ob.title}</h3>
                        <p className="text-sm text-slate-300">{ob.description}</p>
                        {ob.due_date && (
                          <p className="text-xs text-slate-400 mt-2">
                            Due: {new Date(ob.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {ob.status !== 'completed' && ob.status !== 'not_applicable' && (
                          <div className="flex flex-col gap-1.5">
                            {ob.status === 'identified' && (
                              <button
                                onClick={() =>
                                  handleUpdateObligationStatus(ob.id, 'in_progress')
                                }
                                disabled={updatingObligation === ob.id}
                                className="px-2.5 py-1 text-xs font-medium rounded border border-blue-700/50 bg-blue-950/40 text-blue-300 hover:bg-blue-950/60 disabled:opacity-60 transition"
                                title="Mark as in progress"
                              >
                                {updatingObligation === ob.id ? 'Updating…' : 'Start'}
                              </button>
                            )}
                            {ob.status === 'in_progress' && (
                              <>
                                <button
                                  onClick={() =>
                                    handleUpdateObligationStatus(ob.id, 'completed')
                                  }
                                  disabled={updatingObligation === ob.id}
                                  className="px-2.5 py-1 text-xs font-medium rounded border border-green-700/50 bg-green-950/40 text-green-300 hover:bg-green-950/60 disabled:opacity-60 transition"
                                  title="Mark as completed"
                                >
                                  {updatingObligation === ob.id ? 'Updating…' : 'Complete'}
                                </button>
                                <button
                                  onClick={() =>
                                    handleUpdateObligationStatus(ob.id, 'identified')
                                  }
                                  disabled={updatingObligation === ob.id}
                                  className="px-2.5 py-1 text-xs font-medium rounded border border-slate-700/50 bg-slate-950/40 text-slate-400 hover:bg-slate-950/60 disabled:opacity-60 transition"
                                  title="Revert to identified"
                                >
                                  Revert
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Assessment Form */}
      {assessment?.status !== 'finalized' && (
        <form onSubmit={handleSave} className="space-y-6">
          {categories.map(([category, categoryQuestions]) => (
            <div
              key={category}
              className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden"
            >
              {/* Category Header */}
              <button
                type="button"
                onClick={() =>
                  setExpandedCategory(
                    expandedCategory === category ? null : category
                  )
                }
                className="w-full flex items-center justify-between gap-3 px-6 py-4 hover:bg-slate-800/50 transition"
              >
                <h3 className="font-semibold text-white">{category}</h3>
                {expandedCategory === category ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>

              {/* Questions */}
              {expandedCategory === category && (
                <div className="border-t border-slate-800 divide-y divide-slate-800">
                  {categoryQuestions.map((q) => (
                    <div key={q.id} className="px-6 py-5 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-white">
                          {q.question}
                          {q.riskWeight && q.riskWeight >= 0.7 && (
                            <span className="ml-2 text-xs font-bold text-orange-400">
                              HIGH IMPACT
                            </span>
                          )}
                        </label>
                        {q.description && (
                          <p className="mt-1 text-xs text-slate-400">{q.description}</p>
                        )}
                      </div>

                      {/* Input based on type */}
                      {q.type === 'yes-no' && (
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => handleAnswerChange(q.id, true)}
                            className={`px-4 py-2 text-sm rounded-lg transition ${
                              answers[q.id] === true
                                ? 'bg-blue-600 text-white'
                                : 'border border-slate-700 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnswerChange(q.id, false)}
                            className={`px-4 py-2 text-sm rounded-lg transition ${
                              answers[q.id] === false
                                ? 'bg-blue-600 text-white'
                                : 'border border-slate-700 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            No
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnswerChange(q.id, undefined)}
                            className={`px-4 py-2 text-sm rounded-lg transition ${
                              answers[q.id] === undefined
                                ? 'bg-blue-600 text-white'
                                : 'border border-slate-700 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            Skip
                          </button>
                        </div>
                      )}

                      {q.type === 'select' && q.options && (
                        <select
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value || undefined)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none text-sm"
                        >
                          <option value="">Select an option…</option>
                          {q.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-3 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-blue-500/40 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Draft
            </button>

            {result && (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-green-600/40 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Finalize Assessment
              </button>
            )}
          </div>
        </form>
      )}

      {/* Finalized State */}
      {assessment?.status === 'finalized' && (
        <div className="rounded-lg border border-green-800/60 bg-green-950/20 p-6 text-center">
          <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-2">Assessment Complete</h3>
          <p className="text-sm text-slate-400 mb-4">
            Risk classification: {result && getRiskLevelLabel(result.riskLevel)}
          </p>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-2 rounded-lg border border-green-700 px-4 py-2 text-sm text-green-300 hover:bg-green-950/30 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inventory
          </Link>
        </div>
      )}
    </div>
  );
}
