# Security Operations Runbook

**Type**: Runbook  
**Audience**: Security, DevOps, Backend Leads, All Engineers  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: After each security incident or quarterly  
**Time Estimate**: Varies by operation  
**Owner**: Governor Ω

---

## Quick Reference

Security operations for production platform. Covers vulnerability management, incident response, penetration testing, and security hardening.

**When to use**: Security incident, vulnerability discovered, permission audit, security testing  
**Success criteria**: Incidents contained, vulnerabilities patched, no unauthorized access

---

## Security Incident Response

### Security Incident Types

| Type                     | Examples                                 | Severity | Response Time |
| ------------------------ | ---------------------------------------- | -------- | ------------- |
| Unauthorized access      | Account compromise, data breach          | P1       | <5 min        |
| Data exposure            | Sensitive data in logs, misconfigured S3 | P1       | <30 min       |
| Vulnerability discovered | SQL injection, XSS, auth bypass          | P2       | <1 hour       |
| Credential leak          | API key exposed, password in code        | P2       | <30 min       |
| Suspicious activity      | Brute force, unusual API usage           | P2       | <1 hour       |
| Malware/intrusion        | Compromised system, backdoor             | P1       | <5 min        |

### Incident Declaration

**When to declare security incident**:

- Data breach (customer or company data)
- Unauthorized access to systems
- Malware detected
- Credentials leaked
- Security vulnerability exploited

**How to declare** (initiate immediately):

```
1. Stop the bleeding (containment)
   - Disable compromised account
   - Revoke exposed credentials
   - Take affected system offline (if necessary)

2. Notify escalation chain
   - Slack: @governor @security-team
   - Message: "SECURITY INCIDENT: [brief description]"
   - Example: "SECURITY INCIDENT: API key exposed in GitHub"

3. Create incident record
   - Issue: Title "[SECURITY] [Type]: [Description]"
   - Label: security-incident, P1 (or appropriate severity)

4. Begin investigation (see Investigation Phase below)
```

### Investigation Phase (P1: 30-60 min, P2: 1-2 hours)

**Questions to answer**:

1. **What was accessed/exposed?**
   - Which data?
   - Which accounts?
   - How many records?
   - Customer data or internal?

   Investigation:

   ```sql
   -- For unauthorized access:
   SELECT * FROM audit_logs WHERE action = 'unauthorized_access'
     AND created_at > NOW() - INTERVAL '24 hours';

   -- For data exposure:
   SELECT * FROM [table] WHERE accessed_by = 'unauthorized_user'
     OR accessed_from = 'unknown_ip';
   ```

2. **Who had access?**
   - How did they get in?
   - Did they have legitimate credentials?
   - Was this a brute force or social engineering?

3. **How long was access active?**
   - Start time: When first accessed?
   - End time: When discovered/blocked?
   - Duration: How long could they access?

4. **What did they do?**
   - Read data? Download?
   - Modify data? Delete?
   - Create accounts or access?

5. **How did we discover it?**
   - Alert?
   - Customer report?
   - Manual discovery?

### Containment & Recovery

**Immediate actions** (within 30 minutes):

For **unauthorized account access**:

```
1. Reset password immediately
2. Revoke all sessions/tokens
3. Check for secondary access methods
4. Review account activity logs
5. Enable MFA if not present
6. Notify account owner
```

For **exposed API key/credential**:

```
1. Revoke the key immediately
2. Check usage logs (what did attacker use it for?)
3. Generate new credential
4. Update all systems using the old credential
5. Rotate credential in CI/CD secrets
6. Check git history for other exposed keys
```

For **data breach**:

```
1. Identify scope: Which data? How many records?
2. Isolate affected workspace/customers
3. Check what actions were performed
4. Restore from backup if modified (timestamp?)
5. Notify affected customers immediately
6. Document timeline for postmortem
```

For **malware/intrusion**:

```
1. Take affected system offline
2. Do NOT restart (preserve forensics)
3. Isolate network (disconnect from internet)
4. Notify security team immediately
5. Begin forensic analysis
6. Plan system rebuild
```

### Recovery Actions

**Fix the vulnerability**:

- Code: Patch and deploy
- Configuration: Update settings and redeploy
- Access: Revoke and rotate credentials
- System: Rebuild or restore

**Verify recovery**:

- Patch deployed successfully
- Vulnerability no longer present
- No data loss
- System functioning normally

