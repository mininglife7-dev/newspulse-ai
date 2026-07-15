# Disaster Recovery & Business Continuity Plan

**Purpose:** Define procedures for responding to infrastructure failures, data loss, security incidents, and ensuring business continuity  
**Audience:** Founder, operations team, incident responders  
**Version:** 1.0  
**Last Updated:** 2026-07-15  
**Review Frequency:** Quarterly or after major incidents  

---

## Executive Summary

This plan covers disaster scenarios and recovery procedures for NewsPulse AI. The system is designed for **high availability** (99.5% uptime) with **rapid recovery** capabilities.

**Key Numbers:**
- **RTO (Recovery Time Objective):** <40 minutes for complete outage
- **RPO (Recovery Point Objective):** <24 hours for data loss
- **Uptime Target:** 99.5% (allows 3.6 hours/month downtime)
- **Incident Detection:** <5 minutes (automatic via health crons)
- **Incident Communication:** <10 minutes (Founder + team notified)

**Worst-Case Scenario:** Complete system failure requiring full database recovery
**Recovery Timeline:** ~1 hour total (detection + recovery + verification)

---

## Disaster Scenarios & Procedures

### Scenario 1: Application Server Crash (Vercel Outage)

**Severity:** P1 (Critical) — All users affected  
**Symptoms:**
- `/api/health` endpoint returns 500 error
- Preview deployments inaccessible
- All API routes timing out

**Root Causes:**
- Vercel infrastructure failure (rare, <0.1% occurrence)
- Deployment failure (code bug prevents start)
- Out of memory (memory limit exceeded)

**Detection:** Automatic via `/api/health` cron (runs every 5 minutes)

**Recovery Procedure:**

1. **Immediate (0-5 min):**
   - Alert triggered in Vercel dashboard
   - Cron notifies Governor (automatic)
   - Governor escalates to Founder

2. **Diagnosis (5-15 min):**
   - [ ] Check Vercel dashboard for deployment status
   - [ ] Review function logs in Vercel
   - [ ] Check error messages (out of memory? build failure?)
   - [ ] Verify database is still accessible (query Supabase)

3. **Recovery (15-40 min):**
   - **If build failure:**
     - Revert to previous commit: `git revert HEAD`
     - Push to main branch
     - Vercel auto-deploys (~2-5 min)
     - Verify `/api/health` returns 200
   
   - **If out of memory:**
     - Not expected (current memory use ~100 MB, limit 3,008 MB)
     - If occurs: Optimize code or increase function memory
     - Redeploy and verify

   - **If Vercel infrastructure failure:**
     - No action possible on our end
     - Wait for Vercel to recover (usually <30 min)
     - Monitor status page: https://www.vercel.com/status
     - Post update to customers

4. **Verification (40+ min):**
   - [ ] `/api/health` returns 200 OK
   - [ ] `/api/production-health` all checks pass
   - [ ] Test signup flow manually
   - [ ] Test workspace creation
   - [ ] Verify no data loss (spot-check 5 recent records)

**Comms:** Email customers with resolution status once verified

---

### Scenario 2: Database Connection Failure

**Severity:** P1 (Critical) — All API requests fail  
**Symptoms:**
- API responses: "database connection error"
- Health checks: database unavailable
- Supabase dashboard shows connection issues

**Root Causes:**
- Supabase infrastructure failure
- Connection pool exhausted (200 max)
- Database authentication error
- Network routing issue

**Detection:** Automatic via `/api/production-health` cron

**Recovery Procedure:**

1. **Immediate (0-5 min):**
   - Check Supabase status page: https://status.supabase.io
   - If Supabase is down: They're handling it, wait for recovery
   - If Supabase is up: Issue is on our side

2. **Diagnosis (5-15 min):**
   - [ ] Check Supabase dashboard → Logs
   - [ ] Look for authentication errors
   - [ ] Check connection pool status
   - [ ] Verify SUPABASE_ANON_KEY is correct in environment
   - [ ] Verify network connectivity to database

