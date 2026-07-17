# GOVERNOR DEPLOYMENT GUIDE

**Version:** 1.0  
**Part of:** GOVERNOR EXECUTION FABRIC v1  
**Date:** 2026-07-16

---

## EXECUTIVE SUMMARY

This guide explains how to deploy Governor Execution Fabric v1 to production. Governor is designed to run as an autonomous system alongside your engineering infrastructure, requiring minimal manual intervention after initialization.

---

## DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────┐
│         GOVERNANCE LAYER (Layer 6)          │
│  Observability, Metrics, Dashboards, Logs   │
├─────────────────────────────────────────────┤
│         VERIFICATION LAYER (Layer 5)        │
│  Health checks, Tests, Certification        │
├─────────────────────────────────────────────┤
│         SECURITY LAYER (Layer 4)            │
│  Vault, Audit Log, Permissions, Policies    │
├─────────────────────────────────────────────┤
│       EXECUTION FABRIC LAYER (Layer 3)      │
│  GitHub, Supabase, Vercel, Playwright, etc. │
├─────────────────────────────────────────────┤
│       REASONING ENGINE LAYER (Layer 2)      │
│  Claude, GPT-4, Gemini, Local Models        │
├─────────────────────────────────────────────┤
│         GOVERNOR CORE LAYER (Layer 1)       │
│  Mission Planning, Task Scheduling, Auth    │
└─────────────────────────────────────────────┘
          ↓ Deployed to ↓
    ┌──────────────────────────┐
    │   Production Environment │
    │   (Vercel, AWS, K8s)     │
    └──────────────────────────┘
```

---

## PREREQUISITES

### Infrastructure Requirements

- **Compute:** 2 vCPU, 4GB RAM minimum (can scale down for smaller organizations)
- **Storage:** 50GB persistent storage (for logs, audit trail)
- **Network:** Outbound HTTPS to GitHub, Supabase, Vercel, external APIs
- **Database:** Postgres 13+ (for audit logging, optional but recommended)
- **Container Runtime:** Docker or Kubernetes (optional, can run in process)

### Credential Requirements

Governor requires credentials to access:

1. **GitHub**
   - Personal access token with `repo:write`, `workflow:execute`, `secrets:manage`
   - Store in vault as: `github_token`

2. **Supabase**
   - Project URL
   - Service role key (for schema operations)
   - Anon key (for client operations)
   - Store in vault as: `supabase_url`, `supabase_service_key`, `supabase_anon_key`

3. **Vercel**
   - API token with `deploy:execute`, `config:write`
   - Store in vault as: `vercel_token`

4. **Cloud Provider (if using AWS/GCP/Azure)**
   - Access keys or service account credentials
   - Store in vault with provider-specific naming

5. **LLM API Keys (if using multiple models)**
   - OpenAI: `openai_api_key`
   - Google: `google_api_key`
   - Anthropic: Built-in via Claude API

### Access Requirements

Governor must have network access to:

- GitHub API (`api.github.com`)
- Supabase API (`project.supabase.co`)
- Vercel API (`api.vercel.com`)
- External LLM providers (if configured)
- Your production infrastructure

---

## INSTALLATION

### Option 1: Docker (Recommended)

```bash
# 1. Create Docker image
docker build -t governor:1.0 .

# 2. Create config file
cat > governor-config.yaml <<EOF
governor:
  name: "Governor Ω"
  version: "1.0"
  environment: "production"

core:
  mission_history_size: 1000
  task_queue_size: 500

reasoning:
  default_model: "claude-opus-4-8"
  fallback_model: "claude-sonnet-5"
  token_budget: 100000

execution:
  max_concurrent_tasks: 10
  default_timeout_seconds: 600

security:
  vault_backend: "hashicorp"  # or "env", "aws-secrets-manager"
  audit_log_backend: "postgres"
  require_approval_for: ["deploy_production", "rotate_secret", "delete_branch"]

observability:
  log_level: "info"
  metrics_enabled: true
  tracing_enabled: true
EOF

# 3. Run container
docker run -d \
  --name governor \
  --restart always \
  -v governor-config.yaml:/etc/governor/config.yaml \
  -v governor-vault:/etc/governor/vault \
  -v governor-logs:/var/log/governor \
  -e GITHUB_TOKEN=$(vault read -field=token secret/github) \
  -e SUPABASE_URL=$(vault read -field=url secret/supabase) \
  governor:1.0
```

### Option 2: Kubernetes (Enterprise)

```yaml
# governor-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: governor
  namespace: governance
spec:
  replicas: 1
  selector:
    matchLabels:
      app: governor
  template:
    metadata:
      labels:
        app: governor
    spec:
      serviceAccountName: governor
      containers:
        - name: governor
          image: governor:1.0
          resources:
            requests:
              cpu: 2
              memory: 4Gi
            limits:
              cpu: 4
              memory: 8Gi
          env:
            - name: GITHUB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: governor-secrets
                  key: github-token
            - name: SUPABASE_URL
              valueFrom:
                secretKeyRef:
                  name: governor-secrets
                  key: supabase-url
          volumeMounts:
            - name: config
              mountPath: /etc/governor
              readOnly: true
            - name: logs
              mountPath: /var/log/governor
            - name: vault
              mountPath: /etc/governor/vault
      volumes:
        - name: config
          configMap:
            name: governor-config
        - name: logs
          persistentVolumeClaim:
            claimName: governor-logs
        - name: vault
          secret:
            secretName: governor-vault

