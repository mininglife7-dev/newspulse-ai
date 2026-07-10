# Phase 4 Architecture — Product Observability & Customer Onboarding

**Status:** Design & Test Scaffolding Phase  
**Blocked On:** Founder infrastructure decisions (Supabase schema, email auth, Vercel deployment)  
**Target:** Implementation upon infrastructure online  

---

## Phase 4 Objectives

### 1. Product Observability (DNA-GOV-014)
Monitor customer behavior and product health.

**Metrics to Track:**
- Sign-up funnel: Landing → Signup → Email Verification → Workspace Creation
- Risk Assessment workflow: Start → Create Obligation → Complete Assessment → Export Report
- Feature adoption: Users creating assessments per week, average completion time
- Error rates: Critical errors by endpoint, recovery attempts, SLA compliance
- Performance: API latency percentiles (p50, p95, p99), bundle size, CLS/FID/LCP

**System Design:**
```
Customer Action → Client Event → Telemetry Service → Analytics DB
                                                    ↓
                                            Real-time Dashboard (Alert Hub)
                                                    ↓
                                            Weekly Metrics Report
```

**Implementation:**
- Event schema for standardized tracking (action, user_id, timestamp, metadata)
- Sampling strategy for high-volume events (1% baseline, 10% for critical paths)
- Anonymization for PII (token user IDs, strip email/personal data)
- Real-time aggregation for alert thresholds
- Weekly analytics job for trend analysis

---

### 2. Customer Onboarding (DNA-GOV-015)
Reduce time-to-value for new customers.

**First-Run Wizard:**
- Welcome: Explain EURO AI value proposition (30s)
- Company Setup: Organization name, industry, team size (2min)
- Compliance Profile: Select frameworks (ISO 27001, SOC 2, GDPR, HIPAA) (1min)
- First Assessment: Pre-filled template walkthrough (5min)
- Export: Show first risk report (2min)
- Total: ~10 min end-to-end

**In-App Guidance:**
- Inline help tooltips on key workflows
- "Getting Started" section in sidebar (collapsible)
- Video embeds for complex features (assessment creation, evidence upload)
- Contextual examples (pre-filled obligations for selected frameworks)

**Email Campaign:**
- Day 0: Welcome email + link to first risk framework tutorial
- Day 3: Engagement check-in ("How's your assessment going?") + troubleshooting link
- Day 7: Feature spotlight (evidence tracking benefits)
- Day 14: Case study: How Acme Corp reduced audit time by 60%

---

### 3. Advanced Compliance Features (DNA-GOV-016)
Extend compliance platform capabilities.

**Custom Templates:**
- Org-specific obligation templates (inherit from framework defaults)
- Template versioning (track changes, rollback capability)
- Reusable evidence checklists per obligation type
- Template sharing across workspace teams

**Workflow Automation:**
- Trigger: Evidence uploaded → Auto-validate against obligation rules
- Action: Auto-categorize evidence, suggest missing docs
- Escalation: Critical missing evidence → Manager notification
- Integration: Audit tool webhooks (accept/reject workflow decisions)

**Multi-Language Reports:**
- Generate compliance reports in customer's language
- Support: English, Spanish, French, German, Japanese, Mandarin
- Regional compliance nuances (EU GDPR amendments, UK Data Protection Act)

---

### 4. Team Collaboration (DNA-GOV-017)
Enable multi-user workflows.

**Member Invitation:**
- Email-based invitations from workspace owner
- Acceptance → Auto-create account if not exists
- Re-send if email bounces (exponential backoff)

**Role-Based Access:**
- Admin: Full workspace control, billing, members, settings
- Manager: Assessment oversight, evidence review, team reports
- Auditor: Read-only access to assessments and evidence
- Contributor: Create evidence, update own assessments

**Shared Workspaces:**
- Multiple teams can access same workspace (with role restrictions)
- Activity log per user (audit trail for compliance)
- Rate limiting per role (prevent member spam)

---

## DNA-GOV-014: Product Observability Design

### Database Schema

