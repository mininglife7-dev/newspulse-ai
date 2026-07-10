'use client';

import { useEffect, useState } from 'react';
import type { DashboardState, DashboardError } from '@/types/governance';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LaunchReadinessDashboard from '@/components/dashboard/LaunchReadinessDashboard';
import MissionTracker from '@/components/dashboard/MissionTracker';
import BlockerRegistry from '@/components/dashboard/BlockerRegistry';
import CategoryScorecard from '@/components/dashboard/CategoryScorecard';
import ConsistencyCheck from '@/components/dashboard/ConsistencyCheck';
import DataSourceLabel from '@/components/dashboard/DataSourceLabel';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface DashboardData {
  state?: DashboardState;
  error?: string;
  loading: boolean;
  lastFetch?: Date;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    loading: true,
  });

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        const json = (await res.json()) as DashboardState | DashboardError;

        if ('ok' in json && !json.ok) {
          setData({
            error: json.error,
            loading: false,
          });
        } else {
          setData({
            state: json as DashboardState,
            loading: false,
            lastFetch: new Date(),
          });
        }
      } catch (err: any) {
        setData({
          error: err?.message || 'Failed to fetch dashboard',
          loading: false,
        });
      }
    }

    fetchDashboard();

    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  if (data.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin">
          <div className="h-12 w-12 rounded-full border-4 border-border border-t-accent-500" />
        </div>
      </div>
    );
  }

  if (data.error || !data.state) {
    return (
      <div className="flex min-h-screen flex-col gap-6 p-6">
        <h1 className="text-3xl font-bold">Governor Dashboard</h1>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{data.error || 'Unknown error'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const state = data.state;

  return (
    <div className="flex min-h-screen flex-col gap-8 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold">Governor Dashboard</h1>
          <p className="mt-2 text-white/60">
            Canonical source of truth for NewsPulse AI launch readiness
          </p>
        </div>
        <DataSourceLabel
          source={state.dataSource}
          lastUpdated={state.lastUpdated}
          lastFetch={data.lastFetch?.toISOString()}
        />
      </div>

      {/* Critical Alert if NO-GO */}
      {state.launchReadiness.state === 'no_go' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>NO-GO</strong> — {state.launchReadiness.reasoning}
          </AlertDescription>
        </Alert>
      )}

      {/* Conditional GO alert */}
      {state.launchReadiness.state === 'conditional_go' && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>CONDITIONAL GO</strong> — {state.launchReadiness.reasoning}
          </AlertDescription>
        </Alert>
      )}

      {/* Green GO */}
      {state.launchReadiness.state === 'go' && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>GO</strong> — {state.launchReadiness.reasoning}
          </AlertDescription>
        </Alert>
      )}

      {/* Inconsistencies Warning */}
      {state.inconsistencies.found && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Data Integrity Warning:</strong> {state.inconsistencies.issues.length} inconsistencies detected.
            See Consistency Check tab.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard */}
      <Tabs defaultValue="readiness" className="w-full">
        <TabsList className="grid w-full grid-cols-5 gap-2 bg-card p-1">
          <TabsTrigger value="readiness">Launch Readiness</TabsTrigger>
          <TabsTrigger value="missions">Missions ({state.missionProgress.open + state.missionProgress.inProgress})</TabsTrigger>
          <TabsTrigger value="blockers">Blockers ({state.blockers.filter(b => b.status === 'open').length})</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="consistency">Consistency</TabsTrigger>
        </TabsList>

        {/* Readiness Tab */}
        <TabsContent value="readiness" className="mt-6">
          <LaunchReadinessDashboard state={state} />
        </TabsContent>

        {/* Missions Tab */}
        <TabsContent value="missions" className="mt-6">
          <MissionTracker missions={state.missions} missionProgress={state.missionProgress} />
        </TabsContent>

        {/* Blockers Tab */}
        <TabsContent value="blockers" className="mt-6">
          <BlockerRegistry blockers={state.blockers} />
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-6">
          <CategoryScorecard categories={state.categories} />
        </TabsContent>

        {/* Consistency Tab */}
        <TabsContent value="consistency" className="mt-6">
          <ConsistencyCheck inconsistencies={state.inconsistencies} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
