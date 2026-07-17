/**
 * HERCULES Command Centre — Founder's unified control and observation interface
 *
 * Displays:
 * - Enterprise health (overall + by organ)
 * - Current missions and tasks
 * - Recent events and decisions
 * - Authority-gated control panel
 * - Evidence explorer
 */

'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap,
  Activity,
  Brain,
  Eye,
  Heart,
  Shield,
  Wrench,
  TrendingUp,
  Cpu,
  RefreshCw,
} from 'lucide-react';

interface OrganHealth {
  organ: string;
  status: 'HEALTHY' | 'DEGRADED' | 'AT_RISK' | 'CRITICAL' | 'UNKNOWN';
  percentage: number;
  issues: string[];
  lastChecked: string;
}

interface HealthData {
  timestamp: string;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'AT_RISK' | 'CRITICAL' | 'UNKNOWN';
  overallPercentage: number;
  organs: OrganHealth[];
  blockingIssues: string[];
  recommendations: string[];
}

interface KernelStatus {
  enterprises: number;
  missions: number;
  tasks: number;
  queuedTasks: number;
  events: number;
  auditLogEntries: number;
  lastHeartbeat: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'HEALTHY':
      return 'text-green-600 bg-green-50';
    case 'DEGRADED':
      return 'text-yellow-600 bg-yellow-50';
    case 'AT_RISK':
      return 'text-orange-600 bg-orange-50';
    case 'CRITICAL':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'HEALTHY':
      return <CheckCircle className="w-5 h-5" />;
    case 'DEGRADED':
      return <AlertTriangle className="w-5 h-5" />;
    case 'AT_RISK':
      return <AlertTriangle className="w-5 h-5" />;
    case 'CRITICAL':
      return <AlertCircle className="w-5 h-5" />;
    default:
      return <Clock className="w-5 h-5" />;
  }
};

const OrganIcon = ({ organ }: { organ: string }) => {
  if (organ.includes('Production')) return <Activity className="w-4 h-4" />;
  if (organ.includes('Error')) return <AlertCircle className="w-4 h-4" />;
  if (organ.includes('Security')) return <Shield className="w-4 h-4" />;
  if (organ.includes('Cost')) return <TrendingUp className="w-4 h-4" />;
  if (organ.includes('Performance')) return <Zap className="w-4 h-4" />;
  if (organ.includes('Journey')) return <Heart className="w-4 h-4" />;
  return <Cpu className="w-4 h-4" />;
};