**Clear evidence**:

- Attacker accounts removed
- Malware cleaned
- Logs preserved for investigation
- Credentials rotated

---

## Vulnerability Management

### Vulnerability Discovery

**Sources**:

- Dependency scanning (npm audit, Snyk)
- Code review
- Penetration testing
- Security researcher reports
- Customer reports
- Bug bounty (if applicable)

### Vulnerability Assessment

For each vulnerability, determine:

| Factor                 | Assessment                                     |
| ---------------------- | ---------------------------------------------- |
| **Severity**           | Critical / High / Medium / Low                 |
| **CVSS Score**         | 0-10                                           |
| **Exploitability**     | Easy to exploit? Requires specific conditions? |
| **Impact**             | What's worst case? Data breach? Service down?  |
| **Affected component** | Which library? Which code?                     |
| **Exposure**           | How many users affected?                       |

**Severity scale**:

- **CRITICAL**: Exploitable immediately, data breach, RCE → Fix within 24 hours
- **HIGH**: Exploitable but requires conditions, significant impact → Fix within 1 week
- **MEDIUM**: Limited impact, harder to exploit → Fix within 1 month
- **LOW**: Minimal impact, harder to exploit → Fix when convenient

### Patch Process

**For dependency vulnerabilities**:

```bash
# 1. Identify vulnerable package
npm audit

# Example output:
# │ high       │ jsonwebtoken <9.0.0 │ Signature verification bypass │

# 2. Check if update available
npm list jsonwebtoken

# 3. Update package
npm update jsonwebtoken

# 4. Run tests to verify no breaking changes
npm test

# 5. Commit and deploy
git add package.json package-lock.json
git commit -m "fix: update jsonwebtoken to patch signature bypass"
git push origin main
```

**For code vulnerabilities**:

```
1. Isolate fix to separate branch
2. Write test that reproduces vulnerability
3. Implement fix
4. Verify test passes
5. Security review by second engineer
6. Deploy (may need expedited review)
7. Announce fix in security advisory (if user-facing)
```

### Tracking Vulnerabilities

Maintain vulnerability tracking spreadsheet:

| Vulnerability                 | Severity | Date Found | Status      | Patch Date | Notes             |
| ----------------------------- | -------- | ---------- | ----------- | ---------- | ----------------- |
| jsonwebtoken signature bypass | HIGH     | 2026-07-10 | Fixed       | 2026-07-11 | npm audit         |
| XSS in search                 | MEDIUM   | 2026-07-12 | In progress | TBD        | Code review found |

---

## Access Control & Permissions

### User Access Audit

**Monthly task**:

```sql
-- List all users with admin access
SELECT user_email, role, workspace_id, created_at
FROM user_workspace_roles
WHERE role IN ('owner', 'admin')
ORDER BY workspace_id;

-- Review: Is each person still supposed to have this access?
-- If no: Remove access
-- If yes: Keep
```

**Quarterly task**:

```sql
-- List users who haven't logged in 90+ days
SELECT user_email, last_login, workspace_id
FROM users
WHERE last_login < NOW() - INTERVAL '90 days'
AND deleted_at IS NULL;

-- Review: Should these accounts be disabled?
-- Delete old accounts or disable them
```

### Role Verification

**Monthly**: Verify roles match responsibilities

For each workspace:

- Owner count (should be 1-2)
- Admin count (should match team structure)
- Analysts (match compliance team)
- Viewers (executives, auditors)

**If mismatch**:

- Update role assignments
- Notify affected users
- Document change

### Credential Rotation

**API Keys**:

- Rotate every 90 days
- Check logs first (is key still used?)
- Generate new key
- Update all systems using old key
- Delete old key after 30 days of verification

**Database passwords**:

- Rotate quarterly (or after employee departure)
- Change in Supabase dashboard
- Update all connection strings

**SSH keys**:

- Rotate annually
- Check: Which keys are still used?
- Add new key before removing old

---

## Data Security

### Encryption Verification

**Data at rest**:

- [ ] Database encrypted (Supabase default: ✓)
- [ ] Backups encrypted
- [ ] Logs encrypted (if containing sensitive data)
- [ ] Secrets not stored in code

**Data in transit**:

- [ ] All traffic: HTTPS/TLS
- [ ] No plaintext passwords sent
- [ ] API tokens over HTTPS only
- [ ] Database connections encrypted

