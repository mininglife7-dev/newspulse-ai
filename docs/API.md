# EURO AI Platform API Documentation

Complete REST API for multi-tenant AI Governance Compliance Platform.

## Base URL

```
https://newspulse-ai.vercel.app/api
```

## Authentication

All endpoints require Supabase authentication. Include the user's session token in the Authorization header:

```
Authorization: Bearer <supabase_session_token>
```

## Multi-Tenant Architecture

All endpoints enforce workspace isolation. Users can only access data within workspaces they are members of. Verify your workspace membership before making requests.

---

## Workspace Management

### Create Workspace

```
POST /workspace/create
Content-Type: application/json
```

**Request:**
```json
{
  "workspace_id": "uuid",
  "companyName": "string",
  "legalName": "string",
  "country": "string",
  "industry": "string"
}
```

**Response (201):**
```json
{
  "ok": true,
  "workspace": {
    "id": "uuid",
    "name": "string",
    "created_at": "2026-07-15T14:55:28Z"
  }
}
```

### List Workspaces

```
GET /workspace/list
```

**Response:**
```json
{
  "ok": true,
  "workspaces": [
    {
      "id": "uuid",
      "name": "string",
      "legal_name": "string",
      "country": "string",
      "industry": "string",
      "created_at": "2026-07-15T14:55:28Z"
    }
  ],
  "count": 5
}
```

### List Workspace Members

```
GET /workspace/members?workspace_id=<uuid>
```

**Response:**
```json
{
  "ok": true,
  "members": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "owner|admin|member|viewer",
      "status": "active|invited|removed",
      "created_at": "2026-07-15T14:55:28Z"
    }
  ],
  "by_role": {
    "owner": [...],
    "admin": [...],
    "member": [...],
    "viewer": [...]
  },
  "total_count": 10
}
```

### Invite Member

```
POST /workspace/invite-member
Content-Type: application/json
```

**Request:**
```json
{
  "workspace_id": "uuid",
  "email": "user@example.com",
  "role": "owner|admin|member|viewer"
}
```

**Response (201):**
```json
{
  "ok": true,
  "invitation": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "member",
    "status": "invited",
    "created_at": "2026-07-15T14:55:28Z"
  }
}
```

### Update Member Role

```
PUT /workspace/update-member
Content-Type: application/json
```

**Request:**
```json
{
  "workspace_id": "uuid",
  "member_id": "uuid",
  "role": "owner|admin|member|viewer"
}
```

**Response:**
```json
{
  "ok": true,
  "member": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin",
    "updated_at": "2026-07-15T14:55:28Z"
  }
}
```

---

## AI System Management

### Create AI System

```
POST /ai-system/create
Content-Type: application/json
```

**Request:**
```json
{
  "workspace_id": "uuid",
  "name": "string",
  "category": "large_language_model|computer_vision|recommendation|autonomous|biometric|other",
  "description": "string (optional)",
  "status": "in_development|pilot|production|deprecated (optional, default: in_development)",
  "risk_level": "low|medium|high (optional, default: medium)"
}
```

**Response (201):**
```json
{
  "ok": true,
  "ai_system": {
    "id": "uuid",
    "name": "string",
    "category": "large_language_model",
    "status": "in_development",
    "risk_level": "medium",
    "created_at": "2026-07-15T14:55:28Z"
  }
}
```

### List AI Systems

```
GET /ai-system/list?workspace_id=<uuid>
```

**Response:**
```json
{
  "ok": true,
  "systems": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "category": "large_language_model",
      "status": "in_development",
      "risk_level": "medium",
      "created_at": "2026-07-15T14:55:28Z",
      "created_by": "uuid"
    }
  ],
  "count": 3
}
```

### Update AI System

```
PUT /ai-system/update
Content-Type: application/json
```

