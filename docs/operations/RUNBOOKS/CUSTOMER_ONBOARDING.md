# Customer Onboarding Runbook

**Type**: Runbook  
**Audience**: Customer Success Team, Sales, Operations  
**Authority**: Governor Ω  
**Status**: Active  
**Last Updated**: 2026-07-16  
**Review Schedule**: After each onboarding or quarterly  
**Time Estimate**: 1-2 hours per customer  
**Owner**: Governor Ω

---

## Quick Reference

Step-by-step procedure for onboarding a new customer to EURO AI platform. Covers workspace setup, initial configuration, user access, and first-day success.

**When to use**: New customer signs up or is invited to workspace

**Success criteria**: Customer can log in, create workspace, inventory systems, and run first assessment

---

## Pre-Onboarding (5 min)

### Receive Customer Details

From sales or customer signup:

- [ ] Customer name: `[name]`
- [ ] Customer email: `[email]`
- [ ] Organization: `[org name]`
- [ ] Industry: `[industry]`
- [ ] Expected users: `[number]`
- [ ] AI systems to inventory: `[approximate count]`
- [ ] Primary use case: `[describe]`

### Prepare Materials

- [ ] Welcome email template ready
- [ ] Getting started guide prepared
- [ ] Support contact information documented
- [ ] Onboarding checklist printed/shared

### Verify Service Ready

```bash
curl -s https://newspulse-ai.vercel.app/api/health | jq .
# Should show: status: healthy
```

If not healthy: Pause onboarding until fixed.

---

## Phase 1: Welcome & Initial Setup (10 min)

### Send Welcome Email

**Subject**: "Welcome to EURO AI — Getting Started"

**Content**:

```
Hi [Customer Name],

Welcome to EURO AI! We're excited to help you manage AI governance
and EU AI Act compliance.

Your next steps:
1. Create your workspace at: https://newspulse-ai.vercel.app
2. Invite your team members
3. Add your first AI system to the inventory
4. Run a risk assessment
5. Schedule a call with our team if questions

Getting started guide: [link to docs]
Support: [contact info]

Let us know if you have questions!
- The EURO AI Team
```

### Track Customer in System

- [ ] Add to customer database/CRM
- [ ] Create customer workspace in system (or verify they created one)
- [ ] Verify customer can log in
- [ ] Document start date and assigned CSM

---

## Phase 2: Workspace Setup (15-20 min)

### Walk Customer Through Signup (If New User)

**Guide them to:**

1. Go to: https://newspulse-ai.vercel.app
2. Click "Sign Up"
3. Enter email and password
4. Verify email (check inbox)
5. Create workspace:
   - [ ] Workspace name: `[organization name]`
   - [ ] Industry: `[select]`
   - [ ] Country/Region: `[select]`

### Verify Workspace Created

