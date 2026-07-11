'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface SLACheckResult {
  endpoint: string;
  passed: boolean;
  violations: string[];
  metrics: {
    p95: number;
    p99: number;
    count: number;
  };
  sla: {
    endpoint: string;
    p95MaxMs: number;
    p99MaxMs: number;
    minThroughput: number;
  };
}

interface SLACheckResponse {
  ok: boolean;
  timestamp: string;
  allPassed: boolean;
  totalEndpoints: number;
  violatingEndpoints: number;
  results: SLACheckResult[];
}

export function SLAMonitor() {
  const [data, setData] = useState<SLACheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSLAStatus = async () => {
    try {
      const response = await fetch('/api/metrics/sla-check');
      if (!response.ok) throw new Error('Failed to fetch SLA status');
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSLAStatus();
    const interval = setInterval(fetchSLAStatus, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Checking SLA compliance...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Error checking SLA status: {error}
      </div>
    );
  }

  if (!data) return null;

  const violations = data.results.filter((r) => !r.passed);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className={`border rounded-lg p-4 flex items-center justify-between ${
        data.allPassed
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          {data.allPassed ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-600" />
          )}
          <div>
            <p className={`font-semibold ${data.allPassed ? 'text-green-900' : 'text-red-900'}`}>
              {data.allPassed
                ? 'All SLAs Met'
                : `${data.violatingEndpoints} Endpoint${data.violatingEndpoints !== 1 ? 's' : ''} Violating SLA`}
            </p>
            <p className={`text-sm ${data.allPassed ? 'text-green-700' : 'text-red-700'}`}>
              {data.totalEndpoints} endpoints monitored
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {new Date(data.timestamp).toLocaleTimeString()}
        </p>
      </div>

      {/* Violations Details */}
      {violations.length > 0 && (
        <div className="bg-white border border-red-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-red-200 bg-red-50">
            <h3 className="font-semibold text-red-900">SLA Violations</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {violations.map((result) => (
              <div key={result.endpoint} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-mono text-sm font-medium text-gray-900">
                    {result.endpoint}
                  </p>
                  <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                    {result.metrics.count} requests
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  {result.violations.map((violation, idx) => (
                    <p key={idx} className="text-red-700">
                      • {violation}
                    </p>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                  <p>Target: p95 &lt; {result.sla.p95MaxMs}ms, p99 &lt; {result.sla.p99MaxMs}ms</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Passing Endpoints */}
      {data.results.filter((r) => r.passed && r.metrics.count > 0).length > 0 && (
        <div className="bg-white border border-green-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-green-200 bg-green-50">
            <h3 className="font-semibold text-green-900">Compliant Endpoints</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {data.results
              .filter((r) => r.passed && r.metrics.count > 0)
              .map((result) => (
                <div key={result.endpoint} className="p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-mono font-medium text-gray-900">
                      {result.endpoint}
                    </p>
                    <div className="text-right">
                      <p className="text-gray-600">
                        p95: {Math.round(result.metrics.p95)}ms / {result.sla.p95MaxMs}ms
                      </p>
                      <p className="text-gray-600">
                        p99: {Math.round(result.metrics.p99)}ms / {result.sla.p99MaxMs}ms
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