**Request:**
```json
{
  "workspace_id": "uuid",
  "id": "uuid",
  "name": "string (optional)",
  "description": "string (optional)",
  "category": "string (optional)",
  "status": "string (optional)",
  "risk_level": "string (optional)"
}
```

**Response:**
```json
{
  "ok": true,
  "ai_system": {
    "id": "uuid",
    "name": "Updated Name",
    "updated_at": "2026-07-15T14:55:28Z"
  }
}
```

### Delete AI System

```
DELETE /ai-system/delete
Content-Type: application/json
```

**Request:**
```json
{
  "workspace_id": "uuid",
  "id": "uuid"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "AI system deleted successfully"
}
```

---

## Risk Assessment

### Create Risk Assessment

```
POST /risk-assessment/create
Content-Type: application/json
```

**Request:**
```json
{
  "workspace_id": "uuid",
  "ai_system_id": "uuid",
  "assessment_type": "prohibited|high_risk|general",
  "responses": [
    {
      "question_id": "string",
      "answer": true,
      "notes": "string (optional)"
    }
  ]
}
```

Risk score is automatically calculated as: `(affirmativeAnswers / totalQuestions) * 100`

**Response (201):**
```json
{
  "ok": true,
  "assessment": {
    "id": "uuid",
    "ai_system_id": "uuid",
    "assessment_type": "high_risk",
    "risk_score": 65,
    "status": "completed",
    "created_at": "2026-07-15T14:55:28Z"
  }
}
```

### List Risk Assessments

```
GET /risk-assessment/list?workspace_id=<uuid>&ai_system_id=<uuid (optional)>
```

**Response:**
```json
{
  "ok": true,
  "assessments": [
    {
      "id": "uuid",
      "ai_system_id": "uuid",
      "assessment_type": "high_risk",
      "risk_score": 65,
      "status": "completed",
      "created_at": "2026-07-15T14:55:28Z",
      "created_by": "uuid"
    }
  ],
  "count": 2
}
```

---

## Obligations

### Identify Obligations (Auto-generated)

```
POST /obligations/identify
Content-Type: application/json
```

Automatically creates compliance obligations based on risk assessment results.

**Request:**
```json
{
  "workspace_id": "uuid",
  "ai_system_id": "uuid",
  "risk_assessment_id": "uuid (optional)",
  "assessment_type": "prohibited|high_risk|general",
  "risk_score": 65
}
```

**Logic:**
- **Prohibited**: 1 critical obligation (30 days)
- **High-Risk**: 1 high-priority obligation (90 days) + monitoring/oversight if score ≥ 70
- **General**: 1 medium-priority transparency obligation (180 days)

**Response (201):**
```json
{
  "ok": true,
  "obligations_identified": 1,
  "obligations": [
    {
      "id": "uuid",
      "ai_system_id": "uuid",
      "category": "documentation",
      "title": "High-Risk AI System Documentation",
      "description": "...",
      "priority": "high",
      "status": "identified",
      "deadline_days": 90,
      "created_at": "2026-07-15T14:55:28Z"
    }
  ]
}
```

---

## Evidence Collection

### Create Evidence

```
POST /evidence/create
Content-Type: application/json
```

**Request:**
```json
{
  "workspace_id": "uuid",
  "title": "string",
  "category": "documentation|testing|audit|policy|training|other",
  "evidence_type": "file|url|note|attestation",
  "obligation_id": "uuid (optional)",
  "ai_system_id": "uuid (optional)",
  "description": "string (optional)",
  "file_url": "string (optional, for type='file')",
  "external_url": "string (optional, for type='url')",
  "content": "string (optional, for type='note')",
  "tags": ["string"] (optional)
}
```

**Response (201):**
```json
{
  "ok": true,
  "evidence": {
    "id": "uuid",
    "title": "string",
    "category": "documentation",
    "status": "submitted",
    "created_at": "2026-07-15T14:55:28Z"
  }
}
```

### List Evidence

