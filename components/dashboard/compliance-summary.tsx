"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface ComplianceSummaryData {
  ai_systems: {
    total: number;
    by_risk: {
      high: number;
      medium: number;
      low: number;
    };
  };
  obligations: {
    total: number;
    by_priority: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    by_status: {
      identified: number;
      in_progress: number;
      completed: number;
    };
  };
  remediations: {
    total: number;
    by_status: {
      open: number;
      in_progress: number;
      completed: number;
      blocked: number;
    };
  };
  evidence: {
    total: number;
    approved: number;
    approval_rate: number;
  };
  compliance_metrics: {
    overall_compliance_score: number;
    obligations_completed: number;
    obligations_total: number;
  };
}

interface ComplianceSummaryProps {
  workspaceId: string;
}

export function ComplianceSummary({ workspaceId }: ComplianceSummaryProps) {
  const [data, setData] = useState<ComplianceSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const response = await fetch(
          `/api/dashboard/compliance-summary?workspace_id=${workspaceId}`
        );
        if (!response.ok) throw new Error("Failed to fetch compliance summary");
        const result = await response.json();
        if (result.ok) {
          setData(result.summary);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (workspaceId) {
      fetchSummary();
    }
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-800 rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-6">
        <p className="text-red-400">
          {error || "Failed to load compliance summary"}
        </p>
      </div>
    );
  }

  const score = data.compliance_metrics.overall_compliance_score;
  const scoreColor =
    score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
  const scoreGauge =
    score >= 80 ? "bg-green-400" : score >= 60 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="space-y-6">
      {/* Overall Compliance Score */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400 mb-2">
              Overall Compliance Score
            </p>
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-bold ${scoreColor}`}>
                {score}%
              </span>
              <span className="text-sm text-slate-400">
                {data.compliance_metrics.obligations_completed} of{" "}
                {data.compliance_metrics.obligations_total} obligations complete
              </span>
            </div>
          </div>
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-8 border-slate-700" />
            <div
              className={`absolute inset-0 rounded-full border-8 ${scoreGauge}`}
              style={{
                clipPath: `inset(0 0 ${100 - score}% 0)`,
              }}
            />
            <BarChart3 className={`w-12 h-12 ${scoreColor}`} />
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-400">Progress</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={scoreGauge}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* AI Systems */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">AI Systems</span>
            <AlertTriangle className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {data.ai_systems.total}
          </div>
          <div className="space-y-1 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>High Risk:</span>
              <span className="text-red-400 font-medium">
                {data.ai_systems.by_risk.high}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Medium:</span>
              <span className="text-yellow-400 font-medium">
                {data.ai_systems.by_risk.medium}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Low:</span>
              <span className="text-green-400 font-medium">
                {data.ai_systems.by_risk.low}
              </span>
            </div>
          </div>
        </div>

        {/* Obligations */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Obligations</span>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {data.obligations.total}
          </div>
          <div className="space-y-1 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Identified:</span>
              <span className="font-medium">
                {data.obligations.by_status.identified}
              </span>
            </div>
            <div className="flex justify-between">
              <span>In Progress:</span>
              <span className="text-blue-400 font-medium">
                {data.obligations.by_status.in_progress}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Completed:</span>
              <span className="text-green-400 font-medium">
                {data.obligations.by_status.completed}
              </span>
            </div>
          </div>
        </div>

        {/* Evidence */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Evidence</span>
            <CheckCircle2 className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {data.evidence.approved}/{data.evidence.total}
          </div>
          <div className="space-y-1 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Approval Rate:</span>
              <span className={data.evidence.approval_rate >= 75 ? "text-green-400" : "text-yellow-400"}>
                {data.evidence.approval_rate}%
              </span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
              <div
                className={data.evidence.approval_rate >= 75 ? "bg-green-400" : "bg-yellow-400"}
                style={{ width: `${data.evidence.approval_rate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Remediations */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Actions</span>
            <TrendingUp className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            {data.remediations.total}
          </div>
          <div className="space-y-1 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Open:</span>
              <span className="font-medium">
                {data.remediations.by_status.open}
              </span>
            </div>
            <div className="flex justify-between">
              <span>In Progress:</span>
              <span className="text-blue-400 font-medium">
                {data.remediations.by_status.in_progress}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Completed:</span>
              <span className="text-green-400 font-medium">
                {data.remediations.by_status.completed}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Issues */}
      {data.obligations.by_priority.critical > 0 && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="font-semibold text-red-200">Critical Obligations</h3>
          </div>
          <p className="text-sm text-red-300/80">
            You have {data.obligations.by_priority.critical} critical compliance
            obligation{data.obligations.by_priority.critical > 1 ? "s" : ""} that
            require immediate action.
          </p>
        </div>
      )}
    </div>
  );
}
