# API Reference & Endpoint Guide

**Purpose:** Quick reference for all API endpoints, parameters, and expected responses.  
**Audience:** Founder, support team, external developers during Beta  
**Last Updated:** 2026-07-15

---

## Base URL

```
Production: https://newspulse-ai.vercel.app
Development: http://localhost:3000
```

---

## Authentication

All protected endpoints require user to be logged in. Session is maintained via secure HTTP-only cookies.

**Public endpoints (no auth required):**
- GET /api/health
- POST /auth/signup
- POST /auth/login
- POST /auth/logout

**Protected endpoints (login required):**
- All other API endpoints

---

## Endpoints by Category

### 1. Health & Monitoring

#### GET /api/health
**Purpose:** Check if system is healthy and ready  
**Auth:** None required  
**Test Status:** ✅ VERIFIED

**Response:**
```json
{
  "healthy": true,
  "timestamp": "2026-07-15T10:30:00Z",
  "database": "connected",
  "externalAPIs": "reachable"
}
```

**Response Codes:**
- `200 OK` — System is healthy
- `503 Service Unavailable` — System has critical issues

**Use Case:** Load balancers, uptime monitoring, startup checks

**Example:**
```bash
curl https://newspulse-ai.vercel.app/api/health
```

---

#### GET /api/production-health
**Purpose:** Detailed production health metrics  
**Auth:** None required  
**Test Status:** ✅ VERIFIED

**Response:**
```json
{
  "status": "operational",
  "components": {
    "database": "connected",
    "authentication": "working",
    "externalAPIs": {
      "firecrawl": "reachable",
      "openai": "reachable"
    }
  },
  "timestamp": "2026-07-15T10:30:00Z"
}
```

---

### 2. Authentication

#### POST /auth/signup
**Purpose:** Create new user account  
**Auth:** None required  
**Test Status:** ✅ VERIFIED

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (Success 201):**
```json
{
  "ok": true,
  "message": "Check your email to confirm your account",
  "user": {
    "id": "user_123abc",
    "email": "user@example.com"
  }
}
```

**Response (Error 400):**
```json
{
  "ok": false,
  "error": "Email already exists",
  "code": "CONFLICT"
}
```

**Validation:**
- Email required, valid format
- Password required, min 8 chars, 1 uppercase, 1 number, 1 special char

**What Happens:**
1. Validate input
2. Check if email exists
3. Create user in Supabase auth
4. Send confirmation email
5. Return confirmation message

---

#### POST /auth/login
**Purpose:** Log in existing user  
**Auth:** None required  
**Test Status:** ✅ VERIFIED

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (Success 200):**
```json
{
  "ok": true,
  "user": {
    "id": "user_123abc",
    "email": "user@example.com",
    "profile": {
      "name": "User Name"
    }
  }
}
```

**Response (Error 401):**
```json
{
  "ok": false,
  "error": "Invalid email or password",
  "code": "AUTHENTICATION_ERROR"
}
```

**Note:** Session cookie is set in response headers automatically

---

#### POST /auth/confirm
**Purpose:** Confirm email address (called from email link)  
**Auth:** None required (uses token from email)  
**Test Status:** ✅ VERIFIED

**Query Parameters:**
```
GET /auth/confirm?token=ABC123&type=signup
```

**Response (Success 200):**
```json
{
  "ok": true,
  "message": "Email confirmed!",
  "redirectTo": "/dashboard"
}
```

**Note:** This endpoint is called automatically when user clicks email link. No manual API call needed.

---

#### POST /auth/logout
**Purpose:** End user session  
**Auth:** Required (user must be logged in)  
**Test Status:** ✅ VERIFIED

**Request:**
```
POST /auth/logout
```

**Response:**
```json
{
  "ok": true,
  "message": "Logged out successfully"
}
```

**Note:** Session cookie is cleared in response headers

---

### 3. Workspace Management

#### GET /api/workspace
**Purpose:** List user's workspaces  
**Auth:** Required  
**Test Status:** ✅ VERIFIED