- [ ] Workspace appears in dashboard
- [ ] Current user is workspace owner
- [ ] RLS isolation verified (can't see other workspaces)

### Review Workspace Settings

Walk customer through:

1. **Workspace settings page**
   - Workspace name (can change)
   - Workspace ID (cannot change)
   - Description (optional, for internal notes)

2. **Compliance settings** (if available)
   - Data residency: EU (default, cannot change)
   - Audit logging: Enabled
   - RLS policies: Enabled (cannot change)

3. **Notification preferences**
   - Email notifications for assessments
   - Weekly compliance summary
   - Alert settings

---

## Phase 3: Team Setup (20-30 min)

### Add Team Members

1. **Go to: Team page**
   - Settings → Team or Team tab

2. **Invite team members**
   - Click "Invite Member" button
   - Enter email address
   - Select role:
     - **Owner**: Full access, can invite/remove users (usually 1-2 people)
     - **Admin**: Can manage systems and assessments
     - **Analyst**: Can view and comment on assessments
     - **Viewer**: Read-only access to assessments

3. **Send invitations**
   - System sends email to each invitee
   - They click link to accept invitation
   - They are added to workspace

### Explain Roles

For each invited user, explain their role:

- **Owner**: Manages team, workspace settings, billing (usually CEO/CTO)
- **Admin**: Creates AI systems, runs assessments, manages obligations (usually compliance officer or team lead)
- **Analyst**: Reviews assessments, provides feedback, tracks evidence (team members)
- **Viewer**: Views dashboards and reports, no editing (executives, auditors)

### Verify Team Setup

- [ ] All team members invited
- [ ] Invitations sent successfully
- [ ] At least 2 people with Owner/Admin access
- [ ] Roles appropriate for responsibilities

---

## Phase 4: Initial Inventory (30-40 min)

### Add First AI System

Guide customer to add their first AI system:

1. **Go to: Inventory page**
   - Click "AI Systems" or "Inventory" from sidebar

2. **Click "Add AI System" button**

3. **Fill in system details**
   - System name: `[required]` - e.g., "Customer Recommendation Engine"
   - Description: `[optional]` - What does it do?
   - Use case: `[required]` - e.g., "Personalized recommendations"
   - Status: `[required]` - Active/Inactive/Development
   - Data types: `[optional]` - What data does it use? (customer preferences, behavior, etc.)
   - Deployment: `[optional]` - Where is it running?
   - Last updated: `[optional]` - When was it last modified?

4. **Explain each field** (why it matters for compliance)
   - System name: For clear identification
   - Use case: Helps assess impact and risk
   - Data types: Affects data protection requirements
   - Status: Inactive systems don't need assessment

5. **Save and verify**
   - System appears in inventory list
   - System can be clicked to view details
   - Details are correct

### Add Multiple Systems (If Customer Has Many)

Repeat above for 3-5 of customer's most important AI systems.

**Quick entry**: If many systems to add:

- Create a spreadsheet with system names and details
- Bulk import (if available) or manually enter
- Quality check that all appear correctly

---

## Phase 5: First Assessment (20-30 min)

### Create First Risk Assessment

1. **Go to: Assessments page**
   - Click "Assessments" from sidebar

2. **Click "Start New Assessment"**

3. **Select AI system**
   - Choose one system from inventory
   - (Usually start with highest-risk or most important system)

4. **Assessment workflow**
   - Answer questions about the system (varies by system)
   - Questions focus on:
     - Data sensitivity (personal data, sensitive categories)
     - Processing scope (how many people affected)
     - Decision impact (does it make automated decisions)
     - Safeguards (what protections exist)

5. **System calculates risk level**
   - Low, Medium, High, Critical
   - Based on answers provided

6. **Review risk level**
   - Explain what the level means
   - Discuss potential obligations that might apply
   - Plan next steps for remediation

### Create Obligations (If System is High Risk)

If assessment shows High or Critical risk:

1. **Click "Create Obligations" or similar**
   - System suggests relevant obligations based on risk factors

2. **Review suggested obligations**
   - Example: "Conduct Data Protection Impact Assessment"
   - Example: "Document automated decision logic"
   - Example: "Implement human review process"

3. **Accept relevant obligations**
   - Check those that apply to this system
   - Uncheck those that don't apply

4. **Save obligations**
   - Obligations now appear in Obligations list
   - Can be tracked for remediation

---

## Phase 6: Support & First Success (10 min)

### Provide Support Resources

Give customer:

- [ ] Link to getting started guide: [docs]
- [ ] Link to API reference: [docs]
- [ ] Support email: support@euroai.com
- [ ] Slack community link: [if available]
- [ ] Scheduled follow-up call date/time

### Schedule Follow-Up Call

- [ ] 1-week check-in: Review what's been done, answer questions
- [ ] 2-week check-in: Review assessment results and obligations
- [ ] Monthly check-in: Discuss compliance progress and remediation

### Send "You're All Set" Email

**Subject**: "You're all set on EURO AI!"

**Content**:

```
Hi [Customer Name],

Great job! You've successfully:
✓ Created your workspace
✓ Invited team members
✓ Added AI systems to inventory
✓ Completed your first risk assessment
✓ Identified obligations

Next steps:
1. Explore other AI systems in your inventory
2. Run assessments for those systems
3. Create evidence records for your AI Act compliance
4. Track remediation progress

Your team is all set to manage EU AI Act compliance!

Questions? Reply to this email or contact: [support]

Looking forward to working with you!
- The EURO AI Team
```

---

## Verification Checklist

Onboarding is complete when:

- [ ] **Workspace created**
  - Customer can log in
  - Workspace name and settings correct

- [ ] **Team invited**
  - At least 2 team members can log in
  - Roles are appropriate

- [ ] **Systems added**
  - At least 1 AI system in inventory
  - System details are accurate

- [ ] **Assessment completed**
  - At least 1 risk assessment done
  - Risk level calculated correctly

- [ ] **Obligations identified**
  - Relevant obligations created
  - Customer understands next steps

- [ ] **Support contact established**
  - Customer has support contact info
  - Follow-up call scheduled
  - Resources provided

---

## Common Issues & Fixes

### Customer Can't Create Workspace

**Cause**: Email already used, browser issue, service unavailable

**Fix**:

- Try different browser
- Clear cookies and try again
- Verify service is running (health check)
- If problem persists: Reset account via support

### Team Members Not Receiving Invites

**Cause**: Email spam filter, invite not sent, wrong email

**Fix**:

- Check spam/junk folder
- Verify email address is correct
- Resend invitation from team page
- Check email delivery logs

### Assessment Questions Confusing

**Cause**: Terminology not clear, system category unclear

**Fix**:

- Provide examples: "If your system uses customer purchase history, that's personal data"
- Explain reasoning: "We ask about data types because they affect compliance requirements"
- Offer guidance: "If you're not sure, answer 'Yes' on the side of caution"

### Can't Add All Systems at Once

**Cause**: Time constraint, too many systems to manually enter

**Fix**:

- Focus on 3-5 highest-priority systems first
- Schedule follow-up session to add remaining systems
- Offer spreadsheet import (if available)
- Provide batch entry instructions

---

## Success Metrics

**30 days after onboarding**:

- [ ] Customer has active workspace
- [ ] At least 3 AI systems in inventory
- [ ] At least 2 risk assessments completed
- [ ] At least 1 obligation created
- [ ] Evidence records linked to obligation
- [ ] Customer reports confidence in platform

**90 days after onboarding**:

- [ ] Complete AI system inventory documented
- [ ] All critical systems assessed for risk
- [ ] Remediation plan developed for high-risk systems
- [ ] Monthly compliance reporting in use
- [ ] Customer expanding team access

---

## Related Documents

- `docs/customer/SUPPORT_PROCEDURES.md` — How to help customers with issues
- `docs/customer/SUCCESS_METRICS.md` — Track customer health
- Getting started guide (customer-facing)
- Security checklist (for CSM to review)

---

## Updated By

**Session**: Governor Ω (STAGE 4 Phase 4.2)  
**Date**: 2026-07-16  
**Changes**: Initial creation as part of STAGE 4 Phase 4.2 (Operational Knowledge)
