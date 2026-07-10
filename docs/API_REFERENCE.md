# EURO AI Compliance Platform — API Reference

## Authentication

All endpoints require Supabase session authentication via HTTP-only cookie.

```javascript
// Cookie automatically set by Supabase Auth
// Include credentials in fetch:
fetch('/api/obligations', {
  credentials: 'include'
})
```

**Error Response (Unauthenticated):**
```json
{ "ok": false, "error": "Authentication required" }
```
Status: 401

---

## Workspace Management

### GET /api/workspace
Fetch current user's workspace.

**Response:**
```json
{
  "ok": true,
  "workspace": {
    "id": "ws_123",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "industry": "software",
    "employees_range": "50-100",
    "created_at": "2026-07-10T12:00:00Z",
    "members": [
      {
        "user_id": "usr_001",
        "email": "alice@acme.com",
        "first_name": "Alice",
        "last_name": "Smith",
        "status": "active"
      }
    ]
  }
}
```

### GET /api/workspace/members
List active workspace members.

**Response:**
```json
{
  "ok": true,
  "members": [
    {
      "user_id": "usr_001",
      "email": "alice@acme.com",
      "first_name": "Alice",
      "last_name": "Smith"
    }
  ]
}
```

---

## AI Systems (Inventory)

### POST /api/ai-systems
Create new AI system.

**Request:**
```json
{
  "name": "Customer Support Chatbot",
  "system_type": "large_language_model",
  "vendor": "OpenAI",
  "purpose": "Automated customer support via web chat",
  "status": "active"
}
```

**Response:**
```json
{
  "ok": true,
  "system": {
    "id": "sys_456",
    "name": "Customer Support Chatbot",
    "status": "active",
    "created_at": "2026-07-10T13:00:00Z"
  }
}
```

### GET /api/ai-systems
List all AI systems in workspace.

**Query Params:**
- `ai_system_id` (optional): Fetch specific system

**Response:**
```json
{
  "ok": true,
  "systems": [
    {
      "id": "sys_456",
      "name": "Customer Support Chatbot",
      "description": "...",
      "system_type": "large_language_model",
      "vendor": "OpenAI",
      "purpose": "...",
      "status": "active",
      "created_at": "2026-07-10T13:00:00Z"
    }
  ]
}
```

---

## Risk Assessment

### POST /api/risk-assessments
Create or update risk assessment.

**Request:**
```json
{
  "ai_system_id": "sys_456",
  "responses": [
    { "question_id": "q_subliminal_check", "answer": "no" },
    { "question_id": "q_employment_decisions", "answer": "yes" },
    { "question_id": "q_data_classification_level", "answer": 3 }
  ],
  "status": "draft"
}
```

**Response:**
```json
{
  "ok": true,
  "assessment": {
    "id": "assess_789",
    "ai_system_id": "sys_456",
    "risk_score": 45,
    "risk_level": "medium",
    "status": "draft",
    "assessment_data": { "responses": [...] },
    "created_at": "2026-07-10T14:00:00Z",
    "updated_at": "2026-07-10T14:05:00Z"
  }
}
```

### PATCH /api/risk-assessments/:id
Update assessment responses.

**Request:**
```json
{
  "responses": [
    { "question_id": "q_subliminal_check", "answer": "no" }
  ],
  "status": "finalized"
}
```

### GET /api/risk-assessments
Fetch assessment(s).

**Query Params:**
- `ai_system_id`: List assessments for system
- `assessment_id`: Fetch specific assessment
- `comparison=true`: Include progress comparison

---

## Compliance Obligations

### GET /api/obligations
List obligations.

**Query Params:**
- `status`: Filter by status (identified, in_progress, completed, not_applicable)
- `priority`: Filter by priority (critical, high, medium, low)

**Response:**
```json
{
  "ok": true,
  "obligations": [
    {
      "id": "obl_001",
      "title": "Implement subliminal influence detection",
      "description": "Add safeguards...",
      "status": "in_progress",
      "priority": "critical",
      "due_date": "2026-08-10",
      "owner_id": "usr_001",
      "owner": {
        "email": "alice@acme.com",
        "first_name": "Alice"
      },
      "assigned_at": "2026-07-10T14:00:00Z",
      "created_at": "2026-07-10T14:00:00Z"
    }
  ]
}
```

### PATCH /api/obligations/:id
Update obligation.

**Request:**
```json
{
  "status": "completed",
  "priority": "critical",
  "owner_id": "usr_001"
}
```

### POST /api/obligations
Create obligations (usually called by assessment → remediation).

**Request:**
```json
{
  "ai_system_id": "sys_456",
  "assessment_id": "assess_789",
  "obligations": [
    {
      "title": "Implement safeguards",
      "description": "...",
      "priority": "critical",
      "due_date": "2026-08-10"
    }
  ]
}
```

---

## Bulk Import

### POST /api/obligations/bulk-import
Update multiple obligations from CSV.

**Request:**
```
Content-Type: multipart/form-data

file: [CSV file]
```

