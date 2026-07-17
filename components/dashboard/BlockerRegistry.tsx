'use client';

import type { LaunchBlocker } from '@/types/governance';
import { CheckCircle, AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface Props {
  blockers: LaunchBlocker[];
}

export default function BlockerRegistry({ blockers }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'open':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'blocked':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-950/20 border-green-500/30';
      case 'in_progress':
        return 'bg-blue-950/20 border-blue-500/30';
      case 'open':
        return 'bg-yellow-950/20 border-yellow-500/30';
      case 'blocked':
        return 'bg-red-950/20 border-red-500/30';
      default:
        return 'bg-card border-border';
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-500/20 text-red-300';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'low':
        return 'bg-green-500/20 text-green-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  // Sort by status: open first, then blocked, then in_progress, then resolved
  const sortedBlockers = [...blockers].sort((a, b) => {
    const statusOrder = { open: 0, blocked: 1, in_progress: 2, resolved: 3 };
    return (
      (statusOrder[a.status as keyof typeof statusOrder] || 4) -
      (statusOrder[b.status as keyof typeof statusOrder] || 4)
    );
  });

  const stats = {
    total: blockers.length,
    resolved: blockers.filter((b) => b.status === 'resolved').length,
    open: blockers.filter((b) => b.status === 'open').length,
    inProgress: blockers.filter((b) => b.status === 'in_progress').length,
    blocked: blockers.filter((b) => b.status === 'blocked').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-2 sm:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs uppercase text-white/40">Total</div>
          <div className="mt-2 text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded-lg border border-green-500/30 bg-green-950/20 p-3">
          <div className="text-xs uppercase text-white/40">Resolved</div>
          <div className="mt-2 text-2xl font-bold text-green-300">
            {stats.resolved}
          </div>
        </div>
        <div className="rounded-lg border border-blue-500/30 bg-blue-950/20 p-3">
          <div className="text-xs uppercase text-white/40">In Progress</div>
          <div className="mt-2 text-2xl font-bold text-blue-300">
            {stats.inProgress}
          </div>
        </div>
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-950/20 p-3">
          <div className="text-xs uppercase text-white/40">Open</div>
          <div className="mt-2 text-2xl font-bold text-yellow-300">
            {stats.open}
          </div>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3">
          <div className="text-xs uppercase text-white/40">Blocked</div>
          <div className="mt-2 text-2xl font-bold text-red-300">
            {stats.blocked}
          </div>
        </div>
      </div>

      {/* Blockers List */}
      <div className="space-y-2">
        {sortedBlockers.map((blocker) => (
          <div
            key={blocker.id}
            className={`rounded-lg border transition ${getStatusBg(blocker.status)}`}
          >
            <button
              onClick={() =>
                setExpandedId(expandedId === blocker.id ? null : blocker.id)
              }
              className="w-full p-4 text-left hover:bg-white/5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 items-start gap-3">
                  <div className="mt-1">{getStatusIcon(blocker.status)}</div>
                  <div className="flex-1">
                    <div className="font-semibold">
                      {blocker.id} — {blocker.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-white/70">
                      <span>{blocker.problem}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${getRiskBadgeColor(blocker.riskLevel)}`}
                  >
                    {blocker.riskLevel} risk
                  </span>
                  <span className="whitespace-nowrap rounded-full bg-black/50 px-2 py-1 text-xs capitalize text-white/70">
                    {blocker.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </button>

            {/* Expanded Details */}
            {expandedId === blocker.id && (
              <div className="border-t border-white/10 px-4 py-4 text-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 uppercase text-white/40">Impact</div>
                    <div className="text-white/80">{blocker.impact}</div>
                  </div>
                  <div>
                    <div className="mb-2 uppercase text-white/40">Solution</div>
                    <div className="text-white/80">{blocker.solution}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 uppercase text-white/40">
                    Rollback Path
                  </div>
                  <div className="rounded bg-black/30 p-2 font-mono text-xs text-white/70">
                    {blocker.rollbackPath}
                  </div>
                </div>

                {blocker.evidence.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 uppercase text-white/40">Evidence</div>
                    <div className="flex flex-wrap gap-2">
                      {blocker.evidence.map((e) => (
                        <span
                          key={e}
                          className="rounded bg-accent-500/20 px-2 py-1 text-xs text-accent-300"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
