# NewsPulse AI — Customer Onboarding Guide

**Last Updated:** 2026-07-15  
**Status:** Production Ready  
**Platform:** Next.js 14 + Supabase + Vercel

---

## Welcome to NewsPulse AI

NewsPulse AI helps organizations govern and manage AI systems responsibly. This guide walks you through the core features and typical workflows.

### What You Can Do

- **Create workspaces** to organize team members and AI system assessments
- **Invite team members** with role-based access (owner, admin, member, viewer)
- **Assess AI systems** against regulatory risks (unacceptable, high, medium, low)
- **Collaborate securely** with workspace isolation and row-level security

---

## Part 1: Getting Started (5 minutes)

### Step 1: Sign Up

1. Visit [NewsPulse AI](https://newspulse-ai.vercel.app)
2. Sign up with your email address
3. Complete email verification

### Step 2: Create Your First Workspace

A workspace is your organization's container for AI assessments and team members.

**Via the Dashboard:**

1. Click **"Create Workspace"** button
2. Fill in company information:
   - **Company Name** (required): Your organization's legal name
   - **Country** (required): Where you operate
   - **Industry** (required): Your sector (finance, healthcare, etc.)
   - **Website** (optional): Your company website
   - **Number of Employees** (optional): Headcount range
   - **Description** (optional): Brief governance priorities

3. Click **"Create"**
4. You're automatically added as the workspace owner

**Note:** Workspace URLs are auto-generated from your company name for privacy and collision resistance.

### Step 3: You're Ready

Your workspace is live. You can now:

- Add team members
- Create AI system assessments
- Invite colleagues to collaborate

---

## Part 2: Team Management (10 minutes)

### Inviting Team Members

1. Go to **Settings** → **Team Members**
2. Click **"Invite Member"**
3. Enter colleague's email and select their role:
   - **Owner:** Full access (one per workspace)
   - **Admin:** Create assessments, manage members, change roles
   - **Member:** Create and view assessments
   - **Viewer:** Read-only access to workspace data

4. Click **"Send Invitation"**
5. Your colleague receives an email with an accept/decline link

**What Happens Next:**

- Invitation shows as **Pending** until accepted
- Once accepted, team member is **Active** and can access the workspace
- You can remove members anytime (only owners can do this)

### Managing Roles

**Owner-only actions:**

- Change other members' roles (admin, member, viewer)
- Remove members from workspace
- Transfer ownership (contact support)

**Admin actions:**

- Invite new members
- Remove non-owner members
- Assign members and viewers to assessments

**Member actions:**

- Create assessments
- View all workspace assessments
- View team roster

**Viewer actions:**

- Read-only access to assessments
- Cannot create or modify anything

---

## Part 3: AI System Assessments (15 minutes)

### What is an Assessment?

An assessment documents your governance evaluation of an AI system. It captures:

- **AI System ID:** Unique identifier (e.g., "GPT-4-Production-v1")
- **Risk Level:** unacceptable | high | medium | low
- **Risk Score:** 0–100 numeric scale
- **Status:** draft | in_review | finalized
- **Assessment Data:** Custom notes and findings

### Creating an Assessment

1. Go to **Assessments** tab
2. Click **"New Assessment"**
3. Fill in the form:

   ```
   AI System ID:     gpt-4-prod-2026
   Risk Level:       High
   Risk Score:       72 (out of 100)
   Assessment Data:  {
                       "model": "gpt-4",
                       "training_data": "proprietary + web",
                       "drift_detected": true,
                       "review_date": "2026-07-15"
                     }
   Status:           Draft (default)
   ```

4. Click **"Save"**

**Tips:**

- Start with **Draft** status while you're gathering information
- Move to **In Review** when circulating to team for feedback
- Mark **Finalized** once leadership approves the assessment
- Risk Score should align with your risk level (e.g., "high" = 60–79)

### Viewing & Updating Assessments

**View all assessments:**

- Go to **Assessments** → see list with risk levels
- Sort by risk level, status, or date
- Click an assessment to see full details

**Update an assessment:**

1. Open the assessment
2. Click **"Edit"**
3. Change any fields (partial updates supported)
4. Click **"Save"**

**Delete an assessment:**

1. Open the assessment
2. Click **"Delete"** (cannot be undone)
3. Confirm

---

## Part 4: Common Workflows

### Workflow A: Onboarding a New AI System

**Time:** 20 minutes | **Roles:** Member+ required

1. **Create assessment**
   - AI System ID: `my-llm-prod-v2`
   - Risk Level: Start with draft—initial assessment
   - Status: Draft

2. **Gather team input**
   - Share assessment link with admins
   - Request feedback in Assessment comments (coming soon)

3. **Update findings**
   - Revise risk level based on team feedback
   - Add detailed data to assessment_data field
   - Examples: training data sources, model version, drift checks

4. **Finalize**
   - Move status to Finalized
   - Risk level is now locked (recorded for compliance)

5. **Monitor**
   - Set calendar reminder to reassess every 90 days
   - Watch for model drift or training data changes

### Workflow B: Inviting a Compliance Officer

**Time:** 5 minutes | **Roles:** Owner+ required

1. **Go to Team Members**
2. **Invite member:**
   - Email: `compliance@company.com`
   - Role: Admin (can manage assessments and team)
3. **They accept** via email link
4. **Assign to assessments** (via assessment detail view)

### Workflow C: Quarterly Risk Review

**Time:** 1 hour | **Roles:** Admin+ required

1. **Go to Assessments**
2. **Filter by status:**
   - Sort by "Last Updated" to find older assessments
3. **For each assessment:**
   - Review current risk level
   - Check if model version changed
   - Update drift status if applicable
   - Move status to "In Review"
   - Assign to reviewer (admin/member)
4. **Reviewer approves** or requests changes
5. **Finalize** once team agrees

---

## Part 5: Access Control & Security

### Data Isolation

- **Each workspace is completely isolated.** Team members in Workspace A cannot see Workspace B's data.
- **Members can only access workspaces they're invited to.**
- **Row-level security (RLS)** enforces all permissions at the database level.

### Role-Based Access

| Action              | Viewer | Member | Admin | Owner |
| ------------------- | ------ | ------ | ----- | ----- |
| View assessments    | ✅     | ✅     | ✅    | ✅    |
| Create assessments  | ❌     | ✅     | ✅    | ✅    |
| Delete assessments  | ❌     | ❌     | ✅    | ✅    |
| Invite members      | ❌     | ❌     | ✅    | ✅    |
| Remove members      | ❌     | ❌     | ✅    | ✅    |
| Change member roles | ❌     | ❌     | ❌    | ✅    |

### What We Don't Store

- We don't store your actual AI models or weights
- We don't access training data directly
- We only store the assessment metadata you provide
- All data is encrypted at rest and in transit (TLS 1.3)

---

## Part 6: Best Practices

### Assessment Best Practices

✅ **DO:**

- Use consistent AI System IDs (e.g., `gpt-4-prod-v1`, not `my model 1`)
- Include training data sources in assessment_data
- Note any model version changes
- Document drift detection results
- Update assessments quarterly minimum

❌ **DON'T:**

- Leave assessments in Draft status indefinitely
- Assess models without documented training data source
- Ignore drift alerts
- Assess without domain expertise (compliance officer or ML engineer)
- Assign sensitive models to viewers without approval

### Team Best Practices

✅ **DO:**

- Start with Viewer role for observers
- Promote to Member once someone can take ownership
- Assign Admin role only to compliance/governance leads
- Document role changes in your change log
- Review team roster quarterly

❌ **DON'T:**

- Make everyone an Owner (one is enough)
- Invite external contractors as Admin without legal review
- Share workspace access with non-employees
- Forget to remove departed team members

---

## Part 7: Troubleshooting

### I don't see my team member's invitation

**Possible causes:**

1. Email typo in invitation form
2. They haven't clicked the email link yet
3. Email went to spam—ask them to check

**Fix:**

- Resend invitation (coming soon) or
- Have them use "Accept Invitation" link from their email

### I can't create assessments

**Possible causes:**

1. You're a Viewer (need Member+ role)
2. You're not in any workspace yet

**Fix:**

1. Check your role in Settings → Team Members
2. Create a workspace if you haven't already
3. Contact workspace Owner to upgrade your role

### My colleague was invited but can't see the workspace

**Possible causes:**

1. They haven't accepted the invitation yet
2. They're logged in with wrong email address
3. Browser cache issue

**Fix:**

1. Confirm they clicked "Accept" in the email
2. Check they're signed in with same email as invitation
3. Try Ctrl+Shift+Delete to clear browser cache, then refresh

### Risk scores don't match my risk levels

This is normal and expected—risk score (0–100) is more granular than risk level (4 categories).

**Example mapping:**

- Unacceptable: 90–100
- High: 60–89
- Medium: 30–59
- Low: 0–29

Adjust your scoring to match your governance framework.

---

## Part 8: Getting Help

### Support

- **Docs:** Check [docs/API_CLIENT_GUIDE.md](./API_CLIENT_GUIDE.md) for technical API reference
- **Product Issues:** Email founders@newspulse-ai.example.com
- **Urgent:** Reach out directly; we're small and responsive

### Feature Requests

Want to:

- Export assessments as PDF?
- Set up email notifications for status changes?
- Integrate with your compliance system?
- Bulk import AI systems?

**Tell us!** We prioritize features by customer demand.

---

## Part 9: Admin Reference

### Workspace Management

**What you own as an Owner:**

- Workspace settings (name, description, country, industry)
- Team membership and roles
- All assessments within the workspace
- Billing and subscription (if applicable)

**What you cannot do:**

- Transfer ownership to another user (contact support)
- Merge workspaces
- Recover deleted assessments (no trash)

### Audit & Compliance

**What we log:**

- Assessment creation, updates, deletion (with timestamps)
- Team member additions, role changes, removals
- Workspace creation
- User authentication events

**What's available:**

- Assessment history (coming soon—track changes over time)
- Audit logs (available for enterprise customers)
- Data export (coming soon)

---

## Part 10: Roadmap & Coming Soon

**Q3 2026:**

- 📋 Assessment history & change tracking
- 📧 Email notifications for status changes
- 📊 Risk analytics dashboard
- 🔄 Bulk operations (import/export assessments)

**Q4 2026:**

- 🔐 SSO (single sign-on) for enterprise
- 📋 Custom assessment templates
- 🔗 Integrations with compliance platforms
- 📊 Advanced reporting & compliance reports

**Let us know** what you need most!

---

## Quick Links

- [Dashboard](https://newspulse-ai.vercel.app)
- [API Client Guide](./API_CLIENT_GUIDE.md)
- [Production Hardening Report](./PRODUCTION_HARDENING_REPORT.md)
- [Contact Support](mailto:founders@newspulse-ai.example.com)

---

**Version:** 1.0 | **Last Updated:** July 15, 2026 | **Status:** Production Ready

Welcome aboard! 🚀
