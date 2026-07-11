# DNA-GOV-001: Blocking Condition Detector — Deployment & Operations Guide

**Purpose:** Detailed procedures for deploying and operating the 24/7 infrastructure monitoring system that detects blocking conditions (GitHub Actions, Supabase, Vercel outages).

**Trigger:** Deploy immediately after Supabase schema is available (prerequisite: schema.sql executed)

**Timeline:** 15 minutes deployment + 5 minutes configuration = 20 minutes total

**Owner:** Governor

**References:**
- PHASE-2-ARCHITECTURE-OPTIONS.md (DNA-GOV-001 section)
- FOUNDER-ACTION-SUMMARY-2026-07-10.md (infrastructure blocker fixes)
- Deployment schedule: Every 30 minutes (configurable)

---

## Prerequisites

Before deploying DNA-GOV-001, verify:

- [ ] **Supabase schema deployed**
  ```bash
  # Execute in Supabase SQL Editor:
  # Run: supabase/schema.sql (from root of repo)
  # Verify: Tables exist in Supabase dashboard
  ```

- [ ] **GitHub Actions accessible**
  ```bash
  git push origin main
  # Expected: GitHub Actions workflow triggers automatically
  ```

- [ ] **Vercel API token available**
  ```bash
  # Verify env var in .env.local
  echo $VERCEL_TOKEN
  # Expected: Non-empty token (if missing, add from Vercel dashboard)
  ```

- [ ] **Supabase CLI installed**
  ```bash
  npm ls supabase
  # Expected: @supabase/supabase-js installed
  ```

---

## Deployment Procedure (15 minutes)

### Step 1: Create Database Tables (3 minutes)

Execute the following SQL in Supabase SQL Editor to create the monitoring infrastructure:

```sql
-- Create blocking_conditions table
CREATE TABLE IF NOT EXISTS blocking_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name TEXT NOT NULL,  -- "github_actions", "supabase", "vercel"
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  status_code INTEGER,  -- HTTP status from health check
  error_message TEXT,  -- Error description if blocked
  resolved_at TIMESTAMP,  -- When the block was resolved (NULL if still blocked)
  checked_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_blocking_conditions_system_checked 
  ON blocking_conditions(system_name, checked_at DESC);

CREATE INDEX idx_blocking_conditions_is_blocked 
  ON blocking_conditions(is_blocked) 
  WHERE is_blocked = true;

-- Create monitoring_alerts table
CREATE TABLE IF NOT EXISTS monitoring_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name TEXT NOT NULL,  -- "github_actions", "supabase", "vercel"
  alert_type TEXT NOT NULL,  -- "blocker_detected", "blocker_resolved"
  message TEXT NOT NULL,
  severity TEXT NOT NULL,  -- "critical", "warning", "info"
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_monitoring_alerts_system_created 
  ON monitoring_alerts(system_name, created_at DESC);

CREATE INDEX idx_monitoring_alerts_unacknowledged 
  ON monitoring_alerts(acknowledged) 
  WHERE acknowledged = false;

-- Enable RLS
ALTER TABLE blocking_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public read for monitoring, auth write for system)
CREATE POLICY "Anyone can read blocking conditions"
  ON blocking_conditions FOR SELECT
  USING (true);

CREATE POLICY "System can insert blocking conditions"
  ON blocking_conditions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read alerts"
  ON monitoring_alerts FOR SELECT
  USING (true);

CREATE POLICY "System can create alerts"
  ON monitoring_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can acknowledge alerts"
  ON monitoring_alerts FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verify schema
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('blocking_conditions', 'monitoring_alerts');
-- Expected: 2 rows returned
```

**Verification:**
```bash
# Check tables exist in Supabase dashboard
# Go to: Supabase → SQL Editor
# Tables section should show:
# - blocking_conditions
# - monitoring_alerts

# Or verify via Supabase CLI:
supabase db list
```

### Step 2: Create API Endpoint for Health Checks (4 minutes)

Create the endpoint that systems will call to check health status:

```bash
# Create API route
mkdir -p app/api/health/check

cat > app/api/health/check/route.ts << 'EOF'
// app/api/health/check/route.ts
import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

interface HealthCheckResult {
  system: 'github_actions' | 'supabase' | 'vercel';
  status: 'healthy' | 'blocked';
  statusCode: number;
  message: string;
  checkedAt: string;
}

async function checkGitHubActions(): Promise<HealthCheckResult> {
  try {
    const response = await fetch(
      'https://api.github.com/repos/mininglife7-dev/newspulse-ai/actions/runs',
      {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (response.ok) {
      return {
        system: 'github_actions',
        status: 'healthy',
        statusCode: 200,
        message: 'GitHub Actions accessible',
        checkedAt: new Date().toISOString(),
      };
    } else if (response.status === 403) {
      return {
        system: 'github_actions',
        status: 'blocked',
        statusCode: 403,
        message: 'GitHub Actions rate limit exceeded or auth failed',
        checkedAt: new Date().toISOString(),
      };
    } else {
      return {
        system: 'github_actions',
        status: 'blocked',
        statusCode: response.status,
        message: `GitHub Actions returned ${response.status}`,
        checkedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      system: 'github_actions',
      status: 'blocked',
      statusCode: 0,
      message: `GitHub Actions check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      checkedAt: new Date().toISOString(),
    };
  }
}