```sql
-- Events table (partitioned by week for performance)
CREATE TABLE product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'signup_started', 'signup_completed', 'assessment_created', 'evidence_uploaded'
  category TEXT NOT NULL, -- 'funnel', 'feature_adoption', 'error'
  metadata JSONB DEFAULT '{}'::jsonb, -- {assessment_id, error_code, page_duration_ms, ...}
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_events_workspace_created ON product_events(workspace_id, created_at);
CREATE INDEX idx_product_events_event_type ON product_events(event_type);
CREATE INDEX idx_product_events_category ON product_events(category);

-- Daily aggregates (for fast dashboard queries)
CREATE TABLE product_event_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  workspace_id UUID,
  event_type TEXT,
  metric_name TEXT NOT NULL, -- 'count', 'p50_latency', 'error_rate'
  metric_value FLOAT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL,
  UNIQUE(date, workspace_id, event_type, metric_name)
);
CREATE INDEX idx_aggregates_date_metric ON product_event_aggregates(date, metric_name);

-- Alert thresholds (for real-time monitoring)
CREATE TABLE observability_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  alert_type TEXT NOT NULL, -- 'high_error_rate', 'low_signup_completion', 'slow_assessment'
  threshold FLOAT NOT NULL,
  current_value FLOAT,
  triggered_at TIMESTAMP,
  resolved_at TIMESTAMP,
  severity TEXT DEFAULT 'warning', -- 'critical', 'warning', 'info'
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
CREATE INDEX idx_observability_alerts_workspace ON observability_alerts(workspace_id);
CREATE INDEX idx_observability_alerts_triggered ON observability_alerts(triggered_at);
```

### API Endpoints

```
POST /api/telemetry/event
  Payload: {
    event_type: 'assessment_created' | 'evidence_uploaded' | ...,
    metadata: { assessment_id, duration_ms, ... }
  }
  Response: { ok: true, event_id: uuid }
  Rate limit: 100 events/min per user (burst to 500)

GET /api/analytics/funnel
  Query: ?start_date=2026-07-01&end_date=2026-07-31&workspace_id=...
  Response: {
    funnel: [
      { stage: 'signup_started', count: 150, pct: 100 },
      { stage: 'email_verified', count: 120, pct: 80 },
      { stage: 'workspace_created', count: 105, pct: 70 },
      { stage: 'first_assessment', count: 78, pct: 52 }
    ]
  }

GET /api/analytics/feature-adoption
  Query: ?metric=assessments_created&timeframe=weekly
  Response: {
    metric: 'assessments_created',
    data: [
      { week: '2026-07-01', value: 42, change: '+15%' },
      { week: '2026-07-08', value: 48, change: '+14%' }
    ]
  }

GET /api/analytics/health
  Response: {
    api_p95_latency_ms: 245,
    error_rate: 0.0023,
    uptime_pct: 99.97,
    alerts: [
      { type: 'high_error_rate', current: 0.0023, threshold: 0.01 }
    ]
  }
```

### Event Types

```javascript
// Funnel events
'signup_started'           // User visits /signup
'email_verified'           // User confirms email
'workspace_created'        // User creates first workspace
'first_assessment_started' // User begins first risk assessment
'first_assessment_completed' // User exports first report

// Feature adoption events
'assessment_created'       // New assessment started
'obligation_created'       // New obligation added
'evidence_uploaded'        // Evidence file attached
'assessment_exported'      // Report generated/exported
'framework_selected'       // User adds compliance framework

// Error events
'api_error'                // API returned 5xx status
'validation_error'         // Form validation failed
'auth_error'               // Authentication/permission denied
'timeout_error'            // Request exceeded timeout

// Performance events
'page_load'                // Metadata: page_path, duration_ms, bundle_size_kb
'api_request'              // Metadata: endpoint, method, latency_ms, status_code
```

---

## DNA-GOV-015: Customer Onboarding Design

### Database Schema

```sql
-- Onboarding progress tracking
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  step TEXT NOT NULL, -- 'welcome', 'company_setup', 'framework_selection', 'first_assessment'
  completed_at TIMESTAMP,
  skipped_at TIMESTAMP,
  data JSONB DEFAULT '{}'::jsonb, -- {company_name, industry, selected_frameworks, ...}
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(workspace_id, user_id, step)
);

-- Email campaign tracking
CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  user_id UUID NOT NULL,
  campaign_type TEXT NOT NULL, -- 'onboarding', 'feature_spotlight', 'case_study'
  email_number INT DEFAULT 1, -- Day 0, Day 3, Day 7, etc.
  sent_at TIMESTAMP DEFAULT NOW(),
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_email_campaigns_sent ON email_campaigns(sent_at);
```

### First-Run Wizard Screens

```typescript
interface OnboardingStep {
  id: 'welcome' | 'company' | 'frameworks' | 'first_assessment' | 'export';
  title: string;
  description: string;
  fields: FormField[];
  estimatedSeconds: number;
  helpVideoUrl?: string;
  skipAllowed: boolean;
}

const ONBOARDING_FLOW: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to EURO AI Compliance',
    description: 'In the next 10 minutes, you\'ll create your first compliance assessment.',
    fields: [],
    estimatedSeconds: 30,
    skipAllowed: false,
  },
  {
    id: 'company',
    title: 'Tell us about your organization',
    description: 'This helps us customize compliance frameworks for your context.',
    fields: [
      { name: 'company_name', type: 'text', label: 'Company Name', required: true },
      { name: 'industry', type: 'select', label: 'Industry', options: ['Tech', 'Finance', ...] },
      { name: 'team_size', type: 'select', label: 'Team Size', options: ['1-10', '11-50', ...] },
    ],
    estimatedSeconds: 120,
    skipAllowed: true,
  },
  // ... framework selection, first assessment, export
];
```

