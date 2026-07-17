'use client';

import type { DashboardState } from '@/types/governance';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  inconsistencies: DashboardState['inconsistencies'];
}

export default function ConsistencyCheck({ inconsistencies }: Props) {
  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div
        className="rounded-lg border-2 p-6"
        style={{
          borderColor: inconsistencies.found
            ? 'rgb(239, 68, 68, 0.3)'
            : 'rgb(34, 197, 94, 0.3)',
          backgroundColor: inconsistencies.found
            ? 'rgb(127, 29, 29, 0.2)'
            : 'rgb(6, 78, 59, 0.2)',
        }}
      >
        <div className="flex items-start gap-3">
          {inconsistencies.found ? (
            <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <h2 className="text-xl font-bold">
              {inconsistencies.found
                ? 'Data Integrity Issues Detected'
                : 'Data Integrity Verified'}
            </h2>
            <p className="mt-2 text-white/70">
              {inconsistencies.found
                ? `Found ${inconsistencies.issues.length} inconsistencies in the governance state. These should be resolved to ensure reliable metrics.`
                : 'All metrics are consistent across the system. Canonical state is reliable.'}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Issues */}
      {inconsistencies.issues.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Issues:</h3>
          <div className="space-y-2">
            {inconsistencies.issues.map((issue, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-950/20 p-3"
              >
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{issue}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How Consistency is Verified */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 font-semibold">Consistency Checks Performed</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span>
              All blockers referenced in documentation exist in canonical state
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span>
              All missions referenced in documentation exist in canonical state
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Category scores do not exceed target values</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Resolved blockers are not marked with high risk</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Open critical blockers align with readiness percentage</span>
          </li>
        </ul>
      </div>

      {/* Last Check */}
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-white/60">
        <div className="flex items-center justify-between">
          <span>Last consistency check:</span>
          <span className="font-mono">
            {new Date(inconsistencies.lastCheckedAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Data Source Architecture */}
      <div className="rounded-lg border border-accent-500/30 bg-accent-900/20 p-6">
        <h3 className="mb-4 font-semibold">Canonical State Architecture</h3>
        <div className="space-y-3 text-sm">
          <p className="text-white/80">
            The dashboard state is built from a single authoritative source (
            <code className="text-accent-300 bg-black/30 px-1 rounded">
              lib/governance-state.ts
            </code>
            ). All UI components read from{' '}
            <code className="text-accent-300 bg-black/30 px-1 rounded">
              /api/dashboard
            </code>
            .
          </p>
          <p className="text-white/80">
            No hardcoded values exist in the UI layer. All metrics, statuses,
            and calculations are deterministic functions of the canonical
            backend state.
          </p>
          <p className="text-white/80">
            If a metric changes, it is updated in exactly one place:{' '}
            <code className="text-accent-300 bg-black/30 px-1 rounded">
              lib/governance-state.ts
            </code>
            . The change propagates to all dashboard screens automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
