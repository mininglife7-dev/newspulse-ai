'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, TrendingUp, Clock } from 'lucide-react';
import { DashboardMetrics } from '@/lib/dashboard-metrics';

export function DashboardQuickStats() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const res = await fetch('/api/dashboard-metrics');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  if (loading || !metrics) {
    return null;
  }

  const statusColor = metrics.compliancePercentage >= 80
    ? 'text-green-400'
    : metrics.compliancePercentage >= 50
      ? 'text-amber-400'
      : 'text-red-400';

  const statusBg = metrics.compliancePercentage >= 80
    ? 'bg-green-900/20'
    : metrics.compliancePercentage >= 50
      ? 'bg-amber-900/20'
      : 'bg-red-900/20';

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {/* Compliance Score */}
      <div className={`rounded-lg border border-slate-700 ${statusBg} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-1">Compliance Score</p>
            <div className={`text-2xl font-bold ${statusColor}`}>
              {metrics.compliancePercentage}%
            </div>
          </div>
          <TrendingUp className={`h-6 w-6 ${statusColor}`} />
        </div>
        <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              metrics.compliancePercentage >= 80
                ? 'bg-green-500'
                : metrics.compliancePercentage >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${metrics.compliancePercentage}%` }}
          />
        </div>
      </div>

      {/* Pending Reviews */}
      {metrics.pendingReviews > 0 && (
        <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Pending Reviews</p>
              <div className="text-2xl font-bold text-amber-400">
                {metrics.pendingReviews}
              </div>
            </div>
            <Clock className="h-6 w-6 text-amber-400" />
          </div>
          <p className="text-xs text-amber-300 mt-2">Evidence awaiting review</p>
        </div>
      )}

      {/* Overdue Plans */}
      {metrics.overduePlans > 0 && (
        <div className="rounded-lg border border-red-800/50 bg-red-950/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Overdue Plans</p>
              <div className="text-2xl font-bold text-red-400">
                {metrics.overduePlans}
              </div>
            </div>
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <p className="text-xs text-red-300 mt-2">Plans past target date</p>
        </div>
      )}

      {/* Approved Evidence */}
      <div className="rounded-lg border border-green-800/50 bg-green-950/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-1">Evidence Approved</p>
            <div className="text-2xl font-bold text-green-400">
              {metrics.approvedEvidence}
            </div>
          </div>
          <CheckCircle className="h-6 w-6 text-green-400" />
        </div>
        <p className="text-xs text-green-300 mt-2">Compliance verified</p>
      </div>
    </div>
  );
}
