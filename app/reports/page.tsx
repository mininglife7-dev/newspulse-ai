'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, TrendingUp, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { ComplianceReportData } from '@/lib/compliance-report';

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  compliant: {
    bg: 'bg-green-900/30',
    text: 'text-green-300',
    icon: CheckCircle2,
  },
  at_risk: {
    bg: 'bg-orange-900/30',
    text: 'text-orange-300',
    icon: AlertTriangle,
  },
  non_compliant: {
    bg: 'bg-red-900/30',
    text: 'text-red-300',
    icon: AlertCircle,
  },
};

export default function ReportsPage() {
  const [report, setReport] = useState<ComplianceReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/compliance-report');

        if (res.status === 401) {
          window.location.href = '/auth/signin?redirect=/reports';
          return;
        }

        if (res.status === 409) {
          setError('Complete workspace setup first');
          return;
        }

        if (!res.ok) {
          throw new Error(`Error: ${res.status}`);
        }

        const data = await res.json();
        if (!data.ok) {
          throw new Error(data.error || 'Failed to load report');
        }

        setReport(data.report);
      } catch (err: any) {
        setError(err?.message || 'Could not load compliance report');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Generating compliance report...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="flex items-start gap-3 rounded-lg border border-red-800/60 bg-red-950/30 p-5 text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const statusColor = STATUS_COLORS[report.summary.overallStatus];
  const StatusIcon = statusColor.icon;

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
        <h1 className="text-3xl font-bold text-white">Compliance Report</h1>
        <p className="text-sm text-slate-400">
          Generated: {new Date(report.generatedAt).toLocaleString()}
        </p>
      </div>

      {/* Overall Status */}
      <div className={`rounded-lg border ${statusColor.bg} p-6`}>
        <div className="flex items-start gap-4">
          <StatusIcon className={`h-8 w-8 flex-shrink-0 ${statusColor.text} mt-0.5`} />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white capitalize">{report.summary.overallStatus}</h2>
            <p className="mt-1 text-sm text-slate-300">
              {report.summary.overallStatus === 'compliant'
                ? 'Your organization maintains strong compliance posture across AI systems'
                : report.summary.overallStatus === 'at_risk'
                  ? 'Address identified gaps to strengthen compliance posture'
                  : 'Immediate action required to meet compliance obligations'}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* AI Systems Assessed */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Systems Assessed</span>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {report.metrics.compliance.assessedSystems}/{report.metrics.compliance.totalSystems}
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{
                width: `${report.metrics.compliance.assessmentCompletion}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">{report.metrics.compliance.assessmentCompletion}% complete</p>
        </div>

        {/* Obligations Status */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Obligations</span>
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {report.metrics.obligations.byStatus.completed}/{report.metrics.obligations.totalObligations}
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-green-500"
              style={{
                width: `${report.metrics.obligations.completionRate}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">{report.metrics.obligations.completionRate}% complete</p>
        </div>

        {/* Remediation Plans */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Remediation Plans</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {report.metrics.remediation.byStatus.completed}/{report.metrics.remediation.totalPlans}
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-cyan-500"
              style={{
                width: `${report.metrics.remediation.completionRate}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">{report.metrics.remediation.completionRate}% complete</p>
        </div>

        {/* Evidence Approved */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Evidence Approved</span>
            <CheckCircle2 className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {report.metrics.evidence.byStatus.approved}/{report.metrics.evidence.totalEvidence}
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-purple-500"
              style={{
                width: `${report.metrics.evidence.approvalRate}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">{report.metrics.evidence.approvalRate}% approved</p>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Risk Distribution</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400">{report.metrics.compliance.riskDistribution.unacceptable}</div>
            <p className="mt-1 text-sm text-slate-400">Unacceptable</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">{report.metrics.compliance.riskDistribution.high}</div>
            <p className="mt-1 text-sm text-slate-400">High</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400">{report.metrics.compliance.riskDistribution.limited}</div>
            <p className="mt-1 text-sm text-slate-400">Limited</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">{report.metrics.compliance.riskDistribution.minimal}</div>
            <p className="mt-1 text-sm text-slate-400">Minimal</p>
          </div>
        </div>
      </div>

      {/* Key Risks */}
      {report.summary.keyRisks.length > 0 && (
        <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-200 mb-3">
            <AlertTriangle className="h-5 w-5" />
            Key Risks
          </h3>
          <ul className="space-y-2">
            {report.summary.keyRisks.map((risk, idx) => (
              <li key={idx} className="text-sm text-amber-100">
                • {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps */}
      <div className="rounded-lg border border-blue-800/60 bg-blue-950/30 p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-200 mb-3">
          <TrendingUp className="h-5 w-5" />
          Recommended Next Steps
        </h3>
        <ol className="space-y-2">
          {report.summary.nextSteps.map((step, idx) => (
            <li key={idx} className="text-sm text-blue-100">
              {idx + 1}. {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Workspace Info */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4 text-center">
        <p className="text-sm text-slate-400">
          Compliance report for <span className="font-semibold text-slate-300">{report.workspaceName}</span>
        </p>
      </div>
    </div>
  );
}
