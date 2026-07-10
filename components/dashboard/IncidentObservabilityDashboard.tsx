'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
  Activity,
  BarChart3,
} from 'lucide-react';
import type {
  IncidentMetrics,
  SystemHealthMetrics,
  IncidentLifecycleMetrics,
} from '@/lib/incident-metrics';

interface DashboardData {
  metrics: IncidentMetrics;
  health: SystemHealthMetrics;
  incidents: IncidentLifecycleMetrics[];
}

const SYSTEM_LABELS: Record<keyof Omit<SystemHealthMetrics, 'lastSystemCheck' | 'systemUptime' | 'systemErrors'>, string> = {
  detectionSystemHealthy: 'Detection (DNS-016)',
  correlationSystemHealthy: 'Correlation (DNS-022)',
  incidentCommandHealthy: 'Incident Command (DNS-017)',
  communicationSystemHealthy: 'Communication (DNS-018)',
  remediationSystemHealthy: 'Remediation (DNS-021)',
  postmortemSystemHealthy: 'Post-Mortem (DNS-019)',
};

export default function IncidentObservabilityDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState(24);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [metricsRes, healthRes, allIncidentsRes] = await Promise.all([
          fetch(`/api/incident-metrics?metrics=true&hours=${timeWindow}`),
          fetch('/api/incident-metrics?health=true'),
          fetch('/api/incident-metrics?all=true'),
        ]);

        if (!metricsRes.ok || !healthRes.ok || !allIncidentsRes.ok) {
          throw new Error('Failed to fetch incident metrics');
        }

        const metricsData = await metricsRes.json();
        const healthData = await healthRes.json();
        const allIncidentsData = await allIncidentsRes.json();

        setData({
          metrics: metricsData.metrics,
          health: healthData.health,
          incidents: allIncidentsData.incidents,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeWindow]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-700" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-200">Failed to load metrics</div>
            <div className="text-sm text-red-300">{error || 'No data available'}</div>
          </div>
        </div>
      </div>
    );
  }

  const { metrics, health, incidents } = data;
  const recentIncidents = incidents.slice(0, 5);
  const systemsHealthy = Object.entries(health).filter(
    ([key]) => key.endsWith('SystemHealthy') && health[key as keyof SystemHealthMetrics]
  ).length;
  const totalSystems = 6;

  const getTrendIcon = (direction: 'improving' | 'stable' | 'declining') => {
    if (direction === 'improving') {
      return <TrendingUp className="h-4 w-4 text-green-400" />;
    }
    if (direction === 'declining') {
      return <TrendingDown className="h-4 w-4 text-red-400" />;
    }
    return <Activity className="h-4 w-4 text-yellow-400" />;
  };

  const getStatusColor = (status: string): string => {
    if (status === 'resolved') return 'text-green-300';
    if (status === 'remediating' || status === 'commanding') return 'text-yellow-300';
    return 'text-slate-400';
  };

  const getHealthStatusColor = (healthy: boolean): string => {
    return healthy ? 'text-green-300' : 'text-red-300';
  };

  const getImpactBadgeColor = (impact: string): string => {
    switch (impact) {
      case 'critical':
        return 'bg-red-500/20 text-red-300';
      case 'high':
        return 'bg-orange-500/20 text-orange-300';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'low':
        return 'bg-blue-500/20 text-blue-300';
      default:
        return 'bg-slate-500/20 text-slate-300';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with time window control */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Incident Response Observability</h2>
        <div className="flex gap-2">
          {[24, 168, 720].map((hours) => (
            <button
              key={hours}
              onClick={() => setTimeWindow(hours)}
              className={`rounded px-3 py-1 text-sm font-medium transition ${
                timeWindow === hours
                  ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/50'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {hours === 24 ? '24h' : hours === 168 ? '7d' : '30d'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Incidents */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-xs uppercase text-slate-400">Total Incidents</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{metrics.totalIncidents}</span>
          </div>
          <div className="mt-2 flex gap-2 text-xs">
            <div className="flex items-center gap-1 text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              {metrics.resolvedIncidents} resolved
            </div>
            <div className="flex items-center gap-1 text-yellow-400">
              <AlertCircle className="h-3 w-3" />
              {metrics.unresolvedIncidents} open
            </div>
          </div>
        </div>

        {/* MTTR */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-xs uppercase text-slate-400">Avg MTTR</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-cyan-300">{metrics.averageMTTR}</span>
            <span className="text-sm text-slate-400">min</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            {getTrendIcon(metrics.trendDirection)}
            <span>
              {metrics.trendDirection === 'improving' && (
                <span className="text-green-300">
                  {metrics.trendMagnitude.toFixed(1)}% better
                </span>
              )}
              {metrics.trendDirection === 'declining' && (
                <span className="text-red-300">
                  {metrics.trendMagnitude.toFixed(1)}% slower
                </span>
              )}
              {metrics.trendDirection === 'stable' && <span>Stable</span>}
            </span>
          </div>
        </div>

        {/* MTTD */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-xs uppercase text-slate-400">Avg MTTD</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-cyan-300">{metrics.averageMTTD}</span>
            <span className="text-sm text-slate-400">min</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">Time to detect</div>
        </div>

        {/* Success Rate */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-xs uppercase text-slate-400">Success Rate</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-green-300">{metrics.successRate}%</span>
          </div>
          <div className="mt-2 h-2 w-full bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              style={{ width: `${metrics.successRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Percentile Analysis */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Resolution Time Distribution</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase text-slate-400">Median</div>
            <div className="mt-2 text-2xl font-bold text-white">{metrics.medianResolutionTime} min</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400">95th Percentile</div>
            <div className="mt-2 text-2xl font-bold text-yellow-300">{metrics.p95ResolutionTime} min</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400">99th Percentile</div>
            <div className="mt-2 text-2xl font-bold text-red-300">{metrics.p99ResolutionTime} min</div>
          </div>
        </div>
      </div>

      {/* Playbook Effectiveness */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="mb-4 font-semibold text-white">Playbook Effectiveness</h3>
        <div className="space-y-3">
          {Object.entries(metrics.playbookEffectiveness).map(([category, effectiveness]) => (
            <div key={category}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-300">{category}</span>
                <span
                  className={`font-semibold ${
                    effectiveness >= 80
                      ? 'text-green-300'
                      : effectiveness >= 60
                      ? 'text-yellow-300'
                      : 'text-red-300'
                  }`}
                >
                  {effectiveness.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    effectiveness >= 80
                      ? 'bg-green-500'
                      : effectiveness >= 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${effectiveness}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Health Status */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            <h3 className="font-semibold text-white">System Health</h3>
          </div>
          <div className="text-sm text-slate-400">
            {systemsHealthy}/{totalSystems} healthy
          </div>
        </div>
        <div className="space-y-2">
          {Object.entries(SYSTEM_LABELS).map(([key, label]) => {
            const isHealthy = health[key as keyof typeof SYSTEM_LABELS] as boolean;
            return (
              <div key={key} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                <span className="text-sm text-slate-300">{label}</span>
                <span className={`flex items-center gap-1 text-sm font-medium ${getHealthStatusColor(isHealthy)}`}>
                  {isHealthy ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Healthy
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      Unhealthy
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 text-xs text-slate-400">
          <div>Uptime: <span className="font-semibold text-white">{health.systemUptime}%</span></div>
          <div>Errors: <span className="font-semibold text-white">{health.systemErrors}</span></div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="mb-4 font-semibold text-white">Recent Incidents</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left font-semibold text-slate-400">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-400">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-400">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-400">Impact</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-400">MTTR</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-400">Success</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {recentIncidents.length > 0 ? (
                recentIncidents.map((incident) => (
                  <tr key={incident.incidentId} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {incident.incidentId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{incident.category}</td>
                    <td className={`px-4 py-3 font-medium ${getStatusColor(incident.status)}`}>
                      {incident.status}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {incident.customerImpact && (
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getImpactBadgeColor(
                            incident.customerImpact
                          )}`}
                        >
                          {incident.customerImpact}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {incident.totalResolutionTime !== undefined ? (
                        <span className="font-semibold">{incident.totalResolutionTime} min</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {incident.playbookSuccessful !== undefined && (
                        <span
                          className={`font-semibold ${
                            incident.playbookSuccessful ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {incident.playbookSuccessful ? '✓' : '✗'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No incidents recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
