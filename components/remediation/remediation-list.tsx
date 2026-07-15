"use client";

import { useEffect, useState } from "react";
import { Loader, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface RemediationItem {
  id: string;
  obligation_id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "completed" | "blocked";
  target_completion_date?: string;
  completed_date?: string;
  assigned_to?: string;
  created_at: string;
}

interface RemediationListProps {
  workspaceId: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-slate-900/30 border-slate-800 text-slate-300",
  in_progress: "bg-blue-900/30 border-blue-800 text-blue-300",
  completed: "bg-green-900/30 border-green-800 text-green-300",
  blocked: "bg-red-900/30 border-red-800 text-red-300",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <AlertCircle className="w-4 h-4" />,
  in_progress: <Clock className="w-4 h-4" />,
  completed: <CheckCircle className="w-4 h-4" />,
  blocked: <AlertCircle className="w-4 h-4" />,
};

export function RemediationList({ workspaceId }: RemediationListProps) {
  const [remediations, setRemediations] = useState<RemediationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "completed" | "blocked">("all");

  useEffect(() => {
    async function fetchRemediations() {
      try {
        const response = await fetch(
          `/api/remediation/list?workspace_id=${workspaceId}`
        );
        if (!response.ok) throw new Error("Failed to fetch remediations");
        const data = await response.json();
        setRemediations(data.remediations || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (workspaceId) {
      fetchRemediations();
    }
  }, [workspaceId]);

  const filteredRemediations = remediations.filter((r) =>
    filter === "all" ? true : r.status === filter
  );

  const statusCounts = {
    all: remediations.length,
    open: remediations.filter((r) => r.status === "open").length,
    in_progress: remediations.filter((r) => r.status === "in_progress").length,
    completed: remediations.filter((r) => r.status === "completed").length,
    blocked: remediations.filter((r) => r.status === "blocked").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (remediations.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-12 text-center">
        <p className="text-slate-400 mb-4">No remediation actions found</p>
        <p className="text-sm text-slate-500">
          Create remediation items to track compliance action items
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(["all", "open", "in_progress", "completed", "blocked"] as const).map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                filter === status
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {status === "all"
                ? "All"
                : status
                    .split("_")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")}{" "}
              ({statusCounts[status]})
            </button>
          )
        )}
      </div>

      {/* Remediations Grid */}
      <div className="space-y-4">
        {filteredRemediations.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
            <p className="text-slate-400">No remediation items in this status</p>
          </div>
        ) : (
          filteredRemediations.map((remediation) => (
            <div
              key={remediation.id}
              className={`rounded-lg border p-6 transition ${
                STATUS_COLORS[remediation.status]
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-slate-400 mt-1">
                    {STATUS_ICONS[remediation.status]}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">
                      {remediation.title}
                    </h4>
                    {remediation.description && (
                      <p className="text-sm text-slate-400 mb-2">
                        {remediation.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium uppercase ${
                      PRIORITY_COLORS[remediation.priority]
                    }`}
                  >
                    {remediation.priority}
                  </span>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium border ${
                      STATUS_COLORS[remediation.status]
                    }`}
                  >
                    {remediation.status
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid gap-3 sm:grid-cols-3">
                {remediation.target_completion_date && (
                  <div className="bg-slate-800/30 rounded px-3 py-2">
                    <p className="text-xs font-medium text-slate-400 mb-1">
                      Target Date
                    </p>
                    <p className="text-sm text-white">
                      {new Date(
                        remediation.target_completion_date
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {remediation.completed_date && (
                  <div className="bg-slate-800/30 rounded px-3 py-2">
                    <p className="text-xs font-medium text-slate-400 mb-1">
                      Completed
                    </p>
                    <p className="text-sm text-white">
                      {new Date(remediation.completed_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {remediation.assigned_to && (
                  <div className="bg-slate-800/30 rounded px-3 py-2">
                    <p className="text-xs font-medium text-slate-400 mb-1">
                      Assigned To
                    </p>
                    <p className="text-sm text-white">
                      {remediation.assigned_to}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