---

## DNA-GOV-016: Advanced Compliance Features Design

### Custom Templates Schema

```sql
CREATE TABLE compliance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  framework_id UUID NOT NULL,
  name TEXT NOT NULL, -- e.g., "ISO 27001 - Data Security"
  description TEXT,
  is_system_template BOOLEAN DEFAULT FALSE, -- System templates are org-wide
  version INT DEFAULT 1,
  obligations JSONB NOT NULL, -- Array of obligation objects
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (framework_id) REFERENCES compliance_frameworks(id)
);

CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  version INT NOT NULL,
  changes_summary TEXT,
  previous_version INT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (template_id) REFERENCES compliance_templates(id) ON DELETE CASCADE
);
```

### Workflow Automation Schema

```sql
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL, -- "Auto-validate evidence against obligation rules"
  trigger_type TEXT NOT NULL, -- 'evidence_uploaded', 'assessment_status_changed'
  trigger_config JSONB NOT NULL, -- {obligation_id, file_types, ...}
  actions JSONB NOT NULL, -- [{type: 'categorize', config: {...}}, {type: 'notify', ...}]
  enabled BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Execution log for auditing
CREATE TABLE automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL,
  triggered_by TEXT NOT NULL, -- evidence_id, assessment_id, etc.
  status TEXT NOT NULL, -- 'success', 'failure'
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE
);
```

---

## Phase 4 Implementation Timeline

### Week 1: Observability Foundation
- [ ] Create product_events table and indexes
- [ ] Implement telemetry endpoint (`POST /api/telemetry/event`)
- [ ] Create event sampling strategy (1% baseline)
- [ ] Build Alert Hub integration for threshold alerts
- [ ] 20+ unit tests for event routing and aggregation

### Week 2: Onboarding Wizard
- [ ] Create onboarding_progress table
- [ ] Build first-run wizard component (React)
- [ ] Implement form validation and data persistence
- [ ] Create email notification system
- [ ] 15+ UI component tests

### Week 3: Advanced Features
- [ ] Implement custom template management
- [ ] Build workflow automation engine
- [ ] Create multi-language report generation
- [ ] Implement team member invitation system
- [ ] 25+ integration tests

### Week 4: Dashboards & Polish
- [ ] Create analytics dashboard (funnel, adoption metrics)
- [ ] Real-time health monitoring UI
- [ ] Email campaign management interface
- [ ] Performance optimization (query caching, indexing)
- [ ] 30+ end-to-end tests

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Event volume overwhelming telemetry | High latency, data loss | Implement sampling, async queuing, partitioned tables |
| PII leak in event metadata | Legal/compliance | Strict schema validation, data classification, regular audits |
| Low onboarding completion rate | Reduced ARR | A/B test wizard flows, track drop-off points, iterate |
| Template sharing across teams | Accidental data exposure | Implement workspace-level isolation, RLS policies |
| Automation rules causing infinite loops | System DoS | Execution limits, rule validation, manual kill-switch |

---

## Success Metrics (Target)

| Metric | Target | Validation |
|--------|--------|-----------|
| Signup-to-workspace funnel | 70% completion | `GET /api/analytics/funnel` query |
| Onboarding wizard completion | 85% users complete all steps | Event tracking data |
| First assessment time-to-value | < 15 minutes | `assessment_created` → `first_assessment_completed` time delta |
| Feature adoption (weekly assessments) | 40% of active workspaces create ≥1 assessment/week | Aggregate event counts |
| API health: p95 latency | < 300ms | Real-time monitoring dashboard |
| Error rate | < 0.5% (p95 over any day) | Alert Hub thresholds |

---

## Next Actions

1. ✅ Create Phase 4 architecture design
2. ⏳ Build test scaffolding (when infrastructure online)
3. ⏳ Implement observability system (DNA-GOV-014)
4. ⏳ Deploy onboarding wizard (DNA-GOV-015)
5. ⏳ Launch advanced compliance features (DNA-GOV-016 & 017)
6. ⏳ Monitor Phase 4 feature adoption and iterate

---

**Document Prepared By:** Governor (Autonomous)  
**Date:** 2026-07-10  
**Status:** Awaiting Founder infrastructure decisions
