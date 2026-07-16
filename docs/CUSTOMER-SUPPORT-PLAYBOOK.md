# Customer Support Playbook — EURO AI

**Purpose:** Prepare Founder to handle customer issues efficiently and consistently  
**Audience:** Founder, support team (if hired later)  
**Last Updated:** 2026-07-16  
**Status:** Ready for day-1 launch

---

## Quick Reference: Response SLAs

| Severity | Definition | Response Time | Example |
|----------|-----------|----------------|---------|
| **CRITICAL** | Customer can't use the platform (complete outage) | 30 min | "I can't log in", "Dashboard is blank" |
| **HIGH** | Feature doesn't work (customer blocked on task) | 2 hours | "Risk assessment won't save", "Inventory page crashes" |
| **MEDIUM** | Feature works but degraded (workaround exists) | 24 hours | "Slow loading", "Button is hard to find" |
| **LOW** | Enhancement request or minor issue | 1 week | "Can you add X feature?", "Would like Y in German" |

---

## Part 1: Common Customer Questions & Answers

### "Is EURO AI GDPR-compliant?"

**Answer:**
> Yes, EURO AI is architected for GDPR compliance. Here's what we do:
> 
> ✓ **Data Storage:** All customer data is encrypted and stored in EU data centers (Ireland/Frankfurt)  
> ✓ **Access Control:** Row-Level Security (RLS) policies ensure only authorized team members see data  
> ✓ **Deletion:** You can delete your account and all associated data at any time (Settings → Delete Account)  
> ✓ **Data Export:** You can export your data in standard format (request support@euro-ai.com)  
> ✓ **DPA:** We have a Data Processing Agreement with Supabase (our data processor)  
> 
> We're preparing for a formal SOC2 audit in Q3. For detailed compliance info, see: docs/COMPLIANCE-AUDIT-READINESS.md
> 
> Any specific GDPR concerns? Happy to discuss.

---

### "Is our data secure? Will it be hacked?"

**Answer:**
> Security is our top priority. Here's what we've implemented:
> 
> ✓ **Encryption:** All data encrypted in transit (HTTPS/TLS) and at rest (AES-256)  
> ✓ **Authentication:** Passwords are never stored plaintext — bcrypt hashed  
> ✓ **Access Control:** Multi-tenant isolation with Row-Level Security  
> ✓ **Monitoring:** 24/7 system health monitoring (response time <30 min if issues detected)  
> ✓ **Third-Party:** Supabase (our database provider) is SOC2 Type II certified  
> 
> **If there's a security incident,** we follow a 72-hour GDPR notification procedure and will contact you immediately.
> 
> We underwent a comprehensive security audit (see SECURITY-AUDIT-REPORT.md). Any specific security concerns?

---

### "How does the risk assessment work? How accurate is it?"

**Answer:**
> Our risk assessment uses a questionnaire aligned with the EU AI Act (Annex III). Here's how it works:
> 
> 1. **You answer 15 questions** about your AI system (what it does, what data it uses, etc.)
> 2. **We calculate a risk score** (LOW 0-40, MEDIUM 40-70, HIGH 70-100) based on defined thresholds
> 3. **We provide recommendations** for compliance actions
> 
> **Important:** The assessment is **advisory only**. You should:
> - Have a legal expert review the results
> - Adjust recommendations based on your specific risk tolerance
> - Use this as a starting point, not a final compliance decision
> 
> We're building in expert validation (Q3 roadmap). Questions about specific scoring?

---

### "What data does EURO AI collect and store?"

**Answer:**
> EURO AI only collects data YOU provide:
> 
> **Required:**
> - Email (for account login)
> - Password (bcrypt hashed, never stored plaintext)
> 
> **Optional:**
> - Company name, country, industry (for context)
> - AI system descriptions (for assessment)
> - Risk assessment responses (for scoring)
> 
> **We DO NOT collect:**
> ❌ Your actual AI system outputs or datasets  
> ❌ Your users' data (unless you put it in the assessment notes)  
> ❌ Behavioral data for marketing  
> ❌ Location data (except country you provide)  
> ❌ Third-party data without your consent  
> 
> All data is stored per EU GDPR (right to delete, right to export). See privacy policy for details.

---