export default function CommandCentre() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [kernel, setKernel] = useState<KernelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/hercules/health');
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Failed to fetch health:', error);
    }
  };

  const fetchKernelStatus = async () => {
    try {
      const response = await fetch('/api/hercules/kernel?action=status');
      if (response.ok) {
        const data = await response.json();
        setKernel(data.kernel);
      }
    } catch (error) {
      console.error('Failed to fetch kernel status:', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchHealth(), fetchKernelStatus()]).then(() => {
      setLoading(false);
      setLastRefresh(new Date().toLocaleTimeString());
    });
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchHealth(), fetchKernelStatus()]);
    setLastRefresh(new Date().toLocaleTimeString());
    setRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              ⚡ HERCULES Command Centre
            </h1>
            <p className="text-slate-600 mt-2">
              Living Enterprise Operating System — Real-time organism health &
              control
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>

        {/* Last Refresh */}
        {lastRefresh && (
          <p className="text-sm text-slate-500 mb-6">
            Last updated: {lastRefresh}
          </p>
        )}

        {/* Overall Health Card */}
        {health && (
          <div
            className={`p-6 rounded-lg border-2 mb-8 ${
              health.overallStatus === 'HEALTHY'
                ? 'bg-green-50 border-green-200'
                : health.overallStatus === 'DEGRADED'
                  ? 'bg-yellow-50 border-yellow-200'
                  : health.overallStatus === 'AT_RISK'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(health.overallStatus)}
                <div>
                  <h2 className="text-2xl font-bold">
                    {health.overallStatus === 'HEALTHY'
                      ? '🟢 HEALTHY'
                      : health.overallStatus === 'DEGRADED'
                        ? '🟡 DEGRADED'
                        : health.overallStatus === 'AT_RISK'
                          ? '🟠 AT_RISK'
                          : '🔴 CRITICAL'}
                  </h2>
                  <p className="text-sm text-slate-600">Enterprise Health</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {health.overallPercentage}%
                </div>
                <p className="text-xs text-slate-600">System Operational</p>
              </div>
            </div>

            {/* Health Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
              <div
                className={`h-2 rounded-full transition-all ${
                  health.overallPercentage >= 90
                    ? 'bg-green-600'
                    : health.overallPercentage >= 70
                      ? 'bg-yellow-600'
                      : health.overallPercentage >= 50
                        ? 'bg-orange-600'
                        : 'bg-red-600'
                }`}
                style={{ width: `${health.overallPercentage}%` }}
              />
            </div>

            {/* Recommendations */}
            {health.recommendations.length > 0 && (
              <div className="space-y-2">
                {health.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="text-sm p-2 bg-white bg-opacity-60 rounded border-l-2 border-slate-400"
                  >
                    {rec}
                  </div>
                ))}
              </div>
            )}

            {/* Blocking Issues */}
            {health.blockingIssues.length > 0 && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
                <p className="font-semibold text-red-900 mb-2">
                  🚨 Blocking Issues:
                </p>
                <ul className="space-y-1 text-sm text-red-800">
                  {health.blockingIssues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Organ Health */}
          {health && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">HERCULES Organs</h3>
              </div>
              <div className="space-y-3">
                {health.organs.map((organ, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded border ${getStatusColor(organ.status)}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <OrganIcon organ={organ.organ} />
                        <span className="font-semibold text-sm">
                          {organ.organ}
                        </span>
                      </div>
                      <span className="text-xs font-bold">
                        {organ.percentage}%
                      </span>
                    </div>
                    {organ.issues.length > 0 && (
                      <ul className="text-xs space-y-1 mt-2">
                        {organ.issues.slice(0, 2).map((issue, j) => (
                          <li key={j} className="opacity-75">
                            • {issue}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kernel Status */}
          {kernel && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-semibold">Kernel State</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {kernel.enterprises}
                  </div>
                  <p className="text-xs text-slate-600">Enterprises</p>
                </div>
                <div className="p-3 bg-purple-50 rounded border border-purple-200">
                  <div className="text-2xl font-bold text-purple-600">
                    {kernel.missions}
                  </div>
                  <p className="text-xs text-slate-600">Missions</p>
                </div>
                <div className="p-3 bg-green-50 rounded border border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    {kernel.tasks}
                  </div>
                  <p className="text-xs text-slate-600">Total Tasks</p>
                </div>
                <div className="p-3 bg-orange-50 rounded border border-orange-200">
                  <div className="text-2xl font-bold text-orange-600">
                    {kernel.queuedTasks}
                  </div>
                  <p className="text-xs text-slate-600">Queued</p>
                </div>
                <div className="p-3 bg-red-50 rounded border border-red-200">
                  <div className="text-2xl font-bold text-red-600">
                    {kernel.events}
                  </div>
                  <p className="text-xs text-slate-600">Events</p>
                </div>
                <div className="p-3 bg-slate-100 rounded border border-slate-300">
                  <div className="text-2xl font-bold text-slate-700">
                    {kernel.auditLogEntries}
                  </div>
                  <p className="text-xs text-slate-600">Audit Entries</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-slate-50 rounded text-xs text-slate-600">
                <p>
                  Last heartbeat:{' '}
                  {new Date(kernel.lastHeartbeat).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200 text-center">
          <p className="text-sm text-slate-600">
            HERCULES v1.0 operational | Governor autonomous execution
            constitution active
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Founder: Control and observe via /api/hercules/kernel (missions,
            tasks, events) and /api/hercules/health
          </p>
        </div>
      </div>
    </div>
  );
}
