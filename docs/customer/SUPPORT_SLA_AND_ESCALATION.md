# Customer Support SLA & Escalation Procedures

## EURO AI Platform — Support Commitment

**Authority:** Governor (Chief Advisor & Chief of Staff)  
**Effective Date:** 2026-07-12  
**Valid For:** EURO AI Customers (All Tiers)

---

## Executive Summary

EURO AI is committed to providing responsive, professional support during your pilot and production phases. This document defines response times, escalation procedures, and support channels.

**Support Tiers:**

- 🟢 **Pilot Customers:** Priority support during onboarding (Weeks 1-5)
- 🔵 **Production Customers:** Standard support with SLA guarantees
- 🟠 **Enterprise Customers:** Premium support (available post-pilot)

---

## Support Channels

### Primary Support Channel: Email

**Email:** support@euro-ai.production  
**Response Time Target:** 4 hours (business hours, same business day)

**What to include in support emails:**

1. Issue title (one line)
2. Severity level (CRITICAL / HIGH / MEDIUM / LOW)
3. What happened (describe the issue)
4. What you expected (describe expected behavior)
5. How to reproduce (step-by-step)
6. Screenshots/logs (if available)
7. Browser/OS (Chrome, Safari, Firefox, etc.)

**Example Email:**

```
Subject: [MEDIUM] Cannot save risk assessment

Issue: When I try to save a risk assessment as "In Review",
I get a "permission denied" error.

Expected: The assessment should save and move to "In Review" status.

Steps to reproduce:
1. Create new risk assessment
2. Fill out all fields (10 questions)
3. Click "Save as In Review"
4. Error appears: "permission denied"

Browser: Chrome 126 on Windows 11
Screenshot: [attached]
```

### Secondary: Slack (Pilot Only)

**Channel:** #euro-ai-support-[customer-name]  
**Response Time Target:** 1 hour (best effort, pilot phase)

**Slack is for quick questions only.** Use email for complex issues.

### Emergency Hotline

**Phone:** +49-[number] (available 24/7 for CRITICAL issues)  
**Response Time:** 15 minutes

**CRITICAL definition only:**

- System completely down (cannot log in, use core features)
- Data loss or data corruption
- Security incident
- Customer cannot complete critical workflow

**Do NOT use for:** Feature requests, general questions, medium/low severity issues.

---

## Support SLA by Severity

### 🔴 CRITICAL Severity

**Definition:**

- System down or completely unusable
- Data loss or corruption
- Security incident
- All users blocked on critical workflow
- Production environment affected

**Response Time:** 30 minutes (any time, 24/7)  
**First Update:** Within 30 minutes of report  
**Status Updates:** Every 1 hour until resolved  
**Resolution Target:** 4 hours (best effort)

**Who handles:** Founder (immediate escalation) + Governor (technical)

**Example:** "I can't log in to EURO AI. No users can access the platform."

---

### 🟠 HIGH Severity

**Definition:**

- Core feature broken (cannot add AI systems, assess risk, upload evidence)
- Major functionality not working
- Data inaccessible temporarily
- Performance severely degraded
- Affects multiple users or workflows

**Response Time:** 4 hours (business hours)  
**First Update:** Within 4 hours  
**Status Updates:** Daily until resolved  
**Resolution Target:** 24 hours (best effort)

**Who handles:** Governor (technical support) + Founder (if escalation needed)

**Example:** "The risk assessment form won't submit. I've filled all required fields but the 'Save' button is grayed out."

---

### 🟡 MEDIUM Severity

**Definition:**

- Non-core feature not working (reports, exports)
- Performance degraded but usable
- Workaround exists
- Affects single user or non-critical workflow
- UI confusion or unclear error message

**Response Time:** 24 hours (business hours)  
**First Update:** Within 24 hours  
**Status Updates:** Weekly  
**Resolution Target:** 3-5 business days

**Who handles:** Governor (technical support)

**Example:** "The PDF export feature isn't working. I can work around it by copying data into Excel."

