"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, Zap } from "lucide-react";

interface HeatmapSystem {
  ai_system_id: string;
  ai_system_name: string;
  risk_level: string;
  latest_risk_score: number;
  obligations_total: number;
  obligations_incomplete: number;
  critical_obligations: number;
  compliance_urgency: "critical" | "high" | "low";
}

interface RiskHeatmapData {
  heatmap: HeatmapSystem[];
  summary: {
    total_systems: number;
    critical_systems: number;
    high_risk_systems: number;
  };
}

interface RiskHeatmapProps {
  workspaceId: string;
}

export function RiskHeatmap({ workspaceId }: RiskHeatmapProps) {
  const [data, setData] = useState<RiskHeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHeatmap() {
      try {
        const response = await fetch(
          `/api/dashboard/risk-heatmap?workspace_id=${workspaceId}`
        );
        if (!response.ok) throw new Error("Failed to fetch risk heatmap");
        const result = await response.json();
        if (result.ok) {
          setData(result);
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
      fetchHeatmap();
    }
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <div className="h-64 bg-slate-800 rounded animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-6">
        <p className="text-red-400">{error || "Failed to load risk heatmap"}</p>
      </div>
    );
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "border-red-600 bg-red-900/30";
      case "high":
        return "border-yellow-600 bg-yellow-900/30";
      default:
        return "border-green-600 bg-green-900/30";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case "high":
        return <TrendingUp className="w-4 h-4 text-yellow-400" />;
      default:
        return <Zap className="w-4 h-4 text-green-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs font-medium text-slate-400 mb-1">Total Systems</p>
          <p className="text-2xl font-bold text-white">
            {data.summary.total_systems}
          </p>
        </div>
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4">
          <p className="text-xs font-medium text-red-300 mb-1">
            Critical Urgency
          </p>
          <p className="text-2xl font-bold text-red-400">
            {data.summary.critical_systems}
          </p>
        </div>
        <div className="rounded-lg border border-yellow-800/50 bg-yellow-900/20 p-4">
          <p className="text-xs font-medium text-yellow-300 mb-1">
            High Risk
          </p>
          <p className="text-2xl font-bold text-yellow-400">
            {data.summary.high_risk_systems}
          </p>
        </div>
      </div>

      {/* Heatmap List */}
      <div className="space-y-3">
        {data.heatmap.length === 0 ? (
          <div className="rounded-lg border border-green-800/50 bg-green-900/20 p-6 text-center">
            <p className="text-green-300 font-medium">
              All systems are in good compliance standing
            </p>
          </div>
        ) : (
          data.heatmap.map((system) => (
            <div
              key={system.ai_system_id}
              className={`rounded-lg border p-6 transition ${getUrgencyColor(
                system.compliance_urgency
              )}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  {getUrgencyIcon(system.compliance_urgency)}
                  <div>
                    <h4 className="font-semibold text-white">
                      {system.ai_system_name}
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">
                      Risk Level:{" "}
                      <span className="font-medium capitalize text-white">
                        {system.risk_level}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">
                    {system.latest_risk_score}
                  </div>
                  <p className="text-xs text-slate-400">risk score</p>
                </div>
              </div>

              {/* Obligation Status */}
              <div className="grid gap-3 sm:grid-cols-3 mb-4">
                <div className="bg-slate-800/50 rounded px-3 py-2">
                  <p className="text-xs font-medium text-slate-400 mb-1">
                    Total Obligations
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {system.obligations_total}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded px-3 py-2">
                  <p className="text-xs font-medium text-slate-400 mb-1">
                    Incomplete
                  </p>
                  <p className={`text-lg font-semibold ${
                    system.obligations_incomplete > 0
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}>
                    {system.obligations_incomplete}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded px-3 py-2">
                  <p className="text-xs font-medium text-slate-400 mb-1">
                    Critical
                  </p>
                  <p className={`text-lg font-semibold ${
                    system.critical_obligations > 0
                      ? "text-red-400"
                      : "text-green-400"
                  }`}>
                    {system.critical_obligations}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              {system.obligations_total > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-slate-400">
                      Completion
                    </span>
                    <span className="text-xs font-medium text-slate-300">
                      {Math.round(
                        ((system.obligations_total - system.obligations_incomplete) /
                          system.obligations_total) *
                          100
                      )}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={
                        system.compliance_urgency === "critical"
                          ? "bg-red-500"
                          : system.compliance_urgency === "high"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }
                      style={{
                        width: `${
                          ((system.obligations_total -
                            system.obligations_incomplete) /
                            system.obligations_total) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