**CSV Format:**
```
obligation_id,status,priority
obl_001,completed,critical
obl_002,in_progress,high
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "total_rows": 2,
    "successful": 1,
    "failed": 1,
    "errors": [
      {
        "row": 3,
        "obligation_id": "obl_002",
        "error": "Invalid priority 'urgent'. Must be one of: critical, high, medium, low"
      }
    ]
  },
  "message": "Successfully imported 1 of 2 obligations"
}
```

---

## Compliance Recommendations

### GET /api/recommendations
Get recommendations for AI system.

**Query Params:**
- `ai_system_id`: Required

**Response:**
```json
{
  "ok": true,
  "recommendations": [
    {
      "id": "rec_001",
      "title": "Implement subliminal influence detection",
      "description": "Add safeguards...",
      "priority": "critical",
      "effort": "weeks",
      "category": "Prohibited Practices",
      "rationale": "EU AI Act Article 5 prohibits subliminal manipulation"
    }
  ],
  "byCategory": {
    "Prohibited Practices": [...],
    "High-Risk Systems": [...]
  },
  "summary": "5 critical, 8 high, 3 medium, 2 low recommendations",
  "timeline": "~4-6 weeks for comprehensive remediation",
  "riskScore": 65
}
```

---

## Evidence Upload

### POST /api/evidence
Upload evidence file for obligation.

**Request:**
```
Content-Type: multipart/form-data

obligation_id: obl_001
file: [document.pdf]
notes: "Proof of implementation complete"
```

**Response:**
```json
{
  "ok": true,
  "evidence": {
    "id": "ev_999",
    "obligation_id": "obl_001",
    "file_name": "document.pdf",
    "file_size": 2048000,
    "file_type": "application/pdf",
    "storage_path": "obligations/obl_001/document.pdf",
    "uploaded_by_name": "Alice Smith",
    "uploaded_at": "2026-07-10T15:00:00Z",
    "notes": "Proof of implementation complete"
  }
}
```

### GET /api/evidence
List evidence for obligation.

**Query Params:**
- `obligation_id`: Required

**Response:**
```json
{
  "ok": true,
  "evidence": [
    {
      "id": "ev_999",
      "file_name": "document.pdf",
      "file_size": 2048000,
      "uploaded_by_name": "Alice Smith",
      "uploaded_at": "2026-07-10T15:00:00Z"
    }
  ]
}
```

### DELETE /api/evidence
Remove evidence.

**Query Params:**
- `evidence_id`: Required

---

## Reports

### GET /api/reports/compliance-pdf
Generate compliance report PDF.

**Query Params:**
- None (uses all data for workspace)

**Response:**
- Content-Type: application/pdf
- File download

---

## Assessment History & Progress

### GET /api/assessment-history
Fetch assessment timeline.

**Query Params:**
- `ai_system_id`: Required
- `comparison=true`: Include progress metrics

**Response:**
```json
{
  "ok": true,
  "timeline": [
    {
      "version": 1,
      "risk_score": 75,
      "risk_level": "high",
      "created_at": "2026-06-10T10:00:00Z"
    },
    {
      "version": 2,
      "risk_score": 60,
      "risk_level": "medium",
      "created_at": "2026-07-10T14:00:00Z"
    }
  ],
  "comparison": {
    "current_version": 2,
    "current_score": 60,
    "previous_version": 1,
    "previous_score": 75,
    "improvement": {
      "improved": true,
      "score_change": -15,
      "percent_change": 20,
      "improvement_category": "significant"
    }
  }
}
```

---

## Health & Status

### GET /api/health
System health check.

**Response:**
```json
{
  "ok": true,
  "status": "operational",
  "database": "connected",
  "timestamp": "2026-07-10T16:00:00Z"
}
```

---

## Error Handling

All endpoints return consistent error structure:

```json
{
  "ok": false,
  "error": "Human-readable error message"
}
```

**Common Status Codes:**
- `200` — Success
- `400` — Bad request (validation error)
- `401` — Unauthorized (not authenticated)
- `403` — Forbidden (no access to resource)
- `404` — Not found
- `409` — Conflict (e.g., no workspace setup)
- `500` — Server error

---

## Rate Limiting

- No explicit rate limiting (Vercel default limits apply)
- Bulk import: Max 10,000 rows per request
- File upload: Max 10 MB per file
- CSV: Max 10 MB per file

---

## Data Validation

### Status Values
- `identified` — Not yet started
- `in_progress` — Currently being worked on
- `completed` — Finished
- `not_applicable` — Not required for this system

### Priority Values
- `critical` — Must complete within 2 weeks
- `high` — Should complete within 4 weeks
- `medium` — Complete within 8 weeks
- `low` — Nice to have

### Risk Levels
- `low` — Score 0-30
- `medium` — Score 31-60
- `high` — Score 61-80
- `unacceptable` — Score 81-100

---

## Idempotency

- Assessment creation: Idempotent (same input = same assessment)
- Obligation updates: Idempotent (same update = same result)
- Bulk import: Idempotent (same CSV = same result)
- Evidence: Files deduplicated by content hash

---

## Pagination

Most list endpoints support pagination:

**Query Params:**
- `page`: Page number (default 1)
- `limit`: Results per page (default 20, max 100)

**Response Includes:**
```json
{
  "ok": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```
