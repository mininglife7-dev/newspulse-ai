# Founder Action Verification Checklist

**Use this guide to verify each decision was executed correctly.**

---

## Decision 1: Deploy Supabase Schema ✅ or ❌

### What to check

**Step 1: Navigate to Supabase** 
- Open https://app.supabase.com
- Select your project (newspulse-ai or EURO AI)

**Step 2: Verify schema deployed**
In **SQL Editor** or **Table Editor**, check these tables exist:

- [ ] `profiles` — stores user first/last name and metadata
- [ ] `workspaces` — stores customer organizations
- [ ] `companies` — stores company legal info (for EU compliance)
- [ ] `workspace_members` — links users to workspaces
- [ ] `ai_systems` — inventory of AI models/systems customer is documenting
- [ ] `governance_records` — risk assessments and compliance evidence
- [ ] `governance_priorities` — what customer prioritizes (security, fairness, transparency, etc.)

**Step 3: Verify RLS policies**
In **Authentication** > **Policies**, check these exist:
- [ ] Workspace isolation (users can only see their own workspace)
- [ ] Member access control (only workspace members can read)
- [ ] Owner-only admin operations (only workspace owner can modify)

**If all checked:** ✅ **Decision 1 Complete**

**If any missing:** 
- Copy entire `supabase/schema.sql` from the repository root
- Paste into Supabase SQL Editor
- Click "Run" button
- Check again

---

## Decision 2: Enable Email Authentication ✅ or ❌

### What to check

**Step 1: Navigate to Supabase**
- https://app.supabase.com → Your Project

**Step 2: Check Auth Providers**
- Go to **Authentication** > **Providers**
- Look for "Email" provider

- [ ] Email provider **is enabled** (toggle is ON/green)
- [ ] Email confirmation enabled (check "Email confirmations")
- [ ] Confirmation OTP validity set (e.g., 24 hours)

**Step 3: Verify email sending is configured**
- Go to **Authentication** > **Email Templates**
- Check that "Confirm signup" template exists
- [ ] Template has a confirmation link or code

**If all checked:** ✅ **Decision 2 Complete**

**If Email provider is disabled:**
- Click the Email provider row
- Toggle it ON
- Save
- Check again

**If you don't see Email provider:**
- Contact Supabase support (this is usually pre-enabled)
- Verify your Supabase project type (should be "Free" or "Pro")

---

## Decision 3: Check GitHub Actions Billing ✅ or ❌

### What to check

**Step 1: Navigate to GitHub**
- https://github.com/mininglife7-dev/newspulse-ai
- Click **Settings** > **Billing and plans**

**Step 2: Check Actions usage**
- Go to **Billing** > **Actions**

Look for:
- [ ] Your organization's Actions minute usage (e.g., "1,247 / 3,000 minutes this month")
- [ ] Spending cap status (should show "Spending limit" if you have one)

**Step 3: Verify no recent failures**
- Go back to repository
- Click **Actions** tab
- Look at recent workflow runs

- [ ] Recent runs show status: ✅ **Passed** (green) or ❌ **Failed** (red), not ⏸️ **Skipped**
- [ ] Runs from the last 24 hours exist (not just old runs)
- [ ] No workflows showing "Spending limit exceeded" error

**If all checked:** ✅ **Decision 3 Complete**

**If Actions are disabled or spending cap exceeded:**
1. Click "Billing" in GitHub Settings
2. Scroll to "Actions"
3. If "Spending limit" is set to $0, change it to at least $10 (or remove limit)
4. Check Actions again—new workflows should start running
5. Wait ~5 minutes for a new workflow to appear in the Actions tab

---

## Final Verification: Customer Can Sign Up

Once all 3 decisions are verified, test the actual customer flow:

### Test Signup (Must work end-to-end)

1. **Access the product**
   - Go to https://newspulse-ai.vercel.app/
   - [ ] Page loads (no 500 error)

2. **See signup option**
   - [ ] "Sign up" link visible on landing page

3. **Start signup**
   - Click "Sign up"
   - [ ] Signup form appears
   - Enter: First name, last name, email, password
   - Click "Sign up" button

4. **Verify email sent**
   - Check your email inbox (check spam folder too)
   - [ ] Email from Supabase with subject "Confirm your signup"
   - [ ] Email contains a link

5. **Complete email verification**
   - Click the link in the email
   - [ ] Redirected to dashboard
   - [ ] You are now logged in

6. **Create workspace**
   - [ ] Dashboard shows "Get started" prompt or setup form
   - Enter: Company name, country, industry
   - Click "Create workspace"
   - [ ] Form accepted, redirected to dashboard

**If all verified:** ✅ **CUSTOMER LAUNCH READY**

**If any step failed:**
1. Note which step failed
2. Go to https://github.com/mininglife7-dev/newspulse-ai/issues/new
3. Report the failure with the step number
4. Governor will investigate and recommend fix

---

## Success Criteria

### Decision 1 ✅
- [ ] Schema tables exist in Supabase
- [ ] RLS policies installed

### Decision 2 ✅
- [ ] Email auth provider enabled
- [ ] Email templates configured

### Decision 3 ✅
- [ ] GitHub Actions workflows running (not disabled)
- [ ] No spending cap blocking runs

### Customer Signup Flow ✅
- [ ] Signup form accessible
- [ ] Verification email received and works
- [ ] Customer can create workspace
- [ ] Workspace persists in database

### Full Launch ✅
- All 4 sections above verified
- Customer can sign up, verify email, create workspace
- No errors or 500s in the flow
- Ready to onboard first real customer

---

## If Anything Fails

**Do not report as "not working"—be specific:**

1. **What step failed?** (e.g., "Email not received")
2. **What did you expect?** (e.g., "Email within 5 minutes")
3. **What did you get instead?** (e.g., "No email after 1 hour")
4. **Screenshot or error message?** (if applicable)

Attach this to a GitHub issue and Governor will diagnose and fix.

---

**Questions?**  
See `FOUNDER-DECISION-BRIEF.md` for the full context on why each decision matters.

**Next?**  
Once verified: Invite first customer to sign up.  
Governor will monitor via DNS-GOV-006 (Customer Journey Monitoring).