### "How much does EURO AI cost? When will you charge?"

**Answer:**
> We're currently running a **pilot program** for our first customers:
> 
> **Pricing TBD** (we're gathering customer feedback before setting prices)  
> **Current:** Free during pilot phase (first 30 days)  
> **After Pilot:** We'll discuss pricing with you and other beta customers
> 
> If you want to lock in a discounted rate, we're offering **founding customer discounts** (typically 20-40% off standard pricing for the first year).
> 
> Want to discuss pricing or securing a founding customer rate?

---

### "Can I invite my team? How does team management work?"

**Answer:**
> Team management is on our roadmap for **Q3 2026** (next quarter).
> 
> **Today:** One account per person; you manage who has access to your workspace  
> **Coming Q3:** 
> - Invite team members by email
> - Set role-based permissions (Admin, Editor, Viewer)
> - Team activity audit trail
> 
> **Workaround for now:** Share login credentials with your team securely, or create separate accounts and consolidate manually.
> 
> Would this feature help your team workflow?

---

### "Can you integrate with our existing tools (Slack, Salesforce, etc.)?"

**Answer:**
> **Currently:** EURO AI is standalone (no integrations yet).
> 
> **Planned Integrations (Q4 2026+):**
> - Slack notifications (risk assessment alerts)
> - Zapier (workflow automation)
> - API (custom integrations)
> 
> **Today:** You can manually export data and integrate it with your tools.
> 
> What integrations would be most valuable for your workflow?

---

### "Can I customize the risk assessment questionnaire?"

**Answer:**
> **Currently:** The questionnaire is standardized for all customers (ensures consistency across EU AI Act requirements).
> 
> **Coming (Phase 2, Q4 2026):** 
> - Custom question sets
> - Industry-specific questionnaires
> - Weighted scoring
> 
> **Today:** You can add notes to assessments to provide context for your risk evaluation.
> 
> Are there specific questions you'd want to add or modify?

---

### "What if I disagree with the risk score?"

**Answer:**
> The risk assessment is **advisory only** — it's a starting point, not a final verdict.
> 
> **What you should do:**
> 1. Review our recommendations
> 2. Have a legal/compliance expert review your specific system
> 3. Adjust our score if your expert disagrees
> 4. Document your reasoning in the assessment notes
> 5. Build your compliance plan based on YOUR risk evaluation
> 
> We're designed for you to override and customize. Think of us as a assistant, not an authority.
> 
> What specific scoring do you think is off?

---

### "I deleted my account. Can you recover my data?"

**Answer:**
> **Account deletion is permanent.** When you delete your account:
> - All your workspace data is permanently removed
> - We cannot recover it (by design, for GDPR compliance)
> 
> **Prevention:** Before deleting, use Settings → Export Data to download a backup.
> 
> If you deleted by mistake:
> 1. Email support@euro-ai.com IMMEDIATELY with "Account recovery request"
> 2. We can recover within 30 days (after that, data is purged)
> 3. We'll need to verify your identity
> 
> Contact us quickly if you need recovery — we can help!

---

## Part 2: Common Customer Issues & Troubleshooting

### Issue: "I can't log in / Forgot password"

**Customer Says:**
> I tried to sign in but got "Invalid credentials". I don't remember my password.

**Troubleshooting:**
1. **Check email:** Did you use the same email you signed up with?
   - Have customer verify email address (often typos like "gmai.com" instead of "gmail.com")

2. **Reset password:**
   - Go to Sign In page
   - Click "Forgot password?"
   - Enter email
   - Click link in verification email
   - Set new password
   - Try signing in again

3. **If verification email doesn't arrive:**
   - Check spam/junk folder
   - Wait 5 minutes (email can be slow)
   - If still not received: Contact support (may need manual reset)

**Response Email:**
```
Hi [Customer],

Thanks for reaching out! Here's how to reset your password:

1. Go to https://[app-url]/auth/signin
2. Click "Forgot password?"
3. Enter your email: [customer email]
4. Check your email (including spam folder) for a reset link
5. Click the link and set a new password
6. Try signing in again

If you're still having trouble after 5 minutes, reply to this email and I'll reset it manually.

Best,
[Your Name]
```

---

### Issue: "Risk assessment won't save"

**Customer Says:**
> I filled out the questionnaire but when I click "Save", nothing happens. No error message.

**Troubleshooting:**

1. **Check browser console for errors:**
   - Ask customer: "Can you open Developer Tools (F12) and try saving again? Any red error messages?"
   - Ask them to screenshot and send

2. **Common causes:**
   - Missing required field (some questions marked with *)
   - Internet connection dropped
   - Browser cache issue
   - Browser doesn't support (older IE, etc.)

3. **Try these fixes:**
   - Refresh page (Ctrl+R)
   - Clear browser cache (Settings → Clear browsing data)
   - Try different browser (Chrome, Firefox, Safari)
   - Check internet connection (ping google.com)

4. **If still failing:**
   - Escalate to engineering (reproduce in dev environment)
   - Temporary workaround: Have customer screenshot responses and manually re-enter if needed

**Response Email:**
```
Hi [Customer],

Sorry you're hitting a save issue! Let's troubleshoot:

1. **Try refreshing:** Hit Ctrl+R (or Cmd+R on Mac) and try saving again

2. **Check required fields:** Make sure you've answered all questions (marked with *)

3. **Clear cache:** 
   - Chrome: Settings → Clear browsing data → Check "Cookies and cached images" → Clear
   - Firefox: Settings → Privacy → Clear Data

4. **Try different browser:** If you're in Chrome, try Firefox or Safari

5. **Check connection:** Make sure you're still connected to internet

Let me know if any of these work! If not, can you:
- Open Developer Tools (F12)
- Go to Console tab
- Try saving again
- Take a screenshot of any red error messages
- Send me the screenshot

Thanks,
[Your Name]
```

---

### Issue: "Dashboard shows blank / Page won't load"

**Customer Says:**
> I'm signed in but the dashboard is blank/white. The page just shows "Loading..." forever.

**Troubleshooting:**

1. **First, refresh the page:**
   - F5 or Ctrl+R (or Cmd+R on Mac)
   - Wait 10 seconds

2. **Check internet connection:**
   - Can you open other websites? (google.com)
   - If no: Internet is down
   - If yes: Continue troubleshooting

3. **Check browser console for errors:**
   - F12 → Console tab
   - Are there red error messages?
   - Screenshot and send to support

4. **Try incognito/private mode:**
   - Ctrl+Shift+N (Chrome) or Cmd+Shift+P (Safari)
   - Try signing in again
   - Does it work in incognito? (If yes, browser cache is the issue)

5. **Clear cookies:**
   - Settings → Clear browsing data → Check "Cookies and cache" → Clear
   - Refresh page

6. **Try different browser:**
   - Does it work in Chrome? Firefox? Safari?
   - If one browser works: your default browser has a cache/plugin issue
   - If no browser works: it's a server/account issue

**If still broken:**
- Check https://status.vercel.com (Is Vercel down?)
- If yes: System is down, customer should wait
- If no: Escalate to engineering

**Response Email:**
```
Hi [Customer],

Sorry the dashboard isn't loading! Let's troubleshoot:

1. **Refresh the page:** Press F5 (or Cmd+R on Mac)

2. **Clear browser cache:**
   - Chrome: Settings → Clear browsing data → Check all boxes → Clear
   - Firefox: Settings → Privacy → Clear Data

3. **Try a different browser:** Does it work in Safari or Firefox?

4. **Check if Vercel is down:**
   - Go to https://status.vercel.com
   - If it says "All Systems Operational" → Continue troubleshooting
   - If it says there's an incident → We're experiencing an outage; we're working on it

5. **Check the console for errors:**
   - Press F12 on your keyboard
   - Go to "Console" tab
   - Take a screenshot of any red error messages
   - Send to me

If none of this works, reply with:
- What browser you're using
- Console error message (if any)
- Screenshot

I'll investigate further.

Thanks,
[Your Name]
```

---

### Issue: "My workspace/data disappeared"

**Customer Says:**
> I had data yesterday but now my workspace is gone / shows empty. Where is it?

**Troubleshooting:**

1. **Are they logged into the right account?**
   - Ask: "What email address are you signed in with?"
   - If wrong account: Have them sign out and sign in with correct email

2. **Did they accidentally delete it?**
   - Check: Did they ever click "Delete Workspace"?
   - If yes: Data is gone (30-day recovery possible)
   - If no: Data might still be there, check if different account

3. **Is the workspace under a different name?**
   - Ask: "Can you look at the dropdown at the top left? How many workspaces do you see?"
   - If multiple: Might be on wrong workspace

4. **Check for recent activity:**
   - Dashboard → Settings → Activity Log
   - Any delete events?

5. **If truly missing:**
   - Ask: When did you last see the data?
   - Check Supabase logs to see if deletion occurred
   - If accidental deletion within 30 days: Can recover

**Response Email:**
```
Hi [Customer],

Don't worry — let's find your data!

A few quick questions:
1. What email are you currently signed in with?
2. At the top of the dashboard, there's a workspace selector (dropdown). How many workspaces do you see listed there?
3. When did you last see your data?
4. Did you ever click "Delete Workspace"?

Reply with these details and I'll help locate your data or recover it if it was accidentally deleted.

Thanks,
[Your Name]
```

---

### Issue: "I'm getting an error: 'Unauthorized' or 'Forbidden'"

**Customer Says:**
> When I try to do [action], I get an error saying "Unauthorized" or "Forbidden". I'm signed in though!

**Possible Causes:**
1. **Session expired:** They're not actually signed in (cookie expired)
2. **Permission issue:** They don't have access to that workspace (if multi-user)
3. **Account not fully set up:** They haven't completed onboarding (need company setup before inventory)
4. **API error:** Transient error, retry

**Troubleshooting:**

1. **Ask what action they were doing:**
   - "I tried to [add AI system / start risk assessment]"
   - Note: Some features require prior steps

2. **Have them sign out and back in:**
   - Settings → Sign Out
   - Sign back in
   - Try again (may refresh session)

3. **Check if they completed onboarding:**
   - Dashboard should show: "Step 1: Company Setup" (Done/In Progress)
   - If Step 1 not done: They need to complete it first

4. **Try again:** Sometimes it's a transient error

**Response Email:**
```
Hi [Customer],

Got it! Let's fix that error. A few things to try:

1. **Sign out and back in:**
   - Settings (top right) → Sign Out
   - Sign back in
   - Try your action again

2. **Check onboarding status:**
   - Make sure you've completed "Step 1: Company Setup"
   - Some features unlock only after earlier steps

3. **Try again:** Sometimes these errors are temporary

If the error persists, can you tell me:
- Exactly what you were trying to do
- The full error message (screenshot if possible)
- What step of onboarding you're on

I'll dig into it from our end.

Thanks,
[Your Name]
```

---

### Issue: "The app is very slow"

**Customer Says:**
> Clicking buttons takes 5+ seconds. The risk assessment page takes forever to load.

**Troubleshooting:**

1. **Check their internet speed:**
   - Have them go to https://speedtest.net
   - Ask: What's the download speed? (Should be >5 Mbps for good experience)

2. **Check browser performance:**
   - F12 → Performance tab → Record (click button) → Stop
   - Does button click show long processing time?
   - Or is network request slow?

3. **Common causes:**
   - Slow internet (customer's problem)
   - Browser cache full (clearing cache helps)
   - Too many browser tabs (slows JavaScript)
   - Server is slow (our problem)

4. **Fixes to try:**
   - Clear browser cache
   - Close other browser tabs
   - Try different browser
   - Try at different time (if it's load-related)

5. **Check system status:**
   - Is our server slow? Check `/api/health` response time
   - If slow: Might be under load, scale up resources

**Response Email:**
```
Hi [Customer],

Sorry for the slowness! Let's identify the cause:

1. **Check your internet speed:**
   - Go to https://speedtest.net
   - Tell me your download speed

2. **Lighten your browser:**
   - Close other browser tabs
   - Clear browser cache (Settings → Clear browsing data)

3. **Try a different browser:** Chrome vs Firefox vs Safari

4. **Specific page slow?** Which feature takes longest to load?

Once you try these, let me know if it improves or if it's still slow!

Thanks,
[Your Name]
```

---

## Part 3: Escalation Procedures

### When to Escalate to Engineering

**Escalate if:**
1. Customer error persists after 30 min of troubleshooting
2. Multiple customers report the same issue
3. Error appears to be code-related (500 error, database error, etc.)
4. Feature doesn't work as documented
5. Performance is degraded on your end (not customer's connection)

**Escalation Email to Engineering:**
```
Subject: CUSTOMER ISSUE - [Severity] - [Brief Description]

Customer: [Name], [Email]
Severity: [CRITICAL / HIGH / MEDIUM / LOW]
Issue: [2-3 sentence description]

Reproduction steps:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected: [What should happen]
Actual: [What actually happened]

Error message (if any): [Screenshot or text]

Troubleshooting done:
- [Tried clear cache]
- [Tried different browser]
- [Tried ...]

---

Hey [Engineering], customer is blocked on [feature]. Can you take a look?
```

---

## Part 4: Customer Communication Best Practices

### Response Time Guidelines

- **Critical (customer blocked):** Respond within 30 minutes
- **High (feature broken):** Respond within 2 hours
- **Medium (workaround exists):** Respond within 24 hours
- **Low (nice-to-have):** Respond within 1 week

### Email Tone

✅ **Good tone:**
- Friendly and professional
- Empathetic ("I understand how frustrating that is")
- Action-oriented ("Here's what we can do")
- Clear next steps

❌ **Avoid:**
- Jargon or technical terms (customer may not understand)
- Blame ("That's a browser issue, not our problem")
- Dismissive ("That's a minor bug, we'll fix it someday")

### Email Template: Good Response

```
Hi [Customer Name],

Thanks for reporting that! I understand how frustrating [issue] must be.

[Explanation: Why did this happen?]

Here's what I recommend:
1. [First fix to try]
2. [Second fix to try]
3. [Third fix to try]

[If simple fix doesn't work:]
If you're still seeing the issue after trying these:
- Can you send me a screenshot?
- What browser are you using?
- I'll dig into it from my end.

Looking forward to getting this resolved for you!

Best regards,
[Your Name]
EURO AI Support
[Phone number if urgent]
```

### Email Template: Status Update (If Delayed)

```
Hi [Customer Name],

Quick update: I'm still investigating your [issue]. I know this is urgent.

Here's what I've found so far:
- [Finding 1]
- [Finding 2]

Next steps:
- I'm checking [X]
- Should have an update by [time/date]

I'll follow up no later than [time] with more info. Sorry for the wait!

Thanks for your patience,
[Your Name]
```

### Email Template: Issue Resolved

```
Hi [Customer Name],

Great news! I found the issue:

**What happened:** [Brief explanation]

**How I fixed it:** [What was done]

**What you should do:** [Any action needed on their end]

Everything should work now. Can you try it on your end and let me know if it's fixed?

Thanks for being patient — this was a tricky one!

Best,
[Your Name]
```

---

## Part 5: Customer Success Milestones & Check-Ins

### Day 1-3 (Onboarding)

**Customer should accomplish:**
- Sign up
- Verify email
- Complete company setup
- Add first AI system

**Your action:**
- Welcome email (within 1 hour of signup)
- Offer kickoff call (optional, for German customers)
- Track progress (check dashboard daily)

**Welcome Email Template:**
```
Subject: Welcome to EURO AI! 🎉

Hi [Customer],

Great to have you on board! You're going to love EURO AI.

Here's what you can do right now:
1. **Set up your company** (2 min) — Dashboard → Company Setup
2. **Add your first AI system** (2 min) — Dashboard → AI Inventory
3. **Run a risk assessment** (5 min) — Dashboard → Risk Assessment

Questions? Reply to this email anytime.

Your compliance assistant,
[Your Name]
EURO AI
```

---

### Day 7 (First Week Check-In)

**What to check:**
- Did they complete all 3 onboarding steps?
- Any issues or questions?
- Are they satisfied with the product?

**Check-In Email:**
```
Subject: How's EURO AI working for you?

Hi [Customer],

Just checking in on your first week! How's it going?

I see you've [completed company setup / added 2 AI systems / ...].

Quick question: Is there anything you'd like help with or any features you think we should add?

Also, we'd love to hear your feedback. Can you take 2 min to fill out this survey?
[Link to feedback form]

Looking forward to hearing from you!

Best,
[Your Name]
```

---

### Day 30 (End of Pilot / Next Steps)

**What to discuss:**
- Is the product meeting their needs?
- Ready to move beyond pilot?
- Pricing discussion (if applicable)
- Feature requests or improvements

**End-of-Pilot Email:**
```
Subject: You're halfway through your pilot! Here's what's next.

Hi [Customer],

You've been using EURO AI for 30 days — thanks for being an early customer!

**Quick recap:**
- ✓ Completed [X] assessments
- ✓ Identified [Y] AI systems
- ✓ [Other milestones]

**Next steps:**
1. **Founding Customer Rate:** We'd like to offer you a [20-40]% discount on our standard pricing (locked in for Year 1) if you'd like to continue
2. **Feedback Call:** Can we schedule a 30-min call to discuss your experience and future features?
3. **Team Expansion:** Ready to invite your team? We'll have team management in Q3.

Interested in any of these? Reply and we'll set it up.

Thanks for helping us build EURO AI!

Best,
[Your Name]
```

---

## Part 6: Common Upsell Conversations

### "Can you add feature X?"

**Don't say:** "Maybe someday" (vague, customer loses confidence)

**Do say:** 
```
Great idea! Feature X would definitely help with [use case].

Here's where we are with it:
- **Status:** On our roadmap for [Quarter Y]
- **If urgent:** We can prioritize it if multiple customers request it
- **Workaround today:** [Option A] or [Option B]

If this is critical for your workflow, let me know and we can discuss timeline.
```

---

### "We want to upgrade and add team members"

**What to offer:**
- Founding customer discount (20-40% off standard pricing)
- Team seats (at $X per seat/month)
- Priority support (if applicable)

**Upsell Email:**
```
Hi [Customer],

Awesome to hear you want to expand! Here's what we can offer:

**Founding Customer Rate (Special for you):**
- Standard pricing: $[X]/month
- Founding customer rate: $[Y]/month (save [Z]%) — locked in for 1 year

**Team Seats:**
- Each team member seat: $[X]/seat/month
- Includes: Full access, audit trail, notifications
- Coming Q3: Role-based permissions (Admin/Editor/Viewer)

**Optional Extras:**
- Priority support: [description]
- Custom questionnaire: [description]
- API access: [description]

Want to move forward? Let's schedule a call to discuss your specific needs.

Best,
[Your Name]
```

---

## Part 7: Difficult Customer Situations

### Customer Requests Something Out of Scope

**Scenario:** Customer asks for custom compliance framework (takes 40 hours to build)

**Response:**
```
Hi [Customer],

I love your idea for [custom framework]! It's ambitious.

Here's the thing: Building custom frameworks is beyond our current scope (we focus on EU AI Act). However:

**Option A (Recommended):** Use our standard framework as a starting point and customize the notes field to match your needs. Many customers do this.

**Option B:** This could be a post-MVP feature. If multiple customers need it, we'll prioritize it.

**Option C:** Check if a different tool handles [use case] better (I can recommend alternatives if helpful).

Which option works best for you?

Best,
[Your Name]
```

---

### Customer Complains About Price

**Scenario:** Customer says pricing is too high compared to competitor X

**Response:**
```
I hear you — pricing is a real consideration.

Here's how we compare to [Competitor]:

**EURO AI:**
- ✓ EU AI Act focused (our specialty)
- ✓ Transparent risk scoring (vs black-box systems)
- ✓ Founding customer rate (20-40% discount)
- ✗ No team management yet (Q3)

**Competitor X:**
- ✓ [Their strength]
- ✓ [Their strength]
- ✗ [Their weakness]

**Here's what I suggest:**
1. Try both for 30 days and compare
2. If you come back to EURO AI, I'll match your founding customer rate
3. Tell me what features would change your mind — we listen to customers

Either way, I want you using the best tool for YOUR needs. What matters most to you?
```

---

### Customer Had a Bad Experience

**Scenario:** Customer frustrated after outage, missing data, or bug

**Response (Critical):**
```
Hi [Customer],

I'm really sorry about [what happened]. That's not acceptable, and I want to make this right.

**What happened:** [Honest explanation of root cause]

**What we did:** [Immediate fix]

**How we prevent it next time:** [Process improvement]

**How we're making it right:**
- [Discount / free month / etc.]
- [Priority support for next 30 days]
- [Personal check-ins]

I'm committed to earning back your trust. Can we schedule a call to discuss?

Again, I apologize. We'll do better.

Best,
[Your Name]
```

---

## Part 8: Tracking & Documentation

### Customer Issue Log (Google Sheet Template)

Create a Google Sheet to track all customer issues:

| Date | Customer | Issue | Severity | Status | Resolution | Time to Resolve |
|------|----------|-------|----------|--------|------------|-----------------|
| 2026-07-20 | Acme Corp | Can't log in | HIGH | Resolved | Password reset | 45 min |
| 2026-07-20 | TechFlow | Slow loading | MEDIUM | In Progress | Clear cache, investigating | — |
| 2026-07-21 | GlobalAI | Feature request (custom Q) | LOW | Backlog | On roadmap Q4 | — |

**Why track:**
- Identify patterns (3 login issues this week = real bug)
- Measure response time (average 1.2 hours = good)
- Plan resources (100 customers = need support hiring)

---

## Part 9: First Week Monitoring Dashboard

**Create a Google Sheet to monitor pilot week:**

```
CUSTOMER PILOT — WEEK 1 HEALTH

Customer Name | Signup Date | Onboarding Status | Last Seen | Issues | Next Action
---|---|---|---|---|---
[Name 1] | 7/20 | Inventory (50%) | Today | None | Check in Day 5
[Name 2] | 7/20 | Assessment Done | Yesterday | Log-in issue | Resolved
[Name 3] | 7/21 | Company Setup | 2 hrs ago | None | Monitor
```

**Daily Check (5 min):**
- ✓ All customers signed in successfully?
- ✓ Any new issues from logs?
- ✓ Anyone stuck on a step?
- ✓ Any performance issues?

**If customer inactive >24 hours:**
- Check in via email: "Just checking in! Any blockers?"
- Offer help if stuck

---

## Part 10: Customer Feedback & Learning

### Capture Feedback from Every Customer

**During email threads:**
- Note: What features did they ask for?
- Note: What confused them?
- Note: What worked well?

**Structured feedback form (send after pilot):**
- "What worked well?" → Reinforces positives
- "What was confusing?" → Identifies UX issues
- "What features would help most?" → Prioritizes roadmap
- "Would you recommend EURO AI?" → NPS score

### Use Feedback to Improve

**Weekly Review (30 min):**
1. Read all customer emails from the week
2. Note patterns: "2 customers asked for X, 1 complained about Y"
3. Update roadmap if needed
4. Update this playbook if procedures need adjusting

---

## Summary: Your Support Workflow

**Day 1:** Prepare and launch
- [ ] Review this playbook
- [ ] Save email templates somewhere accessible
- [ ] Create customer issue log (Google Sheet)
- [ ] Set up email filters for customer emails

**During Pilot (Ongoing):**
- [ ] Read emails within 2 hours (HIGH/CRITICAL) or 24 hours (MEDIUM/LOW)
- [ ] Use templates in this playbook
- [ ] Log issues and patterns
- [ ] Escalate to engineering if needed

**Weekly Review:**
- [ ] Read all customer emails
- [ ] Identify patterns
- [ ] Update roadmap if needed
- [ ] Follow up on open issues

**Customer Check-Ins:**
- [ ] Day 1: Welcome email
- [ ] Day 7: Check-in email
- [ ] Day 30: End-of-pilot / next steps email

---

## Quick Reference Cards (Print These)

### Common Issues Quick Solve

```
PROBLEM → FIRST TRY
Can't log in → Forgot password reset
Page blank → Refresh + clear cache
Save fails → Check required fields
Unauthorized → Sign out + back in
Slow → Close other tabs, clear cache
```

### Email Templates Quick Access

1. Login issue
2. Dashboard blank
3. Save fails
4. Escalation to engineering
5. Welcome email
6. Check-in email
7. Status update (delayed)
8. Issue resolved

(Keep these in a folder or link for quick copy/paste)

---

**Customer Support Playbook Complete**  
**Last Updated:** 2026-07-16  
**Ready for Day 1 Launch**

Print this guide or keep it open during launch week. You've got this! 🚀
