# Customer Success Playbook

**Purpose:** Workflows and procedures for supporting customers during launch and beyond  
**Audience:** Support team, founder, operations  
**Updated:** 2026-07-11  

---

## Pre-Launch Preparation

### Support Team Setup (Before Day 1)

**Essentials:**
- [ ] Access to support email: mininglife7@gmail.com
- [ ] Slack channel for support tickets (if using Slack)
- [ ] Shared document for tracking common issues
- [ ] Customer contact database
- [ ] Access to Vercel dashboard for status checks
- [ ] Access to Supabase dashboard for data inspection

**Knowledge Base:**
- [ ] Read: CUSTOMER_ONBOARDING.md (know what customers experience)
- [ ] Read: TROUBLESHOOTING_GUIDE.md (know answers to common questions)
- [ ] Read: API_REFERENCE.md (understand API capability)
- [ ] Read: INCIDENT_RESPONSE.md (know escalation procedures)

**Tools:**
- [ ] Bookmark `/api/health` endpoint for quick status check
- [ ] Bookmark `/api/production-health` for detailed diagnostics
- [ ] Bookmark `/api/error-rate` for error tracking
- [ ] Create support email template for responses

**Training:**
- [ ] Sign up for test account
- [ ] Complete onboarding flow yourself
- [ ] Register a test AI system
- [ ] Explore dashboard functionality
- [ ] Test password reset flow
- [ ] Test email verification

---

## First 24 Hours (Launch Day + 1)

### Morning Brief (T+0 Morning)

**Tasks:**
- [ ] Check `/api/production-health` — all healthy?
- [ ] Review overnight error logs (Vercel dashboard)
- [ ] Check for new support emails
- [ ] Note any customer issues or patterns
- [ ] Prepare response templates

### During Day 1

**Every 1-2 hours:**
- [ ] Monitor support email for incoming tickets
- [ ] Check `/api/error-rate` for trending issues
- [ ] Respond to customer emails within 4 hours
- [ ] Track common questions

**Response Priority:**
1. **Critical Issues** (account locked, data loss, security) — respond immediately
2. **Blocking Issues** (can't signup, can't create workspace) — respond within 1 hour
3. **Feature Issues** (dashboard slow, minor bugs) — respond within 4 hours
4. **Questions** (how to..., best practices) — respond within 24 hours

### Typical Customer Journey

**Customer Arrives:**
- Email signup link or sees marketing
- Signs up for account
- Receives verification email
- Clicks verification link
- Logs in

**Common Issues at Each Stage:**
1. **Signup Form:** Email validation, password requirements
2. **Email Verification:** Email not arriving, link expired
3. **Login:** Wrong password, can't remember email
4. **First Login:** Dashboard blank, no workspace
5. **Workspace Creation:** Required fields, name length, company name format
6. **AI System Registration:** System type options, field validation
7. **Dashboard:** Understanding what to do next

---

## Common Support Scenarios

### Scenario 1: "I Can't Sign Up"

**Customer says:** "I keep getting an error when trying to sign up"

**Investigation:**
1. Ask: What error message do you see?
2. Ask: What email are you using?
3. Ask: What password are you using?

**Root Causes & Solutions:**
- **Invalid email format** → Explain: email@example.com format
- **Password too weak** → Explain password requirements
- **Rate limit** → "Wait 1 hour and try again"
- **Email already used** → "Use forgot password or different email"

**Response Template:**
```
Hi [Name],

Thanks for reaching out. I'd like to help you get set up.

Can you tell me:
1. What error message do you see?
2. What email are you trying to use?
3. What browser are you using?

Once I understand what's happening, I'll get you unblocked.

Best,
[Your Name]
```

---

### Scenario 2: "Verification Email Not Received"

**Customer says:** "I verified my email but still can't log in"

**Investigation:**
1. Ask: Did you click the verification link in the email?
2. Ask: Did you check spam/promotions folders?
3. Check: Is account actually verified in our system?