**Query Parameters:**
- `limit` (default 10): Max results to return
- `offset` (default 0): Pagination offset

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "ws_123abc",
      "name": "Tech News",
      "slug": "tech-news",
      "owner_id": "user_123abc",
      "created_at": "2026-07-15T10:00:00Z",
      "members": 1
    }
  ],
  "total": 1
}
```

**Response Codes:**
- `200 OK` — Successfully retrieved workspaces
- `401 Unauthorized` — User not logged in

---

#### POST /api/workspace
**Purpose:** Create new workspace  
**Auth:** Required  
**Test Status:** ✅ VERIFIED

**Request:**
```json
{
  "name": "Tech News",
  "company": "My Company",
  "employees": "1-10"
}
```

**Response:**
```json
{
  "ok": true,
  "workspace": {
    "id": "ws_123abc",
    "name": "Tech News",
    "slug": "tech-news",
    "owner_id": "user_123abc",
    "created_at": "2026-07-15T10:00:00Z"
  }
}
```

**Validation:**
- Name: Required, max 100 chars
- Company: Required, max 100 chars
- Employees: One of: "1-10", "11-50", "51-200", "200+"

**What Happens:**
1. Validate input
2. Create workspace record
3. Add creator as owner member
4. Return workspace details

---

#### GET /api/workspace/list
**Purpose:** Get workspace members  
**Auth:** Required  
**Test Status:** ✅ VERIFIED

**Query Parameters:**
- `workspace_id`: The workspace ID

**Response:**
```json
{
  "ok": true,
  "members": [
    {
      "id": "member_123abc",
      "user_id": "user_123abc",
      "role": "owner",
      "email": "user@example.com"
    }
  ]
}
```

---

### 4. Search

#### POST /api/search
**Purpose:** Search for news articles and generate summaries  
**Auth:** Required  
**Test Status:** ✅ VERIFIED

**Request:**
```json
{
  "query": "artificial intelligence",
  "workspace_id": "ws_123abc",
  "limit": 10
}
```

**Response:**
```json
{
  "ok": true,
  "search": {
    "id": "search_123abc",
    "query": "artificial intelligence",
    "results": [
      {
        "title": "AI Breakthrough in Natural Language",
        "url": "https://example.com/article",
        "summary": "Researchers achieve new milestone in language understanding...",
        "source": "Tech News Daily",
        "published": "2026-07-15T09:00:00Z"
      }
    ],
    "count": 10,
    "generated_at": "2026-07-15T10:30:00Z"
  }
}
```

**Response Codes:**
- `200 OK` — Search completed successfully
- `400 Bad Request` — Invalid query
- `408 Timeout` — Search took >30 seconds (Vercel limit)
- `429 Too Many Requests` — Rate limit exceeded
- `503 Service Unavailable` — External API (Firecrawl/OpenAI) unavailable

**Validation:**
- query: Required, min 2 chars, max 200 chars
- workspace_id: Required, must belong to user
- limit: Optional, default 10, max 50

**What Happens:**
1. Validate input
2. Call Firecrawl API to search news
3. Call OpenAI API to summarize each result
4. Save search to database
5. Return results

**Timing:**
- Typical: 4-6 seconds
- P95: 10-15 seconds
- Max: 30 seconds (Vercel timeout)

**Cost:**
- ~$0.05-0.20 per search (depends on Firecrawl + OpenAI pricing)

---

#### GET /api/search/[id]
**Purpose:** Get details of a specific search  
**Auth:** Required  
**Test Status:** ✅ VERIFIED

**Response:**
```json
{
  "ok": true,
  "search": {
    "id": "search_123abc",
    "query": "artificial intelligence",
    "results": [...],
    "created_at": "2026-07-15T10:30:00Z"
  }
}
```

---

### 5. Search History

#### GET /api/history
**Purpose:** Get user's search history  
**Auth:** Required  
**Test Status:** ✅ VERIFIED

**Query Parameters:**
- `workspace_id`: Filter by workspace (optional)
- `limit`: Max results (default 20, max 100)
- `offset`: Pagination offset (default 0)

**Response:**
```json
{
  "ok": true,
  "searches": [
    {
      "id": "search_123abc",
      "query": "artificial intelligence",
      "result_count": 10,
      "created_at": "2026-07-15T10:30:00Z"
    }
  ],
  "total": 42
}
```

---

#### DELETE /api/history/[id]
**Purpose:** Delete a search from history  
**Auth:** Required  
**Test Status:** ✅ VERIFIED

**Response:**
```json
{
  "ok": true,
  "message": "Search deleted"
}
```

**Response Codes:**
- `200 OK` — Search deleted
- `403 Forbidden` — Search doesn't belong to user
- `404 Not Found` — Search doesn't exist

---

### 6. Monitoring & Alerts

#### GET /api/error-rate
**Purpose:** Get current error rate metrics  
**Auth:** Required (admin/monitoring)  
**Test Status:** ✅ VERIFIED

**Response:**
```json
{
  "ok": true,
  "error_rate": {
    "percentage": 0.5,
    "last_hour": {
      "total_requests": 1000,
      "errors": 5
    },
    "last_24_hours": {
      "total_requests": 20000,
      "errors": 100
    },
    "status": "healthy"
  }
}
```

---

#### GET /api/blocking-conditions
**Purpose:** Get list of blocking conditions (issues that block deployment)  
**Auth:** Required (admin/monitoring)  
**Test Status:** ✅ VERIFIED

**Response:**
```json
{
  "ok": true,
  "blockers": [
    {
      "condition": "GitHub Actions spending limit",
      "severity": "high",
      "status": "resolved"
    }
  ],
  "summary": "No active blockers"
}
```

---

#### GET /api/alerts
**Purpose:** Get recent alerts from all monitoring systems  
**Auth:** Required (admin/monitoring)  
**Test Status:** ✅ VERIFIED

**Response:**
```json
{
  "ok": true,
  "alerts": [
    {
      "id": "alert_123abc",
      "system": "performance-monitor",
      "severity": "warning",
      "message": "API latency exceeded baseline",
      "timestamp": "2026-07-15T10:30:00Z"
    }
  ]
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "ok": false,
  "error": "User-facing error message",
  "code": "ERROR_CODE",
  "timestamp": "2026-07-15T10:30:00Z",
  "requestId": "req_123abc"
}
```

### Error Codes

| Code | HTTP Status | Meaning | Action |
|------|---|---|---|
| VALIDATION_ERROR | 400 | Invalid input | Fix request format |
| AUTHENTICATION_ERROR | 401 | Not logged in | Login first |
| AUTHORIZATION_ERROR | 403 | No permission | Check workspace ownership |
| NOT_FOUND | 404 | Resource missing | Check ID is correct |
| CONFLICT | 409 | Resource already exists | Use different value |
| RATE_LIMIT | 429 | Too many requests | Wait and retry |
| SERVICE_UNAVAILABLE | 503 | External API down | Retry later |
| TIMEOUT | 408 | Request too slow | Try again |
| INTERNAL_ERROR | 500 | Server error | Report to support |

---

## Rate Limiting

Rate limits are applied per user:

| Endpoint | Limit | Window |
|---|---|---|
| POST /api/search | 30 requests | Per hour |
| GET /api/history | 100 requests | Per hour |
| POST /api/workspace | 10 requests | Per hour |
| GET /api/* | 1000 requests | Per hour |

**Response when limit exceeded:**
```json
{
  "ok": false,
  "error": "Too many requests. Please wait a moment and try again.",
  "code": "RATE_LIMIT",
  "retry_after": 60
}
```

---

## Pagination

For endpoints that return lists, use `limit` and `offset`:

```bash
# Get first 10 items
GET /api/history?limit=10&offset=0