3. **Recovery (15-40 min):**
   - **If Supabase is down:**
     - Post customer update: "We're experiencing database issues, Supabase team is investigating"
     - Set expectations: "Estimated recovery: 30 minutes"
     - Check status page for updates every 5 minutes
   
   - **If connection pool exhausted:**
     - Upgrade Supabase plan (from Pro to Business): $100+/month
     - Supabase restarts connection pool (~5 min)
     - Database access restored
   
   - **If authentication error:**
     - Verify database password hasn't changed
     - Check environment variables in Vercel
     - Re-deploy if variables changed: `git commit --allow-empty -m "refresh env" && git push`

4. **Verification (40+ min):**
   - [ ] Connect to database with `psql` (manual test)
   - [ ] Run simple query: `SELECT COUNT(*) FROM profiles`
   - [ ] Verify connection pool status in Supabase dashboard
   - [ ] Test API endpoint: GET `/api/dashboard`
   - [ ] Perform end-to-end test (signup → workspace → system)

---

### Scenario 3: Data Loss or Corruption

**Severity:** P1 (Critical) — Customer data at risk  
**Symptoms:**
- Customer reports missing data
- Workspace appears empty when it shouldn't be
- AI systems disappeared from dashboard
- SQL error: "constraint violation" in logs

**Root Causes:**
- Accidental deletion (bug in code or database script)
- Data corruption (application bug)
- Ransomware/malicious attack
- Storage failure (very unlikely with Supabase)

**Detection:** Manual (customer reports) or automated (data integrity checks)

**Prevention (Before It Happens):**
- [ ] Supabase backups enabled (automatic, daily)
- [ ] Backups retained for 30+ days
- [ ] Point-in-time recovery tested (monthly)
- [ ] Immutable audit log in place (Supabase handles)

**Recovery Procedure:**

1. **Immediate (0-10 min):**
   - [ ] Pause application (stop deployments)
   - [ ] Don't run any migration scripts
   - [ ] Notify Founder immediately (this is data loss)
   - [ ] Escalate to highest priority
   - [ ] Assess scope: which data? how much? how many users?

2. **Diagnosis (10-30 min):**
   - [ ] Check Supabase audit logs for what changed
   - [ ] Run data integrity query:
     ```sql
     -- Check for orphaned records
     SELECT COUNT(*) FROM ai_systems WHERE company_id NOT IN (SELECT id FROM companies);
     SELECT COUNT(*) FROM companies WHERE workspace_id NOT IN (SELECT id FROM workspaces);
     ```
   - [ ] Determine: Is data actually missing or just hidden by bug?
   - [ ] Check application logs for error messages
   - [ ] Determine approximate time of data loss

3. **Recovery (30-90 min):**
   - **If data is hidden (not actually deleted):**
     - Fix application bug
     - Redeploy
     - Verify data reappears
     - No customer impact
   
   - **If data is actually deleted:**
     - Go to Supabase dashboard → Backups
     - Select restore point (before data loss)
     - Initiate restore (creates new database instance)
     - This takes ~15-30 minutes
     - Test recovery: connect to restored database, verify data
   
   - **If data loss confirmed:**
     - Update application to point to recovered database
     - Change SUPABASE_DB_URL environment variable
     - Redeploy application
     - Re-run E2E tests to ensure no new issues
   
   - **If restore fails:**
     - Contact Supabase support immediately (emergency)
     - Provide: what data was lost, when, how to identify it
     - Supabase has additional backup options beyond the standard backups

4. **Verification (90+ min):**
   - [ ] Data integrity checks pass (query above)
   - [ ] Customer reports data restored
   - [ ] RLS policies still enforced (no data leak between workspaces)
   - [ ] Spot-check 10 random records from recovery
   - [ ] Review application logs for any errors

