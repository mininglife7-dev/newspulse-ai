# Production API Specification

**Base URL:** `https://newspulse-ai-production.vercel.app`  
**Authentication:** Bearer token via `Authorization` header  
**Content-Type:** `application/json`  
**Status:** Production Ready  

---

## Authentication

All endpoints require Bearer token authentication:

```http
Authorization: Bearer <TOKEN>
```

Token must match environment variable:
- `PRODUCTION_WIRING_SECRET` - For production-wiring and war-games endpoints
- `CRON_SECRET` - For production-error-collection endpoint

**Error Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized"
}
```

---

## Production Error Collection

### POST `/api/production-error-collection/cron`

Collect error patterns from production logs and create incidents if thresholds exceeded.

**Purpose:** Triggered every 60 seconds by external cron service (EasyCron, cron.is)

**Request:**
```http
POST /api/production-error-collection/cron HTTP/1.1
Host: newspulse-ai-production.vercel.app
Authorization: Bearer {CRON_SECRET}
Content-Type: application/json
```

No request body required.

**Response (200 OK):**
```json
{
  "success": true,
  "collected": 5,
  "message": "Collected 5 error patterns in 234ms"
}
```

**Response (500 Error):**
```json
{
  "error": "Failed to collect error patterns",
  "details": "Database connection failed"
}
```

**Cron Configuration:**

**Option A: EasyCron (Recommended)**
1. Visit https://www.easycron.com
2. Click "Create Cron Job"
3. Enter URL: `https://newspulse-ai-production.vercel.app/api/production-error-collection/cron`
4. Set Header: `Authorization: Bearer {CRON_SECRET}`
5. Set Cron Expression: `*/1 * * * *` (every minute)
6. Enable & Save

**Option B: cron.is**
1. Visit https://cron.is
2. Similar process as EasyCron
3. Enter same URL and headers

**Health Check:**
```bash
# Test manually
curl -X POST https://newspulse-ai-production.vercel.app/api/production-error-collection/cron \
  -H "Authorization: Bearer $CRON_SECRET"

# Should return:
# {"success": true, "collected": N}
```

**SLA:** Must complete within 30 seconds each execution

---

## Production Wiring (Orchestration)

### POST `/api/production-wiring`

Submit error metrics and patterns for orchestration (incident detection and remediation decision).

**Purpose:** Called by external deployment/monitoring system or tests

**Request:**
```http
POST /api/production-wiring HTTP/1.1
Host: newspulse-ai-production.vercel.app
Authorization: Bearer {PRODUCTION_WIRING_SECRET}
Content-Type: application/json

{
  "deploymentId": "deploy-20260716-143022",
  "errorMetrics": {
    "totalErrors": 25,
    "errorRate": 0.05,
    "timewindowSeconds": 60
  },
  "errorPatterns": [
    {
      "fingerprint": "TypeError: Cannot read property 'foo' of undefined",
      "category": "Application",
      "severity": "high",
      "occurrenceCount": 5,
      "lastSeen": "2026-07-16T10:30:22Z",
      "message": "TypeError in db query handler"
    }
  ]
}
```

**Input Validation:**
- `deploymentId`: 1-100 chars, alphanumeric/dash/underscore only
- `errorMetrics.totalErrors`: integer >= 0
- `errorMetrics.errorRate`: decimal 0.0-1.0
- `errorPatterns[].message`: max 10000 chars

**Response (201 Created):**
```json
{
  "timestamp": "2026-07-16T10:30:22Z",
  "incident": {
    "id": "incident-abc123",
    "severity": "high",
    "status": "created"
  },
  "orchestration": {
    "id": "orch-def456",
    "decision": "scale",
    "status": "executing"
  },
  "timeline": [
    {
      "timestamp": "2026-07-16T10:30:22Z",
      "phase": "detection",
      "system": "DNS-023",
      "result": "success"
    },
    {
      "timestamp": "2026-07-16T10:30:23Z",
      "phase": "analysis",
      "system": "DNS-025",
      "result": "success"
    },
    {
      "timestamp": "2026-07-16T10:30:24Z",
      "phase": "decision",
      "system": "DNS-017",
      "result": "success"
    }
  ]
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid deploymentId format"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized"
}
```

