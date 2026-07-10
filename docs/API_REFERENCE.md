# API Reference

**Version:** 1.0  
**Base URL:** `https://newspulse-ai.vercel.app`  
**Authentication:** Supabase session (cookie-based)  

---

## Authentication

All endpoints require an active Supabase session. After signing in, the session is stored in cookies and automatically sent with requests.

**No API keys needed** — session-based auth is automatic.

---

## Endpoints

### User & Workspace

#### POST `/api/workspace`
**Purpose:** Create a new workspace and company profile  
**Authentication:** Required (must be signed in)  
**Rate Limit:** 10 req/min per IP  

**Request Body:**
```json
{
  "companyName": "Acme Corp",
  "country": "DE",
  "industry": "Technology",
  "legalName": "Acme Corporation GmbH",
  "employees": "50-100",
  "website": "https://acme.example.com",
  "description": "AI governance for enterprises"
}
```

**Required Fields:**
- `companyName` (string, 1-100 chars)
- `country` (string, 1-100 chars)
- `industry` (string, 1-100 chars)

**Optional Fields:**
- `legalName` (string, max 150 chars)
- `employees` (string, max 50 chars)
- `website` (string, valid URL, max 200 chars)
- `description` (string, max 500 chars)

**Response:**
```json
{
  "ok": true,
  "workspace": {
    "id": "ws_abc123",
    "slug": "acme-corp-12ab",
    "name": "Acme Corp"
  },
  "companyId": "co_xyz789"
}
```

**Status Codes:**
- `200` — Workspace created successfully
- `400` — Validation error (missing required field or format invalid)
- `401` — Authentication required (not signed in)
- `409` — Workspace already exists or RLS issue
- `429` — Rate limit exceeded
- `500` — Server error (check `/api/health`)

**Error Response:**
```json
{
  "ok": false,
  "error": "companyName must be at most 100 characters"
}
```

---

### AI Systems

#### GET `/api/ai-systems`
**Purpose:** List all AI systems in your workspace  
**Authentication:** Required  
**Rate Limit:** 30 req/min per IP  

**Response:**
```json
{
  "ok": true,
  "systems": [
    {
      "id": "sys_123",
      "name": "ChatGPT Integration",
      "description": "GPT-4 for customer support",
      "system_type": "large_language_model",
      "vendor": "OpenAI",
      "purpose": "Customer support automation",
      "status": "active",
      "created_at": "2026-07-10T12:00:00Z"
    }
  ]
}
```

**Status Codes:**
- `200` — Systems retrieved
- `401` — Not authenticated
- `409` — No workspace (must create workspace first)
- `500` — Server error

---

#### POST `/api/ai-systems`
**Purpose:** Add an AI system to your workspace  
**Authentication:** Required  
**Rate Limit:** 30 req/min per IP  

**Request Body:**
```json
{
  "name": "ChatGPT Integration",
  "description": "GPT-4 for customer support",
  "systemType": "large_language_model",
  "vendor": "OpenAI",
  "purpose": "Customer support automation",
  "status": "active"
}
```

**Required Fields:**
- `name` (string, 1-150 chars)

**Optional Fields:**
- `description` (string, max 500 chars)
- `systemType` (enum: "large_language_model", "generative_ai", "classification_system", "recommendation_system", "computer_vision", "biometric_system", "decision_support", "other")
- `vendor` (string, max 100 chars)
- `purpose` (string, max 300 chars)
- `status` (enum: "active", "pilot", "deprecated"; default: "active")

**Response:**
```json
{
  "ok": true,
  "system": {
    "id": "sys_456",
    "name": "ChatGPT Integration",
    "system_type": "large_language_model",
    "vendor": "OpenAI",
    "purpose": "Customer support automation",
    "status": "active",
    "created_at": "2026-07-10T12:30:00Z"
  }
}
```

**Status Codes:**
- `200` — System created
- `400` — Validation error
- `401` — Not authenticated
- `409` — No workspace
- `429` — Rate limit exceeded
- `500` — Server error

---

### Health & Monitoring

#### GET `/api/health`
**Purpose:** Check basic service health  
**Authentication:** Not required  
**Rate Limit:** None  