async function checkSupabase(): Promise<HealthCheckResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('blocking_conditions')
      .select('id')
      .limit(1);

    if (error) {
      return {
        system: 'supabase',
        status: 'blocked',
        statusCode: 500,
        message: `Supabase query failed: ${error.message}`,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      system: 'supabase',
      status: 'healthy',
      statusCode: 200,
      message: 'Supabase accessible',
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      system: 'supabase',
      status: 'blocked',
      statusCode: 0,
      message: `Supabase check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      checkedAt: new Date().toISOString(),
    };
  }
}

async function checkVercel(): Promise<HealthCheckResult> {
  try {
    const response = await fetch('https://www.vercel.com/api', {
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
      },
    });

    if (response.ok) {
      return {
        system: 'vercel',
        status: 'healthy',
        statusCode: 200,
        message: 'Vercel accessible',
        checkedAt: new Date().toISOString(),
      };
    } else {
      return {
        system: 'vercel',
        status: 'blocked',
        statusCode: response.status,
        message: `Vercel returned ${response.status}`,
        checkedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      system: 'vercel',
      status: 'blocked',
      statusCode: 0,
      message: `Vercel check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Run all health checks in parallel
    const [github, supabase, vercel] = await Promise.all([
      checkGitHubActions(),
      checkSupabase(),
      checkVercel(),
    ]);

    // Check if any system is blocked
    const results = [github, supabase, vercel];
    const anyBlocked = results.some((r) => r.status === 'blocked');

    // Record results in database
    const dbClient = createClient();
    for (const result of results) {
      // Only log if status changed or it's a critical blocker
      if (anyBlocked && result.status === 'blocked') {
        // Log blocking condition
        await dbClient.from('blocking_conditions').insert({
          system_name: result.system,
          is_blocked: true,
          status_code: result.statusCode,
          error_message: result.message,
        });

        // Create alert
        await dbClient.from('monitoring_alerts').insert({
          system_name: result.system,
          alert_type: 'blocker_detected',
          message: `${result.system} is blocked: ${result.message}`,
          severity: 'critical',
        });
      }
    }

    return NextResponse.json({
      ok: !anyBlocked,
      status: anyBlocked ? 'BLOCKED' : 'HEALTHY',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
EOF

# Verify file created
ls -lh app/api/health/check/route.ts
```

### Step 3: Deploy DNA-GOV-001 Monitoring Script (5 minutes)

Create the automation script that runs every 30 minutes:

```bash
# Create monitoring script
cat > scripts/dna-gov-001-monitor.mjs << 'EOF'
#!/usr/bin/env node

/**
 * DNA-GOV-001: Blocking Condition Detector
 * Runs every 30 minutes to check infrastructure health
 * 
 * Usage: npm run dna:monitor
 * Schedule: npm run dna:monitor-setup (sets up GitHub Actions)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const APP_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runHealthCheck() {
  console.log(`\n🏥 DNA-GOV-001 Health Check [${new Date().toISOString()}]`);
  
  try {
    // Call health check endpoint
    const response = await fetch(`${APP_URL}/api/health/check`);
    const data = await response.json();

    if (data.ok) {
      console.log('✅ All systems healthy');
      console.log(`   GitHub Actions: ${data.results[0].status}`);
      console.log(`   Supabase: ${data.results[1].status}`);
      console.log(`   Vercel: ${data.results[2].status}`);
    } else {
      console.log('🚨 BLOCKING CONDITIONS DETECTED:');
      data.results.forEach((result) => {
        if (result.status === 'blocked') {
          console.log(`   ❌ ${result.system}: ${result.message}`);
        } else {
          console.log(`   ✅ ${result.system}: Healthy`);
        }
      });

      // Check if alerts were created
      const { data: alerts } = await supabase
        .from('monitoring_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (alerts && alerts.length > 0) {
        console.log('\n📢 Unacknowledged Alerts:');
        alerts.forEach((alert) => {
          console.log(`   [${alert.severity.toUpperCase()}] ${alert.message}`);
        });
      }
    }

    console.log('\n✓ Health check complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

runHealthCheck();
EOF

# Make script executable
chmod +x scripts/dna-gov-001-monitor.mjs

# Add npm scripts
npm pkg set scripts.dna:monitor="node --env-file=.env.local scripts/dna-gov-001-monitor.mjs"
npm pkg set scripts.dna:monitor-setup="echo 'Add to GitHub Actions workflow: runs the script every 30 minutes'"

# Verify
ls -lh scripts/dna-gov-001-monitor.mjs
```

### Step 4: Set Up GitHub Actions Automation (3 minutes)

Create the GitHub Actions workflow for automated monitoring:

```bash
# Create GitHub Actions workflow
cat > .github/workflows/dna-gov-001-monitoring.yml << 'EOF'
name: DNA-GOV-001 Blocking Condition Detector

on:
  schedule:
    # Run every 30 minutes
    - cron: '*/30 * * * *'
  workflow_dispatch:  # Allow manual trigger

jobs:
  check-infrastructure:
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run DNA-GOV-001 health check
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_URL: ${{ secrets.VERCEL_URL }}
        run: npm run dna:monitor

      - name: Notify on blocker detected
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |
            {
              text: '🚨 DNA-GOV-001: Blocking condition detected',
              attachments: [{
                color: 'danger',
                text: 'Check GitHub Actions → DNA-GOV-001 workflow for details',
                actions: [{
                  type: 'button',
                  text: 'View Logs',
                  url: context.payload.repository.html_url + '/actions/runs/' + context.runId
                }]
              }]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
EOF

# Verify workflow file
ls -lh .github/workflows/dna-gov-001-monitoring.yml
```

### Step 5: Test Deployment (Immediate)

```bash
# Test health check endpoint locally
npm run dev &
# Wait 3 seconds for server to start

curl http://localhost:3000/api/health/check
# Expected output:
# {"ok":true,"status":"HEALTHY","results":[...],"timestamp":"2026-07-11T..."}

# Stop dev server
killall node
```

**Deployment Complete:** ✅ DNA-GOV-001 deployed and automated

---

## Configuration & Customization

### Adjust Monitoring Frequency

Edit `.github/workflows/dna-gov-001-monitoring.yml`:

```yaml
on:
  schedule:
    # Current: Every 30 minutes
    - cron: '*/30 * * * *'
    
    # Options:
    # - cron: '*/15 * * * *'  # Every 15 minutes (more frequent)
    # - cron: '*/60 * * * *'  # Every hour (less frequent)
    # - cron: '0 * * * *'     # Hourly at :00
```

### Add More Health Checks

Edit `app/api/health/check/route.ts`:

```typescript
// Add new health check function
async function checkNewSystem(): Promise<HealthCheckResult> {
  // Implementation here
}

// Add to health check results
const [github, supabase, vercel, newSystem] = await Promise.all([
  checkGitHubActions(),
  checkSupabase(),
  checkVercel(),
  checkNewSystem(),  // Add here
]);
```

### Configure Slack Notifications

In GitHub repository Settings → Secrets:

```
Add: SLACK_WEBHOOK_URL = https://hooks.slack.com/services/...
```

To get webhook URL:
1. Go to Slack workspace → Settings → Apps & integrations
2. Create new webhook → Copy URL
3. Add to GitHub secrets

---

## Operations & Monitoring

### Daily Monitoring Dashboard (5 minutes)

Each day, check the monitoring status:

```sql
-- Query: Show latest 10 health checks
SELECT 
  system_name,
  is_blocked,
  status_code,
  error_message,
  checked_at
FROM blocking_conditions
ORDER BY checked_at DESC
LIMIT 10;

-- Query: Count blockers by system today
SELECT 
  system_name,
  COUNT(*) as blocker_count,
  MAX(checked_at) as latest_check
FROM blocking_conditions
WHERE is_blocked = true
  AND checked_at > NOW() - INTERVAL '24 hours'
GROUP BY system_name;

-- Query: Show unacknowledged alerts
SELECT 
  system_name,
  alert_type,
  message,
  severity,
  created_at
FROM monitoring_alerts
WHERE acknowledged = false
ORDER BY created_at DESC;
```

### Acknowledge Alerts

When you resolve a blocking condition:

```sql
-- Mark alert as acknowledged
UPDATE monitoring_alerts
SET acknowledged = true,
    acknowledged_at = NOW(),
    acknowledged_by = auth.uid()
WHERE id = '[alert-id]'
  AND acknowledged = false;
```

### Automatic Alert Clearing

When a system recovers:

```sql
-- Update blocking_conditions table
UPDATE blocking_conditions
SET is_blocked = false,
    resolved_at = NOW()
WHERE system_name = 'github_actions'
  AND is_blocked = true
  AND (NOW() - checked_at) > INTERVAL '5 minutes';
```

---

## Troubleshooting

### "Health check endpoint not found" (404)

```bash
# Verify API route exists
ls -la app/api/health/check/route.ts

# Verify Next.js rebuild
npm run build

# Restart dev server
npm run dev
```

### "Supabase connection failed"

```bash
# Verify env vars
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Test connection
npm run supabase:shell
# Run: SELECT 1;
```

### "GitHub Actions check failing"

```bash
# Verify GitHub token
echo $GITHUB_TOKEN

# Check token permissions
# Go to: GitHub → Settings → Developer settings → Personal access tokens
# Verify: repo access enabled
```

### "Workflow not triggering"

```bash
# Check workflow file syntax
# Go to: GitHub → Actions → DNA-GOV-001 Monitoring
# Look for syntax errors

# Manually trigger for testing
# Go to: GitHub → Actions → DNA-GOV-001 → Run workflow

# Check logs
# GitHub → Actions → Workflow run → View logs
```

---

## Success Criteria

✅ **DNA-GOV-001 successfully deployed if:**

- [ ] Database tables created (blocking_conditions, monitoring_alerts)
- [ ] Health check endpoint accessible at /api/health/check
- [ ] Health check returns: {"ok": true/false, "status": "HEALTHY/BLOCKED", ...}
- [ ] Monitoring script runs without errors (npm run dna:monitor)
- [ ] GitHub Actions workflow appears in Actions tab
- [ ] Workflow runs on 30-minute schedule (check next scheduled run)
- [ ] Manual workflow trigger works (Actions → Run workflow)
- [ ] Slack notifications configured (if enabled)
- [ ] Alerts appear in monitoring_alerts table after blocked condition
- [ ] Dashboard queries return results without errors

---

## Monitoring During Phase 3

During Phase 3 implementation sprint (2026-07-18 to 2026-07-25):

**Monitor daily:**
```bash
# Check if any blockers detected
npm run dna:monitor

# Review alerts
curl https://[deployment-url]/api/health/check
```

**If a blocker is detected:**
1. Check `monitoring_alerts` table for details
2. Acknowledge alert (mark acknowledged = true)
3. Fix the underlying issue (see FOUNDER-ACTION-SUMMARY for fixes)
4. Verify resolution with another health check

**Escalation path:**
- Info severity: Log only, no action needed
- Warning severity: Monitor closely, may need action
- Critical severity: Founder notification required immediately

---

## Maintenance & Updates

### Monthly Review

- Check blocker trends (any systems repeatedly failing?)
- Review unacknowledged alerts
- Test alert notification channels (Slack, etc.)
- Update health check URLs if infrastructure changes

### Quarterly Deep-Dive

- Audit RLS policies for security
- Review monitoring overhead (CPU, data storage)
- Test recovery procedures (simulate blocker, verify alert)
- Update documentation

---

## Reference Links

- Supabase SQL Editor: `https://supabase.com/dashboard/project/[project]/sql`
- GitHub Actions: `https://github.com/mininglife7-dev/newspulse-ai/actions`
- Health Check Endpoint: `/api/health/check`
- Monitoring Database: `blocking_conditions`, `monitoring_alerts`

---

**Status:** Ready to deploy  
**Owner:** Governor  
**Created:** 2026-07-11  
**Deploy After:** Supabase schema executed (prerequisite)  
**Expected Runtime:** 15-20 minutes deployment + 5 minutes configuration
