# Pre-Customer Verification Checklist

**Purpose:** Final go/no-go checklist before inviting your first customer.

**Audience:** Founder  
**When to use:** After PR #48 merges to main and production deployment completes  
**Time to complete:** 15-20 minutes  
**Result:** Simple binary yes/no verification that product is customer-ready

---

## Step 1: Infrastructure Verification (5 min)

Before you can start testing, verify Founder infrastructure tasks are complete.

**In Vercel Dashboard:**
- [ ] Go to Settings → Environment Variables
- [ ] Verify `GITHUB_TOKEN` secret exists
- [ ] Verify value is configured (should show "••••••" if set correctly)

**In Supabase Console:**
- [ ] Go to SQL Editor
- [ ] Run: `SELECT * FROM pg_tables WHERE schemaname = 'public';`
- [ ] Verify these tables exist: `workspaces`, `workspace_members`, `ai_systems`, `risk_assessments`
- [ ] Go to Authentication → Email templates
- [ ] Verify "Confirm signup" template is enabled
- [ ] Verify "Magic Link" template is enabled (optional but recommended)
- [ ] Go to Project Settings → General
- [ ] Verify region is in EU (for GDPR compliance)

**If any item is unchecked:** Stop here and complete DEPLOYMENT-CHECKLIST.md steps 1-4 first.

**If all items checked:** Continue to Step 2.

---

## Step 2: Deployment Verification (3 min)

**In Vercel Dashboard:**
- [ ] Go to Deployments
- [ ] Click the deployment from your main branch merge
- [ ] Verify status shows ✅ "Ready" (green)
- [ ] If it shows ❌ or ⏳, wait a few minutes and refresh

**If deployment status is not "Ready":**
- [ ] Check Vercel logs for errors (click deployment → Logs tab)
- [ ] Note the error and escalate to engineering
- [ ] Do NOT proceed to customer invitations until deployment succeeds

**If deployment is "Ready":** Continue to Step 3.

---

## Step 3: Application Test (5 min)