**Solutions:**
- **Unread email** → "Check spam folder, whitelist noreply email"
- **Link expired** → "Request new verification email on login page"
- **Already verified** → "Try logging in again, clear browser cookies"

**Response Template:**
```
Hi [Name],

A few things to check:

1. Look in your spam/promotions folder for the email
2. Whitelist us: noreply@newspulse-ai.vercel.app
3. If link expired: Go to login page → "resend verification"
4. Try incognito mode (browser cache issue)

Let me know if that solves it!

Best,
[Your Name]
```

---

### Scenario 3: "I Can't Create a Workspace"

**Customer says:** "Workspace creation keeps failing"

**Investigation:**
1. Ask: What error message appears?
2. Ask: What company name are you using?
3. Check: Has this user created a workspace before?
4. Check: Are they hitting rate limit (10/minute)?

**Root Causes & Solutions:**
- **Missing required fields** → "Company name, country, industry required"
- **Company name too long** → "Max 100 characters"
- **Special characters in name** → "Remove emoji/special chars"
- **Rate limited** → "Wait 1 minute and try again"
- **Name collision** → "Try different name with unique identifier"

**Response Template:**
```
Hi [Name],

I see you're having trouble creating a workspace. Let me help.

First, try this:
1. Refresh page: F5
2. Use company name < 50 characters
3. Avoid special characters or emoji
4. Make sure country and industry are selected

If that doesn't work, let me know the exact error message.

Best,
[Your Name]
```

---

### Scenario 4: "I Registered an AI System But Don't See It"

**Customer says:** "I added a system but it's not showing in my dashboard"

**Investigation:**
1. Ask: Did you see a success message after clicking Save?
2. Ask: Try refreshing the page — does it appear?
3. Check: Is it showing in our database (Supabase)?

**Root Causes & Solutions:**
- **Form didn't actually submit** → "Try again, watch for success message"
- **Browser cache showing old data** → "Refresh: Ctrl+Shift+R"
- **Data sync delay** → "Wait 10 seconds, refresh"
- **User viewing wrong workspace** → "Verify logged in to correct account"

**Response Template:**
```
Hi [Name],

The system should appear immediately after saving. Let me troubleshoot:

1. Refresh: Ctrl+Shift+R (hard refresh)
2. Wait 10 seconds for data sync
3. Try different browser
4. Clear cookies: Settings → Privacy → Cookies

If you still don't see it, reply with:
- System name you tried to add
- Browser type/version
- Approximate time you tried to add it

Best,
[Your Name]
```

---

### Scenario 5: "Dashboard Is Blank/Slow"

**Customer says:** "My dashboard won't load" or "Dashboard is very slow"

**Investigation:**
1. Check: Is server up? (`/api/health`)
2. Check: Is there an error in Vercel logs?
3. Ask: Which browser and device?
4. Ask: Are you on WiFi or mobile?

**Root Causes & Solutions:**
- **Server issue** → Check `/api/production-health`
- **Network slow** → "Try different WiFi/network"
- **First load** → "First load can take 5-10 seconds"
- **Browser cache** → "Clear cache and cookies"
- **Too many systems** → "Dashboard renders faster with fewer systems"

**Response Template:**
```
Hi [Name],

Let me check a few things:

**Server Status:**
Is the service healthy? Check: https://newspulse-ai.vercel.app/api/health

**Your end:**
1. Refresh page: F5
2. Try different browser
3. Hard refresh: Ctrl+Shift+R
4. Clear cookies

**Network:**
Try different WiFi or mobile network.

Let me know what you find!

Best,
[Your Name]
```

---

### Scenario 6: "I Need Help Organizing My AI Systems"

**Customer says:** "How should I categorize my systems?" or "What system types should I use?"

**Investigation:**
1. Ask: What AI systems are you using?
2. Ask: What business problem does each solve?

