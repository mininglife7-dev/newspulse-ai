'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Filter, Download } from 'lucide-react';

interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  alert_type: string;
  system_id: string;
  message: string;
  confidence: number;
  timestamp: string;
  details?: Record<string, any>;
}

interface AlertsSummary {
  alerts: Alert[];
  stats: {
    totalAlerts: number;
    bySeverity: Record<string, number>;
    byAlertType: Record<string, number>;
    topSystems: Array<{ systemId: string; count: number }>;
    timeRange: {
      from: string;
      to: string;
      hoursBack: number;
    };
  };
  filters: {
    applied: {
      severity?: string;
      alertType?: string;
      systemId?: string;
      hoursBack: number;
    };
    available: {
      severities: string[];
      alertTypes: string[];
    };
  };
  lastUpdated: string;
}

export default function ThreatsDashboardPage() {
  const [summary, setSummary] = useState<AlertsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    severity: '',
    alertType: '',
    systemId: '',
    hoursBack: '24',
  });

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.alertType) params.append('alertType', filters.alertType);
      if (filters.systemId) params.append('systemId', filters.systemId);
      params.append('hoursBack', filters.hoursBack);

      const res = await fetch(`/api/alerts/summary?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch alerts');
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Alerts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filters]);

  const severityColors = {
    critical: 'bg-red-900/20 border-red-800/50 text-red-200',
    high: 'bg-orange-900/20 border-orange-800/50 text-orange-200',
    medium: 'bg-yellow-900/20 border-yellow-800/50 text-yellow-200',
    low: 'bg-blue-900/20 border-blue-800/50 text-blue-200',
  };

  const severityBadge = {
    critical: 'bg-red-900 text-red-200',
    high: 'bg-orange-900 text-orange-200',
    medium: 'bg-yellow-900 text-yellow-200',
    low: 'bg-blue-900 text-blue-200',
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const res = await fetch('/api/export/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, ...filters }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alerts-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white">Runtime Threat Monitoring</h1>
          <p className="mt-2 text-lg text-slate-400">Loading alerts...</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-lg bg-slate-800"></div>
          <div className="h-96 rounded-lg bg-slate-800"></div>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white">Runtime Threat Monitoring</h1>
          <p className="mt-2 text-lg text-slate-400">Error loading alerts</p>
        </div>
        <div className="rounded-lg border border-red-800/50 bg-red-950/20 p-6">
          <div className="flex gap-4">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-white">Error</h3>
              <p className="text-sm text-slate-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const hasCriticalAlerts = summary.stats.bySeverity.critical > 0;
  const hasHighAlerts = summary.stats.bySeverity.high > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white">Runtime Threat Monitoring</h1>
        <p className="mt-2 text-lg text-slate-400">
          AI system threat detection and security alerts ({summary.stats.timeRange.hoursBack}h window)
        </p>
      </div>

      {/* Critical Alert Banner */}
      {hasCriticalAlerts && (
        <div className="rounded-lg border border-red-800/50 bg-red-950/20 p-6">
          <div className="flex gap-4">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-200">
                {summary.stats.bySeverity.critical} Critical Threat{summary.stats.bySeverity.critical !== 1 ? 's' : ''} Detected
              </h3>
              <p className="text-sm text-red-300/80 mt-1">
                Immediate action required to address high-risk security vulnerabilities.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-slate-400 mb-2">Total Alerts</p>
          <p className="text-3xl font-bold text-white">{summary.stats.totalAlerts}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-slate-400 mb-2">Critical</p>
          <p className="text-3xl font-bold text-red-400">{summary.stats.bySeverity.critical}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-slate-400 mb-2">High</p>
          <p className="text-3xl font-bold text-orange-400">{summary.stats.bySeverity.high}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-sm text-slate-400 mb-2">Updated</p>
          <p className="text-sm text-slate-300 font-mono">
            {new Date(summary.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-slate-400" />
          <h3 className="font-semibold text-white">Filters</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Alert Type</label>
            <select
              value={filters.alertType}
              onChange={(e) => setFilters({ ...filters, alertType: e.target.value })}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              {summary.filters.available.alertTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">System</label>
            <select
              value={filters.systemId}
              onChange={(e) => setFilters({ ...filters, systemId: e.target.value })}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm"
            >
              <option value="">All Systems</option>
              {summary.stats.topSystems.map((sys) => (
                <option key={sys.systemId} value={sys.systemId}>
                  {sys.systemId} ({sys.count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Time Range</label>
            <select
              value={filters.hoursBack}
              onChange={(e) => setFilters({ ...filters, hoursBack: e.target.value })}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm"
            >
              <option value="1">Last 1 hour</option>
              <option value="6">Last 6 hours</option>
              <option value="24">Last 24 hours</option>
              <option value="72">Last 3 days</option>
              <option value="168">Last 7 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-white">
            Alerts ({summary.alerts.length} of {summary.stats.totalAlerts})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-3 py-2 text-white text-sm font-medium transition"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'JSON'}
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 px-3 py-2 text-white text-sm font-medium transition"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'CSV'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Time</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Alert Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">System</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Confidence</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Message</th>
              </tr>
            </thead>
            <tbody>
              {summary.alerts.length === 0 ? (
                <tr className="border-b border-slate-800">
                  <td colSpan={6} className="px-6 py-4 text-center text-slate-400">
                    No alerts matching your filters
                  </td>
                </tr>
              ) : (
                summary.alerts.map((alert) => (
                  <tr key={alert.id} className={`border-b border-slate-800 ${severityColors[alert.severity]}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${severityBadge[alert.severity]}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">{alert.alert_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono">{alert.system_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">{Math.round(alert.confidence)}%</td>
                    <td className="px-6 py-4 max-w-xs truncate text-xs">{alert.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
