# API Reference

**Type**: Reference  
**Audience**: Backend Engineers, Frontend Engineers, API Consumers  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Owner**: Governor Ω

---

## Quick Reference

REST API endpoints for EURO AI platform. All endpoints require authentication (JWT token in Authorization header). Responses use standard HTTP status codes and JSON format.

**Base URL**: `https://newspulse-ai.vercel.app/api`  
**Auth**: Bearer token in `Authorization: Bearer <JWT>`  
**Format**: JSON request/response

---

## Authentication

### Login

**Endpoint**: `POST /auth/login`

**Request**:

```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response** (200):

```json
{
  "user": {
    "id": "u-123",
    "email": "user@example.com",
    "full_name": "John Doe"
  },
  "session": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 3600
  }
}
```

**Errors**:

- `401 Unauthorized` — Invalid credentials
- `429 Too Many Requests` — Too many login attempts

---

### Sign Up

**Endpoint**: `POST /auth/signup`

**Request**:

```json
{
  "email": "newuser@example.com",
  "password": "secure_password",
  "full_name": "Jane Doe"
}
```

**Response** (201):

```json
{
  "user": {
    "id": "u-456",
    "email": "newuser@example.com",
    "full_name": "Jane Doe"
  }
}
```

**Errors**:

- `400 Bad Request` — Invalid email or password format
- `409 Conflict` — Email already registered

---

### Logout

**Endpoint**: `POST /auth/logout`

**Headers**: `Authorization: Bearer <JWT>`

**Response** (200):

```json
{
  "message": "Logged out successfully"
}
```

---

## Workspaces

### List User's Workspaces

**Endpoint**: `GET /workspaces`

**Headers**: `Authorization: Bearer <JWT>`

**Response** (200):

```json
{
  "workspaces": [
    {
      "id": "ws-123",
      "name": "Acme Corp",
      "description": "Main AI governance workspace",
      "industry": "finance",
      "country": "DE",
      "owner_id": "u-123",
      "created_at": "2026-07-01T10:00:00Z"
    }
  ]
}
```

---

### Create Workspace

**Endpoint**: `POST /workspaces`

**Headers**: `Authorization: Bearer <JWT>`

**Request**:

```json
{
  "name": "New Organization",
  "description": "Our workspace",
  "industry": "tech",
  "country": "FR"
}
```

**Response** (201):

```json
{
  "workspace": {
    "id": "ws-789",
    "name": "New Organization",
    "description": "Our workspace",
    "industry": "tech",
    "country": "FR",
    "owner_id": "u-123",
    "created_at": "2026-07-16T15:00:00Z"
  }
}
```

**Errors**:

- `400 Bad Request` — Missing required fields
- `409 Conflict` — Workspace name already exists for user

---

### Get Workspace Details

**Endpoint**: `GET /workspaces/{workspace_id}`

**Headers**: `Authorization: Bearer <JWT>`

**Response** (200):

```json
{
  "workspace": {
    "id": "ws-123",
    "name": "Acme Corp",
    "description": "Main AI governance workspace",
    "industry": "finance",
    "country": "DE",
    "owner_id": "u-123",
    "created_at": "2026-07-01T10:00:00Z",
    "team_count": 5,
    "systems_count": 12,
    "assessments_count": 8
  }
}
```

**Errors**:

- `404 Not Found` — Workspace doesn't exist or not accessible
- `403 Forbidden` — User not in workspace

---

## AI Systems

### List Systems in Workspace

**Endpoint**: `GET /workspaces/{workspace_id}/systems`

**Headers**: `Authorization: Bearer <JWT>`

**Query Parameters**:

- `status` (optional): Filter by status (active, inactive, development)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)

**Response** (200):

```json
{
  "systems": [
    {
      "id": "sys-123",
      "workspace_id": "ws-123",
      "name": "Customer Recommendation Engine",
      "description": "Recommends products based on user history",
      "use_case": "Personalized recommendations",
      "status": "active",
      "data_types": ["customer_behavior", "product_data"],
      "deployment_environment": "cloud",
      "created_at": "2026-07-05T09:00:00Z",
      "updated_at": "2026-07-15T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3
  }
}
```

---

### Create AI System

**Endpoint**: `POST /workspaces/{workspace_id}/systems`

**Headers**: `Authorization: Bearer <JWT>`

**Request**:

```json
{
  "name": "Fraud Detection System",
  "description": "Identifies suspicious transactions",
  "use_case": "Real-time fraud prevention",
  "status": "active",
  "data_types": ["transaction_history", "user_profile"],
  "deployment_environment": "cloud"
}
```

**Response** (201):

```json
{
  "system": {
    "id": "sys-456",
    "workspace_id": "ws-123",
    "name": "Fraud Detection System",
    "description": "Identifies suspicious transactions",
    "use_case": "Real-time fraud prevention",
    "status": "active",
    "data_types": ["transaction_history", "user_profile"],
    "deployment_environment": "cloud",
    "created_at": "2026-07-16T15:00:00Z"
  }
}
```

**Errors**:

- `400 Bad Request` — Missing required fields
- `409 Conflict` — System name already exists in workspace

---

### Update AI System

**Endpoint**: `PUT /workspaces/{workspace_id}/systems/{system_id}`

**Headers**: `Authorization: Bearer <JWT>`

**Request**:

```json
{
  "status": "inactive",
  "description": "Updated description"
}
```

**Response** (200):

```json
{
  "system": {
    "id": "sys-456",
    "status": "inactive",
    "description": "Updated description",
    "updated_at": "2026-07-16T15:30:00Z"
  }
}
```

---

### Delete AI System

**Endpoint**: `DELETE /workspaces/{workspace_id}/systems/{system_id}`

**Headers**: `Authorization: Bearer <JWT>`

**Response** (204): No content

---

## Assessments

### List Assessments for System

**Endpoint**: `GET /workspaces/{workspace_id}/systems/{system_id}/assessments`

**Headers**: `Authorization: Bearer <JWT>`

**Response** (200):

```json
{
  "assessments": [
    {
      "id": "ass-123",
      "system_id": "sys-123",
      "status": "completed",
      "risk_level": "high",
      "answers": {
        "data_sensitivity": "high",
        "processing_scope": "all_customers",
        "decision_impact": "yes"
      },
      "created_at": "2026-07-10T10:00:00Z",
      "completed_at": "2026-07-10T10:45:00Z"
    }
  ]
}
```

---

### Create Assessment

**Endpoint**: `POST /workspaces/{workspace_id}/systems/{system_id}/assessments`

**Headers**: `Authorization: Bearer <JWT>`

**Request**:

```json
{
  "status": "in_progress",
  "answers": {
    "data_sensitivity": "high",
    "processing_scope": "eu_customers",
    "decision_impact": "yes"
  }
}
```

**Response** (201):

```json
{
  "assessment": {
    "id": "ass-456",
    "system_id": "sys-123",
    "status": "in_progress",
    "risk_level": null,
    "answers": { ... },
    "created_at": "2026-07-16T15:00:00Z"
  }
}
```

---

### Complete Assessment

**Endpoint**: `POST /workspaces/{workspace_id}/systems/{system_id}/assessments/{assessment_id}/complete`

**Headers**: `Authorization: Bearer <JWT>`

**Response** (200):

```json
{
  "assessment": {
    "id": "ass-456",
    "status": "completed",
    "risk_level": "high",
    "completed_at": "2026-07-16T15:15:00Z"
  }
}
```

---

## Obligations

### List Obligations in Workspace

**Endpoint**: `GET /workspaces/{workspace_id}/obligations`

**Headers**: `Authorization: Bearer <JWT>`

**Query Parameters**:

- `status` (optional): Filter by status (open, in_progress, completed)
- `assessment_id` (optional): Filter by assessment

**Response** (200):

```json
{
  "obligations": [
    {
      "id": "obl-123",
      "workspace_id": "ws-123",
      "assessment_id": "ass-123",
      "title": "Conduct Data Protection Impact Assessment",
      "description": "Required under EU AI Act Article 25",
      "status": "open",
      "due_date": "2026-09-30",
      "created_at": "2026-07-10T10:45:00Z",
      "evidence_count": 2
    }
  ]
}
```

---

### Create Obligations from Assessment

**Endpoint**: `POST /workspaces/{workspace_id}/assessments/{assessment_id}/create-obligations`

**Headers**: `Authorization: Bearer <JWT>`

**Request** (suggested obligations returned from assessment):

```json
{
  "obligation_ids": ["obl-123", "obl-124"]
}
```

**Response** (201):

```json
{
  "obligations": [
    {
      "id": "obl-123",
      "title": "Data Protection Impact Assessment",
      "status": "open"
    },
    {
      "id": "obl-124",
      "title": "Document AI System Operations",
      "status": "open"
    }
  ]
}
```

---

### Update Obligation

**Endpoint**: `PUT /workspaces/{workspace_id}/obligations/{obligation_id}`

**Headers**: `Authorization: Bearer <JWT>`

**Request**:

```json
{
  "status": "in_progress",
  "due_date": "2026-10-15"
}
```

**Response** (200):

```json
{
  "obligation": {
    "id": "obl-123",
    "status": "in_progress",
    "due_date": "2026-10-15",
    "updated_at": "2026-07-16T15:30:00Z"
  }
}
```

---

## Evidence

### List Evidence for Obligation

**Endpoint**: `GET /workspaces/{workspace_id}/obligations/{obligation_id}/evidence`

**Headers**: `Authorization: Bearer <JWT>`

**Response** (200):

```json
{
  "evidence": [
    {
      "id": "ev-123",
      "obligation_id": "obl-123",
      "title": "DPIA Document.pdf",
      "description": "Data Protection Impact Assessment signed by DPO",
      "status": "approved",
      "content_type": "document",
      "file_url": "https://storage.example.com/ev-123.pdf",
      "created_at": "2026-07-12T10:00:00Z",
      "updated_at": "2026-07-15T14:00:00Z"
    }
  ]
}
```

---

### Create Evidence

**Endpoint**: `POST /workspaces/{workspace_id}/obligations/{obligation_id}/evidence`

**Headers**: `Authorization: Bearer <JWT>`

**Request**:

```json
{
  "title": "Assessment Results Summary",
  "description": "High-level summary of risk assessment",
  "content_type": "document",
  "file_url": "https://storage.example.com/assessment-summary.pdf"
}
```

**Response** (201):

```json
{
  "evidence": {
    "id": "ev-456",
    "obligation_id": "obl-123",
    "title": "Assessment Results Summary",
    "status": "submitted",
    "created_at": "2026-07-16T15:00:00Z"
  }
}
```

---

### Update Evidence Status

**Endpoint**: `PUT /workspaces/{workspace_id}/evidence/{evidence_id}`

**Headers**: `Authorization: Bearer <JWT>`

**Request**:

```json
{
  "status": "approved"
}
```

**Response** (200):

```json
{
  "evidence": {
    "id": "ev-456",
    "status": "approved",
    "updated_at": "2026-07-16T15:30:00Z"
  }
}
```

---

### Delete Evidence

**Endpoint**: `DELETE /workspaces/{workspace_id}/evidence/{evidence_id}`

**Headers**: `Authorization: Bearer <JWT>`

**Response** (204): No content

---

## Team Management

### List Team Members

**Endpoint**: `GET /workspaces/{workspace_id}/team`

**Headers**: `Authorization: Bearer <JWT>`

**Response** (200):

```json
{
  "members": [
    {
      "user_id": "u-123",
      "email": "owner@example.com",
      "full_name": "John Doe",
      "role": "owner",
      "joined_at": "2026-07-01T10:00:00Z"
    },
    {
      "user_id": "u-456",
      "email": "analyst@example.com",
      "full_name": "Jane Smith",
      "role": "analyst",
      "joined_at": "2026-07-05T14:00:00Z"
    }
  ]
}
```

---

### Invite Team Member

**Endpoint**: `POST /workspaces/{workspace_id}/team/invite`

**Headers**: `Authorization: Bearer <JWT>`

**Request**:

```json
{
  "email": "newmember@example.com",
  "role": "analyst"
}
```

**Response** (200):

```json
{
  "invitation": {
    "email": "newmember@example.com",
    "role": "analyst",
    "invited_at": "2026-07-16T15:00:00Z",
    "status": "pending"
  }
}
```

---

### Update Team Member Role

**Endpoint**: `PUT /workspaces/{workspace_id}/team/{user_id}`

**Headers**: `Authorization: Bearer <JWT>`

**Request**:

```json
{
  "role": "admin"
}
```

**Response** (200):

```json
{
  "member": {
    "user_id": "u-456",
    "email": "analyst@example.com",
    "role": "admin",
    "updated_at": "2026-07-16T15:30:00Z"
  }
}
```

---

### Remove Team Member

**Endpoint**: `DELETE /workspaces/{workspace_id}/team/{user_id}`

**Headers**: `Authorization: Bearer <JWT>`

**Response** (204): No content

---

## Health & Monitoring

### Health Check

**Endpoint**: `GET /health`

**Response** (200):

```json
{
  "status": "healthy",
  "timestamp": "2026-07-16T15:30:00Z",
  "components": {
    "database": "healthy",
    "auth": "healthy",
    "api": "healthy"
  },
  "version": "1.0.0"
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "reason": "Must be valid email address"
    }
  }
}
```

### HTTP Status Codes

| Status | Meaning             | Example                |
| ------ | ------------------- | ---------------------- |
| 200    | OK                  | Request succeeded      |
| 201    | Created             | Resource created       |
| 204    | No Content          | Deletion successful    |
| 400    | Bad Request         | Invalid input          |
| 401    | Unauthorized        | Missing/invalid JWT    |
| 403    | Forbidden           | No access to resource  |
| 404    | Not Found           | Resource doesn't exist |
| 409    | Conflict            | Duplicate resource     |
| 429    | Too Many Requests   | Rate limited           |
| 500    | Server Error        | Internal error         |
| 503    | Service Unavailable | Maintenance            |

---

## Rate Limiting

All endpoints are rate limited:

- **Default**: 60 requests per minute per user
- **Auth endpoints**: 10 requests per minute per IP
- **File uploads**: 10 requests per minute per user

**Header** in response:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1626447000
```

---

## Related Documents

- `ARCHITECTURE.md` — System design overview
- `DATABASE_SCHEMA.md` — Data model and structure
- `PATTERNS/ROUTE_PATTERNS.md` — How to implement endpoints
- `docs/governance/ENGINEERING_STANDARDS.md` — API standards

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.3)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.3 (Engineering Knowledge)