---

### 🟢 LOW Severity

**Definition:**

- Feature request or enhancement
- Documentation gap
- Minor UI issue
- Cosmetic bug (doesn't affect functionality)
- Questions about best practices

**Response Time:** 1 week (best effort)  
**First Update:** Within 1 week  
**Status Updates:** As prioritized  
**Resolution Target:** 2-4 weeks

**Who handles:** Governor (documentation/product team)

**Example:** "The date picker doesn't highlight today's date. It would be nice if it did."

---

## Escalation Procedures

### Level 1: Support Team (Governor)

**Receives:** Email to support@euro-ai.production  
**Authority:** Fix common issues, debug problems, provide troubleshooting guidance  
**Response Time:** Per SLA above

**Common L1 Resolutions:**

- Guide customer through troubleshooting steps
- Provide documentation or training
- Confirm browser/network issue vs. platform issue
- Reset user credentials
- Restart affected service (if available)

**When to escalate to L2:** Cannot resolve after 2 hours or needs Founder approval

---

### Level 2: Founder (Customer Success Lead)

**Escalation triggers:**

- CRITICAL issue not resolving within 2 hours
- HIGH issue not resolving within 8 hours
- Customer requests direct contact
- Legal/contractual question
- Feature request needs product decision

**Authority:** Make product decisions, authorize workarounds, direct Governor resources  
**Response Time:** 1 hour (for CRITICAL), 4 hours (for HIGH)

**Who contacts:** Founder directly (support@euro-ai.production marks ESCALATE: FOUNDER in subject)

**Example escalation email:**

```
Subject: ESCALATE: FOUNDER - HIGH ISSUE - Risk assessments failing to save

Issue: Customer cannot save risk assessments (business-critical).
Governor has spent 2 hours troubleshooting. Issue appears to be
RLS policy configuration, not user error.

Customer: [Name]
Workspace: [ID]
Impact: Customer cannot complete daily work
Blocker: Production onboarding delayed

Request: Founder to review RLS policy logs and determine if
schema deployment issue or permission grant issue.

Recommendation: If schema issue, may need rollback + redeployment.
If permission issue, may need manual grant in database.
```

---

### Level 3: Engineering Deep Dive (Governor + Founder)

**Escalation triggers:**

- CRITICAL issue involving database/infrastructure
- Potential data loss or corruption
- Security incident
- Issues requiring code changes
- Issues affecting multiple customers

**Authority:** Change code, modify database schema, take extraordinary measures  
**Response Time:** 15 minutes (CRITICAL)

**Process:**

1. Governor reports to Founder with full technical context
2. Founder authorizes remediation approach
3. Governor executes fix
4. Both verify resolution
5. Root cause analysis scheduled for post-resolution

---

## What to Expect at Each Step

### Step 1: Initial Email/Report

You'll receive:

- Confirmation that we received your report
- Ticket number (for reference)
- Preliminary severity assessment
- Estimated response time

**Timeline:** Within 1 hour

### Step 2: First Response

Governor will:

- Acknowledge the issue
- Ask clarifying questions (if needed)
- Provide initial troubleshooting steps OR
- Confirm it's a platform issue and begin investigation

**Timeline:** Per SLA (4 hours to 1 week depending on severity)

### Step 3: Investigation

Governor will:

- Review application logs
- Check database state
- Verify RLS policies
- Test the issue in a test workspace
- Identify root cause

**You'll receive:** Daily status updates (for HIGH/CRITICAL)

### Step 4: Resolution

Governor will:

- Fix the issue (code change, database fix, or configuration change)
- Verify resolution in test environment
- Prepare fix deployment procedure
- Request your approval before deploying to your workspace

### Step 5: Verification

You will:

- Test the fix in your workspace
- Confirm the issue is resolved
- Report any remaining issues

Governor will:

- Confirm resolution with you
- Document the issue and fix (for future reference)
- Close the ticket

---

## Pilot vs. Production Support

### During Pilot (Weeks 1-5)

**SLA Relaxed:** We're partners optimizing EURO AI together.

| Severity | Pilot Response | Production Response |
| -------- | -------------- | ------------------- |
| CRITICAL | 30 min         | 30 min              |
| HIGH     | 4 hours        | 4 hours             |
| MEDIUM   | 24 hours       | 24 hours            |
| LOW      | 1 week         | 1 week              |

**Pilot focus:** Get you productive + identify product gaps

**Founder involvement:** Direct (daily check-ins, weekly reviews)

### After Pilot (Production)

**SLA Formal:** Guaranteed response times.

**Founder involvement:** Strategic guidance (weekly reviews, quarterly planning)

**Governor involvement:** Daily support + monitoring

---

## Known Limitations & Workarounds

### Limitation 1: Bulk Upload Not Yet Available

**Issue:** Cannot upload multiple evidence documents at once (one-by-one only)

**Workaround:** Use the batch upload API (contact support for endpoint)

**Timeline:** Available in next release (Week 3)

### Limitation 2: Custom Reports Limited

**Issue:** Cannot create fully custom compliance reports (preset templates only)

**Workaround:** Export data to CSV, build custom reports in Excel

**Timeline:** Custom report builder in v1.1 (Month 2)

### Limitation 3: No Advanced Permissions

**Issue:** All admins have the same permissions (cannot restrict specific features)

**Workaround:** Train admins to follow governance policy

**Timeline:** Fine-grained permissions in v1.1

---

## Support During Extended Outages

If EURO AI experiences an outage lasting >2 hours:

1. **Founder will call you** (voice call, not email)
2. **Status page** (status.euro-ai.production) updated every 30 min
3. **Slack channel** (if available) for real-time updates
4. **Post-outage report:** Sent within 24 hours of resolution

**Compensation for pilot customers:** Proportional credit toward production pricing

---

## Feedback & Continuous Improvement

We welcome feedback on support quality!

**How to send feedback:**

- Reply to any support email with: "FEEDBACK: [your comments]"
- Annual customer survey (sends at end of year)
- Direct email to: [founder email]

**What we track:**

- Support response times (actual vs. SLA target)
- First-response resolution rate
- Customer satisfaction scores
- Common issues (for product prioritization)

---

## Support Team Directory

| Role                            | Name     | Email                      | Response Time |
| ------------------------------- | -------- | -------------------------- | ------------- |
| Customer Success Lead (Founder) | [Name]   | [email]                    | 1-4 hours     |
| Technical Support (Governor)    | Governor | support@euro-ai.production | Per SLA       |
| Emergency Hotline               | [Name]   | +49-[number]               | 15 min        |

---

## Frequently Asked Questions

**Q: Can I reach support on weekends?**  
A: For CRITICAL issues only (system down, data loss). Use emergency hotline.

**Q: What if I don't get a response within the SLA time?**  
A: Contact Founder directly. Response time failure is taken seriously.

**Q: Will my data be backed up if there's an outage?**  
A: Yes. Supabase backs up daily automatically. You can also export your data anytime via Settings → Export.

**Q: How long will the pilot support last?**  
A: 4-5 weeks (Weeks 1-5 of onboarding). After pilot completion, you transition to production SLA.

**Q: Can I get premium support after pilot?**  
A: Yes! Enterprise support tiers available. Contact Founder to discuss options.

**Q: Who can open a support ticket?**  
A: Any workspace admin or owner. Owners should empower admins to report issues directly.

---

## Acknowledgment

**I understand and accept this Support SLA:**

Customer Name: ___________________________  
Customer Email: ___________________________  
Workspace: ___________________________  
Date: ___________________________  
Signature (digital OK): ___________________________

---

**Questions about this SLA?** Email support@euro-ai.production and mention "SLA Question"

---

_Last updated: 2026-07-12_  
_Version: 1.0_  
_Next review: 2026-08-12 (one month post-pilot)_