```
GET /evidence/list?workspace_id=<uuid>&ai_system_id=<uuid (optional)>&obligation_id=<uuid (optional)>
```

**Response:**
```json
{
  "ok": true,
  "evidence": [
    {
      "id": "uuid",
      "title": "string",
      "category": "documentation",
      "evidence_type": "file",
      "status": "submitted",
      "obligation_id": "uuid",
      "ai_system_id": "uuid",
      "created_at": "2026-07-15T14:55:28Z"
    }
  ],
  "count": 5
}
```

### Update Evidence

```
PUT /evidence/update
Content-Type: application/json
```

**Request:**
```json
{
  "workspace_id": "uuid",
  "id": "uuid",
  "description": "string (optional)",
  "obligation_id": "uuid|null (optional)",
  "tags": ["string"] (optional)",
  "status": "submitted|reviewing|approved|rejected (optional)"
}
```

**Response:**
```json
{
  "ok": true,
  "evidence": {
    "id": "uuid",
    "title": "string",
    "status": "approved",
    "updated_at": "2026-07-15T14:55:28Z"
  }
}
```

---

## Remediation Tracking

### Create Remediation Action

```
POST /remediation/create
Content-Type: application/json
```

**Request:**
```json
{
  "workspace_id": "uuid",
  "obligation_id": "uuid",
  "title": "string",
  "description": "string (optional)",
  "assigned_to": "uuid (optional)",
  "priority": "low|medium|high|critical",
  "target_completion_date": "2026-09-15"
}
```

**Response (201):**
```json
{
  "ok": true,
  "remediation": {
    "id": "uuid",
    "obligation_id": "uuid",
    "title": "string",
    "priority": "high",
    "status": "open",
    "target_completion_date": "2026-09-15",
    "created_at": "2026-07-15T14:55:28Z"
  }
}
```

### List Remediations

```
GET /remediation/list?workspace_id=<uuid>&obligation_id=<uuid (optional)>&status=<status (optional)>
```

Status filters: `open`, `in_progress`, `completed`, `blocked`

**Response:**
```json
{
  "ok": true,
  "remediations": [
    {
      "id": "uuid",
      "obligation_id": "uuid",
      "title": "string",
      "priority": "high",
      "status": "open",
      "target_completion_date": "2026-09-15",
      "completed_date": null,
      "created_at": "2026-07-15T14:55:28Z"
    }
  ],
  "count": 3
}
```

### Update Remediation

```
PUT /remediation/update
Content-Type: application/json
```

**Request:**
```json
{
  "workspace_id": "uuid",
  "id": "uuid",
  "description": "string (optional)",
  "assigned_to": "uuid|null (optional)",
  "priority": "string (optional)",
  "status": "open|in_progress|completed|blocked (optional)",
  "target_completion_date": "2026-09-15 (optional)",
  "completed_date": "2026-08-15|null (optional)"
}
```

**Response:**
```json
{
  "ok": true,
  "remediation": {
    "id": "uuid",
    "status": "completed",
    "completed_date": "2026-08-15",
    "updated_at": "2026-07-15T14:55:28Z"
  }
}
```

---

## Dashboard & Analytics

### Compliance Summary

```
GET /dashboard/compliance-summary?workspace_id=<uuid>
```

**Response:**
```json
{
  "ok": true,
  "summary": {
    "workspace_id": "uuid",
    "ai_systems": {
      "total": 3,
      "by_risk": {
        "high": 1,
        "medium": 1,
        "low": 1
      }
    },
    "obligations": {
      "total": 5,
      "by_priority": {
        "critical": 1,
        "high": 2,
        "medium": 2,
        "low": 0
      },
      "by_status": {
        "identified": 3,
        "in_progress": 1,
        "completed": 1
      }
    },
    "remediations": {
      "total": 4,
      "by_status": {
        "open": 2,
        "in_progress": 1,
        "completed": 1,
        "blocked": 0
      }
    },
    "evidence": {
      "total": 8,
      "approved": 5,
      "approval_rate": 62
    },
    "compliance_metrics": {
      "overall_compliance_score": 60,
      "obligations_completed": 1,
      "obligations_total": 5
    }
  }
}
```

