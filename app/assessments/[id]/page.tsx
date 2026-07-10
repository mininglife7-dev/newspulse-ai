'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, AlertTriangle, Shield, Loader2, CheckCircle } from 'lucide-react';

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
  assessment_data?: {
    result?: {
      reasoning: string[];
      obligations: string[];
    };
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

export default function AssessmentDetailPage({ params }: { params: { id: string } }) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/risk-assessments/${params.id}`);
        if (res.status === 401) {
          window.location.href = '/auth/signin?redirect=/assessments';
          return;
        }
        if (res.status === 404) {
          setLoadError('Assessment not found');
          setAssessment(null);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        const data = await res.json().catch(() => {
          throw new Error('Server error - unable to parse response');
        });
        if (!data.ok) throw new Error(data.error || 'Failed to load');
        setAssessment(data.assessment);
      } catch (err: any) {
        setLoadError(err?.message || 'Could not load assessment');
        setAssessment(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading assessment...
      </div>
    );
  }

  if (loadError || !assessment) {
    return (
      <div className="space-y-4">
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assessments
        </Link>
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>{loadError || 'Assessment not found'}</div>
        </div>
      </div>
    );
  }

  const riskColors = RISK_LEVEL_COLORS[assessment.risk_level];
  const Icon = riskColors.icon;
  const result = assessment.assessment_data?.result;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assessments
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-white">
          {assessment.ai_systems?.name || 'Unknown System'}
        </h1>
        <p className="mt-1 text-slate-400">
          Assessed {new Date(assessment.created_at).toLocaleDateString()} · Status: {assessment.status}
        </p>
      </div>

      {/* Risk Summary Card */}
      <div
        className={`rounded-lg border p-8 ${riskColors.bg} ${riskColors.border}`}
      >
        <div className="flex items-start gap-6">
          <Icon className={`h-8 w-8 ${riskColors.text} flex-shrink-0`} />
          <div className="flex-1">
            <div className={`text-3xl font-bold ${riskColors.text}`}>
              {assessment.risk_level.toUpperCase()}
            </div>
            <div className="mt-2 flex items-center gap-4">
              <div>
                <div className="text-sm text-slate-400">Risk Score</div>
                <div className={`text-2xl font-bold ${riskColors.text}`}>
                  {Math.round(assessment.risk_score)}/100
                </div>
              </div>
              <div className="hidden md:block h-12 w-px bg-slate-700/50"></div>
              <div className="flex-1">
                <div className="text-sm text-slate-400 mb-2">Compliance Status</div>
                <div className="space-y-1">
                  {assessment.risk_level === 'unacceptable' && (
                    <div className="text-sm font-semibold text-red-300">
                      🚫 Deployment prohibited under EU AI Act
                    </div>
                  )}
                  {assessment.risk_level === 'high' && (
                    <div className="text-sm font-semibold text-orange-300">
                      ⚠️ High-risk system requires extensive compliance measures
                    </div>
                  )}
                  {assessment.risk_level === 'limited' && (
                    <div className="text-sm font-semibold text-amber-300">
                      ℹ️ Limited risk requires transparency and monitoring
                    </div>
                  )}
                  {assessment.risk_level === 'minimal' && (
                    <div className="text-sm font-semibold text-green-300">
                      ✓ Minimal risk with standard compliance practices
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Risk Factors / Reasoning */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Risk Factors</h2>
            {result.reasoning && result.reasoning.length > 0 ? (
              <ul className="space-y-3">
                {result.reasoning.map((reason, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <div className="h-5 w-5 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                    </div>
                    <span className="text-sm text-slate-300">{reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No risk factors identified</p>
            )}
          </div>

          {/* Compliance Obligations */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Compliance Obligations</h2>
            {result.obligations && result.obligations.length > 0 ? (
              <ul className="space-y-3">
                {result.obligations.map((obligation, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-300">{obligation}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No obligations identified</p>
            )}
          </div>
        </div>
      )}

      {/* System Details */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Assessment Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI System</div>
            <div className="mt-1 text-white">{assessment.ai_systems?.name || 'Unknown'}</div>
          </div>
          {assessment.ai_systems?.system_type && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Type</div>
              <div className="mt-1 text-white capitalize">{assessment.ai_systems.system_type.replace(/_/g, ' ')}</div>
            </div>
          )}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assessment Date</div>
            <div className="mt-1 text-white">{new Date(assessment.created_at).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</div>
            <div className="mt-1">
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300 capitalize">
                {assessment.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/risk-assessment"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-3 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-blue-500/40"
        >
          Re-assess System
        </Link>
        <Link
          href="/assessments"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-6 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-900/50"
        >
          View All Assessments
        </Link>
      </div>
    </div>
  );
}
