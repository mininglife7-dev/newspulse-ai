'use client';

import type { DashboardState } from '@/types/governance';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  state: DashboardState;
}

export default function LaunchReadinessDashboard({ state }: Props) {
  const {
    launchReadiness,
    infraHealth,
    engineeringReadiness,
    securityStatus,
    customerReadiness,
    pilotReadiness,
  } = state;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'go':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'conditional_go':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'no_go':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertCircle className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-green-500/30 bg-green-950/20';
      case 'degraded':
        return 'border-yellow-500/30 bg-yellow-950/20';
      case 'critical':
        return 'border-red-500/30 bg-red-950/20';
      default:
        return 'border-border bg-card';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return <span className="text-green-300">Healthy</span>;
      case 'degraded':
        return <span className="text-yellow-300">Degraded</span>;
      case 'critical':
        return <span className="text-red-300">Critical</span>;
      default:
        return <span className="text-white/60">Unknown</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main GO/NO-GO Card */}
      <div className="rounded-lg border-2 border-accent-500/40 bg-accent-900/20 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-3">
              {getStatusIcon(launchReadiness.state)}
              <h2 className="text-2xl font-bold uppercase tracking-wider">
                {launchReadiness.state.replace(/_/g, ' ')}
              </h2>
            </div>
            <p className="mb-4 text-white/70">{launchReadiness.reasoning}</p>

            {launchReadiness.conditions &&
              launchReadiness.conditions.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold text-accent-300">
                    Conditions to reach GO:
                  </h3>
                  <ul className="space-y-1 text-sm text-white/60">
                    {launchReadiness.conditions.map((condition, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 inline-block h-1 w-1 rounded-full bg-accent-500" />
                        <span>{condition}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-5xl font-bold text-accent-300">
                {launchReadiness.percentage}
              </div>
              <div className="text-xs text-white/40">Overall Score</div>
            </div>
            <div className="h-2 w-40 overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-gradient-to-r from-accent-500 to-indigo-600"
                style={{ width: `${launchReadiness.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Critical Gates */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs uppercase text-white/40">Build Status</div>
          <div className="mt-2 flex items-center gap-2">
            {state.criticalGates.buildStatus === 'pass' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : state.criticalGates.buildStatus === 'fail' ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
            <span className="font-semibold">
              {state.criticalGates.buildStatus.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs uppercase text-white/40">CI Status</div>
          <div className="mt-2 flex items-center gap-2">
            {state.criticalGates.ciStatus === 'pass' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : state.criticalGates.ciStatus === 'fail' ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
            <span className="font-semibold">
              {state.criticalGates.ciStatus.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs uppercase text-white/40">Deployment</div>
          <div className="mt-2 flex items-center gap-2">
            {state.criticalGates.deploymentStatus === 'deployed' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : state.criticalGates.deploymentStatus === 'failed' ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
            <span className="font-semibold capitalize">
              {state.criticalGates.deploymentStatus}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs uppercase text-white/40">Security Audit</div>
          <div className="mt-2 flex items-center gap-2">
            {state.criticalGates.securityAudit === 'pass' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : state.criticalGates.securityAudit === 'fail' ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
            <span className="font-semibold capitalize">
              {state.criticalGates.securityAudit}
            </span>
          </div>
        </div>
      </div>

      {/* Health Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`rounded-lg border p-4 ${getStatusColor(infraHealth)}`}>
          <div className="text-xs uppercase text-white/40">
            Infrastructure Health
          </div>
          <div className="mt-2">{getStatusText(infraHealth)}</div>
        </div>

        <div
          className={`rounded-lg border p-4 ${getStatusColor(securityStatus)}`}
        >
          <div className="text-xs uppercase text-white/40">Security Status</div>
          <div className="mt-2">{getStatusText(securityStatus)}</div>
        </div>
      </div>

      {/* Readiness Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs uppercase text-white/40">
            Customer Readiness
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {customerReadiness.percentage}
            </span>
            <span className="text-white/40">%</span>
          </div>
          {customerReadiness.blockers.length > 0 && (
            <div className="mt-2 text-xs text-red-300">
              {customerReadiness.blockers.length} blocker(s)
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs uppercase text-white/40">Pilot Readiness</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {pilotReadiness.percentage}
            </span>
            <span className="text-white/40">%</span>
          </div>
          {pilotReadiness.blockers.length > 0 && (
            <div className="mt-2 text-xs text-red-300">
              {pilotReadiness.blockers.length} blocker(s)
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs uppercase text-white/40">
            Engineering Readiness
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {Math.round(engineeringReadiness.percentage)}
            </span>
            <span className="text-white/40">%</span>
          </div>
          {engineeringReadiness.blockers.length > 0 && (
            <div className="mt-2 text-xs text-red-300">
              {engineeringReadiness.blockers.length} blocker(s)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