**Guidance:**

**Large Language Models:** ChatGPT, Claude, Llama, Gemini
- Use for: Text generation, customer support, content creation

**Generative AI:** DALL-E, Midjourney, Stable Diffusion
- Use for: Image generation, design, art

**Classification:** Spam detection, sentiment analysis
- Use for: Categorizing content, pattern recognition

**Recommendation:** Product recommendations, content feeds
- Use for: Personalization, upsell

**Computer Vision:** Image recognition, object detection
- Use for: Image analysis, content moderation

**Biometric:** Facial recognition, fingerprint scanning
- Use for: Identity verification, access control

**Decision Support:** Loan approval, hiring tools, medical diagnosis aids
- Use for: Automating business decisions

**Response Template:**
```
Hi [Name],

Great question! Here's how to categorize your systems:

**For [System Name]:**
- It's a [System Type]
- Use case: [Brief explanation]
- Risk level: [High/Medium/Low]

**Common patterns:**
- Customer-facing systems → Higher risk
- Internal tools → Lower risk
- High-traffic systems → Higher risk

Do you want help with other systems?

Best,
[Your Name]
```

---

## First Week Operations

### Daily Standup (Every Morning)

**Checklist:**
- [ ] Check overnight error logs
- [ ] Count new customer signups
- [ ] Review support emails received
- [ ] Check for any critical issues
- [ ] Update issue tracking document
- [ ] Note patterns or trends

### Tracking Issues

**Create spreadsheet with columns:**
- Date/Time
- Customer Email
- Issue Type (Signup, Workspace, System, Dashboard, etc.)
- Problem Description
- Root Cause (if known)
- Solution Provided
- Resolution Status (Open/Resolved)
- Resolution Time

**Weekly analysis:**
- Most common issue types
- Average resolution time
- Customer satisfaction
- Patterns needing product fix

### Email Response Standards

**Always include:**
1. Acknowledgment ("Thanks for reporting this...")
2. Investigation summary ("I checked X and found...")
3. Solution with steps
4. Next steps or follow-up

**Tone:**
- Friendly but professional
- Technical but understandable
- Action-oriented (specific steps)
- Empathetic (acknowledge frustration)

**Example:**
```
Hi [Name],

Thanks for reaching out — I'm sorry you're having trouble with [issue].

I checked a few things:
1. Your account is active
2. Email verification is complete
3. Workspace was created successfully

Here's what should fix it:
[3-5 specific steps]

Try that and let me know if it works. If not, I can dig deeper.

Best regards,
[Your Name]
Support Team
```

---

## Escalation Procedures

### When to Escalate to Founder

**Escalate if:**
- Customer reports data loss or unauthorized access
- Security issue suspected
- Potential bug in core functionality
- Customer asking to delete account/data
- Multiple customers reporting same issue
- Issue blocking customer's business

**How to escalate:**
1. Summarize issue in clear email
2. Include: customer email, exact error, steps to reproduce
3. Send to founder with subject: "ESCALATION: [Issue Type]"
4. Tell customer: "I'm escalating this to our technical team"

---

### When to Escalate to Development

**Escalate if:**
- Issue reproducible but cause unknown
- Appears to be application bug
- Requires database inspection
- Performance issue
- Potential security vulnerability

**How to escalate:**
1. Document steps to reproduce exactly
2. Include screenshots if visual
3. Include browser console errors (F12)
4. Include exact error messages
5. Note customer impact level
6. Send to dev team via Slack/email

---

## Knowledge Building

### Common Customer Questions (FAQ)

Track questions you receive and document answers. After first week:
- [ ] Create FAQ document based on top 10 questions
- [ ] Share with team
- [ ] Update public documentation

### Issue Database

