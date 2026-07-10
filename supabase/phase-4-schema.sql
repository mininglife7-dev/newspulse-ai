-- Phase 4 Schema: Observability, Onboarding, Advanced Features
-- This schema extends the existing EURO AI compliance platform with:
-- 1. Product telemetry and analytics (DNA-GOV-014)
-- 2. Customer onboarding tracking (DNA-GOV-015)
-- 3. Advanced compliance features (DNA-GOV-016)
-- 4. Team collaboration (DNA-GOV-017)

-- ============================================================================
-- DNA-GOV-014: Product Observability
-- ============================================================================

-- Product events - all user actions for analytics and monitoring
CREATE TABLE IF NOT EXISTS product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  category TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_event_type CHECK (
    event_type IN (
      'signup_started', 'email_verified', 'workspace_created', 'first_assessment_started', 'first_assessment_completed',
      'assessment_created', 'obligation_created', 'evidence_uploaded', 'assessment_exported', 'framework_selected',
      'api_error', 'validation_error', 'auth_error', 'timeout_error',
      'page_load', 'api_request'
    )
  ),
  CONSTRAINT valid_category CHECK (category IN ('funnel', 'feature_adoption', 'error', 'performance'))
);

CREATE INDEX idx_product_events_workspace_created ON product_events(workspace_id, created_at DESC);
CREATE INDEX idx_product_events_event_type ON product_events(event_type);
CREATE INDEX idx_product_events_category ON product_events(category);
CREATE INDEX idx_product_events_user_created ON product_events(user_id, created_at DESC);

-- Daily aggregates for fast dashboard queries
CREATE TABLE IF NOT EXISTS product_event_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  event_type TEXT,
  metric_name TEXT NOT NULL,
  metric_value FLOAT NOT NULL,

  UNIQUE(date, workspace_id, event_type, metric_name)
);

CREATE INDEX idx_aggregates_date_metric ON product_event_aggregates(date DESC, metric_name);
CREATE INDEX idx_aggregates_workspace ON product_event_aggregates(workspace_id, date DESC);

-- Real-time observability alerts
CREATE TABLE IF NOT EXISTS observability_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  threshold FLOAT NOT NULL,
  current_value FLOAT,
  triggered_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  severity TEXT DEFAULT 'warning',

  CONSTRAINT valid_severity CHECK (severity IN ('critical', 'warning', 'info'))
);

CREATE INDEX idx_observability_alerts_workspace ON observability_alerts(workspace_id);
CREATE INDEX idx_observability_alerts_triggered ON observability_alerts(triggered_at DESC);

-- ============================================================================
-- DNA-GOV-015: Customer Onboarding
-- ============================================================================

-- First-run wizard progress tracking
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  skipped_at TIMESTAMP WITH TIME ZONE,
  data JSONB DEFAULT '{}'::jsonb,

  UNIQUE(workspace_id, user_id, step),
  CONSTRAINT valid_step CHECK (
    step IN ('welcome', 'company_setup', 'framework_selection', 'first_assessment', 'export')
  )
);

CREATE INDEX idx_onboarding_workspace ON onboarding_progress(workspace_id);
CREATE INDEX idx_onboarding_user ON onboarding_progress(user_id);
CREATE INDEX idx_onboarding_completed ON onboarding_progress(completed_at DESC);

-- Email campaign tracking
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL,
  email_number INT DEFAULT 1,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_campaign CHECK (campaign_type IN ('onboarding', 'feature_spotlight', 'case_study', 'engagement'))
);

CREATE INDEX idx_email_campaigns_sent ON email_campaigns(sent_at DESC);
CREATE INDEX idx_email_campaigns_user ON email_campaigns(user_id);
CREATE INDEX idx_email_campaigns_opened ON email_campaigns(opened_at DESC) WHERE opened_at IS NOT NULL;

-- ============================================================================
-- DNA-GOV-016: Advanced Compliance Features
-- ============================================================================