5. **Post-Incident (Next Day):**
   - [ ] Root cause analysis: How did data get deleted?
   - [ ] Fix the bug that caused deletion
   - [ ] Add test to prevent recurrence
   - [ ] Review backup retention policy
   - [ ] Consider implementing automated integrity checks

**Communication Template:**
```
Subject: Data Recovery Complete - [Issue Details]

We experienced a data loss incident affecting [number] workspaces.
We recovered all data from our automatic backups (no data loss to customers).

What happened: [Brief explanation]
When: [Time range]
Impact: [Which users/workspaces affected]
Resolution: [Data restored]
Root cause: [Bug fixed]

We've taken the following actions to prevent recurrence:
- Fixed the bug in [component]
- Added automated integrity checks
- Reviewed backup procedures

We sincerely apologize for the incident. Questions? Reply to this email.
```

---

### Scenario 4: Security Breach or Unauthorized Access

**Severity:** P1 (Critical) — Customer data privacy at risk  
**Symptoms:**
- Customer reports seeing another company's data
- Suspicious login from unknown location
- Database access logs show unusual queries
- Admin key exposed in logs or repository

**Root Causes:**
- RLS policy bypass (very rare, would require code bug)
- Credential exposure (database password in logs)
- Account takeover (customer password compromised)
- Social engineering / insider threat

**Detection:** Manual (customer reports) or automated (suspicious access patterns)

**Prevention (Before It Happens):**
- [ ] No secrets in code (checked in pre-launch audit)
- [ ] Admin key isolated in server-only module
- [ ] RLS policies tested for injection attacks
- [ ] Rate limiting prevents brute force
- [ ] HTTPS enforced (all connections encrypted)

**Recovery Procedure:**

1. **Immediate (0-5 min):**
   - [ ] Escalate to Founder immediately
   - [ ] If admin key exposed: Rotate immediately
     - Go to Supabase dashboard → Settings → API
     - Generate new service role key
     - Update SUPABASE_SERVICE_ROLE_KEY in Vercel
     - Redeploy
   - [ ] If customer account compromised: Have them reset password
   - [ ] Do NOT admit vulnerability to other customers yet

2. **Diagnosis (5-30 min):**
   - [ ] Check Supabase audit logs for unauthorized access
   - [ ] Identify what data was accessed
   - [ ] Identify which workspaces were affected
   - [ ] Determine if data was exfiltrated or just viewed
   - [ ] Check if RLS policies were bypassed or creds were stolen

3. **Containment (30-60 min):**
   - **If RLS policy bypass:**
     - Shut down API immediately (deploy kill switch)
     - This is a critical vulnerability
     - Contact Supabase security team
     - Do NOT restart until fix verified
   
   - **If credentials stolen:**
     - Rotate all database passwords
     - Rotate all API keys
     - Check git history for exposed secrets
     - If secret was in repository, force-push history removal (advanced)
   
   - **If customer account compromised:**
     - Lock customer's account temporarily
     - Force password reset
     - Invalidate all existing sessions
     - Require MFA re-setup

4. **Investigation (1-24 hours):**
   - [ ] Determine root cause (code bug? exposed secret? compromised password?)
   - [ ] Assess scale: how many records viewed? other customers affected?
   - [ ] Review logs to identify pattern
   - [ ] Check if vulnerability exists in production code or was already patched

5. **Remediation (24-72 hours):**
   - [ ] Fix the vulnerability (code fix, secret rotation, etc.)
   - [ ] Deploy fix to production
   - [ ] Add automated tests to prevent recurrence
   - [ ] Security audit of related code

6. **Communication (24 hours):**
   - [ ] Notify affected customers
   - [ ] Be transparent about what happened
   - [ ] Explain containment and remediation steps
   - [ ] Provide recommended actions (change passwords, etc.)
   - [ ] Offer support if customers have concerns