### Risk Heatmap

```
GET /dashboard/risk-heatmap?workspace_id=<uuid>
```

Prioritizes AI systems by compliance urgency (critical obligations + high risk scores).

**Response:**
```json
{
  "ok": true,
  "heatmap": [
    {
      "ai_system_id": "uuid",
      "ai_system_name": "string",
      "risk_level": "high",
      "latest_risk_score": 75,
      "obligations_total": 3,
      "obligations_incomplete": 2,
      "critical_obligations": 1,
      "compliance_urgency": "critical"
    }
  ],
  "summary": {
    "total_systems": 3,
    "critical_systems": 1,
    "high_risk_systems": 1
  }
}
```

---

## Audit & Compliance

### Log Audit Event

```
POST /audit/log-event
Content-Type: application/json
```

**Request:**
```json
{
  "workspace_id": "uuid",
  "event_type": "string",
  "entity_type": "ai_system|obligation|evidence|remediation|workspace|member",
  "entity_id": "uuid",
  "action": "created|updated|deleted|reviewed|approved|rejected",
  "description": "string (optional)",
  "metadata": { "key": "value" } (optional)
}
```

**Response (201):**
```json
{
  "ok": true,
  "audit_log": {
    "id": "uuid",
    "event_type": "string",
    "action": "created",
    "created_at": "2026-07-15T14:55:28Z"
  }
}
```

### List Audit Events

```
GET /audit/list-events?workspace_id=<uuid>&entity_type=<type (optional)>&entity_id=<id (optional)>&action=<action (optional)>&limit=100
```

**Response:**
```json
{
  "ok": true,
  "audit_logs": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "event_type": "string",
      "entity_type": "ai_system",
      "entity_id": "uuid",
      "action": "created",
      "description": "string",
      "metadata": {},
      "created_at": "2026-07-15T14:55:28Z"
    }
  ],
  "count": 25
}
```

---

## Regulatory Monitoring

### Check Regulatory Updates

```
GET /regulatory/check-updates?workspace_id=<uuid>&jurisdiction=<jurisdiction (optional)>
```

Automatically uses workspace country if jurisdiction not provided.

**Response:**
```json
{
  "ok": true,
  "updates": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "jurisdiction": "EU",
      "regulation_type": "AI_ACT",
      "effective_date": "2026-09-01",
      "impact_level": "critical",
      "status": "active"
    }
  ],
  "by_impact": {
    "critical": [{ ... }],
    "high": [{ ... }],
    "medium": [{ ... }],
    "low": [{ ... }]
  },
  "critical_count": 2,
  "total_count": 8
}
```

### Mark Regulatory Update as Reviewed

```
POST /regulatory/mark-reviewed
Content-Type: application/json
```

**Request:**
```json
{
  "workspace_id": "uuid",
  "update_id": "uuid",
  "notes": "string (optional)"
}
```

**Response (201):**
```json
{
  "ok": true,
  "review": {
    "id": "uuid",
    "update_id": "uuid",
    "reviewed_at": "2026-07-15T14:55:28Z"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "ok": false,
  "error": "Human-readable error message"
}
```

### Status Codes

- `200` - Success (GET, PUT)
- `201` - Created (POST)
- `400` - Bad Request (missing/invalid fields)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (no workspace access)
- `404` - Not Found (resource not found)
- `409` - Conflict (duplicate/already exists)
- `500` - Server Error (unhandled exception)

---

## Rate Limiting

No rate limits are currently enforced, but that may change. Implement exponential backoff for production resilience.

---

## Changelog

**v1.0** - Initial release with complete compliance workflow APIs
