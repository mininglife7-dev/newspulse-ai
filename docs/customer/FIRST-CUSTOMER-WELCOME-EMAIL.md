# First Customer Welcome Email

**Purpose:** Send to first pilot customer after Founder completes launch setup  
**Timing:** Send immediately after Founder actions complete  
**Expected Response:** Customer should sign up within 24 hours

---

## Email Template (Copy & Customize)

### Subject Line Options

**Option 1 (Professional):**

```
Welcome to [Platform Name] — Your AI Governance Dashboard
```

**Option 2 (Friendly):**

```
Let's Manage Your AI Systems Together 🚀
```

**Option 3 (Urgent):**

```
[Founder Name] + [Customer Name]: Your EU AI Act Compliance Platform
```

---

### Email Body

```
Hi [Customer Name],

I'm excited to invite you to join [Company Name] as our first pilot customer
for [Platform Name] — the AI governance platform built for European companies.

====================
YOUR MISSION TODAY
====================

In the next 30 minutes, you'll:

1. Create your account (2 min)
2. Set up your workspace (3 min)
3. Add your first AI system (3 min)
4. Run an EU AI Act risk assessment (10 min)
5. Get your compliance report (2 min)

That's it. You'll have a risk assessment report in 20 minutes.

====================
HOW TO GET STARTED
====================

1. Go to: https://[your-domain].com
   (Click "Get Started" at the top)

2. Sign up with:
   Email: [customer-email]
   Password: [anything secure]

3. Confirm your email (check your inbox)

4. Create workspace:
   Name: Your company name
   Industry: [Your industry]

5. Follow the guided setup

Questions? Just reply to this email — I read every message.

====================
WHY NOW?
====================

EU AI Act compliance requirements just got real. Most companies are:
- ❌ Still figuring out which AI systems they have
- ❌ Don't know their risk levels
- ❌ Have no documentation for regulators

We built [Platform Name] to change that. In 20 minutes, you'll have
everything you need for compliance.

This is a pilot program. Your feedback will directly shape the product.

====================
TIMELINE
====================

Week 1: You try it out, tell us what works (or doesn't)
Week 2: We iterate based on your feedback
Week 3: You help shape the roadmap

You're not just a customer — you're a co-builder.

====================
SUPPORT
====================

I'm here if you get stuck:

- Live help: Reply to this email
- Docs: https://[your-domain].com/docs
- Status: https://status.[your-domain].com

I typically respond within 1 hour (often much faster).

====================
LET'S DO THIS
====================

Go sign up: https://[your-domain].com

I'm excited to see what you build.

[Founder Name]
[Title]
[Company Name]

P.S. – This is the actual platform, not a demo. Every button works.
Every report is real. No sales pitch waiting at the end. Just a
genuinely useful compliance tool.

P.P.S. – If you have 5 minutes after onboarding, I'd love to know:
what was the smoothest part? What was confusing? Your feedback makes
us better.
```

---

## Customization Checklist

Before sending, make sure you've filled in:

- [ ] `[Platform Name]` — The actual platform name
- [ ] `[Company Name]` — Your company
- [ ] `[Founder Name]` — Your name
- [ ] `[Title]` — Your title (CEO, Founder, etc.)
- [ ] `[your-domain].com` — Your actual domain
- [ ] `[customer-email]` — Their email
- [ ] `[Your industry]` — Their industry (if known)

---

## Send Instructions

1. **Email Client:** Gmail, Outlook, or your email app
2. **To:** Customer email address
3. **Copy-paste:** Template above into email body
4. **Customize:** Fill in all bracketed fields
5. **Proofread:** Read it one more time
6. **Send:** Click Send

**Timing:** Send immediately after verifying:

- ✅ Supabase schema deployed
- ✅ GitHub Actions spending configured
- ✅ `/api/health` returns healthy
- ✅ Vercel deployment live

---

## What Happens Next

### Customer Receives Email

- [ ] Email delivers (usually instant)
- [ ] Customer opens (likely within 1 hour)
- [ ] Customer clicks signup link

### Customer Signs Up (Expected: 15-30 min)

- [ ] Account created in Supabase
- [ ] Email confirmation sent
- [ ] Customer confirms email
- [ ] Dashboard loads

### Founder Monitors (Real-time)

- [ ] Watch `/api/health` every few minutes
- [ ] Watch GitHub Actions for any errors
- [ ] Read any support emails immediately
- [ ] Follow `LAUNCH-DAY-PROCEDURES.md`

### Customer Completes Journey (Expected: 20-30 min total)

- [ ] Creates workspace
- [ ] Adds AI system
- [ ] Runs risk assessment
- [ ] Generates report
- [ ] (Optional) Reaches out with questions

---

## If Customer Doesn't Sign Up Within 1 Hour

**Possible reasons:**

1. Email went to spam (check with them)
2. They're busy (they'll sign up later)
3. They couldn't find the link (resend email)
4. Technical issue (check `/api/health` and logs)

**Your response:**

1. Send a follow-up message: "Did you get my email?"
2. Offer direct help: "I can walk you through it step-by-step"
3. Provide alternative: "Want me to create your account for you?"

---

## After Customer Completes Journey

### Success Message (if they reach out)

```
Awesome! You're live now.

Next steps:
1. Explore your risk assessment results
2. Add more AI systems to your inventory
3. Generate reports for your team

I'm here if you have questions.

[Your name]
```

### Feedback Request (after they've used it for 1 day)

```
You've had a day to try [Platform Name].

Quick feedback:
1. What worked well?
2. What was confusing?
3. What would be most valuable next?

Your answers shape what we build next.

Reply here or call me: [phone number]

Thanks,
[Your name]
```

---

## Troubleshooting If Signup Fails

### "Email already exists"

- Customer created account twice (or test account exists)
- Solution: Manually reset their password via Supabase

### "Email confirmation not arriving"

- Check spam folder
- Verify SendGrid is configured
- Manually confirm their email in Supabase

### "Can't create workspace"

- Check RLS policies deployed correctly
- Check error in browser console
- Check `/api/alerts` for system errors

### "Risk assessment won't submit"

- Check database connectivity
- Check for validation errors in form
- Check Supabase query logs for errors

See: `docs/governance/FOUNDER_QUICK_REFERENCE.md` for more troubleshooting.

---

## Variations by Customer Type

### If customer is a Large Enterprise

```
[Add to email]:
"We understand compliance complexity at scale.
This platform handles multi-system environments
where teams have different risk tolerances."
```

### If customer is a Startup

```
[Add to email]:
"You're probably moving fast. This gets you
compliant quickly so you can focus on growth."
```

### If customer is Non-Technical

```
[Add to email]:
"Don't worry if you're not technical.
Everything is designed to be straightforward.
I'll walk you through it."
```

---

## Record Keeping

After sending:

- [ ] Save sent email to `docs/launch-records/first-customer-email.txt`
- [ ] Note send time in launch record
- [ ] Track customer response time
- [ ] Document any issues encountered

---

## Next Customer Emails

After the first customer:

- Refine this template based on their feedback
- Document what worked and what didn't
- Create customer #2 email with improvements
- Keep a library of successful customer emails

---

**Remember:** This is the first impression. Make it count.

The customer is co-creating this product with you. Show them you care about
their success, not just converting them as a customer.

Good luck! 🚀
