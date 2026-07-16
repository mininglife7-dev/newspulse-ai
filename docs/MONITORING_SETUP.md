# Monitoring and Observability Setup

## Overview

This guide covers monitoring, logging, and alerting for the EURO AI platform. Structured logging is already integrated in API endpoints.

## Structured Logging

### Log Format

All API endpoints emit structured JSON logs with:

```json
{
  "timestamp": "2026-07-16T10:30:00.000Z",
  "level": "info|warn|error|debug",
  "message": "Descriptive message",
  "requestId": "unique-request-id",
  "userId": "user-id (optional)",
  "workspaceId": "workspace-id (optional)",
  "duration": "ms elapsed",
  "statusCode": "HTTP status code (optional)",
  "error": "error message (error logs only)",
  "stack": "stack trace (error logs only)"
}
```

### Log Levels

- **debug**: Development/troubleshooting information
- **info**: Normal operation events (request received, request completed)
- **warn**: Warnings that don't affect operation (auth failures, access denied)
- **error**: Errors requiring attention (failed operations, exceptions)

### Accessing Logs

**Vercel Real-time Logs:**

```bash
vercel logs -f  # Follow mode
vercel logs --limit 100  # Last 100 entries
```

**Filter by Request ID:**
All related events share the same `requestId` for easy tracing.

## Key Metrics to Track

### Application Metrics

1. **Request Volume**
   - Endpoint: Count by endpoint
   - Method: Count by HTTP method
   - Status: Distribution of response codes

2. **Response Times**
   - P50 (median): Target < 200ms
   - P95: Target < 500ms
   - P99: Target < 2000ms

3. **Error Rates**
   - 4xx errors: Client errors (validation, auth, access)
   - 5xx errors: Server errors (bugs, database issues)
   - Target: < 1% of all requests

4. **Critical Workflows**
   - Risk assessments created/hour
   - Obligations identified/hour
   - Evidence submitted/hour

### Business Metrics

1. **Compliance Coverage**
   - Workspaces with assessments
   - AI systems with risk assessment
   - Obligations identified vs. remediated

2. **User Activity**
   - Active users/day
   - Workspaces created/week
   - Team members invited/week

### Infrastructure Metrics

1. **Database**
   - Connection pool usage
   - Query count/minute
   - Slow queries (> 1000ms)
   - Row-level security policy effectiveness

2. **API Performance**
   - Endpoint response times
   - Payload sizes
   - Concurrent requests

## Implementing Alerts

### Critical Alerts (Immediate Escalation)

These alerts should trigger immediate investigation:

1. **Error Rate > 5%**

   ```
   Alert: High error rate detected
   Threshold: 5xx errors > 5% of total requests
   Action: Check logs, trigger rollback if needed
   ```

2. **Service Down**

   ```
   Alert: Health check failing
   Threshold: 3 consecutive health check failures
   Action: Immediate investigation, declare incident
   ```

3. **Database Connection Failed**
   ```
   Alert: Database unavailable
   Threshold: Any query returns connection error
   Action: Check database status, contact provider if needed
   ```

### Warning Alerts (Investigation within 1 hour)

1. **High Response Time (P95 > 1s)**

   ```
   Threshold: P95 latency > 1000ms for 5+ minutes
   Action: Check database performance, review slow queries
   ```

2. **Unusual Error Pattern**

   ```
   Threshold: Same error appearing > 10x in 5 minutes
   Action: Review error details, check for missing config
   ```

3. **High 401 Errors**
   ```
   Threshold: Authentication failures > 10% of requests
   Action: Review auth configuration, check for compromised keys
   ```

## Monitoring Dashboard

### Key Queries

**Total Requests (last hour):**

```
filter by: timestamp > now - 1h
count: all log entries
```

**Error Rate (last hour):**

```
filter by: timestamp > now - 1h AND (level == "error" OR statusCode >= 500)
calculate: error_count / total_count * 100
```

**Response Times (last hour):**