**Mandatory Reporting:**
- Check if any customer data includes PII (names, emails, addresses)
- If GDPR applies: Notify affected users within 72 hours of breach
- If CCPA applies: Notify California residents
- Keep documentation for regulatory audit

---

### Scenario 5: Data Center or Regional Outage

**Severity:** P1 (Critical) — All services in region unavailable  
**Symptoms:**
- All API endpoints timeout
- Database unreachable
- Vercel deployment region shows critical error
- Multiple Supabase services down

**Root Causes:**
- Cloud provider data center failure (AWS, Google Cloud)
- Regional network outage
- Power failure in region
- Natural disaster (earthquake, fire, etc.)

**Detection:** Automatic via health crons

**Recovery Procedure:**

1. **Immediate (0-10 min):**
   - [ ] Check cloud provider status pages:
     - Vercel: https://www.vercel.com/status
     - Supabase (uses AWS): https://status.aws.amazon.com
   - [ ] Monitor social media for reports of outage
   - [ ] Notify customers of status

2. **Waiting for Recovery (10 min - 2 hours):**
   - [ ] No action available on our end
   - [ ] Cloud providers will restore service
   - [ ] Estimated recovery: 30 minutes to 2 hours (depends on scale of outage)
   - [ ] Post updates every 15 minutes

3. **After Recovery (2+ hours):**
   - [ ] Check health endpoints
   - [ ] Verify data integrity (no corruption from outage)
   - [ ] Perform full system test
   - [ ] Resume normal operations

**Mitigation (Future):**
- This is a cloud-provider-level problem
- Would require multi-region deployment (~$200+/month)
- Not recommended for MVP
- Re-evaluate after reaching 10,000+ workspaces

---

### Scenario 6: Third-Party Dependency Failure

**Severity:** P2-P3 (depends on dependency)  
**Symptoms vary by dependency:**
- Supabase Auth not sending emails
- Vercel build system failures
- GitHub Actions failing

**Root Causes:**
- Third-party service outage
- Rate limit exceeded
- Credentials expired
- API version incompatibility

**Detection:** Automatic (health crons) + manual (customer reports)

**Recovery Procedure:**

1. **For Supabase Email Outage:**
   - Temporary workaround: Email notifications paused
   - Manual recovery: Ask customers to reset password on login page
   - If persistent: Consider alternative email provider (SendGrid)

2. **For Vercel Build Failures:**
   - Check Vercel status page
   - Retry deployment manually
   - If issue persists: Deploy to alternative (Netlify, AWS Amplify)

3. **For GitHub Actions:**
   - CI pipeline doesn't block deployment
   - Code still deploys to production
   - Re-run actions manually if needed

---

## Business Continuity Plan

### Continuity Objectives

| Objective | Target | Notes |
|-----------|--------|-------|
| **RPO** (Recovery Point Objective) | <24 hours | Acceptable for MVP; daily backups sufficient |
| **RTO** (Recovery Time Objective) | <1 hour | Automated recovery can be completed in 40-60 min |
| **MTTR** (Mean Time to Recovery) | <30 min | Detection + diagnosis + fix typical timeframe |
| **Acceptable Downtime** | 3.6 hours/month | 99.5% uptime SLA (allows for incidents) |

### Continuity Strategy

**High Availability:**
1. Redundant cloud infrastructure (Vercel manages this)
2. Automated health monitoring (every 5 minutes)
3. Quick rollback capability (git revert + redeploy)
4. Database backups (automatic, daily retention)

**Rapid Recovery:**
1. Containerized deployment (Vercel handles)
2. Infrastructure-as-Code (vercel.json, next.config.js)
3. Automated tests (run on every PR)
4. Documented procedures (this document)

**Redundancy:**
- Frontend: Vercel CDN (redundant globally)
- Database: Supabase (multi-replica, auto-failover)
- DNS: Vercel DNS (globally distributed)