**Response (500 Error):**
```json
{
  "error": "Failed to process wiring",
  "details": "Supabase connection failed"
}
```

---

### GET `/api/production-wiring`

Query state of incidents and orchestrations.

**Purpose:** Status check, integration verification, debugging

**Request:**
```http
GET /api/production-wiring?action=status&deploymentId=deploy-20260716-143022 HTTP/1.1
Host: newspulse-ai-production.vercel.app
Authorization: Bearer {PRODUCTION_WIRING_SECRET}
```

**Query Parameters:**
- `action` (required): `status`
- `deploymentId` (optional): Filter by deployment ID

**Response (200 OK):**
```json
{
  "timestamp": "2026-07-16T10:30:30Z",
  "deploymentId": "deploy-20260716-143022",
  "incidents": {
    "total": 1,
    "critical": 0,
    "high": 1,
    "medium": 0,
    "low": 0
  },
  "orchestrations": {
    "total": 1,
    "executing": 1,
    "succeeded": 0,
    "failed": 0
  }
}
```

---

### PUT `/api/production-wiring`

Update incident or orchestration status.

**Purpose:** Notify system of remediation completion or escalation

**Request:**
```http
PUT /api/production-wiring HTTP/1.1
Host: newspulse-ai-production.vercel.app
Authorization: Bearer {PRODUCTION_WIRING_SECRET}
Content-Type: application/json

{
  "orchestrationId": "orch-def456",
  "status": "succeeded",
  "message": "Rolled back deployment to v1.2.3, errors now < 1%"
}
```

**Input Validation:**
- `orchestrationId`: required
- `status`: one of `executing`, `succeeded`, `failed`
- `message`: max 10000 chars

**Response (200 OK):**
```json
{
  "timestamp": "2026-07-16T10:30:45Z",
  "orchestrationId": "orch-def456",
  "status": "succeeded"
}
```

---

## War Games (Synthetic Testing)

### GET `/api/war-games`

List available incident scenarios for testing.

**Purpose:** Discover what scenarios can be simulated

**Request:**
```http
GET /api/war-games?action=scenarios HTTP/1.1
Host: newspulse-ai-production.vercel.app
Authorization: Bearer {PRODUCTION_WIRING_SECRET}
```

**Query Parameters:**
- `action` (required): `scenarios`, `results`, or `summary`
- `scenario` (optional): Scenario name for `results` action

**Response (200 OK):**
```json
{
  "total": 6,
  "scenarios": [
    {
      "name": "Pool Exhaustion",
      "description": "Database connection pool at capacity",
      "category": "Database",
      "severity": "critical",
      "expectedDetectionTime": 5000,
      "expectedRemediationTime": 30000
    },
    {
      "name": "CPU Spike",
      "description": "CPU utilization exceeds 90%",
      "category": "Infrastructure",
      "severity": "high",
      "expectedDetectionTime": 3000,
      "expectedRemediationTime": 45000
    }
  ]
}
```

---

### POST `/api/war-games`

Execute synthetic incident scenario.

**Purpose:** End-to-end validation of incident response pipeline

**Request (Single Scenario):**
```http
POST /api/war-games HTTP/1.1
Host: newspulse-ai-production.vercel.app
Authorization: Bearer {PRODUCTION_WIRING_SECRET}
Content-Type: application/json

{
  "scenario": "Pool Exhaustion"
}
```

**Request (All Scenarios):**
```http
POST /api/war-games HTTP/1.1
Host: newspulse-ai-production.vercel.app
Authorization: Bearer {PRODUCTION_WIRING_SECRET}
Content-Type: application/json

{
  "all": true
}
```

**Response (201 Created):**
```json
{
  "timestamp": "2026-07-16T10:30:50Z",
  "executed": 1,
  "results": [
    {
      "scenario": "Pool Exhaustion",
      "success": true,
      "detectionTime": 4834,
      "remediationTime": 31245,
      "validation": {
        "passed": true,
        "checks": [
          "Detection time under 10s threshold",
          "Remediation time under 60s threshold",
          "Post-mortem created",
          "Alerts sent to founder"
        ]
      }
    }
  ],
  "summary": {
    "totalScenarios": 1,
    "successRate": 100,
    "averageDetectionTime": 4834,
    "averageRemediationTime": 31245,
    "failureReasons": []
  }
}
```

