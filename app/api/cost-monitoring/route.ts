import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  getVercelProjectSpending,
  estimateSupabaseSpending,
  detectCostAnomaly,
  getAlertSeverity,
} from '@/lib/vercel-cost';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CostMonitoringReport {
  ok: boolean;
  timestamp: string;
  workspacesChecked: number;
  alertsGenerated: number;
  anomalies: Array<{
    workspace_id: string;
    provider: 'vercel' | 'supabase';
    severity: 'info' | 'warning' | 'high';
    message: string;
  }>;
  errors: string[];
}

/**
 * GET /api/cost-monitoring
 *
 * DNA-GOV-004 endpoint: Autonomously detect cost anomalies.
 * Called by Vercel cron daily at 3 AM UTC.
 *
 * For each active workspace:
 * 1. Fetch current spend (Vercel, Supabase)
 * 2. Compare against 30-day baseline (2.5-sigma threshold)
 * 3. Store cost_snapshots for historical tracking
 * 4. Create cost_alerts if anomalies detected
 * 5. Send email digest to workspace members
 *
 * Returns:
 * - 200 + report: Monitoring completed (with or without anomalies)
 * - 503: Monitoring failed (network error, auth error, etc.)
 */
export async function GET(req: Request): Promise<NextResponse<CostMonitoringReport>> {
  const report: CostMonitoringReport = {
    ok: true,
    timestamp: new Date().toISOString(),
    workspacesChecked: 0,
    alertsGenerated: 0,
    anomalies: [],
    errors: [],
  };

  const supabase = createAdminClient();

  try {
    // Get all active workspaces (Phase 1: simplified; ideally fetches workspace integrations)
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('id, name, owner_id')
      .eq('status', 'active');

    if (workspacesError || !workspaces) {
      throw new Error(`Failed to fetch workspaces: ${workspacesError?.message}`);
    }

    report.workspacesChecked = workspaces.length;

    for (const workspace of workspaces) {
      try {
        await monitorWorkspaceSpending(supabase, workspace.id, workspace.name, report);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        report.errors.push(`Workspace ${workspace.name} (${workspace.id}): ${message}`);
        console.error(`[cost-monitoring] Error in workspace ${workspace.id}:`, err);
      }
    }

    // Log anomalies for visibility
    if (report.anomalies.length > 0) {
      console.warn(
        `[cost-monitoring] Detected ${report.anomalies.length} anomalies:\n`,
        report.anomalies
          .map((a) => `  - ${a.severity.toUpperCase()}: ${a.provider} ${a.message}`)
          .join('\n')
      );
    }

    if (report.errors.length > 0) {
      console.warn(`[cost-monitoring] Errors: ${report.errors.join('; ')}`);
      report.ok = false;
    }

    return NextResponse.json(report, { status: report.ok ? 200 : 207 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cost-monitoring] Monitoring failed:', message);

    report.ok = false;
    report.errors.push(message);

    return NextResponse.json(report, { status: 503 });
  }
}

/**
 * Monitor spending for a single workspace:
 * 1. Fetch Vercel and Supabase costs
 * 2. Load 30-day baseline
 * 3. Detect anomalies
 * 4. Store snapshots and alerts
 * 5. Schedule email digest
 */
async function monitorWorkspaceSpending(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  workspaceName: string,
  report: CostMonitoringReport
): Promise<void> {
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  const vercelToken = process.env.VERCEL_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!vercelProjectId || !vercelToken) {
    throw new Error('VERCEL_PROJECT_ID or VERCEL_TOKEN not configured');
  }

  // Phase 1: Monitor Vercel costs
  const vercelStats = await getVercelProjectSpending(vercelProjectId, vercelToken);

  // Store Vercel cost snapshot
  const today = new Date().toISOString().split('T')[0];
  const { error: snapshotError } = await supabase.from('cost_snapshots').upsert({
    workspace_id: workspaceId,
    provider: 'vercel',
    date: today,
    daily_spend_usd: vercelStats.current_spend_usd,
    cumulative_spend_usd: vercelStats.projected_month_end_usd,
    metadata: {
      day_of_month: vercelStats.day_of_month,
      usage_breakdown: vercelStats.usage_breakdown,
      currency: vercelStats.currency,
    },
  });

  if (snapshotError) {
    throw new Error(`Failed to store Vercel snapshot: ${snapshotError.message}`);
  }

  // Load 30-day baseline for Vercel
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const baselineDate = thirtyDaysAgo.toISOString().split('T')[0];

  const { data: historicalVercel, error: histError } = await supabase
    .from('cost_snapshots')
    .select('daily_spend_usd')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'vercel')
    .gte('date', baselineDate)
    .lt('date', today);

  if (histError) {
    throw new Error(`Failed to load Vercel baseline: ${histError.message}`);
  }

  // Detect Vercel anomalies
  const historicalSpends = (historicalVercel || []).map((s) => Number(s.daily_spend_usd));
  const vercelAnomaly = detectCostAnomaly(vercelStats.current_spend_usd, historicalSpends);

  if (vercelAnomaly.isAnomaly) {
    const severity = getAlertSeverity(vercelAnomaly.exceedsBy, vercelAnomaly.baseline);
    const message = `Vercel spend ${vercelAnomaly.percentAboveBaseline}% above baseline: $${vercelStats.current_spend_usd.toFixed(2)} (baseline: $${vercelAnomaly.baseline.toFixed(2)})`;

    const { error: alertError } = await supabase.from('cost_alerts').insert({
      workspace_id: workspaceId,
      alert_type: 'cost_spike',
      severity,
      provider: 'vercel',
      message,
      metadata: {
        threshold: vercelAnomaly.threshold,
        actual: vercelStats.current_spend_usd,
        baseline: vercelAnomaly.baseline,
        stddev: vercelAnomaly.stdDev,
        exceeds_by: vercelAnomaly.exceedsBy,
        percent_above_baseline: vercelAnomaly.percentAboveBaseline,
      },
    });

    if (alertError) {
      throw new Error(`Failed to store Vercel alert: ${alertError.message}`);
    }

    report.anomalies.push({
      workspace_id: workspaceId,
      provider: 'vercel',
      severity,
      message,
    });
    report.alertsGenerated += 1;
  }

  // Phase 1: Monitor Supabase (if credentials available)
  if (supabaseUrl && supabaseKey) {
    try {
      const supabaseStats = await estimateSupabaseSpending(supabaseUrl, supabaseKey);

      // Store Supabase cost snapshot
      const { error: snapshotError } = await supabase.from('cost_snapshots').upsert({
        workspace_id: workspaceId,
        provider: 'supabase',
        date: today,
        daily_spend_usd: supabaseStats.estimated_spend_usd,
        cumulative_spend_usd: supabaseStats.estimated_spend_usd, // Estimate daily == cumulative for now
        metadata: {
          database_size_gb: supabaseStats.database_size_gb,
          connection_count: supabaseStats.connection_count,
          api_requests_count: supabaseStats.api_requests_count,
        },
      });
      if (snapshotError) {
        throw new Error(`Failed to store Supabase snapshot: ${snapshotError.message}`);
      }

      // Load Supabase baseline (skip anomaly detection if no historical data)
      const { data: historicalSB } = await supabase
        .from('cost_snapshots')
        .select('daily_spend_usd')
        .eq('workspace_id', workspaceId)
        .eq('provider', 'supabase')
        .gte('date', baselineDate)
        .lt('date', today);

      if (historicalSB && historicalSB.length >= 7) {
        const supabaseHistorical = historicalSB.map((s) => Number(s.daily_spend_usd));
        const supabaseAnomaly = detectCostAnomaly(supabaseStats.estimated_spend_usd, supabaseHistorical);

        if (supabaseAnomaly.isAnomaly) {
          const severity = getAlertSeverity(supabaseAnomaly.exceedsBy, supabaseAnomaly.baseline);
          const message = `Supabase spend ${supabaseAnomaly.percentAboveBaseline}% above baseline: $${supabaseStats.estimated_spend_usd.toFixed(2)} (baseline: $${supabaseAnomaly.baseline.toFixed(2)})`;

          await supabase.from('cost_alerts').insert({
            workspace_id: workspaceId,
            alert_type: 'cost_spike',
            severity,
            provider: 'supabase',
            message,
            metadata: {
              threshold: supabaseAnomaly.threshold,
              actual: supabaseStats.estimated_spend_usd,
              baseline: supabaseAnomaly.baseline,
              stddev: supabaseAnomaly.stdDev,
            },
          });

          report.anomalies.push({
            workspace_id: workspaceId,
            provider: 'supabase',
            severity,
            message,
          });
          report.alertsGenerated += 1;
        }
      }
    } catch (err) {
      // Supabase monitoring is optional; don't fail the entire cron
      console.warn(`[cost-monitoring] Supabase monitoring failed for workspace ${workspaceId}:`, err);
    }
  }

  // Phase 2: Send email digest (stub for now, will implement with email service)
  if (report.anomalies.length > 0) {
    console.info(`[cost-monitoring] Would send email digest to workspace ${workspaceName} with ${report.anomalies.length} anomalies`);
  }
}