---
apiVersion: v1
kind: Service
metadata:
  name: governor-api
  namespace: governance
spec:
  selector:
    app: governor
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: governor
  namespace: governance
```

Deploy:

```bash
kubectl create namespace governance
kubectl create secret generic governor-secrets \
  --from-literal=github-token=$GITHUB_TOKEN \
  --from-literal=supabase-url=$SUPABASE_URL \
  -n governance
kubectl apply -f governor-deployment.yaml
```

### Option 3: Process (Development)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set environment variables
export GOVERNOR_CONFIG=/etc/governor/config.yaml
export GITHUB_TOKEN=$(vault read -field=token secret/github)
export SUPABASE_URL=$(vault read -field=url secret/supabase)

# 3. Initialize credentials vault
python -c "
from governor import CredentialVault
vault = CredentialVault()
vault.init()
"

# 4. Run Governor
python -m governor.main
```

---

## CONFIGURATION

### Core Configuration File

```yaml
# /etc/governor/config.yaml

governor:
  name: 'Governor Ω'
  version: '1.0'
  environment: 'production' # or "staging", "development"
  timezone: 'UTC'

# Layer 1: Governor Core
core:
  mission_history_size: 1000
  task_queue_size: 500
  escalation_timeout_seconds: 3600
  approval_timeout_seconds: 1800

# Layer 2: Reasoning Engine
reasoning:
  default_model: 'claude-opus-4-8'
  fallback_model: 'claude-sonnet-5'
  reasoning_timeout_seconds: 300
  token_budget: 100000

  model_endpoints:
    anthropic:
      base_url: 'https://api.anthropic.com'
      model_ids: ['claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5']
    openai:
      base_url: 'https://api.openai.com/v1'
      model_ids: ['gpt-4-turbo', 'gpt-4']
    google:
      base_url: 'https://generativelanguage.googleapis.com'
      model_ids: ['gemini-pro']

# Layer 3: Execution Fabric
execution:
  max_concurrent_tasks: 10
  default_timeout_seconds: 600
  tool_discovery_interval_seconds: 3600

  tools:
    git:
      enabled: true
      path: '/usr/bin/git'
    github:
      enabled: true
      module: 'governor.modules.github'
    supabase:
      enabled: true
      module: 'governor.modules.supabase'
    vercel:
      enabled: true
      module: 'governor.modules.vercel'
    playwright:
      enabled: false # Enable if browser automation needed
      module: 'governor.modules.playwright'

# Layer 4: Security
security:
  vault_backend: 'hashicorp' # "env", "aws-secrets-manager", "hashicorp"
  vault_address: 'https://vault.example.com'
  vault_namespace: 'governor'

  audit_log_backend: 'postgres' # "postgres", "s3", "file"
  audit_log_connection: 'postgres://user:pass@localhost/governor'
  audit_log_retention_days: 2555 # 7 years

  credential_rotation_days: 90

  permissions:
    require_approval_for:
      - 'set_secret'
      - 'rotate_secret'
      - 'deploy_production'
      - 'rollback_deployment'
      - 'delete_branch'
      - 'drop_database'

    autonomous_for:
      - 'push_code'
      - 'create_branch'
      - 'create_pr'
      - 'run_tests'
      - 'query_database_select'

# Layer 5: Verification
verification:
  health_check_interval_seconds: 60
  production_verification_required: true

  checks:
    - type: 'api_health'
      endpoint: '/api/health'
      timeout_seconds: 10
    - type: 'database_connectivity'
      timeout_seconds: 15
    - type: 'external_service'
      services: ['github', 'supabase', 'vercel']

# Layer 6: Observability
observability:
  log_level: 'info' # "debug", "info", "warning", "error"

  metrics:
    enabled: true
    backend: 'prometheus' # "prometheus", "cloudwatch", "datadog"
    scrape_interval_seconds: 15

  tracing:
    enabled: true
    backend: 'jaeger' # "jaeger", "datadog", "aws-xray"
    sample_rate: 1.0 # 100% sampling

  logging:
    format: 'json' # "json" or "text"
    output: 'stdout' # "stdout", "file", "both"
    file_path: '/var/log/governor/governor.log'
    rotation:
      max_size_mb: 100
      max_age_days: 30
      max_backups: 10
```

---

## INITIALIZATION

### Step 1: Initialize Credential Vault

```bash
# Connect to vault
vault login -method=oidc

# Store credentials
vault kv put secret/github \
  token=$GITHUB_TOKEN

vault kv put secret/supabase \
  url=$SUPABASE_URL \
  service_key=$SUPABASE_SERVICE_KEY \
  anon_key=$SUPABASE_ANON_KEY

vault kv put secret/vercel \
  token=$VERCEL_TOKEN

# Verify credentials stored
vault kv list secret/
```