-- Custom compliance templates
CREATE TABLE IF NOT EXISTS compliance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  framework_id UUID NOT NULL REFERENCES compliance_frameworks(id),
  name TEXT NOT NULL,
  description TEXT,
  is_system_template BOOLEAN DEFAULT FALSE,
  version INT DEFAULT 1,
  obligations JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_compliance_templates_workspace ON compliance_templates(workspace_id);
CREATE INDEX idx_compliance_templates_framework ON compliance_templates(framework_id);
CREATE INDEX idx_compliance_templates_system ON compliance_templates(is_system_template);

-- Template version history
CREATE TABLE IF NOT EXISTS template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES compliance_templates(id) ON DELETE CASCADE,
  version INT NOT NULL,
  changes_summary TEXT,
  previous_version INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_template_versions_template ON template_versions(template_id);

-- Workflow automation rules
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL,
  actions JSONB NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_trigger CHECK (trigger_type IN ('evidence_uploaded', 'assessment_status_changed', 'obligation_created'))
);

CREATE INDEX idx_automation_rules_workspace ON automation_rules(workspace_id);
CREATE INDEX idx_automation_rules_enabled ON automation_rules(enabled) WHERE enabled = TRUE;

-- Automation execution log
CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  triggered_by TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('success', 'failure'))
);

CREATE INDEX idx_automation_executions_rule ON automation_executions(rule_id);
CREATE INDEX idx_automation_executions_status ON automation_executions(status);
CREATE INDEX idx_automation_executions_time ON automation_executions(executed_at DESC);

-- ============================================================================
-- DNA-GOV-017: Team Collaboration
-- ============================================================================

-- Workspace members with roles
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(workspace_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'auditor', 'contributor'))
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_role ON workspace_members(role);

-- Activity audit trail
CREATE TABLE IF NOT EXISTS workspace_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  changes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_workspace ON workspace_audit_log(workspace_id);
CREATE INDEX idx_audit_log_user ON workspace_audit_log(user_id);
CREATE INDEX idx_audit_log_resource ON workspace_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_time ON workspace_audit_log(created_at DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_event_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE observability_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_audit_log ENABLE ROW LEVEL SECURITY;

-- Product events: Users can only see their own workspace's events (or admins see all)
CREATE POLICY product_events_select ON product_events
FOR SELECT USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
    UNION
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Onboarding progress: Users can only see their own or workspace admin can see all
CREATE POLICY onboarding_progress_select ON onboarding_progress
FOR SELECT USING (
  user_id = auth.uid() OR
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- Workspace members: Users can see members of their workspaces
CREATE POLICY workspace_members_select ON workspace_members
FOR SELECT USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
    UNION
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Audit log: Users can see audit log for their workspaces
CREATE POLICY audit_log_select ON workspace_audit_log
FOR SELECT USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
    UNION
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- Triggers & Functions
-- ============================================================================

-- Auto-update product_event_aggregates on new events
CREATE OR REPLACE FUNCTION update_event_aggregates()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO product_event_aggregates (date, workspace_id, event_type, metric_name, metric_value)
  VALUES (
    CURRENT_DATE,
    NEW.workspace_id,
    NEW.event_type,
    'count',
    1
  )
  ON CONFLICT (date, workspace_id, event_type, metric_name)
  DO UPDATE SET metric_value = metric_value + 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_aggregates
AFTER INSERT ON product_events
FOR EACH ROW
EXECUTE FUNCTION update_event_aggregates();

-- Auto-log workspace changes to audit log
CREATE OR REPLACE FUNCTION log_workspace_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_audit_log (workspace_id, user_id, action, resource_type, resource_id)
  VALUES (
    COALESCE(NEW.workspace_id, OLD.workspace_id),
    auth.uid(),
    CASE
      WHEN TG_OP = 'DELETE' THEN 'deleted'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
      ELSE 'created'
    END,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Grants & Permissions
-- ============================================================================

-- Service role can access all tables (for cron jobs, APIs)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
