'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Cpu,
  FileCheck,
  TrendingUp,
  Download,
  ClipboardList,
} from 'lucide-react';

interface ComplianceSummary {
  totalSystems: number;
  assessedSystems: number;
  unassessedSystems: number;
  riskDistribution: {
    unacceptable: number;
    high: number;
    medium: number;
    low: number;
  };
  assessmentStatus: {
    draft: number;
    in_review: number;
    finalized: number;
  };
  evidenceMetrics: {
    submitted: number;
    under_review: number;
    approved: number;
    rejected: number;
  };
  obligationMetrics: {
    total: number;
    identified: number;
    in_progress: number;
    completed: number;
    not_applicable: number;
    high_priority: number;
    critical_priority: number;
  };
  complianceHealth: 'critical' | 'warning' | 'good' | 'excellent';
  readinessPercentage: number;
}

const HEALTH_COLORS = {
  critical: 'text-red-400 bg-red-950/30 border-red-800/60',
  warning: 'text-amber-400 bg-amber-950/30 border-amber-800/60',
  good: 'text-green-400 bg-green-950/30 border-green-800/60',
  excellent: 'text-emerald-400 bg-emerald-950/30 border-emerald-800/60',
};

const HEALTH_LABELS = {
  critical: 'Critical',
  warning: 'Warning',
  good: 'Good',
  excellent: 'Excellent',
};

