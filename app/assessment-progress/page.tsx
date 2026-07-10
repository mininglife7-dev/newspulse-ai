'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface AssessmentComparison {
  current_version: number;
  current_score: number;
  current_level: string;
  current_date: string;
  previous_version?: number;
  previous_score?: number;
  previous_level?: string;
  previous_date?: string;
  versions_count: number;
  improvement?: {
    improved: boolean;
    score_change: number;
    percent_change: number;
    improvement_category: string;
  };
}

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-950/30', text: 'text-green-300', border: 'border-green-800/60' },
  medium: { bg: 'bg-amber-950/30', text: 'text-amber-300', border: 'border-amber-800/60' },
  high: { bg: 'bg-red-950/30', text: 'text-red-300', border: 'border-red-800/60' },
  unacceptable: { bg: 'bg-red-950/50', text: 'text-red-200', border: 'border-red-700/60' },
};

const IMPROVEMENT_COLORS = {
  significant: 'bg-green-950/50 text-green-300 border-green-800/60',
  moderate: 'bg-blue-950/50 text-blue-300 border-blue-800/60',
  minor: 'bg-slate-800/50 text-slate-300 border-slate-700/60',
  regression: 'bg-red-950/50 text-red-300 border-red-800/60',
  no_change: 'bg-slate-800/30 text-slate-400 border-slate-700/30',
};