**Encryption strength**:

- [ ] TLS 1.2 or higher
- [ ] Cipher suites modern (not deprecated)
- [ ] Certificate valid and trusted

Check:

```bash
# Test TLS strength
curl -I https://newspulse-ai.vercel.app

# Check certificate
openssl s_client -connect newspulse-ai.vercel.app:443
# Look for: TLSv1.2 or TLSv1.3, strong cipher
```

### Sensitive Data Handling

**What counts as sensitive**:

- User passwords
- API keys / authentication tokens
- Database credentials
- Customer personal data (names, emails)
- Payment information (credit cards)
- Health information (if applicable)

**Where it should NOT appear**:

- ❌ Git repository
- ❌ Logs (console or application logs)
- ❌ Error messages shown to users
- ❌ Debug output
- ❌ Backups unless encrypted

**Where it IS safe**:

- ✓ Database (with RLS enforcement)
- ✓ Secrets manager (environment variables)
- ✓ Encrypted files
- ✓ Session storage (encrypted cookies)

**Regular checks**:

```bash
# Scan git history for secrets
git log --all -p | grep -i 'password\|secret\|key\|token'

# Scan code for hardcoded secrets
grep -r 'password.*=' app/
grep -r 'API_KEY' app/

# Scan recent commits for secrets
git log -p --follow -S 'secret' -- .
```

If found: Revoke credential, change in production, remove from git history

---

## Input Validation & Injection Prevention

### SQL Injection Testing

**How to test**:

```
Test input: '; DROP TABLE users; --

1. Try in form field that stores to database
2. Expected: Stored as literal string (escaped)
3. Verify: Input `'; DROP TABLE users; --` stored unchanged
4. Verify: Table NOT dropped
5. If table dropped: CRITICAL vulnerability!
```

**Prevention checklist**:

- [ ] All database queries use parameterized queries
- [ ] No string concatenation in SQL
- [ ] Input validated on server (not just client)
- [ ] Database user has limited permissions
- [ ] RLS policies prevent unauthorized access

### XSS Testing

**How to test**:

```
Test input: <img src=x onerror="alert('xss')">

1. Try in form field that displays to users
2. Expected: Rendered as text or escaped HTML
3. Verify: No alert popup appears
4. Verify: HTML shown as: &lt;img src=x ...&gt;
5. If alert popup: CRITICAL vulnerability!
```

**Prevention checklist**:

- [ ] All user input escaped when displayed
- [ ] No innerHTML used with user input
- [ ] React/Vue auto-escaping used correctly
- [ ] Content Security Policy configured
- [ ] No eval() or Function() with user input

### CSRF Prevention

**How to test**:

```
1. Create form with hidden CSRF token
2. Verify token present: <input name="csrf" value="...">
3. Verify token unique per request
4. Make request without token
5. Verify: Request rejected (403 or error)
6. Make request with wrong token
7. Verify: Request rejected
```

**Prevention checklist**:

- [ ] All forms include CSRF token
- [ ] Token verified on server
- [ ] Token invalidated after use
- [ ] Token changes per request
- [ ] SameSite cookie attribute set

---

## Third-Party Security

### Dependency Security

**Process**:

1. On every push: `npm audit` runs automatically
2. If vulnerabilities found: CI/CD blocks merge
3. Fix vulnerabilities before merging
4. Review advisory: What's the issue? How does it affect us?

**Quarterly: Full audit**:

```bash
# Check all dependencies for known vulnerabilities
npm audit --production

