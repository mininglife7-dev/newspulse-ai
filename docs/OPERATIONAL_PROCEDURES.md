# EURO AI Platform - Operational Procedures

## Overview

This document outlines operational procedures for deploying, monitoring, and maintaining the EURO AI platform in production.

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All tests passing (`npm run test`)
- [ ] Build completes successfully (`npm run build`)
- [ ] No ESLint warnings or errors (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Environment variables configured in Vercel
- [ ] Database migrations reviewed and approved
- [ ] Database backups exist

### Deployment Process (Vercel)

1. **Push to `main` branch**

   ```bash
   git push origin main
   ```

2. **Monitor deployment in Vercel dashboard**
   - Visit: https://vercel.com/lalit-kumar-d-s-projects/newspulse-ai
   - Deployment status: Ready = Success, Error = Rollback

3. **Verify deployment**

   ```bash
   curl https://newspulse-ai-production.vercel.app/api/health
   # Expected response: { "ok": true, "status": "healthy" }
   ```

4. **Check monitoring data**
   - Verify logs in Vercel
   - Check error rate trends
   - Confirm API response times are normal

### Rollback Procedure

1. **Identify problematic commit**

   ```bash
   git log --oneline main | head -5
   ```

2. **Revert to previous version**

   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Monitor rollback completion** in Vercel dashboard

4. **Document incident** in decision register

## Monitoring and Alerting

### Key Metrics to Monitor

- **Request Rate**: Total API requests per minute
- **Error Rate**: % of requests returning 4xx/5xx status
- **Response Time**: P50, P95, P99 latencies
- **Database Performance**: Query latencies, connection pool usage
- **Authentication**: Failed login attempts, session errors

### Logging Structure

All logs are structured JSON with the following fields:

```json
{
  "timestamp": "2026-07-16T10:30:00.000Z",
  "level": "info|warn|error|debug",
  "message": "Human-readable message",
  "requestId": "unique-request-id",
  "userId": "user-id (if applicable)",
  "workspaceId": "workspace-id (if applicable)",
  "endpoint": "/api/endpoint",
  "statusCode": 200,
  "duration": 45
}
```

### Viewing Logs

**Vercel Real-time Logs:**

```bash
vercel logs -f
```

**Query logs by request ID:**
All logs include `requestId` for tracing related events across services.

### Critical Error Responses

- **400 Bad Request**: Validation failed, check request format
- **401 Unauthorized**: Auth token missing or invalid
- **403 Forbidden**: User lacks workspace access
- **404 Not Found**: Resource not found, check IDs
- **500 Internal Server Error**: Check logs with requestId

## Database Operations

### Backup and Recovery

**Automatic Backups:**

- Supabase automatically backs up daily
- Access backups via Supabase dashboard > Backups

**Manual Backup:**

```bash
# Export database
supabase db pull
```

**Restore from Backup:**

- Via Supabase dashboard: Backups tab > Restore
- Contact Supabase support for point-in-time recovery

### Database Migrations

1. **Test in local/staging environment first**
2. **Review migration script**
3. **Schedule maintenance window if needed**
4. **Execute migration** via Supabase dashboard or CLI
5. **Verify data integrity** after migration

### Row-Level Security (RLS) Policies

All tables have RLS policies enforcing workspace isolation. When modifying policies:

1. Review affected users/queries
2. Test in staging with test data
3. Deploy with monitoring
4. Rollback if access issues appear

## Common Issues and Resolution

### High Error Rate (>1% of requests)

1. Check Vercel logs for error patterns
2. Look for common `error` messages in structured logs
3. Verify database connection status
4. Check for rate limiting or DDoS
5. If critical: trigger rollback procedure

### Slow Response Times (P95 >2s)

1. Check database query performance
2. Look for N+1 queries in API logs
3. Verify database connection pool status
4. Check for high CPU usage
5. Consider increasing resources if sustained

### Authentication Failures

1. Verify Supabase auth service status
2. Check environment variables are correct
3. Verify auth tokens haven't expired
4. Review recent auth configuration changes
5. Check for rate limiting on auth endpoint

### Database Access Denied

1. Verify RLS policies are correct
2. Check user has workspace membership
3. Confirm service role key is valid
4. Review recent permission changes
5. Check for expired credentials

## Performance Optimization

### Query Performance

- Monitor slow queries: `duration > 1000ms` in logs
- Add database indexes for frequently filtered columns
- Use pagination for large result sets (max 1000 items)

### API Response Time

- Target: P95 < 500ms, P99 < 2000ms
- Monitor slow endpoints: `/obligations/identify`, `/risk-assessment/create`
- Consider caching for read-heavy queries

## Security Operations

### Credential Rotation

- Environment variables: update in Vercel every 90 days
- Database passwords: rotate annually in Supabase
- API keys: rotate if compromised

### Access Control Review

- Monthly review of workspace members
- Quarterly audit of role assignments
- Remove inactive members promptly
- Review audit logs for suspicious access

## Incident Response

### Minor Incident (400-499 errors <5%)

1. Monitor for escalation
2. Review relevant logs
3. Document findings
4. No user communication needed

### Major Incident (500 errors >5% or service down)

1. **Immediate**: Trigger rollback procedure
2. **Within 15 min**: Post-incident review
3. **Within 1 hour**: Communication to affected users
4. **Within 24 hours**: Root cause analysis
5. **Within 1 week**: Fix deployed and verified

### Communication Template

```
Service Impact: [Brief description]
Status: [Investigating/Mitigating/Resolved]
Start Time: [UTC timestamp]
Expected Resolution: [Timeframe]
Updates: [Every 30 minutes during incident]
```

## Scheduled Maintenance

### Weekly Tasks

- Review error logs for patterns
- Check database growth rate
- Monitor authentication metrics

### Monthly Tasks

- Review and update security policies
- Audit user access and permissions
- Analyze performance trends
- Update capacity planning

### Quarterly Tasks

- Security audit of API endpoints
- Database performance optimization
- Update operational runbooks
- Disaster recovery drill

## Documentation

- **Architecture**: See ARCHITECTURE.md
- **API Reference**: Auto-generated in Swagger/OpenAPI format
- **Database Schema**: See schema in supabase/migrations/
- **Troubleshooting**: See TROUBLESHOOTING.md

## Contacts and Escalation

- **Platform Owner**: Lalit Kumar (lalit@example.com)
- **Database Issues**: Supabase support (support@supabase.io)
- **Deployment Issues**: Vercel support (support@vercel.com)
- **Security Incidents**: security@example.com

## Version History

| Date       | Version | Changes                       |
| ---------- | ------- | ----------------------------- |
| 2026-07-16 | 1.0.0   | Initial production procedures |

---

**Last Updated**: 2026-07-16  
**Next Review**: 2026-08-16