Test the production app directly. Open [https://euro-ai.vercel.app](https://euro-ai.vercel.app) in a private browser window (incognito mode to avoid cached data):

### 3.1: Landing Page
- [ ] Page loads within 3 seconds
- [ ] Hero section visible with title and CTA button
- [ ] No red errors in browser console (F12 → Console tab)
- [ ] All images load correctly

### 3.2: Sign Up Flow
- [ ] Click "Sign Up" button
- [ ] Email input field is visible and accepts text
- [ ] "Create Account" button is clickable
- [ ] Enter test email: `test-customer-[timestamp]@gmail.com` (e.g., `test-customer-1726425600@gmail.com`)
- [ ] Enter password: `TempPassword123!`
- [ ] Click "Create Account"
- [ ] Page redirects to email verification screen

### 3.3: Email Verification
- [ ] Email verification page loads
- [ ] Shows message: "Check your email for a verification link"
- [ ] Check Gmail inbox (or your email client) for verification email from EURO AI
- [ ] **Important:** Email should arrive within 2 minutes
  - If no email after 2 min: Email auth not configured. See DEPLOYMENT-CHECKLIST.md step 3.
- [ ] Click verification link in email
- [ ] Browser redirects back to app (should be `/en/auth/verify-email` or similar)
- [ ] Redirects to dashboard

### 3.4: Company Setup (Step 1 of 3)
- [ ] "Company Setup" form loads
- [ ] Form has fields: Company Name, Industry, Employees, EU-based
- [ ] All fields have helpful placeholder text
- [ ] "Next" button is clickable
- [ ] Enter: Company Name = "Test Company", Industry = "Technology", Employees = "10-50", EU-based = Yes
- [ ] Click "Next"
- [ ] Form validates and saves (progress indicator updates)

### 3.5: AI Inventory (Step 2 of 3)
- [ ] "Add AI Systems" page loads
- [ ] Shows form to add AI system
- [ ] Fields: System Name, Purpose, Data Processed, Vendor/Owner
- [ ] "Add System" button is clickable
- [ ] Enter: System Name = "GPT-4", Purpose = "Customer Support", Data = "Customer emails", Vendor = "OpenAI"
- [ ] Click "Add System"
- [ ] System appears in list below
- [ ] Can add multiple systems (add 2-3 for realistic test)
- [ ] "Next" button is clickable
- [ ] Click "Next"

### 3.6: Risk Assessment (Step 3 of 3)
- [ ] Risk assessment questionnaire loads
- [ ] Shows questions about each AI system (from step 2)
- [ ] Questions are clear and answerable
- [ ] All questions have 5-point scale or yes/no options
- [ ] "Submit" button is clickable at bottom
- [ ] Answer all questions (doesn't matter what you choose, this is just testing the form works)
- [ ] Click "Submit"
- [ ] Page shows completion message

### 3.7: Dashboard Access
- [ ] After completion, redirects to dashboard
- [ ] Shows company name at top
- [ ] Shows list of AI systems added in step 2
- [ ] Shows risk assessment results summary
- [ ] "View Assessment" link is clickable
- [ ] Click link to view full risk assessment details
- [ ] Risk levels displayed (Low/Medium/High/Critical)
- [ ] No errors or broken data display

### 3.8: Sign Out and Re-Login
- [ ] Find "Sign Out" or "Logout" button (usually top-right or menu)
- [ ] Click to sign out
- [ ] Redirects back to landing page
- [ ] Click "Sign In"
- [ ] Enter test email and password from step 3.2
- [ ] Successfully logs back in
- [ ] Can access dashboard with previous company/systems data

**If any item in Step 3 is unchecked:** 
- [ ] Note which step failed
- [ ] Escalate to engineering with: which step, what was expected, what happened instead
- [ ] Do NOT proceed to customer invitation

**If all items in Step 3 are checked:** Continue to Step 4.

---

## Step 4: Accessibility Quick Check (3 min)

Test that the app is keyboard-navigable (required for all users, especially accessibility compliance):

- [ ] Open app to landing page
- [ ] Press Tab repeatedly - does focus move through all buttons/links?
- [ ] Press Enter on a focused button - does it activate?
- [ ] Try to use keyboard alone (no mouse) to complete a form field
- [ ] Page should be fully navigable with keyboard only

- [ ] Open DevTools (F12)
- [ ] Go to Console tab
- [ ] Look for any red `Error` messages (warnings/orange are OK)
- [ ] Should see 0 red errors

**If keyboard navigation is broken or there are console errors:**
- [ ] Escalate to engineering
- [ ] Do NOT invite customer yet

**If keyboard works and console is clean:** Continue to Step 5.

---

## Step 5: Mobile Responsiveness Check (2 min)

Test that the app works on mobile devices:

- [ ] Open app on mobile phone or use Chrome DevTools mobile emulation (F12 → Toggle device toolbar)
- [ ] Set viewport to iPhone SE (375px width) or similar small screen
- [ ] Refresh page
- [ ] Forms should still be usable (not cut off or broken)
- [ ] Buttons should be large enough to tap (target: ≥44px height)
- [ ] Text should be readable without zooming
- [ ] No horizontal scrollbar should be visible

- [ ] Test on tablet width (768px):
- [ ] Layout adapts to wider screen
- [ ] Content doesn't become too stretched

**If any element is broken on mobile:**
- [ ] Escalate to engineering
- [ ] Do NOT invite customer yet

**If mobile experience looks good:** Continue to Step 6.

---

## Step 6: Performance Check (2 min)

Test that the app performs well:

- [ ] Open Vercel Analytics dashboard (vercel.com → newspulse-ai → Analytics)
- [ ] Look at Core Web Vitals or Performance metrics
- [ ] Page load time should be <3 seconds
- [ ] No red/yellow performance warnings

- [ ] In browser (F12 → Network tab), reload landing page:
- [ ] Total page load time in Network tab <3 seconds
- [ ] All images/JS files should have green status (200 OK)

**If page load >5 seconds or there are red error responses:**
- [ ] This might be a temporary network issue - try again
- [ ] If consistent, escalate to engineering

**If performance looks good:** Continue to Step 7.

---

## Step 7: Final Go/No-Go Decision

Review your checklist:

| Category | Status |
|----------|--------|
| Infrastructure | ☐ All 4 tasks complete |
| Deployment | ☐ Production shows "Ready" |
| Sign Up → Verification → Company Setup → Inventory → Risk Assessment | ☐ All steps work end-to-end |
| Email delivery | ☐ Verification email arrives <2 min |
| Dashboard | ☐ Can view results and re-login |
| Accessibility | ☐ Keyboard navigation works, 0 console errors |
| Mobile | ☐ Usable on 375px and 768px widths |
| Performance | ☐ Page load <3 seconds |

**Count checked items:**
- **8/8 checked:** ✅ **GO** — Product is customer-ready. Proceed to customer invitation.
- **7/8 checked:** ⚠️ **CAUTION** — One area needs attention. Escalate to engineering, fix, verify, then invite customer.
- **<7/8 checked:** ❌ **STOP** — Multiple issues detected. Do not invite customer until all items pass. Escalate to engineering.

---

## If You Get "GO"

You're ready to invite your first customer!

**Next steps:**
1. Use template from CUSTOMER-INVITATION-EMAIL.md
2. Personalize for your first customer
3. Send invitation with link: [https://euro-ai.vercel.app](https://euro-ai.vercel.app)
4. Schedule kickoff call (30 min)
5. Start daily monitoring (see PRODUCTION-MONITORING-SETUP.md)

---

## If You Get "STOP"

Document what failed and why:

```
Failed Items:
1. [Item name]: [What was expected] → [What happened]
2. [Item name]: [What was expected] → [What happened]

Steps taken:
- [What I tried]
- [What I checked]

Next action:
- Contact engineering with: [items that failed, timestamps, screenshots]
- Wait for fix and re-run this checklist
```

Send this summary to engineering with any relevant screenshots or error messages.

---

## Common Issues & Quick Fixes

### Issue: Email verification email doesn't arrive

**Check:**
1. Gmail spam folder (sometimes email filters are too aggressive)
2. Wait 2 minutes (email delivery can be slow on first try)
3. Try signing up again with a different test email

**If still no email:**
- Supabase email auth not configured (step 3 in DEPLOYMENT-CHECKLIST.md)
- Do not proceed with customer invitation
- Contact engineering

### Issue: Page loads but shows blank screen or errors

**Check:**
1. Clear browser cache (Ctrl+Shift+Delete on Windows, Cmd+Shift+Delete on Mac)
2. Try a different browser
3. Try incognito/private window
4. Check browser console (F12 → Console) for red error messages

**If error persists:**
- Screenshot the error
- Note the URL you were on
- Contact engineering

### Issue: Form doesn't submit or shows "error"

**Check:**
1. Make sure all required fields have data
2. Try again (might be a temporary network hiccup)
3. Check browser console for error details

**If issue repeats:**
- Screenshot the form with error message
- Contact engineering

### Issue: Mobile doesn't look right

**Check:**
1. Is viewport actually set to mobile width? (Check Chrome DevTools shows "<600px" or similar)
2. Try landscape orientation
3. Try different phone size in Chrome DevTools

**If consistently broken on mobile:**
- Screenshot what's broken (what should look like vs what you see)
- Contact engineering

---

## After Verification Passes

Keep this checklist in your project folder. Re-run it:
- Before each major update deploy
- If you notice any customer issues
- Weekly during customer pilot (spot-check, takes 5 min)

**Successful verification = High confidence in product quality. Now execute customer pilot with confidence.** 🚀

---

**Questions?** Check PRODUCTION-MONITORING-SETUP.md for operations or escalate to engineering.