# Review each vulnerable package
# Ask: Is this in our code path? Can we update?
# If yes: Update. If no: Accept risk.
```

**Supply chain security**:

- [ ] Only install from npm registry
- [ ] Verify package signatures (npm v8+)
- [ ] Review package source code before adding
- [ ] Lock dependencies with package-lock.json
- [ ] Review dependency permissions (does it access fs? network?)

### Third-Party Services

**Review quarterly**:

For each third-party service (Supabase, Vercel, etc.):

- [ ] Access control: Who has admin access?
- [ ] Secrets: Are credentials secure?
- [ ] Audit logs: Can we see who did what?
- [ ] Compliance: Does it meet our standards?

**Example**: Supabase

- [ ] Team members reviewed
- [ ] Database passwords rotated
- [ ] Database credentials in CI/CD checked
- [ ] Audit logs reviewed for suspicious activity

---

## Security Testing & Validation

### Pre-Deployment Security Review

**Before every deploy**, check:

```
☐ No hardcoded secrets/passwords
☐ No debug logging of sensitive data
☐ All input validated
☐ All output escaped
☐ Authentication working
☐ Authorization enforced
☐ RLS policies in place
☐ HTTPS enforced
☐ Security headers present
```

### Security Scanning

**Automated**:

- `npm audit` (dependency vulnerabilities)
- Linter rules for common issues
- Type checking for type confusion

**Manual**:

- Code review (peer, security-focused)
- Penetration testing (quarterly)
- Security audit (annual)

**OWASP Top 10 Checklist**:

- [ ] 1. Injection (SQL, command, etc.)
- [ ] 2. Broken Authentication
- [ ] 3. Sensitive Data Exposure
- [ ] 4. XML External Entities (XXE)
- [ ] 5. Broken Access Control
- [ ] 6. Security Misconfiguration
- [ ] 7. Cross-Site Scripting (XSS)
- [ ] 8. Insecure Deserialization
- [ ] 9. Using Components with Known Vulnerabilities
- [ ] 10. Insufficient Logging & Monitoring

---

## Incident Postmortem: Security Edition

**For security incidents**, postmortem should answer**:

1. **What happened?** (Timeline)
   - When discovered?
   - Who accessed what?
   - What was modified/deleted?

2. **Why did it happen?** (Root cause)
   - How did attacker get in? (weak password? leaked key? vulnerability?)
   - Why wasn't it caught? (monitoring gap? audit trail?)

3. **Impact assessment**
   - Customer data exposed? (notify customers)
   - System compromised? (how long?)
   - Financial impact? (loss, recovery cost)

4. **What we'll do differently**
   - Code fix? (patch vulnerability)
   - Process fix? (better credential management)
   - Monitoring? (alert on suspicious activity)

5. **Learning for team**
   - What can we teach others?
   - Document vulnerability in runbook

---

## Security Dashboard

### Key Metrics to Track

| Metric                               | Current        | Target | Status |
| ------------------------------------ | -------------- | ------ | ------ |
| Unpatched vulnerabilities            | __             | 0      |        |
| Critical vulnerabilities             | __             | 0      |        |
| Unauthorized access attempts blocked | __ per day     | <10    |        |
| Security incidents                   | __ per quarter | 0      |        |
| Credentials leaked                   | __             | 0      |        |
| Failed login attempts                | __ per day     | <50    |        |

### Monthly Security Review

- [ ] Vulnerability scan results reviewed
- [ ] Access changes audited
- [ ] Incidents reviewed for patterns
- [ ] Third-party services assessed
- [ ] Update this runbook if needed

---

## Security Contacts & Escalation

### Security Team

- Security Lead: [Contact]
- On-call security: [Contact]
- Founder (Governor Ω): [Contact]

### Reporting Security Issues

**Internal**:

- Slack: @security-team
- Email: security@euroai.com

**External** (from security researchers):

- Email: security@euroai.com
- PGP key: [If applicable]
- Bug bounty program: [Link, if applicable]

---

## Compliance & Standards

### EU AI Act Compliance (Security)

- [ ] Data processing legally compliant
- [ ] Personal data protected
- [ ] Audit trails maintained
- [ ] Incident response procedures documented
- [ ] DPA (Data Processing Agreement) signed with customers

### Standards to Maintain

- [ ] OWASP Top 10: Not vulnerable to known issues
- [ ] NIST Cybersecurity Framework: Basic security practices
- [ ] SOC 2 Type II: If pursuing compliance

---

## Security Training

### For All Engineers

**Onboarding**: 1-hour security training

- Common vulnerabilities
- How to avoid them
- How to test for them
- Who to ask for help

**Quarterly**: 30-minute refresher

- New threat trends
- Recent incidents (learnings)
- Tool updates

### For On-Call

**Extra training**:

- Security incident response
- Rapid credential rotation
- Data breach containment
- Customer notification procedures

---

## Related Documents

- `INCIDENT_RESPONSE.md` — General incident response (applies to security too)
- `CHECKLISTS/MONTHLY_COMPLIANCE_AUDIT.md` — Security verification checklist
- `CHECKLISTS/PRE_DEPLOYMENT.md` — Security checks before deploy
- `docs/governance/ENGINEERING_STANDARDS.md` — Security coding standards

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
