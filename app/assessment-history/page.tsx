'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface AssessmentRecord {
  version: number;
  risk_score: number;
  risk_level: string;
  created_at: string;
  assessment_count: number;
}

interface TimelineData {
  system_name: string;
  ai_system_id: string;
  assessments: AssessmentRecord[];
  total_versions: number;
  current_score: number;
  current_level: string;
}

const RISK_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  low: {
    bg: 'bg-green-950/30',
    text: 'text-green-300',
    border: 'border-green-800/60',
    badge: 'bg-green-900/50 text-green-200',
  },
  medium: {
    bg: 'bg-amber-950/30',
    text: 'text-amber-300',
    border: 'border-amber-800/60',
    badge: 'bg-amber-900/50 text-amber-200',
  },
  high: {
    bg: 'bg-red-950/30',
    text: 'text-red-300',
    border: 'border-red-800/60',
    badge: 'bg-red-900/50 text-red-200',
  },
  unacceptable: {
    bg: 'bg-red-950/50',
    text: 'text-red-200',
    border: 'border-red-700/60',
    badge: 'bg-red-900/70 text-red-100',
  },
};

export default function AssessmentHistoryPage() {
  const searchParams = useSearchParams();
  const aiSystemId = searchParams.get('ai_system_id');

  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!aiSystemId) {
      setError('AI System ID required');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/assessment-history?ai_system_id=${aiSystemId}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to load assessment history');
      }

      setTimeline(data.timeline);
    } catch (err: any) {
      setError(err?.message || 'Failed to load assessment history');
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
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading assessment history…
      </div>
    );
  }

  if (error || !timeline) {
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
          <div>{error || 'Could not load assessment history'}</div>
        </div>
      </div>
    );
  }

  const sortedAssessments = [...timeline.assessments].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const minScore = Math.min(...sortedAssessments.map((a) => a.risk_score), 0);
  const maxScore = Math.max(...sortedAssessments.map((a) => a.risk_score), 100);
  const scoreRange = maxScore - minScore || 100;

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
        <h1 className="text-3xl font-bold text-white">Assessment History</h1>
        <p className="text-slate-400">{timeline.system_name}</p>
      </div>

      {/* Current Status Card */}
      <div className={`rounded-lg border p-6 ${RISK_COLORS[timeline.current_level].bg} ${RISK_COLORS[timeline.current_level].border}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2 text-sm text-slate-400">Current Assessment</div>
            <div className={`text-2xl font-bold ${RISK_COLORS[timeline.current_level].text}`}>
              {timeline.current_level.charAt(0).toUpperCase() + timeline.current_level.slice(1)} Risk
            </div>
            <div className={`text-sm mt-1 ${RISK_COLORS[timeline.current_level].text}`}>
              Score: {timeline.current_score}/100
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">Total Assessments</div>
            <div className={`text-3xl font-bold ${RISK_COLORS[timeline.current_level].text}`}>
              {timeline.total_versions}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Assessment Timeline</h2>

        {/* Horizontal Risk Score Chart */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4">
            <div className="text-sm text-slate-400 mb-2">Risk Score Trend (0-100)</div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500 opacity-30"
                style={{ width: '100%' }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Low (0)</span>
              <span>Medium (50)</span>
              <span>High (100)</span>
            </div>
          </div>

          {/* Assessment Points */}
          <div className="relative h-16 mt-8">
            {sortedAssessments.map((assessment, idx) => {
              const position = ((assessment.risk_score - minScore) / scoreRange) * 100;
              const nextAssessment = sortedAssessments[idx + 1];
              const trend =
                nextAssessment && nextAssessment.risk_score > assessment.risk_score
                  ? 'up'
                  : nextAssessment && nextAssessment.risk_score < assessment.risk_score
                    ? 'down'
                    : null;

              return (
                <div
                  key={assessment.version}
                  className="absolute top-0 flex flex-col items-center"
                  style={{ left: `${position}%` }}
                >
                  {/* Trend Indicator */}
                  {trend && (
                    <div className={`mb-1 ${trend === 'up' ? 'text-red-400' : 'text-green-400'}`}>
                      {trend === 'up' ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                    </div>
                  )}

                  {/* Score Point */}
                  <div
                    className={`h-4 w-4 rounded-full border-2 border-slate-600 ${
                      assessment.version === timeline.total_versions
                        ? 'bg-blue-500 border-blue-400'
                        : 'bg-slate-700'
                    }`}
                  />

                  {/* Label */}
                  <div className="mt-2 text-xs text-slate-400 whitespace-nowrap">
                    v{assessment.version}
                  </div>
                  <div className={`text-xs font-semibold ${RISK_COLORS[assessment.risk_level].text}`}>
                    {assessment.risk_score}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Assessment Records</h2>

        {sortedAssessments.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-slate-500" />
            <p className="text-slate-400">No assessment history available.</p>
          </div>
        ) : (
          sortedAssessments.map((assessment, idx) => {
            const nextAssessment = sortedAssessments[idx + 1];
            const change = nextAssessment
              ? nextAssessment.risk_score - assessment.risk_score
              : null;
            const colorClass = RISK_COLORS[assessment.risk_level];
            const isLatest = assessment.version === timeline.total_versions;

            return (
              <div
                key={assessment.version}
                className={`rounded-lg border transition ${
                  isLatest
                    ? 'border-blue-700/60 bg-blue-950/30'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-semibold text-slate-400">Version {assessment.version}</span>
                        {isLatest && (
                          <span className="text-xs font-semibold bg-blue-900/50 text-blue-200 px-2 py-1 rounded">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-slate-400">Risk Level</div>
                          <div
                            className={`text-lg font-bold ${colorClass.text} capitalize`}
                          >
                            {assessment.risk_level}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Risk Score</div>
                          <div className={`text-lg font-bold ${colorClass.text}`}>
                            {assessment.risk_score}/100
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Assessed</div>
                          <div className="text-slate-300 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(assessment.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Days Since</div>
                          <div className="text-slate-300">
                            {Math.floor(
                              (Date.now() - new Date(assessment.created_at).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )}{' '}
                            days ago
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Change Indicator */}
                    {change !== null && (
                      <div className="text-right">
                        <div className="text-sm text-slate-400 mb-1">Change to Next</div>
                        <div
                          className={`flex items-center gap-1 text-lg font-bold ${
                            change > 0 ? 'text-red-400' : 'text-green-400'
                          }`}
                        >
                          {change > 0 ? (
                            <>
                              <TrendingUp className="h-5 w-5" />
                              +{change}
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-5 w-5" />
                              {change}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Link */}
                  <Link
                    href={`/assessment-progress?ai_system_id=${timeline.ai_system_id}`}
                    className="mt-3 inline-text text-xs text-blue-400 hover:text-blue-300"
                  >
                    View comparison with current →
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Stats */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Compliance Trend Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-slate-400">Starting Risk</div>
            <div className={`text-2xl font-bold ${RISK_COLORS[sortedAssessments[0]?.risk_level || 'medium'].text}`}>
              {sortedAssessments[0]?.risk_score || 0}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Current Risk</div>
            <div className={`text-2xl font-bold ${RISK_COLORS[timeline.current_level].text}`}>
              {timeline.current_score}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Total Change</div>
            <div
              className={`text-2xl font-bold flex items-center gap-1 ${
                timeline.current_score < (sortedAssessments[0]?.risk_score || 0)
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {timeline.current_score < (sortedAssessments[0]?.risk_score || 0) ? (
                <>
                  <TrendingDown className="h-5 w-5" />
                  {sortedAssessments[0]?.risk_score - timeline.current_score}
                </>
              ) : (
                <>
                  <TrendingUp className="h-5 w-5" />
                  +{timeline.current_score - (sortedAssessments[0]?.risk_score || 0)}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