export default function AssessmentProgressPage() {
  const searchParams = useSearchParams();
  const aiSystemId = searchParams.get('ai_system_id');

  const [comparison, setComparison] = useState<AssessmentComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!aiSystemId) {
      setError('AI system ID required');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/assessment-history?ai_system_id=${aiSystemId}&comparison=true`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to load assessment progress');
      }

      setComparison(data.comparison);
    } catch (err: any) {
      setError(err?.message || 'Failed to load assessment progress');
    } finally {
      setLoading(false);
    }
  }, [aiSystemId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading assessment progress…
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

  if (!comparison || comparison.versions_count === 0) {
    return (
      <div className="space-y-4">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inventory
        </Link>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <Clock className="mx-auto mb-4 h-8 w-8 text-slate-500" />
          <p className="text-slate-300">Only one assessment completed</p>
          <p className="mt-2 text-sm text-slate-400">
            Complete another assessment to compare and track progress
          </p>
        </div>
      </div>
    );
  }

  const currentColor = RISK_COLORS[comparison.current_level];
  const previousColor = comparison.previous_level ? RISK_COLORS[comparison.previous_level] : null;
  const improvementColor = comparison.improvement?.improvement_category || 'no_change';
  const improved = comparison.improvement?.improved ?? false;

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
        <h1 className="text-3xl font-bold text-white">Assessment Progress</h1>
        <p className="text-slate-400">
          Track how your AI system's risk profile has improved over time
        </p>
      </div>

      {/* Current Assessment Status */}
      <div className={`rounded-lg border p-6 ${currentColor.bg} ${currentColor.border}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className={`h-5 w-5 ${currentColor.text}`} />
              <h2 className={`text-lg font-semibold ${currentColor.text}`}>
                Current Assessment (Version {comparison.current_version})
              </h2>
            </div>
            <p className={`text-sm ${currentColor.text}`}>
              Completed on {new Date(comparison.current_date).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${currentColor.text}`}>
              {comparison.current_score.toFixed(0)}
            </div>
            <div className={`text-sm ${currentColor.text}`}>
              Risk: {comparison.current_level.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Improvement Visualization */}
      {comparison.previous_score !== undefined && comparison.improvement && (
        <div className="space-y-4">
          {/* Comparison Arrow */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex items-center justify-between gap-4">
              {/* Previous Assessment */}
              <div className="flex-1">
                <div className="mb-2 text-sm text-slate-400">
                  Previous (v{comparison.previous_version})
                </div>
                <div className={`rounded-lg border p-4 ${previousColor?.bg} ${previousColor?.border}`}>
                  <div className={`text-2xl font-bold ${previousColor?.text}`}>
                    {comparison.previous_score?.toFixed(0)}
                  </div>
                  <div className={`text-sm ${previousColor?.text}`}>
                    {comparison.previous_level?.toUpperCase()}
                  </div>
                  <div className={`text-xs ${previousColor?.text} mt-1`}>
                    {new Date(comparison.previous_date!).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Arrow & Change */}
              <div className="flex flex-col items-center gap-2">
                {improved ? (
                  <TrendingDown className="h-6 w-6 text-green-400" />
                ) : (
                  <TrendingUp className="h-6 w-6 text-red-400" />
                )}
                <div className="text-sm font-semibold text-slate-300">
                  {improved ? '−' : '+'}{Math.abs(comparison.improvement.score_change)}
                </div>
                <div className="text-xs text-slate-400">
                  {Math.abs(comparison.improvement.percent_change)}%
                </div>
              </div>

              {/* Current Assessment */}
              <div className="flex-1">
                <div className="mb-2 text-sm text-slate-400">
                  Current (v{comparison.current_version})
                </div>
                <div className={`rounded-lg border p-4 ${currentColor.bg} ${currentColor.border}`}>
                  <div className={`text-2xl font-bold ${currentColor.text}`}>
                    {comparison.current_score.toFixed(0)}
                  </div>
                  <div className={`text-sm ${currentColor.text}`}>
                    {comparison.current_level.toUpperCase()}
                  </div>
                  <div className={`text-xs ${currentColor.text} mt-1`}>
                    {new Date(comparison.current_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Improvement Summary */}
          <div
            className={`rounded-lg border p-6 ${IMPROVEMENT_COLORS[improvementColor as keyof typeof IMPROVEMENT_COLORS]}`}
          >
            <h3 className="mb-2 font-semibold">
              {improved ? '✓ Improvement Detected' : '⚠ Score Change Detected'}
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Score Change:</span>
                <span className="font-semibold">
                  {improved ? '−' : '+'}
                  {Math.abs(comparison.improvement.score_change)} points
                </span>
              </div>
              <div className="flex justify-between">
                <span>Percent Change:</span>
                <span className="font-semibold">
                  {Math.abs(comparison.improvement.percent_change)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Category:</span>
                <span className="font-semibold capitalize">
                  {comparison.improvement.improvement_category}
                </span>
              </div>
            </div>

            {improved && (
              <div className="mt-4 rounded-lg bg-slate-900/30 p-3 text-xs">
                <p className="font-medium">
                  {comparison.improvement.improvement_category === 'significant' &&
                    '🎯 Significant progress! Your compliance efforts are working.'}
                  {comparison.improvement.improvement_category === 'moderate' &&
                    '✓ Good progress. Continue with your remediation plan.'}
                  {comparison.improvement.improvement_category === 'minor' &&
                    '→ Minor improvement. Keep working on key obligations.'}
                </p>
              </div>
            )}

            {!improved && (
              <div className="mt-4 rounded-lg bg-red-900/30 p-3 text-xs">
                <p className="font-medium">
                  ⚠ Risk score increased. Review recent changes and ensure compliance controls are in place.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Summary */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Assessment History</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-sm text-slate-400">Total Assessments</div>
            <div className="mt-2 text-2xl font-bold text-white">{comparison.versions_count}</div>
          </div>
          <div>
            <div className="text-sm text-slate-400">Improvement Trend</div>
            <div className="mt-2 flex items-center gap-2">
              {improved ? (
                <>
                  <TrendingDown className="h-5 w-5 text-green-400" />
                  <span className="text-lg font-bold text-green-300">Better</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-5 w-5 text-red-400" />
                  <span className="text-lg font-bold text-red-300">Worse</span>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-400">Time Between</div>
            <div className="mt-2 text-lg font-bold text-white">
              {comparison.current_date && comparison.previous_date
                ? (() => {
                    const current = new Date(comparison.current_date);
                    const previous = new Date(comparison.previous_date);
                    const days = Math.floor(
                      (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return days > 0 ? `${days} days` : 'Same day';
                  })()
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Next Steps</h3>
        <div className="space-y-3">
          {improved ? (
            <>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-400 mt-0.5" />
                <div>
                  <div className="font-medium text-white">Continue implementing obligations</div>
                  <div className="text-sm text-slate-400">
                    Maintain momentum on compliance tasks to further reduce risk
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="h-5 w-5 flex-shrink-0 text-blue-400 mt-0.5" />
                <div>
                  <div className="font-medium text-white">
                    Schedule next assessment
                  </div>
                  <div className="text-sm text-slate-400">
                    Plan another assessment in {Math.ceil(90 / (comparison.versions_count - 1)) || 30} days
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5" />
                <div>
                  <div className="font-medium text-white">Review recent changes</div>
                  <div className="text-sm text-slate-400">
                    Identify what caused the increase and plan corrective actions
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-blue-400 mt-0.5" />
                <div>
                  <div className="font-medium text-white">Prioritize obligations</div>
                  <div className="text-sm text-slate-400">
                    Focus on critical controls that address the new risks
                  </div>
                </div>
              </div>
            </>
          )}
          <Link
            href="/obligations"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            View Obligations <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
