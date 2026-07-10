-- DNA-GOV-004: Cost Anomaly Detection
-- Migration: Create cost monitoring tables and RLS policies
-- Purpose: Track Vercel/Supabase spending, detect anomalies, correlate with deployments

-- ============================================================================
-- 1. Cost Snapshots Table (immutable history of daily spending)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('vercel', 'supabase')),
  date DATE NOT NULL,
  daily_spend_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cumulative_spend_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
  metadata JSONB, -- { "category_breakdown": {...}, "raw_response": {...}, "currency": "USD" }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, provider, date)
);

CREATE INDEX idx_cost_snapshots_workspace_id ON cost_snapshots(workspace_id);
CREATE INDEX idx_cost_snapshots_provider ON cost_snapshots(provider);
CREATE INDEX idx_cost_snapshots_date ON cost_snapshots(date);
CREATE INDEX idx_cost_snapshots_workspace_date ON cost_snapshots(workspace_id, date DESC);

-- RLS: Users can only see cost snapshots from their workspace
ALTER TABLE cost_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_cost_snapshots" ON cost_snapshots
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "service_can_insert_cost_snapshots" ON cost_snapshots
  FOR INSERT WITH CHECK (
    -- Only cron/service can insert (no auth.uid() means service role)
    auth.role() = 'service_role'
  );

-- ============================================================================
-- 2. Deployment Events Table (correlate code changes with spending)
-- ============================================================================

CREATE TABLE IF NOT EXISTS deployment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  commit_sha TEXT NOT NULL,
  merged_at TIMESTAMP NOT NULL,
  author_email TEXT,
  message TEXT,
  files_changed INTEGER,
  metadata JSONB, -- { "pr_number": 49, "branch": "...", "repo": "...", "url": "..." }
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, commit_sha, merged_at)
);

CREATE INDEX idx_deployment_events_workspace_id ON deployment_events(workspace_id);
CREATE INDEX idx_deployment_events_merged_at ON deployment_events(merged_at DESC);
CREATE INDEX idx_deployment_events_workspace_merged_at ON deployment_events(workspace_id, merged_at DESC);

-- RLS: Users can only see deployment events from their workspace
ALTER TABLE deployment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_deployment_events" ON deployment_events
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "service_can_insert_deployment_events" ON deployment_events
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );

-- ============================================================================
-- 3. Cost Alerts Table (detected anomalies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('cost_spike', 'projected_overage', 'anomaly')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'high')),
  provider TEXT CHECK (provider IN ('vercel', 'supabase', NULL)),
  message TEXT NOT NULL,
  metadata JSONB, -- { "threshold": 42.50, "actual": 150.00, "baseline": 8.75, "stddev": 3.2, "related_deployments": [...] }
  dismissed_by UUID REFERENCES auth.users(id),
  dismissed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cost_alerts_workspace_id ON cost_alerts(workspace_id);
CREATE INDEX idx_cost_alerts_severity ON cost_alerts(severity);
CREATE INDEX idx_cost_alerts_created_at ON cost_alerts(created_at DESC);
CREATE INDEX idx_cost_alerts_workspace_created ON cost_alerts(workspace_id, created_at DESC);

-- RLS: Users can only see alerts from their workspace
ALTER TABLE cost_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_cost_alerts" ON cost_alerts
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "workspace_members_can_dismiss_cost_alerts" ON cost_alerts
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  ) WITH CHECK (
    dismissed_by = auth.uid() OR dismissed_by IS NULL
  );

CREATE POLICY "service_can_insert_cost_alerts" ON cost_alerts
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );

-- ============================================================================
-- 4. Cost Monitoring State Table (tracks last run, baseline, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cost_monitoring_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('vercel', 'supabase')),
  last_snapshot_date DATE,
  baseline_30d_median DECIMAL(10, 2), -- Cache baseline to avoid recalculating
  baseline_30d_stddev DECIMAL(10, 2),
  alert_threshold_multiplier DECIMAL(3, 1) DEFAULT 2.5, -- 2.5-sigma
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, provider)
);

CREATE INDEX idx_cost_monitoring_state_workspace ON cost_monitoring_state(workspace_id);

-- RLS: Only workspace members can view their own state
ALTER TABLE cost_monitoring_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_monitoring_state" ON cost_monitoring_state
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "service_can_manage_monitoring_state" ON cost_monitoring_state
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- ============================================================================
-- 5. Helper Functions
-- ============================================================================

-- Get cost alert summary for dashboard
CREATE OR REPLACE FUNCTION get_cost_alert_summary(workspace_uuid UUID)
RETURNS TABLE (
  total_alerts BIGINT,
  high_severity BIGINT,
  warning_severity BIGINT,
  info_severity BIGINT,
  undismissed_alerts BIGINT,
  latest_alert_at TIMESTAMP
) AS $$
  SELECT
    COUNT(*)::BIGINT as total_alerts,
    COUNT(*) FILTER (WHERE severity = 'high')::BIGINT as high_severity,
    COUNT(*) FILTER (WHERE severity = 'warning')::BIGINT as warning_severity,
    COUNT(*) FILTER (WHERE severity = 'info')::BIGINT as info_severity,
    COUNT(*) FILTER (WHERE dismissed_at IS NULL)::BIGINT as undismissed_alerts,
    MAX(created_at) as latest_alert_at
  FROM cost_alerts
  WHERE workspace_id = workspace_uuid AND created_at > NOW() - INTERVAL '30 days';
$$ LANGUAGE SQL SECURITY DEFINER;

-- Get baseline spending for anomaly detection
CREATE OR REPLACE FUNCTION calculate_cost_baseline(
  workspace_uuid UUID,
  cost_provider TEXT,
  lookback_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  median_daily_spend DECIMAL,
  stddev_daily_spend DECIMAL
) AS $$
  WITH daily_spends AS (
    SELECT daily_spend_usd
    FROM cost_snapshots
    WHERE workspace_id = workspace_uuid
      AND provider = cost_provider
      AND date > NOW()::DATE - lookback_days
    ORDER BY daily_spend_usd
  ),
  stats AS (
    SELECT
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY daily_spend_usd) as median,
      STDDEV_POP(daily_spend_usd) as stddev
    FROM daily_spends
  )
  SELECT
    median::DECIMAL,
    COALESCE(stddev, 0)::DECIMAL
  FROM stats;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- 6. Audit Logging (immutability guarantee)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cost_snapshot_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES cost_snapshots(id) ON DELETE CASCADE,
  previous_state JSONB,
  new_state JSONB,
  changed_by TEXT DEFAULT 'system',
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to log cost_snapshot changes (archive originals)
CREATE OR REPLACE FUNCTION audit_cost_snapshot_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO cost_snapshot_audit (snapshot_id, previous_state, new_state, changed_by, changed_at)
    VALUES (
      OLD.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      CURRENT_USER,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Triggers disabled for now since snapshots should be immutable
-- If updates needed, use audit table to track all changes
-- CREATE TRIGGER cost_snapshots_audit AFTER UPDATE ON cost_snapshots
--   FOR EACH ROW EXECUTE FUNCTION audit_cost_snapshot_changes();
