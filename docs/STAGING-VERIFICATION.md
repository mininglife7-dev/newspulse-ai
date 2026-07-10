# Staging Verification Guide

**Purpose:** Complete pre-launch validation of the 3-step onboarding in staging environment.  
**Audience:** Founder, QA team, onboarding specialist  
**Timeline:** ~1-2 hours for full verification  
**Prerequisite:** All 4 infrastructure tasks completed (Vercel secret, Supabase schema, email auth, region verified)

---

## Quick Start Verification (15 minutes)

If you're pressed for time, start here. This validates the critical path.

### 1. Staging Environment Ready

1. Go to PR #48: https://github.com/mininglife7-dev/newspulse-ai/pull/48
2. Scroll to **Vercel Deployment**
3. Verify it shows ✅ **Ready** (not ❌ Failed)
4. Click **Visit Preview** to open staging URL

### 2. Landing Page Renders

1. You should see the hero section: "AI Governance, Made Simple"
2. Verify:
   - [ ] Hero text visible
   - [ ] "Start Free Trial" button visible and clickable
   - [ ] "Learn More" button visible
   - [ ] Trust badges render (Built for Europe, Enterprise Grade, Rapid Setup)
   - [ ] Feature section shows: AI Inventory and Risk Analysis
   - [ ] CTA section: "Ready to transform AI governance?"

### 3. Signup → Dashboard

1. Click **"Start Free Trial"**
2. Sign up with test email: `test-german-customer-1@example.com`
3. Create password (min 8 chars, mixed case recommended)
4. Check your email for verification link (should arrive within 30 seconds)
5. Click verification link → should redirect to verify confirmation
6. Sign in with your credentials → should land on **Dashboard**
7. Verify dashboard shows: "Welcome" message and "Company Setup" card

**If this works, core flow is verified. Continue with full tests below.**

---

## Full Staging Verification (90 minutes)

### Phase 1: Signup & Authentication (15 minutes)

#### A. Account Creation

1. Go to staging URL `/auth/signup`
2. Fill form:
   - Email: `test-{}@example.com` (use unique value)
   - Password: `TestPassword123!`
   - Confirm Password: `TestPassword123!`
   - ☑️ Check "I agree to the Terms and Privacy Policy"
3. Click **"Create account"**

**Verify:**
- [ ] Page redirects to verify-email screen
- [ ] Message shows "Check your email for a verification link"
- [ ] No error messages

#### B. Email Verification

1. Check the email inbox for the test email
   - Look for sender: `noreply@mail.supabase.io` or similar
   - Subject should mention "verify" or "confirm"
2. Click the verification link in the email
3. Should see success message or redirect to dashboard