```
filter by: timestamp > now - 1h AND level == "info"
calculate: p50(duration), p95(duration), p99(duration)
```

**Requests by Endpoint (last hour):**

```
filter by: timestamp > now - 1h
group by: endpoint
count: requests per endpoint
```

**Top Errors (last hour):**

```
filter by: timestamp > now - 1h AND level == "error"
group by: error message
count: occurrences
```

## Observability Best Practices

### Tracing Requests

Every request gets a unique `requestId`:

```json
// Request received
{
  "requestId": "1721129400000-a1b2c3d4e5",
  "level": "info",
  "message": "Request received",
  "endpoint": "/api/risk-assessment/create"
}

// Processing events
{
  "requestId": "1721129400000-a1b2c3d4e5",
  "level": "info",
  "message": "Risk score calculated",
  "riskScore": 50,
  "affirmativeAnswers": 4
}

// Request completed
{
  "requestId": "1721129400000-a1b2c3d4e5",
  "level": "info",
  "message": "Request completed",
  "statusCode": 201,
  "duration": 145
}
```

To trace a complete flow, search logs for the same `requestId`.

### Error Context

When logging errors, include context:

```json
{
  "requestId": "1721129400000-a1b2c3d4e5",
  "level": "error",
  "message": "Failed to create risk assessment",
  "error": "user not in workspace",
  "userId": "user-123",
  "workspaceId": "workspace-456",
  "stack": "at verifyWorkspaceAccess (/app/api/risk-assessment/create/route.ts:50)"
}
```

### Performance Monitoring

Track performance of critical operations:

```json
{
  "requestId": "1721129400000-a1b2c3d4e5",
  "level": "info",
  "message": "Risk assessment created successfully",
  "duration": 342,
  "assessmentId": "assessment-123",
  "queryTimeMs": 120, // Database time
  "computeTimeMs": 45 // Risk scoring time
}
```

## Third-Party Monitoring Services

### Optional: Vercel Analytics

Enable in Vercel dashboard for built-in observability:

- Web Vitals tracking
- Edge request analytics
- Performance monitoring

### Optional: Datadog Integration

For advanced monitoring, configure Datadog:

1. Create Datadog account at datadog.com
2. Get API key from Datadog dashboard
3. Add to Vercel environment variables: `DATADOG_API_KEY`
4. Configure log forwarding in Vercel

### Optional: Sentry Integration

For error tracking:

1. Create Sentry project at sentry.io
2. Get DSN from project settings
3. Add to environment: `SENTRY_DSN`
4. Configure in API middleware

## Capacity Planning

### Monthly Growth Rates

Monitor these metrics for capacity planning:

- Total API requests/month
- Database storage growth/month
- Concurrent active users
- Peak request rate

### Scaling Triggers

- **Vercel**: Scales automatically, monitor Build minutes
- **Supabase**: Scales automatically, monitor query times
- Consider upgrade if:
  - P99 response time > 2000ms consistently
  - Database storage approaching limits
  - Monthly bill increasing >20% month-over-month

## Log Retention

- **Vercel**: Stores logs for 7 days by default
- **Long-term storage**: Export logs to Datadog or similar service
- **Compliance**: Keep logs for 90 days minimum for audit trails

## Performance Benchmarks

### Target SLOs

- **Availability**: 99.9% (< 43 minutes downtime/month)
- **Response Time**: P95 < 500ms
- **Error Rate**: < 1% (max 0.1% for 5xx errors)
- **Authentication**: < 50ms P95

### Success Criteria

- [ ] All requests < 500ms P95
- [ ] Error rate consistently < 1%
- [ ] No 5xx errors from code bugs (handled gracefully)
- [ ] All business workflows succeed > 99.5% of attempts

## Documentation

- **Logging**: See `/lib/logger.ts` for logging implementation
- **Structured Format**: JSON format with request tracing
- **Integration Tests**: See `tests/integration/` for workflow validation

---

**Last Updated**: 2026-07-16  
**Review Schedule**: Monthly