Maintain running list of:
- **Recurring issues** (seen multiple times)
- **Known workarounds** (we've solved before)
- **Pending fixes** (reported to dev team)
- **Feature requests** (customers asked for)

This becomes product roadmap input.

---

## Customer Success Metrics

### Track These Weekly

| Metric | Target | What It Means |
|--------|--------|---------------|
| Average Response Time | < 4 hours | Are we responsive? |
| Resolution Time | < 24 hours | How fast do we fix issues? |
| First Contact Resolution | > 80% | Do we solve on first try? |
| Customer Satisfaction | NPS > 40 | Do customers like us? |
| Repeat Issues | < 20% | Are we preventing problems? |
| Escalation Rate | < 5% | Do we need dev help? |

---

## Post-Launch Week Summary (Day 7)

**Prepare report:**
- Total support emails received
- Issue type breakdown (percentage)
- Average response time
- Average resolution time
- Customer satisfaction score
- Top 5 issues encountered
- Recommended improvements
- Dev team action items

**Share with founder and team.**

---

## Long-Term Success

### Month 1 Goals
- [ ] Resolve 95%+ of issues on first contact
- [ ] Average response time < 4 hours
- [ ] Average resolution time < 24 hours
- [ ] Implement FAQ based on top 20 questions
- [ ] Identify 5 product bugs/improvements from feedback

### Month 2 Goals
- [ ] Self-service FAQ solves 50% of common questions
- [ ] Proactive outreach to at-risk customers
- [ ] Customer success playbook updated with learned workflows
- [ ] Product improvements deployed based on feedback

### Ongoing
- [ ] Monthly retrospective on support quality
- [ ] Quarterly review of customer success metrics
- [ ] Regular updates to troubleshooting guide
- [ ] Feedback to product team on feature gaps

---

## Support Email Templates

### Template: Welcome Email

```
Subject: Welcome to EURO AI! 🚀

Hi [Name],

Welcome to EURO AI! We're excited to have you on board.

Here's what you can do right now:
1. Complete your profile (optional)
2. Register your first AI system
3. Review your compliance dashboard

Resources:
- Getting started: [link to onboarding guide]
- API docs: [link to API reference]
- Troubleshooting: [link to troubleshooting guide]

Questions? Reply to this email. We typically respond within 24 hours.

Welcome aboard!
[Your Name]
Support Team
```

### Template: Feedback Request

```
Subject: How's EURO AI working for you?

Hi [Name],

We'd love to hear how your first week with EURO AI has been.

Quick questions:
1. Were you able to register your AI systems? ✅
2. Did the onboarding process make sense? ✅
3. Anything we could improve? 💭

Even if everything is great, a quick "all good!" helps us know.

Reply directly to this email.

Thanks,
[Your Name]
Support Team
```

### Template: Feature Request Response

```
Subject: Re: [Feature Request]

Hi [Name],

Thanks for suggesting [feature]. This is valuable feedback.

We've noted this as a feature request for our product team. We evaluate requests based on:
- Customer impact
- Technical feasibility
- Product roadmap alignment
- User demand

I'll keep you posted if this moves forward.

In the meantime, here's a workaround: [if applicable]

Best,
[Your Name]
Support Team
```

---

## Crisis Communication

### If Major Issue Occurs

**Immediate (Within 30 minutes):**
1. Assess severity (is customer data at risk?)
2. Check if it's widespread or single customer
3. Email affected customers with status update
4. Escalate to founder and dev team

**Status Update Template:**
```
Subject: Status Update: [Issue Name]

Hi [Name],

We're aware of [issue] affecting your account. Here's what's happening:

**What we know:**
[Brief explanation]

**What we're doing:**
[Recovery steps]

**Timeline:**
[Estimated resolution time]

We'll update you within [timeframe]. Thanks for your patience.

[Your Name]
Support Team
```

---

**Document Version:** 1.0  
**Created:** 2026-07-11  
**Owner:** Support Team, Founder  
**Review Date:** 2026-07-18 (first week retrospective)

