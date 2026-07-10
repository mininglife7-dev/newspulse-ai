# NewsPulse AI — API Documentation

## Overview

NewsPulse AI provides REST APIs for news search, history management, governance monitoring, and system health checks.

All APIs:
- Require `POST` body as JSON (except `GET` endpoints)
- Return JSON responses with `ok` boolean and `error` string on failure
- Support demo mode via `DEMO_MODE=true` for testing without external API keys

---

## GET /api/health

Check system configuration status.

**Response (200 — Healthy):**
```json
{
  "ok": true,
  "status": "healthy",
  "checks": {
    "firecrawl": true,
    "openai": true,
    "supabase_url": true,
    "supabase_anon": true,
    "supabase_service": true
  },
  "timestamp": "2026-07-10T04:10:00.000Z"
}
```

**Response (503 — Degraded):**
```json
{
  "ok": false,
  "status": "degraded",
  "checks": {
    "firecrawl": false,
    "openai": false,
    "supabase_url": false,
    "supabase_anon": false,
    "supabase_service": false
  },
  "timestamp": "2026-07-10T04:10:00.000Z"
}
```

---

## POST /api/search

Search the web for news articles and get AI summaries.

**Request:**
```json
{
  "keyword": "artificial intelligence"
}
```

**Response (200 — Success):**
```json
{
  "ok": true,
  "keyword": "artificial intelligence",
  "count": 3,
  "results": [
    {
      "title": "News about \"artificial intelligence\" — Sample Result 1",
      "url": "https://example.com/article-1",
      "source": "example.com",
      "date": "2026-07-09T04:10:00.000Z",
      "description": "This is a demo article about artificial intelligence...",
      "ai_summary": "In this demo article, we explore artificial intelligence..."
    }
  ],
  "_demo": true,
  "_note": "Demo mode active. Results are mock data."
}
```

**Response (400 — Missing Keyword):**
```json
{
  "ok": false,
  "error": "Missing \"keyword\" in request body."
}
```

**Response (500 — Misconfigured):**
```json
{
  "ok": false,
  "error": "Server misconfigured: FIRECRAWL_API_KEY missing. Set DEMO_MODE=true to use sample data."
}
```

**Demo Mode:**
When `DEMO_MODE=true`, returns sample articles without requiring external API keys. Useful for development and testing.

---

## GET /api/history

Retrieve saved search history.

**Query Parameters:**
- `limit` (optional): Max results to return (default: 50, max: 200)

**Response (200 — Success):**
```json
{
  "ok": true,
  "count": 2,
  "history": [
    {
      "id": "uuid-123",
      "keyword": "bitcoin",
      "result_count": 5,
      "created_at": "2026-07-10T01:00:00.000Z",
      "results": [
        {
          "title": "Bitcoin Reaches New High",
          "url": "https://news.example.com/bitcoin",
          "source": "news.example.com",
          "date": "2026-07-10T00:00:00.000Z",
          "description": "Bitcoin surges to new all-time high...",
          "ai_summary": "Bitcoin has reached a new record price..."
        }
      ]
    }
  ]
}
```

**Response (500 — Misconfigured):**
```json
{
  "ok": false,
  "error": "Failed to load search history. Configure Supabase credentials or set DEMO_MODE=true."
}
```

**Demo Mode:**
When `DEMO_MODE=true`, returns empty history (searches are not persisted in demo mode).

---

## DELETE /api/history

Clear all saved searches.

**Authentication:**
- Optional: `Authorization: Bearer <admin_token>` header
- If configured with `ADMIN_TOKEN` environment variable, requests without valid token receive 401

**Response (200 — Success):**
```json
{
  "ok": true,
  "deleted": 5
}
```

**Response (401 — Unauthorized):**
```json
{
  "ok": false,
  "error": "Unauthorized"
}
```

---

## GET /api/dashboard

Retrieve canonical governance and launch readiness state.

**Response (200 — Success):**
```json
{
  "lastUpdated": "2026-07-10T04:10:00.000Z",
  "dataSource": "Canonical Backend",
  "launchReadiness": {
    "percentage": 52,
    "state": "no_go",
    "reasoning": "Critical gate(s) failed: deployment not verified..."
  },
  "missionProgress": {
    "completed": 0,
    "inProgress": 1,
    "open": 9,
    "deferred": 0,
    "percentComplete": 10
  },
  "infraHealth": "degraded",
  "securityStatus": "healthy",
  "deploymentStatus": "degraded",
  "criticalGates": {
    "buildStatus": "pass",
    "ciStatus": "pass",
    "deploymentStatus": "failed",
    "securityAudit": "pass"
  },
  "blockers": [
    {
      "id": "M-01",
      "title": "Launch decision documentation",
      "status": "resolved",
      "problem": "...",
      "impact": "...",
      "solution": "...",
      "evidence": ["..."],
      "riskLevel": "low",
      "rollbackPath": "..."
    }
  ],
  "missions": [
    {
      "id": "V2-1",
      "title": "Mission Alpha",
      "status": "in_progress",
      "impactScore": 9,
      "effortEstimate": "1 week",
      "owner": "Founder"
    }
  ],
  "categories": [
    {
      "name": "Product Strategy",
      "mainScore": 85,
      "currentScore": 80,
      "targetScore": 90,
      "priority": "P0",
      "owner": "Founder",
      "evidence": "..."
    }
  ],
  "inconsistencies": {
    "found": false,
    "issues": [],
    "lastCheckedAt": "2026-07-10T04:10:00.000Z"
  }
}
```

---

## Environment Variables

### Required for Real Search
- `FIRECRAWL_API_KEY` — Web search and scraping. Get at https://firecrawl.dev
- `OPENAI_API_KEY` — Article summarization. Get at https://platform.openai.com/api-keys
- `NEXT_PUBLIC_SUPABASE_URL` — Database URL from Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Publishable API key from Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Secret service role key (server-side only)

### Optional for Demo Mode
- `DEMO_MODE` — Set to `true` to use mock data instead of real APIs

### Optional for Security
- `ADMIN_TOKEN` — Protect DELETE /api/history with bearer token authentication

---

## Error Handling

All endpoints return standardized error responses:

```json
{
  "ok": false,
  "error": "Human-readable error message"
}
```

**Common HTTP Status Codes:**
- `200` — Success
- `400` — Bad request (missing required field, invalid JSON)
- `401` — Unauthorized (missing/invalid auth token)
- `404` — Not found
- `405` — Method not allowed
- `500` — Server error (misconfigured, database error, external API failure)
- `503` — Service degraded (health check for missing configuration)

---

## Demo Mode

When `DEMO_MODE=true`:
- `/api/search` returns 3 sample articles for any keyword
- `/api/history` returns empty array (no persistence)
- `/api/health` still reports actual configuration status
- No external API keys required

This is useful for:
- Local development without Firecrawl/OpenAI/Supabase credentials
- CI/CD testing
- Previewing the UI without real API calls
- Educational demos

---

## Rate Limiting

Currently not implemented. Consider adding in production:
```
POST /api/search: 10 requests per minute per IP
GET /api/history: 60 requests per minute per IP
DELETE /api/history: 1 request per hour per IP
```

---

## Caching

- `GET /api/health` — No cache, always fresh
- `GET /api/dashboard` — 60 second server cache
- `GET /api/history` — No cache (`cache: 'no-store'`)

---

Last updated: July 10, 2026