---

### GET `/api/war-games?action=results&scenario=Pool Exhaustion`

Retrieve results of previously executed scenario.

**Request:**
```http
GET /api/war-games?action=results&scenario=Pool%20Exhaustion HTTP/1.1
Host: newspulse-ai-production.vercel.app
Authorization: Bearer {PRODUCTION_WIRING_SECRET}
```

**Response (200 OK):**
```json
{
  "scenario": "Pool Exhaustion",
  "results": [
    {
      "executedAt": "2026-07-16T10:30:50Z",
      "success": true,
      "detectionTime": 4834,
      "remediationTime": 31245,
      "incidentsDetected": 1,
      "postMortemCreated": true,
      "metrics": {
        "mttr": 0.52,
        "mttd": 4.8,
        "successRateImpact": 0.05
      }
    }
  ]
}
```

---

### GET `/api/war-games?action=summary`

Get summary of all war game results.

**Request:**
```http
GET /api/war-games?action=summary HTTP/1.1
Host: newspulse-ai-production.vercel.app
Authorization: Bearer {PRODUCTION_WIRING_SECRET}
```

**Response (200 OK):**
```json
{
  "timestamp": "2026-07-16T10:31:00Z",
  "totalScenarios": 6,
  "successRate": 98.5,
  "averageDetectionTime": 4200,
  "averageRemediationTime": 35800,
  "averagePostMortemTime": 4500,
  "failureReasons": [
    "Pool Exhaustion scenario failed on 2026-07-15 (network timeout)"
  ]
}
```

---

### DELETE `/api/war-games`

Clear war game results.

**Purpose:** Reset test data for clean run

**Request (Clear Specific Scenario):**
```http
DELETE /api/war-games?scenario=Pool%20Exhaustion HTTP/1.1
Host: newspulse-ai-production.vercel.app
Authorization: Bearer {PRODUCTION_WIRING_SECRET}
```

**Request (Clear All Results):**
```http
DELETE /api/war-games HTTP/1.1
Host: newspulse-ai-production.vercel.app
Authorization: Bearer {PRODUCTION_WIRING_SECRET}
```

**Response (200 OK):**
```json
{
  "success": true,
  "cleared": "all scenarios"
}
```

---

## Health Checks

### GET `/api/health`

Basic application health check.

**Request:**
```http
GET /api/health HTTP/1.1
Host: newspulse-ai-production.vercel.app
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-07-16T10:31:00Z"
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "reason": "Database connection failed"
}
```

---

## Rate Limiting

**Current Limits:** None (to be implemented in future phase)

**Planned Limits:**
- Production-wiring: 10 requests/minute per deploymentId
- Error-collection: 1 request/minute (external cron only)
- War-games: 5 requests/minute

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Human-readable error message",
  "details": "Technical details (optional)",
  "timestamp": "2026-07-16T10:31:00Z"
}
```

**HTTP Status Codes:**
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication failed
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily down

---

## Integration Examples

### EasyCron Integration
```bash
# Setup error collection cron
curl https://www.easycron.com/set/json \
  -d url="https://newspulse-ai-production.vercel.app/api/production-error-collection/cron" \
  -d cron="*/1 * * * *" \
  -d timezone="America/New_York"
```

### Manual Testing
```bash
# 1. Test error collection
curl -X POST https://newspulse-ai-production.vercel.app/api/production-error-collection/cron \
  -H "Authorization: Bearer $CRON_SECRET"

# 2. Submit error metrics
curl -X POST https://newspulse-ai-production.vercel.app/api/production-wiring \
  -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "deploymentId": "test-001",
    "errorMetrics": {"totalErrors": 5, "errorRate": 0.01},
    "errorPatterns": []
  }'

# 3. Check status
curl https://newspulse-ai-production.vercel.app/api/production-wiring?action=status \
  -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET"

# 4. Run war game
curl -X POST https://newspulse-ai-production.vercel.app/api/war-games \
  -H "Authorization: Bearer $PRODUCTION_WIRING_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"scenario": "Pool Exhaustion"}'
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07-16 | Initial production API specification with Bearer token auth |

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-16  
**Status:** Production Ready  
**Next Review:** 2026-08-16