export default function CompliancePage() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/compliance-dashboard');
      if (res.status === 401) {
        window.location.href = '/auth/signin?redirect=/compliance';
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to load');
      setSummary(data.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to load compliance dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/reports/dashboard');
      if (!res.ok) throw new Error('Failed to generate report');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err?.message || 'Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…
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
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return <div className="text-slate-400">No data available</div>;
  }

  const readinessColor =
    summary.readinessPercentage >= 80
      ? 'text-green-400'
      : summary.readinessPercentage >= 50
      ? 'text-amber-400'
      : 'text-red-400';

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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Compliance Dashboard</h1>
            <p className="text-slate-400">
              Your organization's AI governance compliance status and readiness
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-950/50 hover:border-amber-600/50"
            title="Export compliance report as PDF"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Health Status Card */}
      <div
        className={`rounded-lg border p-6 ${HEALTH_COLORS[summary.complianceHealth]}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {HEALTH_LABELS[summary.complianceHealth]} Status
            </h2>
            <p className="text-sm opacity-90">
              {summary.complianceHealth === 'critical'
                ? 'Immediate action required: unacceptable-risk systems detected'
                : summary.complianceHealth === 'warning'
                ? 'Action needed: high-risk systems and incomplete assessments'
                : summary.complianceHealth === 'good'
                ? 'On track: most systems assessed, evidence in review'
                : 'Excellent: all systems assessed and evidence approved'}
            </p>
          </div>
          <div className="text-4xl font-bold opacity-30">
            {summary.readinessPercentage}%
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* AI Systems */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-slate-400">AI Systems</h3>
            <Cpu className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white">{summary.totalSystems}</div>
          <p className="text-xs text-slate-500 mt-2">
            {summary.assessedSystems} assessed · {summary.unassessedSystems} pending
          </p>
        </div>

        {/* Assessment Completion */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-slate-400">Assessments</h3>
            <CheckCircle className="h-5 w-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {summary.totalSystems > 0 ? Math.round((summary.assessedSystems / summary.totalSystems) * 100) : 0}%
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {summary.assessmentStatus.finalized} finalized · {summary.assessmentStatus.draft} draft
          </p>
        </div>

        {/* Risk Summary */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-slate-400">Risk Levels</h3>
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {summary.riskDistribution.high + summary.riskDistribution.unacceptable}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {summary.riskDistribution.unacceptable} unacceptable · {summary.riskDistribution.high} high
          </p>
        </div>

        {/* Evidence Status */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-slate-400">Evidence</h3>
            <FileCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {summary.evidenceMetrics.approved}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {summary.evidenceMetrics.under_review} in review · {summary.evidenceMetrics.submitted} submitted
          </p>
        </div>

        {/* Obligations Status */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-slate-400">Obligations</h3>
            <ClipboardList className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {summary.obligationMetrics.completed}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {summary.obligationMetrics.total} total · {summary.obligationMetrics.in_progress} in progress
          </p>
        </div>
      </div>

      {/* Detailed Status Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk Distribution */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="font-semibold text-white mb-4">Risk Classification</h3>
          <div className="space-y-3">
            {[
              { label: 'Unacceptable', count: summary.riskDistribution.unacceptable, color: 'bg-red-500' },
              { label: 'High', count: summary.riskDistribution.high, color: 'bg-orange-500' },
              { label: 'Medium', count: summary.riskDistribution.medium, color: 'bg-amber-500' },
              { label: 'Low', count: summary.riskDistribution.low, color: 'bg-green-500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${item.color}`}></div>
                  <span className="text-sm text-slate-400">{item.label}</span>
                </div>
                <span className="font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Assessment Status Breakdown */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="font-semibold text-white mb-4">Assessment Status</h3>
          <div className="space-y-3">
            {[
              { label: 'Finalized', count: summary.assessmentStatus.finalized, color: 'text-green-400' },
              { label: 'In Review', count: summary.assessmentStatus.in_review, color: 'text-amber-400' },
              { label: 'Draft', count: summary.assessmentStatus.draft, color: 'text-slate-400' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className={`text-sm ${item.color}`}>{item.label}</span>
                <span className="font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Obligation Status & Priority */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Obligation Status Breakdown */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="font-semibold text-white mb-4">Obligation Status</h3>
          <div className="space-y-3">
            {[
              { label: 'Completed', count: summary.obligationMetrics.completed, color: 'text-green-400' },
              { label: 'In Progress', count: summary.obligationMetrics.in_progress, color: 'text-cyan-400' },
              { label: 'Identified', count: summary.obligationMetrics.identified, color: 'text-amber-400' },
              { label: 'Not Applicable', count: summary.obligationMetrics.not_applicable, color: 'text-slate-400' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className={`text-sm ${item.color}`}>{item.label}</span>
                <span className="font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Obligation Priority Breakdown */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="font-semibold text-white mb-4">Obligation Priority</h3>
          <div className="space-y-3">
            {[
              { label: 'Critical', count: summary.obligationMetrics.critical_priority, color: 'text-red-400' },
              { label: 'High', count: summary.obligationMetrics.high_priority, color: 'text-orange-400' },
              { label: 'Other', count: summary.obligationMetrics.total - summary.obligationMetrics.critical_priority - summary.obligationMetrics.high_priority, color: 'text-slate-400' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className={`text-sm ${item.color}`}>{item.label}</span>
                <span className="font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evidence Approval Status */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="font-semibold text-white mb-4">Evidence Approval Status</h3>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Approved', count: summary.evidenceMetrics.approved, color: 'bg-green-950/50 text-green-300 border-green-800/60' },
            { label: 'Under Review', count: summary.evidenceMetrics.under_review, color: 'bg-amber-950/50 text-amber-300 border-amber-800/60' },
            { label: 'Submitted', count: summary.evidenceMetrics.submitted, color: 'bg-blue-950/50 text-blue-300 border-blue-800/60' },
            { label: 'Rejected', count: summary.evidenceMetrics.rejected, color: 'bg-red-950/50 text-red-300 border-red-800/60' },
          ].map((item) => (
            <div key={item.label} className={`rounded-lg border p-4 ${item.color}`}>
              <div className="text-sm opacity-75 mb-2">{item.label}</div>
              <div className="text-2xl font-bold">{item.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Readiness Progress */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Compliance Readiness</h3>
          <TrendingUp className="h-5 w-5 text-cyan-400" />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  summary.readinessPercentage >= 80
                    ? 'bg-green-500'
                    : summary.readinessPercentage >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${summary.readinessPercentage}%` }}
              ></div>
            </div>
          </div>
          <div className={`text-2xl font-bold min-w-fit ${readinessColor}`}>
            {summary.readinessPercentage}%
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-6">
        <h3 className="font-semibold text-white mb-4">Next Steps</h3>
        <ul className="space-y-3">
          {summary.unassessedSystems > 0 && (
            <li className="flex gap-3 text-sm">
              <span className="text-cyan-400">→</span>
              <span className="text-slate-400">
                Complete assessments for {summary.unassessedSystems} system{summary.unassessedSystems !== 1 ? 's' : ''}
              </span>
            </li>
          )}
          {summary.assessmentStatus.draft > 0 && (
            <li className="flex gap-3 text-sm">
              <span className="text-amber-400">→</span>
              <span className="text-slate-400">
                Finalize {summary.assessmentStatus.draft} draft assessment{summary.assessmentStatus.draft !== 1 ? 's' : ''}
              </span>
            </li>
          )}
          {summary.evidenceMetrics.submitted > 0 && (
            <li className="flex gap-3 text-sm">
              <span className="text-amber-400">→</span>
              <span className="text-slate-400">
                Review {summary.evidenceMetrics.submitted} submitted evidence item{summary.evidenceMetrics.submitted !== 1 ? 's' : ''}
              </span>
            </li>
          )}
          {summary.riskDistribution.high > 0 && (
            <li className="flex gap-3 text-sm">
              <span className="text-orange-400">→</span>
              <span className="text-slate-400">
                Create mitigation plans for {summary.riskDistribution.high} high-risk system{summary.riskDistribution.high !== 1 ? 's' : ''}
              </span>
            </li>
          )}
          {summary.riskDistribution.unacceptable > 0 && (
            <li className="flex gap-3 text-sm">
              <span className="text-red-400">⚠</span>
              <span className="text-red-400 font-medium">
                URGENT: {summary.riskDistribution.unacceptable} unacceptable-risk system{summary.riskDistribution.unacceptable !== 1 ? 's' : ''} requires immediate action
              </span>
            </li>
          )}
          {summary.obligationMetrics.critical_priority > 0 && (
            <li className="flex gap-3 text-sm">
              <span className="text-red-400">⚠</span>
              <span className="text-red-400 font-medium">
                CRITICAL: {summary.obligationMetrics.critical_priority} critical obligation{summary.obligationMetrics.critical_priority !== 1 ? 's' : ''} need immediate attention
              </span>
            </li>
          )}
          {summary.obligationMetrics.identified > 0 && (
            <li className="flex gap-3 text-sm">
              <span className="text-amber-400">→</span>
              <span className="text-slate-400">
                Start tracking {summary.obligationMetrics.identified} identified obligation{summary.obligationMetrics.identified !== 1 ? 's' : ''}
              </span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