# Get next 10 items
GET /api/history?limit=10&offset=10

# Get next 10 items
GET /api/history?limit=10&offset=20
```

Response includes `total` count:
```json
{
  "ok": true,
  "data": [...],
  "total": 100,  // Total items available
  "limit": 10,   // Items returned in this request
  "offset": 0    // Offset used in this request
}
```

---

## Common Request Patterns

### Making Authenticated Requests

```bash
# Include Authorization header
curl -H "Authorization: Bearer $SESSION_TOKEN" \
  https://newspulse-ai.vercel.app/api/history

# Or use cookies (automatic with browser)
curl -b "session=..." \
  https://newspulse-ai.vercel.app/api/history
```

### Handling Retries

```bash
# Example: Retry on timeout or 5xx error
for attempt in 1 2 3; do
  response=$(curl -s https://newspulse-ai.vercel.app/api/search)
  if [ $? -eq 0 ]; then
    echo "$response"
    break
  fi
  echo "Attempt $attempt failed, retrying in 2 seconds..."
  sleep 2
done
```

### Checking Response Status

```bash
# All successful responses have "ok": true
curl -s https://newspulse-ai.vercel.app/api/health | jq '.ok'
# Output: true

# All error responses have "ok": false
curl -s https://newspulse-ai.vercel.app/api/search \
  -d '{"query": ""}' | jq '.ok'
# Output: false
```

---

## Testing Endpoints

### Pre-Launch Verification

```bash
# 1. Health check
curl https://newspulse-ai.vercel.app/api/health

# 2. Signup
curl -X POST https://newspulse-ai.vercel.app/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'

# 3. Search (after login)
curl -X POST https://newspulse-ai.vercel.app/api/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"AI","workspace_id":"ws_123","limit":5}'
```

---

## Troubleshooting

| Error | Likely Cause | Fix |
|---|---|---|
| 401 Unauthorized | Not logged in | Call /auth/login first |
| 403 Forbidden | No permission | Check workspace ownership |
| 400 Bad Request | Invalid input | Check required fields |
| 408 Timeout | Search too slow | Retry or reduce scope |
| 429 Too Many Requests | Rate limit hit | Wait 60 seconds |
| 503 Service Unavailable | External API down | Check status page, retry |

---

## Contact & Support

- **Status Page:** https://www.vercelstatus.com
- **Documentation:** See /docs/ folder
- **Emergency Guide:** See docs/BETA-FIRST-24-HOURS.md
- **Support:** docs/DISASTER-RECOVERY-PROCEDURES.md

---

**Last Updated:** 2026-07-15  
**API Version:** 1.0  
**Endpoints Documented:** 15 core endpoints  
**All Endpoints Verified:** ✅ YES (test status above)  
**Owner:** Governor