**Verify:**
- [ ] Email arrives within 30 seconds
- [ ] Link works (doesn't return 404)
- [ ] Redirects after click

#### C. Sign In

1. Go to `/auth/signin`
2. Sign in with test email + password
3. Should redirect to `/dashboard`

**Verify:**
- [ ] Dashboard loads
- [ ] Welcome message shows your email
- [ ] No auth errors

---

### Phase 2: Company Setup (20 minutes)

1. On dashboard, click the **"Company Setup"** card
2. Fill form:
   - **Company Name:** `Test Company GmbH`
   - **Country:** Select `Germany` (critical for GDPR verification)
   - **Industry:** Select any industry (e.g., `Technology`, `Manufacturing`)
3. Click **"Continue"**

**Verify:**
- [ ] Form submits without errors
- [ ] Redirects back to dashboard
- [ ] Company name now displays in workspace info box (top)
- [ ] **"Company Setup"** card now shows ✅ Completed (green checkmark)
- [ ] **"AI Inventory"** card is now unlocked (clickable, not grayed out)

#### Mobile Check (5 minutes)

1. Resize browser to mobile width (375px)
2. Click Company Setup again to test form responsiveness

**Verify:**
- [ ] Form stacks vertically (single column)
- [ ] Buttons stack vertically on mobile (not side-by-side)
- [ ] All text is readable
- [ ] No horizontal scroll needed

---

### Phase 3: AI Inventory (25 minutes)

1. On dashboard, click **"AI Inventory"** card (or go to `/inventory`)
2. Click **"Add AI system"** button

#### First System

3. Fill form:
   - **Name:** `ChatGPT Integration`
   - **Type:** Select `LLM`
   - **Vendor/Provider:** `OpenAI`
   - **Status:** Select `Active`
4. Click **"Save system"**

**Verify:**
- [ ] System appears in inventory list
- [ ] Name, type, vendor all display correctly
- [ ] No errors

#### Second System (to test multiple)

5. Click **"Add AI system"** again
6. Fill form:
   - **Name:** `Recommendation Engine`
   - **Type:** Select `Classification`
   - **Vendor/Provider:** `Internal`
   - **Status:** Select `Pilot`
7. Click **"Save system"**

**Verify:**
- [ ] Both systems now appear in list
- [ ] Inventory shows "2 systems registered"

#### Dashboard Verification

8. Go back to dashboard
9. **"AI Inventory"** card should show: `2 systems registered — add more`

**Verify:**
- [ ] System count updates in real-time
- [ ] Inventory card shows correct count

---

### Phase 4: Risk Assessment (30 minutes)

1. On dashboard, click **"Risk Assessment"** card (or go to `/risk-assessments`)
2. You should see the inventory systems list on the left

**Verify:**
- [ ] Both systems appear: "ChatGPT Integration" and "Recommendation Engine"

#### Assess First System

3. Click **"ChatGPT Integration"** in the list
4. Assessment form appears with 15 questions across 5 categories:
   - Fundamental Rights (e.g., "Does this system make decisions affecting humans?")
   - Safety
   - Bias & Discrimination
   - Transparency
   - Accountability

**Verify form loads:**
- [ ] All 5 categories visible
- [ ] Categories are collapsible (click to expand/collapse)
- [ ] Questions are readable

#### Complete Assessment

5. Click to expand each category (verify keyboard + mouse work)
6. Answer some questions by checking boxes (e.g., check 5-7 boxes)
7. Scroll down and click **"Submit Assessment"**

**Verify:**
- [ ] Form validates (all required fields present)
- [ ] Submit button is clickable
- [ ] No network errors

#### View Results

8. After submit, should see results page with:
   - Risk Level (Low/Medium/High/Unacceptable)
   - Risk Score (0-100)
   - Explanation

**Verify:**
- [ ] Results display correctly
- [ ] Risk level badge appears (should have color: green/yellow/orange/red)
- [ ] Score is a number between 0-100

#### Assess Second System

9. Click **"Recommendation Engine"** in the left sidebar
10. Fill out assessment form for this system
11. Click **"Submit Assessment"**

**Verify:**
- [ ] Can assess multiple systems
- [ ] Results display for second system

#### Dashboard Verification

12. Go back to dashboard
13. **"Risk Assessment"** card should show: `2 assessments completed — assess more`

**Verify:**
- [ ] Assessment count updates correctly
- [ ] Card shows real completion state (not "coming soon")

---

### Phase 5: Accessibility & Mobile (15 minutes)

#### A. Keyboard Navigation

1. Go to `/auth/signup` (or any form page)
2. Press **Tab** repeatedly to navigate through form fields
3. Each field should show a focus indicator (blue outline)

**Verify:**
- [ ] Focus indicator visible on all interactive elements
- [ ] Tab order makes sense (left-to-right, top-to-bottom)
- [ ] No keyboard traps (can tab forward and backward)
- [ ] Enter key submits forms

#### B. Text Contrast

1. On any page with text, examine color contrast
2. Secondary text (e.g., descriptions) should be readable

**Verify (visual check):**
- [ ] All text is readable (no light-on-light or dark-on-dark)
- [ ] Primary text (white) is clear
- [ ] Secondary text (slate-300) is acceptable

#### C. Mobile Responsiveness

1. Resize browser to `375px` width (mobile)
2. Go through signup → company setup → inventory → risk assessment
3. Verify layout adapts:

**Verify on each page:**
- [ ] Single-column layout
- [ ] No horizontal scroll
- [ ] Buttons stack vertically
- [ ] Touch targets are large (44px+)
- [ ] Text remains readable

---

## Error Scenarios (Optional, 15 minutes)

Test error handling to ensure graceful failures:

### A. Duplicate Email Signup

1. Try to sign up with an email that already exists
2. Should show error: "Email already in use"

**Verify:**
- [ ] Error message appears
- [ ] Form doesn't submit
- [ ] User can correct and retry

### B. Weak Password

1. Try password `test` (less than 8 chars)
2. Should show error: "Password must be at least 8 characters"

**Verify:**
- [ ] Validation error appears before submit
- [ ] User can correct password

### C. Missing Required Fields

1. Try to submit company setup form with empty name
2. Should show error: "Company name is required"

**Verify:**
- [ ] Validation prevents submit
- [ ] Error message is clear

---

## Post-Verification Checklist

After completing all tests, verify:

- [ ] All 5 phases passed (signup, company setup, inventory, assessment, access)
- [ ] Mobile responsiveness verified
- [ ] Accessibility basics confirmed (keyboard nav, contrast, labels)
- [ ] No console errors (open DevTools → Console tab)
- [ ] No network errors (open DevTools → Network tab)
- [ ] Dashboard accurately reflects progress (counts, completion status)

---

## Common Issues & Fixes

| Issue | Expected | Fix |
|-------|----------|-----|
| "Email verification link expired" | Link works for 24 hours | Request new verification link or contact support |
| "Deployment shows 'Failed'" | Deployment should show ✅ Ready | Check Vercel secret is configured (see DEPLOYMENT-CHECKLIST.md step 1) |
| "Can't see email verification link" | Email should arrive in 30 seconds | Check spam folder; verify Supabase email auth is enabled (step 3 in checklist) |
| "Company Setup form won't submit" | Form should submit successfully | Verify all required fields are filled (Company Name, Country, Industry) |
| "Risk Assessment questions don't load" | Should show 15 questions in 5 categories | Verify Supabase schema.sql was deployed with risk_assessments table |
| "Can't add AI systems" | System should save and appear in list | Verify Supabase schema.sql deployed with ai_systems table |
| "Assessment results show 0 score" | Should calculate risk score 1-100 | This may be correct if no questions answered; answer some questions and resubmit |

---

## Performance & Monitoring (Optional)

### Lighthouse Audit

1. Open DevTools → Lighthouse tab
2. Run audit for each page:
   - Landing page (/)
   - Dashboard (/dashboard)
   - Risk Assessment (/risk-assessments)

**Target scores:**
- [ ] Performance: ≥ 80
- [ ] Accessibility: ≥ 90
- [ ] Best Practices: ≥ 90

### Error Monitoring

1. Open DevTools → Console tab
2. Go through entire flow
3. Should see no red errors (warnings are OK)

**Verify:**
- [ ] No "500" server errors
- [ ] No "401" auth errors (unless testing auth flow)
- [ ] No JavaScript exceptions

---

## Sign-Off

Once you've completed this verification, you're ready for customer launch.

**Verification Complete:**
- [ ] Quick start (15 min) passed
- [ ] Full verification (90 min) passed
- [ ] No critical issues found
- [ ] Performance acceptable

**Proceed to:** Customer pilot launch or production deployment.

---

## Escalation

If you encounter issues not covered here:

1. **Code issue:** Check error messages; screenshot and share in GitHub issue
2. **Infrastructure issue:** Refer to DEPLOYMENT-CHECKLIST.md troubleshooting section
3. **Product question:** Check CUSTOMER-GUIDES.md for expected behavior

**Contact:** Onboarding specialist or engineering team

---

**Last Updated:** 2026-07-10  
**Version:** 1.0 (MVP Launch)  
**Next Update:** After first customer feedback
