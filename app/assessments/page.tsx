'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, AlertTriangle, Shield, Loader2 } from 'lucide-react';

interface Assessment {
  id: string;
  ai_system_id: string;
  risk_level: 'unacceptable' | 'high' | 'limited' | 'minimal';
  risk_score: number;
  status: string;
  created_at: string;
  ai_systems: {
    id: string;
    name: string;
    system_type: string | null;
  };
}

const RISK_LEVEL_COLORS: Record<
  'unacceptable' | 'high' | 'limited' | 'minimal',
  { bg: string; text: string; border: string; icon: typeof AlertTriangle }
> = {
  unacceptable: {
    bg: 'bg-red-950/30',
    text: 'text-red-300',
    border: 'border-red-800/60',
    icon: AlertTriangle,
  },
  high: {
    bg: 'bg-orange-950/30',
    text: 'text-orange-300',
    border: 'border-orange-800/60',
    icon: AlertTriangle,
  },
  limited: {
    bg: 'bg-amber-950/30',
    text: 'text-amber-300',
    border: 'border-amber-800/60',
    icon: Shield,
  },
  minimal: {
    bg: 'bg-green-950/30',
    text: 'text-green-300',
    border: 'border-green-800/60',
    icon: Shield,
  },
};

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/risk-assessments');
      if (res.status === 401) {
        window.location.href = '/auth/signin?redirect=/assessments';
        return;
      }
      if (res.status === 409) {
        setLoadError('Complete workspace setup first');
        setAssessments([]);
        return;
      }
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const data = await res.json().catch(() => {
        throw new Error('Server error - unable to parse response');
      });
      if (!data.ok) throw new Error(data.error || 'Failed to load');
      setAssessments(data.assessments || []);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load risk assessments');
      setAssessments([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
        <h1 className="text-3xl font-bold text-white">Risk Assessments</h1>
        <p className="text-slate-400">
          Review AI system risk classifications and compliance obligations
        </p>
      </div>

      {loadError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>{loadError}</div>
        </div>
      )}

      {assessments === null && !loadError ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading assessments...
        </div>
      ) : assessments && assessments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-12 text-center">
          <Shield className="mx-auto mb-4 h-10 w-10 text-slate-600" />
          <h2 className="text-lg font-semibold text-white">No assessments yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Start by assessing the risks of your AI systems.
          </p>
          <Link
            href="/risk-assessment"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-2 text-sm font-medium text-white transition hover:shadow-lg"
          >
            Begin Risk Assessment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Risk Summary */}
          {assessments && assessments.length > 0 && (
            <div className="grid gap-4 md:grid-cols-4">
              {Object.entries(
                assessments.reduce((acc, a) => {
                  acc[a.risk_level] = (acc[a.risk_level] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([level, count]) => (
                <div
                  key={level}
                  className={`rounded-lg border p-4 ${RISK_LEVEL_COLORS[level as keyof typeof RISK_LEVEL_COLORS].bg} ${RISK_LEVEL_COLORS[level as keyof typeof RISK_LEVEL_COLORS].border}`}
                >
                  <div className="text-2xl font-bold text-white">{count}</div>
                  <div className="text-xs text-slate-400">{level.toUpperCase()}</div>
                </div>
              ))}
            </div>
          )}

          {/* Assessments List */}
          <div className="space-y-3">
            {assessments?.map((assessment) => {
              const riskColors = RISK_LEVEL_COLORS[assessment.risk_level];
              const Icon = riskColors.icon;

              return (
                <div
                  key={assessment.id}
                  className={`rounded-lg border p-5 ${riskColors.bg} ${riskColors.border}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <Icon className={`h-6 w-6 ${riskColors.text} flex-shrink-0 mt-0.5`} />
                      <div>
                        <h3 className="font-semibold text-white">
                          {assessment.ai_systems?.name || 'Unknown System'}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          Assessed {new Date(assessment.created_at).toLocaleDateString()}
                        </p>
                        <div className="mt-3 flex gap-4">
                          <span className={`text-sm font-medium ${riskColors.text}`}>
                            Risk Score: {Math.round(assessment.risk_score)}/100
                          </span>
                          <span className="text-xs text-slate-500">
                            Status: {assessment.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${riskColors.text}`}>
                        {assessment.risk_level.toUpperCase()}
                      </div>
                      <Link
                        href={`/assessments/${assessment.id}`}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <Link
              href="/risk-assessment"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-3 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-blue-500/40"
            >
              Assess Another System
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