### Step 2: Initialize Audit Database

```bash
# Create audit schema
psql -h localhost -U governor -d governor -f scripts/init-audit-schema.sql

# Verify schema
psql -h localhost -U governor -d governor -c "\dt"
```

### Step 3: Perform Health Checks

```bash
# Check Governor status
curl http://localhost:8080/api/governor/status

# Check module health
curl http://localhost:8080/api/governor/modules

# Check vault connectivity
curl http://localhost:8080/api/governor/vault/status

# Check database connectivity
curl http://localhost:8080/api/governor/database/status
```

Expected responses:

```json
{
  "status": "healthy",
  "modules": {
    "github": "healthy",
    "supabase": "healthy",
    "vercel": "healthy"
  },
  "vault": "connected",
  "database": "connected"
}
```

---

## PRODUCTION CHECKLIST

Before going live:

```
[ ] Infrastructure provisioned (compute, storage, network)
[ ] Credentials securely stored in vault
[ ] TLS certificates configured
[ ] Audit database initialized and backed up
[ ] Monitoring and alerting configured
[ ] Governor API accessible
[ ] All modules health checks passing
[ ] Founder authorization configured
[ ] Approval workflow tested
[ ] Rollback procedures documented
[ ] Disaster recovery plan created
[ ] Team trained on Governor operations
[ ] Initial mission executed successfully
[ ] Performance baseline established
[ ] Security scanning passed
```

---

## ONGOING OPERATIONS

### Daily

```bash
# Check Governor health
curl http://localhost:8080/api/governor/health

# Review recent missions
curl http://localhost:8080/api/governor/missions?limit=10

# Check for alerts
curl http://localhost:8080/api/governor/alerts
```

### Weekly

```bash
# Review audit log
curl http://localhost:8080/api/governor/audit-log?days=7

# Check module metrics
curl http://localhost:8080/api/governor/modules/metrics

# Verify backup status
curl http://localhost:8080/api/governor/backup/status
```

### Monthly

```bash
# Rotate credentials
vault kv put secret/github token=$NEW_GITHUB_TOKEN

# Review permission changes
curl http://localhost:8080/api/governor/permissions/audit

# Test disaster recovery
./scripts/test-recovery.sh
```

### Quarterly

```bash
# Audit all credentials
./scripts/audit-credentials.sh

# Review security posture
./scripts/security-audit.sh

# Update documentation
./scripts/update-docs.sh
```

---

## SCALING

### Single-Mission to Multi-Mission (Horizontal)

```yaml
# Enable multi-task execution
execution:
  max_concurrent_tasks: 50 # Increase from 10

# Scale reasoning engine
reasoning:
  model_pool_size: 5 # Multiple model connections

# Add worker processes
governor:
  worker_processes: 4 # Parallel task execution
```

### Multi-Region Deployment

```yaml
# Configure regional audit logs
observability:
  logging:
    regional_backends:
      - region: 'us-east-1'
        backend: 'cloudwatch'
      - region: 'eu-central-1'
        backend: 'cloudwatch'

# Deploy Governor instances per region
# Use load balancer to route missions
```

---

## MONITORING

### Key Metrics

```
governor_missions_total                  # Total missions executed
governor_missions_successful             # Successful missions
governor_missions_failed                 # Failed missions
governor_tasks_completed                 # Tasks completed
governor_escalations_total               # Escalations required
governor_autonomous_rate                 # % of autonomous tasks
governor_avg_mission_duration_seconds    # Average mission time
governor_audit_log_entries               # Audit trail size
governor_vault_operations                # Secret operations
```

### Dashboards

- Governor Health Dashboard (uptime, missions, errors)
- Autonomous Rate Dashboard (autonomous vs escalated)
- Security Dashboard (audit log, permission changes)
- Performance Dashboard (latency, throughput, costs)

---

## TROUBLESHOOTING

### Governor Not Starting

**Error:** "Failed to connect to vault"

```bash
# Check vault is running
vault status

# Check network connectivity
curl https://vault.example.com

# Verify credentials
export VAULT_ADDR=https://vault.example.com
vault login
```

### Module Health Degraded

**Error:** "GitHub module unhealthy"

```bash
# Check GitHub token valid
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user

# Check GitHub API status
curl https://www.githubstatus.com/api/v2/status.json

# Restart module
curl -X POST http://localhost:8080/api/governor/modules/github/restart
```

### Audit Log Growing Too Large

**Error:** "Disk space low"

```bash
# Check audit log size
du -sh /var/log/governor/

# Archive old logs
./scripts/archive-audit-logs.sh --before 2025-01-01

# Compress audit database
psql -d governor -c "VACUUM ANALYZE audit_log;"
```

---

## REFERENCE

**See Also:**

- GOVERNOR-EXECUTION-FABRIC-v1-ARCHITECTURE.md (Architecture overview)
- GOVERNOR-AUTONOMOUS-MANUAL.md (Operating manual)
- GOVERNOR-SECURITY-MODEL.md (Security setup)

---

**Status:** PRODUCTION-READY  
**Last Updated:** 2026-07-16  
**Maintained by:** Governor Ω
