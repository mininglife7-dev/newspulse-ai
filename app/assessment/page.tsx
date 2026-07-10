'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  EU_AI_ACT_QUESTIONS,
  calculateRiskScore,
  getProgressSummary,
  type AssessmentResponse,
  type RiskLevel,
} from '@/lib/risk-assessment';

interface AssessmentData {
  id: string;
  ai_system_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  status: 'draft' | 'in_review' | 'finalized';
  assessment_data: { responses: AssessmentResponse[] };
}

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-950/30', text: 'text-green-300', border: 'border-green-800/60' },
  medium: { bg: 'bg-amber-950/30', text: 'text-amber-300', border: 'border-amber-800/60' },
  high: { bg: 'bg-red-950/30', text: 'text-red-300', border: 'border-red-800/60' },
  unacceptable: { bg: 'bg-red-950/50', text: 'text-red-200', border: 'border-red-700/60' },
};

export default function AssessmentPage() {
  const searchParams = useSearchParams();
  const aiSystemId = searchParams.get('ai_system_id');

  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [responses, setResponses] = useState<Map<string, AssessmentResponse>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = EU_AI_ACT_QUESTIONS[currentIndex];
  const progress = getProgressSummary(Array.from(responses.values()));
  const { score, level } = calculateRiskScore(Array.from(responses.values()));
  const isComplete = progress.answered_questions === progress.total_questions;

  const load = useCallback(async () => {
    if (!aiSystemId) {
      setError('AI system ID required');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/risk-assessments?ai_system_id=${aiSystemId}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (res.status === 404) {
          // Create new assessment
          const createRes = await fetch('/api/risk-assessments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ai_system_id: aiSystemId }),
          });
          const createData = await createRes.json();
          if (!createRes.ok || !createData.ok) throw new Error(createData.error);
          setAssessment(createData.assessment);
        } else {
          throw new Error(data.error || 'Failed to load assessment');
        }
      } else {
        setAssessment(data.assessment);
        if (data.assessment?.assessment_data?.responses) {
          const respMap = new Map(
            data.assessment.assessment_data.responses.map((r: AssessmentResponse) => [
              r.question_id,
              r,
            ])
          );
          setResponses(respMap);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }, [aiSystemId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResponse = (answer: string | number | boolean) => {
    const resp: AssessmentResponse = {
      question_id: currentQuestion.id,
      answer,
      answered_at: new Date().toISOString(),
    };
    setResponses(new Map(responses.set(currentQuestion.id, resp)));

    // Auto-advance to next question
    if (currentIndex < EU_AI_ACT_QUESTIONS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSave = async () => {
    if (!assessment) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/risk-assessments/${assessment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: Array.from(responses.values()),
          status: isComplete ? 'finalized' : 'draft',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);
      setAssessment(data.assessment);
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading assessment…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inventory
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
      <div className="space-y-2">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inventory
        </Link>
        <h1 className="text-3xl font-bold text-white">EU AI Act Risk Assessment</h1>
        <p className="text-slate-400">
          Answer questions about your AI system to determine its risk classification.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Progress and summary */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-300">Progress</h3>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>Questions answered</span>
                  <span className="font-semibold text-white">
                    {progress.answered_questions}/{progress.total_questions}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                    style={{ width: `${progress.progress_percentage}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-slate-400">{progress.progress_percentage}% complete</p>
            </div>
          </div>

          {/* Risk score summary */}
          <div
            className={`rounded-lg border p-5 ${RISK_COLORS[level].bg} ${RISK_COLORS[level].border}`}
          >
            <h3 className={`mb-3 text-sm font-semibold ${RISK_COLORS[level].text}`}>
              Current Risk Level
            </h3>
            <div className="space-y-2">
              <div className={`text-2xl font-bold ${RISK_COLORS[level].text}`}>{level}</div>
              <div className={`text-sm ${RISK_COLORS[level].text}`}>Score: {score}/100</div>
            </div>
          </div>
        </div>

        {/* Question and responses */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Question {currentIndex + 1} of {EU_AI_ACT_QUESTIONS.length}
              </span>
              {responses.has(currentQuestion.id) && (
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> Answered
                </div>
              )}
            </div>

            <div className="mb-6 space-y-3">
              <h2 className="text-lg font-semibold text-white">{currentQuestion.question_text}</h2>
              {currentQuestion.help_text && (
                <p className="text-sm text-slate-400">{currentQuestion.help_text}</p>
              )}
            </div>

            {/* Response input based on question type */}
            <div className="mb-6 space-y-3">
              {currentQuestion.question_type === 'yes_no' && (
                <div className="flex gap-3">
                  {['yes', 'no'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleResponse(opt)}
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                        responses.get(currentQuestion.id)?.answer === opt
                          ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                          : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      {opt === 'yes' ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.question_type === 'scale_1_5' && (
                <div className="flex gap-2">
                  {['1', '2', '3', '4', '5'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleResponse(opt)}
                      className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition ${
                        responses.get(currentQuestion.id)?.answer === opt
                          ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                          : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.question_type === 'multiple_choice' && (
                <div className="space-y-2">
                  {currentQuestion.options?.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleResponse(opt)}
                      className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                        responses.get(currentQuestion.id)?.answer === opt
                          ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                          : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      {opt.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                onClick={() => setCurrentIndex(Math.min(EU_AI_ACT_QUESTIONS.length - 1, currentIndex + 1))}
                disabled={currentIndex === EU_AI_ACT_QUESTIONS.length - 1}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Save button */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-2 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-blue-500/40 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isComplete ? 'Finalize Assessment' : 'Save Progress'}
            </button>
            {isComplete && (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                View Results
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
