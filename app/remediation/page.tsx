'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Shield,
  Lightbulb,
} from 'lucide-react';
import {
  generateRemediationPlan,
  getTimelineEstimate,
  getPriorityColor,
  type RemediationPlan,
} from '@/lib/compliance-obligations';
import { type AssessmentResponse, type RiskLevel } from '@/lib/risk-assessment';

interface AssessmentData {
  id: string;
  ai_system_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  status: 'draft' | 'in_review' | 'finalized';
  assessment_data: { responses: AssessmentResponse[] };
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'hours' | 'days' | 'weeks';
  category: string;
  rationale: string;
}

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-950/30', text: 'text-green-300', border: 'border-green-800/60' },
  medium: { bg: 'bg-amber-950/30', text: 'text-amber-300', border: 'border-amber-800/60' },
  high: { bg: 'bg-red-950/30', text: 'text-red-300', border: 'border-red-800/60' },
  unacceptable: { bg: 'bg-red-950/50', text: 'text-red-200', border: 'border-red-700/60' },
};

export default function RemediationPage() {
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('assessment_id');

  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [remediationPlan, setRemediationPlan] = useState<RemediationPlan | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!assessmentId) {
      setError('Assessment ID required');
      setLoading(false);
      return;
    }

    try {
      // Fetch the assessment by ID
      const res = await fetch(`/api/risk-assessments?assessment_id=${assessmentId}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to load assessment');
      }

      if (!data.assessment) {
        throw new Error('Assessment not found');
      }

      setAssessment(data.assessment);

      // Generate remediation plan
      const plan = generateRemediationPlan(
        data.assessment.risk_score,
        data.assessment.risk_level,
        data.assessment.assessment_data?.responses ?? []
      );
      setRemediationPlan(plan);

      // Fetch recommendations
      try {
        const recsRes = await fetch(`/api/recommendations?ai_system_id=${data.assessment.ai_system_id}`);
        const recsData = await recsRes.json();
        if (recsRes.ok && recsData.ok) {
          setRecommendations(recsData.recommendations || []);
        }
      } catch (err) {
        console.warn('Failed to fetch recommendations (non-critical):', err);
      }

      // Persist obligations to database (idempotent — safe to call multiple times)
      if (plan.obligations.length > 0) {
        try {
          const obligationsRes = await fetch('/api/obligations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assessment_id: assessmentId,
              ai_system_id: data.assessment.ai_system_id,
              obligations: plan.obligations,
            }),
          });
          if (!obligationsRes.ok) {
            console.warn('Failed to persist obligations (non-critical):', await obligationsRes.json());
          }
        } catch (err) {
          console.warn('Failed to persist obligations (non-critical):', err);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load remediation plan');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading remediation plan…
      </div>
    );
  }

  if (error || !assessment || !remediationPlan) {
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
          <div>{error || 'Could not load assessment'}</div>
        </div>
      </div>
    );
  }

  const colorClass = RISK_COLORS[remediationPlan.risk_level];
  const criticalObligations = remediationPlan.obligations.filter((o) => o.priority === 'critical');
  const highObligations = remediationPlan.obligations.filter((o) => o.priority === 'high');

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
        <h1 className="text-3xl font-bold text-white">Compliance Remediation Plan</h1>
        <p className="text-slate-400">
          Based on your risk assessment, here are the obligations and recommended actions to achieve
          compliance with the EU AI Act.
        </p>
      </div>

      {/* Risk Summary */}
      <div className={`rounded-lg border p-6 ${colorClass.bg} ${colorClass.border}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2">
              <Shield className={`h-5 w-5 ${colorClass.text}`} />
              <h2 className={`text-lg font-semibold ${colorClass.text}`}>
                {remediationPlan.risk_level.charAt(0).toUpperCase() +
                  remediationPlan.risk_level.slice(1)}{' '}
                Risk
              </h2>
            </div>
            <p className={`text-sm ${colorClass.text}`}>{remediationPlan.summary}</p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${colorClass.text}`}>
              {remediationPlan.risk_score}
            </div>
            <div className={`text-xs ${colorClass.text}`}>out of 100</div>
          </div>
        </div>
      </div>

      {/* Timeline Overview */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Recommended Timeline</h3>
        </div>
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-sm text-slate-300">Total remediation effort</div>
            <div className="text-2xl font-bold text-white">~{remediationPlan.timeline_weeks} weeks</div>
            <p className="mt-1 text-xs text-slate-400">
              Assuming 1 team member working part-time on compliance improvements
            </p>
          </div>
          {criticalObligations.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-800/40 bg-red-950/20 p-3">
              <div className="text-xs font-semibold text-red-300">
                ⚠️ {criticalObligations.length} CRITICAL obligation{criticalObligations.length !== 1 ? 's' : ''} requiring immediate attention
              </div>
              <div className="mt-1 text-xs text-red-400">
                Address within 2 weeks to minimize legal exposure
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Actions */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Recommended Implementation Actions</h3>
          </div>
          <p className="text-sm text-slate-400">
            Strategic guidance based on your risk assessment and the EU AI Act requirements
          </p>

          <div className="space-y-3">
            {recommendations.map((rec) => {
              const priorityColor = getPriorityColor(rec.priority);
              return (
                <div
                  key={rec.id}
                  className="rounded-lg border border-slate-800 bg-gradient-to-r from-slate-900/50 to-slate-900/30 p-5 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-2 mb-2">
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${priorityColor}`}
                        >
                          {rec.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400 bg-slate-800/50 rounded px-2 py-1">
                          {rec.category}
                        </span>
                      </div>
                      <h4 className="font-semibold text-white mb-2">{rec.title}</h4>
                      <p className="text-sm text-slate-400 mb-3">{rec.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="capitalize">{rec.effort}</span>
                        </div>
                        <div className="text-slate-600">
                          Legal: {rec.rationale}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Obligations by Priority */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Compliance Obligations</h3>

        {remediationPlan.obligations.length === 0 ? (
          <div className="rounded-lg border border-green-800/60 bg-green-950/20 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-green-400" />
            <p className="text-white">No additional compliance obligations identified.</p>
            <p className="mt-2 text-sm text-green-300">
              Continue with regular monitoring and governance reviews.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {remediationPlan.obligations.map((obligation) => {
              const priorityColor = getPriorityColor(obligation.priority);
              return (
                <div
                  key={obligation.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-2 mb-2">
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${priorityColor}`}
                        >
                          {obligation.priority.toUpperCase()}
                        </span>
                        <h4 className="font-semibold text-white">{obligation.title}</h4>
                      </div>
                      <p className="text-sm text-slate-400 mb-3">{obligation.description}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimelineEstimate(obligation.effort_estimate)}
                        </div>
                        <div>Category: {obligation.category}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Steps */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Next Steps</h3>
        </div>
        <ol className="space-y-3 text-sm text-slate-400">
          <li className="flex gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">
              1
            </span>
            <div>
              <div className="font-medium text-white">
                {criticalObligations.length > 0 ? 'Address critical obligations first' : 'Review all obligations'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {criticalObligations.length > 0
                  ? `Start with the ${criticalObligations.length} critical issue(s) that may create legal liability.`
                  : 'Work through obligations in priority order.'}
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">
              2
            </span>
            <div>
              <div className="font-medium text-white">Assign ownership & deadlines</div>
              <div className="text-xs text-slate-500 mt-1">
                Distribute obligations across your team with clear ownership and completion dates.
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">
              3
            </span>
            <div>
              <div className="font-medium text-white">Document progress & evidence</div>
              <div className="text-xs text-slate-500 mt-1">
                Maintain audit trail of implementation and evidence of compliance for regulators.
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">
              4
            </span>
            <div>
              <div className="font-medium text-white">Re-assess after improvements</div>
              <div className="text-xs text-slate-500 mt-1">
                Schedule a follow-up risk assessment in {remediationPlan.timeline_weeks} weeks to verify improvements.
              </div>
            </div>
          </li>
        </ol>
      </div>

      {/* Footer Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          <FileText className="h-4 w-4" />
          Print/Export as PDF
        </button>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:shadow-lg hover:shadow-blue-500/40"
        >
          Back to Inventory
        </Link>
      </div>
    </div>
  );
}