**Single Point of Failure:** Database authentication key (SUPABASE_SERVICE_ROLE_KEY)
- Mitigation: Rotate quarterly, store in vault, limited distribution
- If exposed: Can rotate in <5 minutes

---

## Communication Plan

### During Incident

**Timeline:**
- **T+5 min:** Founder notified automatically
- **T+10 min:** Governor escalates if needed
- **T+15 min:** Customer communication if outage >15 min
- **T+30 min:** Status update to customers

**Communication Channels:**
1. Email to support list: mininglife7@gmail.com
2. Status page (if available in future)
3. Twitter/LinkedIn (if major outage)

**Template:**
```
Subject: [INCIDENT] System Unavailable - [Issue]

We're currently experiencing [brief description].

What's happening: [Details]
Expected resolution: [Time estimate]
Next update: [Frequency of updates]

We're working to restore service as quickly as possible.
Questions: Reply to this email.
```

### Post-Incident Communication

**24 hours after resolution:**
```
Subject: [RESOLVED] Incident Summary

We've resolved the [issue] that affected service on [date].

What happened: [Description]
Duration: [How long]
Affected users: [Who]
Root cause: [Why it happened]
Prevention: [What we're doing to prevent it]

We sincerely apologize for the disruption.
```

---

## Testing & Verification

### Monthly Disaster Recovery Drills

**Every month (first Monday):**
- [ ] Verify Supabase backups exist
- [ ] Test point-in-time recovery to staging database
- [ ] Verify recovery can be completed in <30 minutes
- [ ] Document any issues found
- [ ] Update procedures if needed

### Annual Disaster Recovery Test

**Yearly (Q1):**
- [ ] Full simulated outage test
- [ ] Practice failover to backup region (if applicable)
- [ ] Verify communication procedures
- [ ] Test customer notification process
- [ ] Document lessons learned

### Load Testing (Post-Launch)

**Before scale-up events:**
- [ ] Simulate 2x expected load
- [ ] Verify no cascading failures
- [ ] Identify breaking points
- [ ] Update disaster procedures if limits changed

---

## Escalation Procedures

### On-Call Rotation (Post-Launch)

**During first month:**
- Governor on-call 24/7
- Founder available for escalation

**After stabilization (Month 2+):**
- Governor during business hours
- Founder available for critical incidents

### Escalation Path

**Level 1 (Minor Issue):**
- Governor diagnoses and fixes
- No Founder notification needed
- Logged for review

**Level 2 (Significant Issue):**
- Governor diagnoses
- Escalates to Founder if uncertain about fix
- Fixes with Founder approval

**Level 3 (Critical Issue):**
- Governor detects, notifies Founder immediately
- Joint decision making
- May require customer communication

**Level 4 (Catastrophic Issue):**
- Founder makes final decisions
- All available resources mobilized
- External support may be engaged

---

## Equipment & Infrastructure Checklist

**Before Launch:**
- [ ] Supabase Pro plan active
- [ ] Vercel Pro plan active
- [ ] Backups enabled and tested
- [ ] Health monitoring crons deployed
- [ ] Incident response playbook (this document) published
- [ ] Escalation contacts configured
- [ ] Recovery procedures documented
- [ ] RLS security audit completed

**Monthly (First of Month):**
- [ ] Verify backup retention (30+ days)
- [ ] Test restore procedure
- [ ] Review incident logs
- [ ] Update contact information

**Quarterly:**
- [ ] Full security audit
- [ ] Disaster recovery drill
- [ ] Review and update procedures

---

## Document Control

**Prepared by:** Governor, Chief of Staff  
**Reviewed by:** [Pending - requires Founder review]  
**Approved by:** [Pending - requires Founder sign-off]  
**Created:** 2026-07-15  
**Last Updated:** 2026-07-15  
**Next Review:** 2026-10-15 (quarterly)  

---

**This is the definitive incident response and disaster recovery document. Update after each significant incident or quarterly. Test procedures annually.**
