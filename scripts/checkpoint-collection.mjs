#!/usr/bin/env node

/**
 * Checkpoint Audit Collection Script
 *
 * Purpose: Collect adoption metrics during Pause-and-Measure window (2026-07-10 to 2026-07-17)
 * Usage: npm run checkpoint:collect
 *
 * Collects:
 * - Tier 1: Adoption metrics (obligations, assessments, templates)
 * - Tier 2: Engagement metrics (status updates, exports, searches)
 * - Tier 3: Feature-specific metrics (progress tracker, navigation)
 * - Tier 4: Health metrics (error rates, performance)
 *
 * Output: Appends daily report to CHECKPOINT-DAILY-LOG.md
 *
 * Prerequisites:
 * - Supabase schema deployed (tables exist)
 * - NEXT_PUBLIC_SUPABASE_URL environment variable
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable
 * - Database with obligations, assessments, audit_logs tables
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const LOG_PATH = join(process.cwd(), 'docs/governance/CHECKPOINT-DAILY-LOG.md');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Set: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function collectAdoptionMetrics() {
  console.log('📊 Collecting adoption metrics...');

  // Obligations usage
  const { data: obligations, error: obligationsError } = await supabase
    .from('obligations')
    .select('id, workspace_id, source, due_date, created_at', { count: 'exact' })
    .gte('created_at', getTodayStart())
    .lte('created_at', getTodayEnd());

  if (obligationsError) {
    console.error('❌ Failed to collect obligations:', obligationsError.message);
    return null;
  }

  const totalObligations = obligations?.length || 0;
  const activeWorkspaces = new Set(obligations?.map(o => o.workspace_id) || []).size;
  const templateImports = obligations?.filter(o => o.source === 'template_import').length || 0;
  const manualCreations = obligations?.filter(o => o.source === 'manual').length || 0;
  const withDueDates = obligations?.filter(o => o.due_date).length || 0;

  // Assessments usage
  const { data: assessments, error: assessmentsError } = await supabase
    .from('assessments')
    .select('id, progress, created_at', { count: 'exact' })
    .gte('created_at', getTodayStart())
    .lte('created_at', getTodayEnd());

  if (assessmentsError) {
    console.error('❌ Failed to collect assessments:', assessmentsError.message);
    return null;
  }

  const totalAssessments = assessments?.length || 0;
  const started = assessments?.filter(a => a.progress > 0).length || 0;
  const completed = assessments?.filter(a => a.progress === 100).length || 0;
  const avgCompletion = assessments?.length
    ? (assessments.reduce((sum, a) => sum + a.progress, 0) / assessments.length).toFixed(1)
    : 0;

  return {
    date: new Date().toISOString().split('T')[0],
    adoption: {
      totalObligations,
      activeWorkspaces,
      templateImports,
      manualCreations,
      withDueDates,
      totalAssessments,
      assessmentsStarted: started,
      assessmentsCompleted: completed,
      avgCompletionRate: parseFloat(avgCompletion),
    },
  };
}

async function collectEngagementMetrics() {
  console.log('📊 Collecting engagement metrics...');

  // Obligation management actions
  const { data: auditLogs, error: auditError } = await supabase
    .from('audit_logs')
    .select('action, entity_type')
    .eq('entity_type', 'obligation')
    .gte('created_at', getTodayStart())
    .lte('created_at', getTodayEnd());

  if (auditError) {
    console.error('⚠️  Could not collect audit logs:', auditError.message);
    return { engagement: {} };
  }

  const statusUpdates = auditLogs?.filter(a => a.action === 'status_update').length || 0;
  const bulkUpdates = auditLogs?.filter(a => a.action === 'bulk_status_update').length || 0;
  const dueDateChanges = auditLogs?.filter(a => a.action === 'due_date_change').length || 0;
  const csvExports = auditLogs?.filter(a => a.action === 'csv_export').length || 0;
  const searches = auditLogs?.filter(a => a.action === 'search').length || 0;

  return {
    engagement: {
      statusUpdates,
      bulkUpdates,
      dueDateChanges,
      csvExports,
      searches,
      totalActions: auditLogs?.length || 0,
    },
  };
}

async function collectHealthMetrics() {
  console.log('📊 Collecting health metrics...');

  // For now, return placeholder (requires application logs/monitoring setup)
  // In production, connect to error tracking service or log aggregation
  return {
    health: {
      errorRate: 'N/A (requires log setup)',
      p99Latency: 'N/A (requires APM setup)',
      dbUtilization: 'N/A (requires monitoring setup)',
      deploymentStatus: 'Check Vercel dashboard',
    },
  };
}

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

function getTodayEnd() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today.toISOString();
}

function formatReport(data, engagement, health) {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });

  let trend = '→';
  // Placeholder for trend calculation (would compare to yesterday)

  return `
## Daily Checkpoint — ${date} ${time} UTC

### Adoption Metrics
- Total obligations created: ${data.adoption.totalObligations}
- Active workspaces: ${data.adoption.activeWorkspaces}
- Template imports: ${data.adoption.templateImports}
- Manual creations: ${data.adoption.manualCreations}
- Obligations with due dates: ${data.adoption.withDueDates}
- Assessments created: ${data.adoption.totalAssessments}
- Assessments started: ${data.adoption.assessmentsStarted}
- Assessments completed: ${data.adoption.assessmentsCompleted}
- Average completion rate: ${data.adoption.avgCompletionRate}%

### Engagement Metrics
- Status updates: ${engagement.engagement.statusUpdates}
- Bulk updates: ${engagement.engagement.bulkUpdates}
- Due date changes: ${engagement.engagement.dueDateChanges}
- CSV exports: ${engagement.engagement.csvExports}
- Search queries: ${engagement.engagement.searches}
- Total actions: ${engagement.engagement.totalActions}

### Health Metrics
- Error rate: ${health.health.errorRate}
- p99 latency: ${health.health.p99Latency}
- DB utilization: ${health.health.dbUtilization}
- Deployment status: ${health.health.deploymentStatus}

### Qualitative Signals
- Slack mentions: [Manual review required]
- GitHub issues: [Manual review required]
- Customer feedback: [Manual review required]

### Trend
${trend} To be calculated from historical data

---
`;
}

async function appendToLog(report) {
  let content = '';

  if (existsSync(LOG_PATH)) {
    content = readFileSync(LOG_PATH, 'utf-8');
  } else {
    // Create header if new file
    content = `# Daily Checkpoint Log — 2026-07-10 to 2026-07-17

**Purpose:** Track adoption metrics during Pause-and-Measure window

---

`;
  }

  // Append report
  content += report + '\n';

  writeFileSync(LOG_PATH, content, 'utf-8');
  console.log(`✅ Report appended to ${LOG_PATH}`);
}

async function main() {
  try {
    console.log('🚀 Starting checkpoint collection...\n');

    const data = await collectAdoptionMetrics();
    if (!data) {
      console.error('❌ Collection failed');
      process.exit(1);
    }

    const engagement = await collectEngagementMetrics();
    const health = await collectHealthMetrics();

    const report = formatReport(data, engagement, health);
    await appendToLog(report);

    console.log('\n✅ Checkpoint collection complete');
    console.log(`📝 Log: ${LOG_PATH}`);
    console.log('\nNext: Review metrics and update CHECKPOINT-DAILY-LOG.md with qualitative signals');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
