'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Activity, Zap } from 'lucide-react';

interface MetricsSummary {
  totalRequests: number;
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
}

interface EndpointMetric {
  name: string;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
  count: number;
}

interface MetricsResponse {
  ok: boolean;
  timestamp: string;
  summary: MetricsSummary;
  byEndpoint: Record<string, EndpointMetric>;
  allMetrics: Record<string, any>;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics/dashboard');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 10000); // 10 second refresh
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading metrics...</div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Error loading metrics: {error}
      </div>
    );
  }

  if (!metrics) return null;

  const summary = metrics.summary;
  const latencyHealthy = summary.p95LatencyMs < 1000; // 1s SLA

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Performance Monitoring
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            autoRefresh
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Total Requests
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary.totalRequests.toLocaleString()}
              </p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        {/* Average Latency */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                Avg Latency
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary.averageLatencyMs}ms
              </p>
            </div>
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        {/* P95 Latency */}
        <div
          className={`border rounded-lg p-4 ${
            latencyHealthy
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                P95 Latency
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  latencyHealthy ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {summary.p95LatencyMs}ms
              </p>
            </div>
            {latencyHealthy ? (
              <ArrowDown className="w-8 h-8 text-green-500" />
            ) : (
              <ArrowUp className="w-8 h-8 text-red-500" />
            )}
          </div>
        </div>

        {/* P99 Latency */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">
                P99 Latency
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary.p99LatencyMs}ms
              </p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Latency Range */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Latency Range
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500 uppercase font-medium">Min</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {summary.minLatencyMs === Infinity
                ? '—'
                : `${summary.minLatencyMs}ms`}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase font-medium">
              P50 (Median)
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {summary.p50LatencyMs}ms
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase font-medium">Max</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {summary.maxLatencyMs === -Infinity
                ? '—'
                : `${summary.maxLatencyMs}ms`}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase font-medium">Range</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {summary.maxLatencyMs === -Infinity ||
              summary.minLatencyMs === Infinity
                ? '—'
                : `${summary.maxLatencyMs - summary.minLatencyMs}ms`}
            </p>
          </div>
        </div>
      </div>

      {/* Endpoints Table */}
      {Object.keys(metrics.byEndpoint).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Endpoint Performance
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">
                    Endpoint
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">
                    Requests
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">
                    P50
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">
                    P95
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">
                    P99
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">
                    Max
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(metrics.byEndpoint)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([endpoint, metric]) => (
                    <tr key={endpoint} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono text-xs text-gray-900">
                        {endpoint}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {metric.count.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {Math.round(metric.p50)}ms
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {Math.round(metric.p95)}ms
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {Math.round(metric.p99)}ms
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {Math.round(metric.max)}ms
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {Object.keys(metrics.byEndpoint).length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">
            No metrics collected yet. Make API requests to see performance data.
          </p>
        </div>
      )}
    </div>
  );
}