**Response:**
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2026-07-10T12:00:00Z",
  "uptime_s": 86400
}
```

**Use case:** Monitoring, health checks, CI/CD pipelines

---

#### GET `/api/production-health`
**Purpose:** Detailed production health check  
**Authentication:** Optional  
**Rate Limit:** None  

**Response:**
```json
{
  "ok": true,
  "timestamp": "2026-07-10T12:00:00Z",
  "checks": [
    {
      "name": "landing_page",
      "status": "healthy",
      "latencyMs": 145
    },
    {
      "name": "auth_flow",
      "status": "healthy",
      "latencyMs": 892
    },
    {
      "name": "dashboard",
      "status": "healthy",
      "latencyMs": 234
    }
  ],
  "summary": {
    "healthy": 3,
    "degraded": 0,
    "critical": 0
  }
}
```

**Use case:** Detailed monitoring, SLA tracking

---

#### GET `/api/verify-deployment`
**Purpose:** Verify latest code is deployed and live  
**Authentication:** Optional  
**Rate Limit:** None  

**Response:**
```json
{
  "ok": true,
  "status": "healthy",
  "alert": "✅ OK: Latest code deployed and live",
  "currentDeployment": {
    "commit": "abc123def456",
    "deployedAt": "2026-07-10T11:00:00Z",
    "isLive": true
  },
  "latestCommit": "abc123def456",
  "mismatch": false,
  "checkedAt": "2026-07-10T12:00:00Z"
}
```

**Use case:** Deployment verification, CI/CD pipelines, monitoring

---

#### GET `/api/error-rate`
**Purpose:** Get current error rate metrics  
**Authentication:** Optional  
**Rate Limit:** None  

**Response:**
```json
{
  "ok": true,
  "timestamp": "2026-07-10T12:00:00Z",
  "summary": {
    "totalErrors": 42,
    "errorRate": 0.5,
    "criticalEndpoints": ["/api/workspace", "/api/ai-systems"],
    "errorTrends": [0.4, 0.45, 0.5]
  }
}
```

**Use case:** Error tracking, SLA monitoring, incident response

---

#### GET `/api/alerts`
**Purpose:** Get active system alerts  
**Authentication:** Optional  
**Rate Limit:** None  

**Response:**
```json
{
  "ok": true,
  "timestamp": "2026-07-10T12:00:00Z",
  "alertCount": 2,
  "criticalCount": 0,
  "warningCount": 2,
  "alerts": [
    {
      "severity": "warning",
      "message": "High error rate detected (0.8%)",
      "discoveredAt": "2026-07-10T11:55:00Z"
    }
  ]
}
```

**Use case:** Alert hub, system status monitoring

---

#### GET `/api/blocking-conditions`
**Purpose:** Detect external blockers  
**Authentication:** Optional  
**Rate Limit:** None  

**Response (No blockers):**
```json
{
  "ok": true,
  "message": "No external blockers detected",
  "blockers": [],
  "checkedAt": "2026-07-10T12:00:00Z"
}
```

**Response (With blockers):**
```json
{
  "ok": true,
  "message": "External blockers detected",
  "blockers": [
    {
      "type": "github_actions",
      "severity": "high",
      "description": "No workflow runs in the last check",
      "recommendedAction": "Check GitHub status or enable Actions"
    }
  ],
  "checkedAt": "2026-07-10T12:00:00Z"
}
```

**Use case:** Deployment verification, external service monitoring

---

### Dashboard

#### GET `/api/dashboard`
**Purpose:** Get governance dashboard state  
**Authentication:** Required  
**Rate Limit:** None  

**Response:**
```json
{
  "ok": true,
  "launchReadiness": {
    "status": "ready",
    "completionPercent": 100
  },
  "missionProgress": {
    "phasesComplete": 2,
    "phasesTotal": 3
  },
  "health": {
    "status": "healthy",
    "issueCount": 0
  },
  "blockers": [],
  "timestamp": "2026-07-10T12:00:00Z"
}
```

**Use case:** Dashboard UI, status tracking

---

## Rate Limiting

**Per-endpoint limits:**
- POST `/api/workspace` — 10 req/min per IP
- GET/POST `/api/ai-systems` — 30 req/min per IP
- All other endpoints — No limit (monitored)

**Headers in response:**
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 1689014460
```

**When limit exceeded:**
```
Status: 429 Too Many Requests
{
  "ok": false,
  "error": "Rate limit exceeded"
}
```

---

## Error Handling

**Standard error response:**
```json
{
  "ok": false,
  "error": "Human-readable error message",
  "timestamp": "2026-07-10T12:00:00Z"
}
```

**Common errors:**

| Status | Error | Cause | Fix |
|--------|-------|-------|-----|
| 400 | Validation error | Invalid input | Check field lengths, formats, enums |
| 401 | Authentication required | Not signed in | Sign in first, then retry |
| 409 | No workspace | Workspace doesn't exist | Create workspace via POST /api/workspace |
| 429 | Rate limit exceeded | Too many requests | Wait before retrying |
| 500 | Server error | Backend issue | Check /api/health, retry later |
| 503 | Service unavailable | Supabase down | Check status.supabase.io |

---

## Caching

**Responses include Cache-Control headers:**

```
X-Cache-Control: no-store, private (for user data)
X-Cache-Control: public, max-age=60 (for monitoring data)
X-Cache-Control: public, max-age=300 (for dashboard)
```

**Browser caching:**
- User data (`/api/workspace`, `/api/ai-systems`) — Not cached
- Monitoring data (health, errors, alerts) — Cached 1-5 minutes
- Dashboard — Cached 5 minutes

---

## Examples

### Create Workspace (cURL)

```bash
curl -X POST https://newspulse-ai.vercel.app/api/workspace \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "My Company",
    "country": "US",
    "industry": "Technology",
    "website": "https://mycompany.com"
  }'
```

### Add AI System (cURL)

```bash
curl -X POST https://newspulse-ai.vercel.app/api/ai-systems \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4 Integration",
    "vendor": "OpenAI",
    "status": "active"
  }'
```

### Check Health (JavaScript)

```javascript
const response = await fetch('https://newspulse-ai.vercel.app/api/health');
const data = await response.json();

if (data.ok) {
  console.log('Service is healthy');
} else {
  console.error('Service is degraded');
}
```

---

## Changelog

### Version 1.0 (2026-07-10)
- Initial API release
- 7 endpoints (workspace, ai-systems, health, monitoring)
- Rate limiting enabled
- Input validation enforced
- Safe error handling

---

## Support

**Issues or questions?**
- Email: mininglife7@gmail.com
- Status page: Vercel dashboard → Deployments

**Common issues:**
- "Authentication required" → Sign in at app root
- "Rate limit exceeded" → Wait 60 seconds before retrying
- "Server error" → Check `/api/health` endpoint status

---

**Last Updated:** 2026-07-10  
**Next Review:** 2026-07-17 (post-launch)
