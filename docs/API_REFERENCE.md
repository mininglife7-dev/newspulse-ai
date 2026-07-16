# EURO AI Platform - API Reference

**Version**: 1.0.0  
**Base URL**: `https://newspulse-ai.vercel.app/api` (Production)  
**Authentication**: Supabase JWT Bearer Token  
**Content-Type**: `application/json`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Error Handling](#error-handling)
3. [Workspace APIs](#workspace-apis)
4. [AI System APIs](#ai-system-apis)
5. [Risk Assessment APIs](#risk-assessment-apis)
6. [Obligation APIs](#obligation-apis)
7. [Evidence APIs](#evidence-apis)
8. [Remediation APIs](#remediation-apis)
9. [Dashboard APIs](#dashboard-apis)
10. [Rate Limits & Quotas](#rate-limits--quotas)

---

## Authentication

All endpoints (except `/api/health`) require authentication.

### Header Format

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Getting a Token

```bash
# Via Supabase Auth UI (automatic in browser)
# Or via Supabase CLI
supabase auth -p your-password sign-in
```

### Request ID Tracking

Every response includes a request ID for tracing:

```
X-Request-ID: 1721129400000-a1b2c3d4e5
```

Use this ID to trace logs and debug issues.

---

## Error Handling

### Response Format

All error responses follow this format:

```json
{
  "ok": false,
  "error": "Descriptive error message",
  "requestId": "1721129400000-a1b2c3d4e5"
}
```

### Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success (GET) | Request completed successfully |
| 201 | Created (POST) | Resource created successfully |
| 400 | Bad Request | Missing required fields |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks workspace access |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Unexpected error |

### Retry Strategy

For 5xx errors, retry with exponential backoff:

```javascript
let retries = 0;
const maxRetries = 3;
const baseDelay = 1000; // 1 second

async function fetchWithRetry(url, options) {
  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status >= 500) {
        throw new Error('Server error');
      }
      return response;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, retries - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

---

## Workspace APIs

### List Workspaces

**GET** `/workspace/list`

List all workspaces the user has access to.

**Response:**
```json
{
  "ok": true,
  "workspaces": [
    {
      "id": "ws-123abc",
      "name": "ACME Corp",
      "description": "AI Governance",
      "owner_id": "user-456",
      "created_at": "2026-07-01T10:00:00Z"
    }
  ]
}
```

---

### Create Workspace

**POST** `/workspace/create`

**Request:**
```json
{
  "name": "Tech Startup Inc",
  "description": "EU AI Act compliance management"
}
```

**Response:**
```json
{
  "ok": true,
  "workspace": {
    "id": "ws-789def",
    "name": "Tech Startup Inc",
    "created_at": "2026-07-16T10:00:00Z"
  }
}
```

---

### Get Workspace Members

**GET** `/workspace/members?workspace_id=<id>`

**Response:**
```json
{
  "ok": true,
  "members": [
    {
      "id": "member-123",
      "user_id": "user-456",
      "workspace_id": "ws-789",
      "email": "alice@example.com",
      "role": "owner",
      "joined_at": "2026-07-01T10:00:00Z"
    }
  ]
}
```

---

### Invite Member

**POST** `/workspace/invite-member`

**Request:**
```json
{
  "workspace_id": "ws-789def",
  "email": "bob@example.com",
  "role": "admin"
}
```

**Roles:**
- `owner` - Full access, can delete workspace
- `admin` - Full access except workspace deletion
- `member` - Can create/modify content
- `viewer` - Read-only access

**Response:**
```json
{
  "ok": true,
  "invitation": {
    "id": "inv-123",
    "email": "bob@example.com",
    "role": "admin",
    "expires_at": "2026-07-23T10:00:00Z"
  }
}
```

---

## AI System APIs

### List AI Systems

**GET** `/ai-system/list?workspace_id=<id>`

**Response:**
```json
{
  "ok": true,
  "ai_systems": [
    {
      "id": "sys-123",
      "workspace_id": "ws-789",
      "name": "Content Recommendation Engine",
      "description": "Recommends articles to users",
      "category": "recommendation",
      "risk_level": "high",
      "status": "production",
      "created_at": "2026-07-01T10:00:00Z"
    }
  ]
}
```

---

### Create AI System

**POST** `/ai-system/create`

**Request:**
```json
{
  "workspace_id": "ws-789def",
  "name": "Customer Support Chatbot",
  "description": "Answers customer questions automatically",
  "category": "large_language_model",
  "risk_level": "high",
  "status": "pilot"
}
```

**Categories:**
- `large_language_model` - LLMs (GPT, Claude, etc.)
- `computer_vision` - Image/video analysis
- `recommendation` - Recommendation systems
- `autonomous` - Autonomous agents
- `biometric` - Biometric systems
- `other` - Other AI systems

**Response:**
```json
{
  "ok": true,
  "ai_system": {
    "id": "sys-456",
    "name": "Customer Support Chatbot",
    "created_at": "2026-07-16T10:00:00Z"
  }
}
```

---

## Risk Assessment APIs

### Create Risk Assessment

**POST** `/risk-assessment/create`

Assess an AI system for compliance risks.

**Request:**
```json
{
  "workspace_id": "ws-789def",
  "ai_system_id": "sys-456",
  "assessment_type": "high_risk",
  "responses": [
    {
      "question_id": "q1",
      "answer": true,
      "notes": "System uses facial recognition"
    },
    {
      "question_id": "q2",
      "answer": false,
      "notes": "No biometric data used"
    }
  ]
}
```

**Assessment Types:**
- `prohibited` - Violates EU AI Act Article 5
- `high_risk` - Requires extensive documentation
- `general` - Standard compliance requirements

**Response:**
```json
{
  "ok": true,
  "assessment": {
    "id": "assess-789",
    "ai_system_id": "sys-456",
    "assessment_type": "high_risk",
    "risk_score": 67,
    "risk_level": "high",
    "status": "completed",
    "created_at": "2026-07-16T10:00:00Z"
  }
}
```

**Risk Score Calculation:**
- Formula: `(affirmativeAnswers / totalQuestions) * 100`
- Range: 0-100
- Score >= 70 triggers additional obligations

---

### List Risk Assessments

**GET** `/risk-assessment/list?workspace_id=<id>&ai_system_id=<id>`

**Response:**
```json
{
  "ok": true,
  "assessments": [
    {
      "id": "assess-789",
      "ai_system_id": "sys-456",
      "assessment_type": "high_risk",
      "risk_score": 67,
      "created_at": "2026-07-16T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

## Obligation APIs

### Identify Obligations

**POST** `/obligations/identify`

Automatically generate obligations based on risk assessment.

**Request:**
```json
{
  "workspace_id": "ws-789def",
  "ai_system_id": "sys-456",
  "risk_assessment_id": "assess-789",
  "assessment_type": "high_risk",
  "risk_score": 67
}
```

**Response:**
```json
{
  "ok": true,
  "obligations_identified": 3,
  "obligations": [
    {
      "id": "obl-123",
      "category": "documentation",
      "title": "High-Risk AI System Documentation",
      "description": "Comprehensive documentation required including training data, testing procedures...",
      "priority": "high",
      "deadline_days": 90,
      "status": "identified",
      "source": "EU_AI_ACT",
      "created_at": "2026-07-16T10:00:00Z"
    }
  ]
}
```

---

### List Obligations

**GET** `/obligations/list?workspace_id=<id>&ai_system_id=<id>`

**Query Parameters:**
- `workspace_id` (required): Workspace ID
- `ai_system_id` (optional): Filter by AI system

**Response:**
```json
{
  "ok": true,
  "obligations": [
    {
      "id": "obl-123",
      "ai_system_id": "sys-456",
      "category": "documentation",
      "title": "High-Risk AI System Documentation",
      "priority": "high",
      "deadline_days": 90,
      "status": "identified"
    }
  ],
  "count": 1
}
```

---

## Evidence APIs

### Submit Evidence

**POST** `/evidence/create`

Submit evidence for compliance obligations.

**Request:**
```json
{
  "workspace_id": "ws-789def",
  "obligation_id": "obl-123",
  "evidence_type": "file",
  "category": "documentation",
  "description": "Testing procedures document",
  "file_url": "https://storage.example.com/testing-procedures.pdf",
  "tags": ["testing", "verification"]
}
```

**Evidence Types:**
- `file` - PDF, document, spreadsheet
- `url` - Link to external resource
- `note` - Text notes
- `attestation` - Formal statement/certification

**Categories:**
- `documentation` - Technical documentation
- `testing` - Test results and procedures
- `verification` - Third-party verification
- `training` - Training materials
- `governance` - Governance procedures
- `monitoring` - Monitoring reports
- `incident_response` - Incident handling
- `other` - Other evidence

**Response:**
```json
{
  "ok": true,
  "evidence": {
    "id": "evid-123",
    "obligation_id": "obl-123",
    "evidence_type": "file",
    "category": "documentation",
    "status": "submitted",
    "created_at": "2026-07-16T10:00:00Z"
  }
}
```

---

### List Evidence

**GET** `/evidence/list?workspace_id=<id>&obligation_id=<id>`

**Response:**
```json
{
  "ok": true,
  "evidence": [
    {
      "id": "evid-123",
      "obligation_id": "obl-123",
      "evidence_type": "file",
      "category": "documentation",
      "description": "Testing procedures document",
      "status": "submitted",
      "created_at": "2026-07-16T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

## Remediation APIs

### Create Remediation

**POST** `/remediation/create`

Create a remediation plan for an obligation.

**Request:**
```json
{
  "workspace_id": "ws-789def",
  "obligation_id": "obl-123",
  "title": "Complete AI System Documentation",
  "description": "Prepare comprehensive documentation for high-risk AI system",
  "priority": "high",
  "deadline_date": "2026-10-16",
  "assigned_to": "user-456"
}
```

**Priorities:**
- `critical` - Address immediately
- `high` - Address within 2 weeks
- `medium` - Address within 1 month
- `low` - Address when possible

**Response:**
```json
{
  "ok": true,
  "remediation": {
    "id": "rem-123",
    "obligation_id": "obl-123",
    "title": "Complete AI System Documentation",
    "priority": "high",
    "status": "in_progress",
    "deadline_date": "2026-10-16",
    "created_at": "2026-07-16T10:00:00Z"
  }
}
```

---

### List Remediations

**GET** `/remediation/list?workspace_id=<id>&status=<status>`

**Status Filter:**
- `in_progress` - Active remediations
- `completed` - Finished remediations
- `blocked` - Blocked/on-hold

**Response:**
```json
{
  "ok": true,
  "remediations": [
    {
      "id": "rem-123",
      "obligation_id": "obl-123",
      "title": "Complete AI System Documentation",
      "status": "in_progress",
      "priority": "high",
      "deadline_date": "2026-10-16"
    }
  ],
  "count": 1
}
```

---

### Update Remediation

**PUT** `/remediation/update`

Update remediation status or details.

**Request:**
```json
{
  "id": "rem-123",
  "workspace_id": "ws-789def",
  "status": "completed",
  "progress_percentage": 100,
  "notes": "Documentation completed and reviewed"
}
```

**Response:**
```json
{
  "ok": true,
  "remediation": {
    "id": "rem-123",
    "status": "completed",
    "progress_percentage": 100,
    "updated_at": "2026-07-16T14:00:00Z"
  }
}
```

---

## Dashboard APIs

### Compliance Summary

**GET** `/dashboard/compliance-summary?workspace_id=<id>`

Get overview of compliance status.

**Response:**
```json
{
  "ok": true,
  "summary": {
    "total_ai_systems": 5,
    "assessed_systems": 3,
    "total_obligations": 12,
    "obligations_completed": 4,
    "completion_percentage": 33,
    "high_risk_systems": 2,
    "critical_obligations": 1
  }
}
```

---

### Risk Heatmap

**GET** `/dashboard/risk-heatmap?workspace_id=<id>`

Get risk distribution across systems.

**Response:**
```json
{
  "ok": true,
  "heatmap": {
    "prohibited": 0,
    "high_risk": 2,
    "medium_risk": 1,
    "low_risk": 2,
    "unassessed": 0
  }
}
```

---

## Health Check

### System Status

**GET** `/health`

Check if system is operational (no auth required).

**Response:**
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2026-07-16T10:00:00Z",
  "uptime_s": 3600,
  "checks": {
    "supabase_url": true,
    "supabase_anon": true,
    "supabase_service": true
  }
}
```

---

## Rate Limits & Quotas

### Rate Limiting

Requests are rate-limited by endpoint type:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Read operations | 100 req/min | Per user |
| Write operations | 30 req/min | Per user |
| Auth operations | 5 attempts | Per 15 min |
| Resource-intensive | 10 req/min | Per workspace |

### Quota Headers

Every response includes quota information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1721129460
```

### Rate Limit Response

When limit exceeded:

```json
{
  "ok": false,
  "error": "Too many requests. Please try again later.",
  "statusCode": 429,
  "retryAfter": 45
}
```

**Response Header:**
```
Retry-After: 45
```

---

## SDK Example (JavaScript)

```javascript
class EUROAIClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!data.ok && response.status >= 500) {
      throw new Error(`Server error: ${data.error} (${data.requestId})`);
    }

    return data;
  }

  async createAssessment(workspaceId, aiSystemId, responses) {
    return this.request('/risk-assessment/create', {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: workspaceId,
        ai_system_id: aiSystemId,
        assessment_type: 'high_risk',
        responses,
      }),
    });
  }

  async listObligations(workspaceId) {
    return this.request(`/obligations/list?workspace_id=${workspaceId}`);
  }
}

// Usage
const client = new EUROAIClient(
  'https://newspulse-ai.vercel.app/api',
  'your-jwt-token'
);

const assessment = await client.createAssessment(
  'ws-789',
  'sys-456',
  [{ question_id: 'q1', answer: true }]
);
```

---

## Webhook Events (Future)

Planned webhook events for Phase 4:

- `obligation.created` - New obligation identified
- `evidence.submitted` - Evidence uploaded
- `remediation.completed` - Remediation finished
- `deadline.approaching` - Obligation deadline in 7 days
- `assessment.completed` - Risk assessment finished

---

## Support

- **API Issues**: Check `/docs/MONITORING_SETUP.md` for debugging
- **Rate Limits**: See section above for handling
- **Authentication**: Verify token hasn't expired
- **Errors**: Use `requestId` from response to trace logs

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-07-16  
**API Version**: 1.0.0  
**Status**: Production-Ready
