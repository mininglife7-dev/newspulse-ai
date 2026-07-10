# EURO AI Customer Guides

**Version:** 1.0 (MVP)  
**Last Updated:** 2026-07-10  
**Audience:** First-time users, German customers, pilot partners  

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Step 1: Company Setup](#step-1-company-setup)
3. [Step 2: AI Inventory](#step-2-ai-inventory)
4. [Step 3: Risk Assessment](#step-3-risk-assessment)
5. [FAQ](#faq)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### What is EURO AI?

EURO AI helps organizations manage AI governance and comply with the EU AI Act. Our three-step onboarding gets you from zero to compliance baseline in under an hour:

1. **Company Setup** — Tell us about your organization
2. **AI Inventory** — Catalog all AI systems you use
3. **Risk Assessment** — Evaluate EU AI Act compliance risks

### Sign Up

1. Visit the EURO AI homepage
2. Click **"Start Free Trial"**
3. Enter your email and create a password (min. 8 characters)
4. Click **"Create account"**
5. Check your email for a verification link
6. Click the link to verify your account
7. Sign in with your email and password

**What happens next:** You'll land on your dashboard. It's time to start the 3-step onboarding.

---

## Step 1: Company Setup

**What you're doing:** Creating your workspace and telling EURO AI about your organization.

**Why it matters:** This establishes your data isolation and context for AI system classification.

### How to Complete Step 1

1. On your dashboard, click the **"Company Setup"** card
2. Fill in the required fields:
   - **Company Name** (e.g., "Acme Inc.") — Your organization's name
   - **Country** — Where you're headquartered (EU required for AI Act compliance)
   - **Industry** — Your primary business sector
3. Optionally, fill in:
   - **Legal Name** — Formal company name if different
   - **AI Priorities** — Brief description of your AI use cases
4. Click **"Continue"**
5. You'll see a success message and be redirected to your dashboard

**What gets created:**
- Your workspace (a secure, isolated data environment)
- Your company profile
- Your user access to the workspace

### Next Steps

Once you complete Step 1:
- Your dashboard unlocks **Step 2: AI Inventory**
- You can now register all AI systems your organization uses

---

## Step 2: AI Inventory

**What you're doing:** Registering every AI system (model, tool, or service) your organization uses.

**Why it matters:** You can't govern what you don't know about. Your AI Inventory is the foundation for risk assessment.

### How to Complete Step 2

1. On your dashboard, click the **"AI Inventory"** card (or go directly to `/inventory`)
2. You'll see an empty inventory. Click **"Add AI system"**
3. A form appears. Fill in:
   - **Name*** — System identifier (e.g., "Customer Support Chatbot")
   - **Type** — Category (LLM, Generative AI, Classification, etc.)
   - **Vendor / Provider** — Company that makes/hosts it (e.g., "OpenAI", "Internal")
   - **Status** — Current state (Active, Pilot, Deprecated)
   - **Purpose** — What you use it for (optional)
4. Click **"Save system"**
5. The system appears in your inventory
6. Repeat for every AI system your organization uses

**System Status Guide:**
- **Active** — Currently in production
- **Pilot** — Under evaluation or limited rollout
- **Deprecated** — No longer in use (keep for records)

### Adding Multiple Systems

To add more systems:
1. Click **"Add AI system"** again
2. The form resets for the next entry
3. Repeat until you've cataloged all systems

**Tip:** Start with your largest systems (LLMs, chatbots, recommendation engines). Smaller tools can be added later.

### Next Steps

Once you've added at least one system:
- Your dashboard unlocks **Step 3: Risk Assessment**
- You can now evaluate each system against EU AI Act requirements

---

## Step 3: Risk Assessment

**What you're doing:** Evaluating each AI system against EU AI Act compliance requirements.

**Why it matters:** Risk assessment identifies which systems require special attention, documentation, and governance controls.

### How to Complete Step 3

1. On your dashboard, click the **"Risk Assessment"** card (or go directly to `/risk-assessments`)
2. On the left side, you'll see your AI systems list
3. Click on a system to assess it
4. The assessment form appears with 15 questions across 5 categories:
   - **Fundamental Rights** (e.g., Does this system make decisions affecting humans?)
   - **Safety** (e.g., Could system failures cause physical harm?)
   - **Bias & Discrimination** (e.g., Does it process protected characteristics?)
   - **Transparency** (e.g., Do users know they're interacting with AI?)
   - **Accountability** (e.g., Do you have audit trails?)

5. **Read each question carefully.** Check the box if "yes" to the question.
6. **Expand sections** by clicking the category header to see related questions
7. Click **"Submit Assessment"** when done

### Understanding Your Risk Level

After you submit, EURO AI calculates your risk level:

- 🟢 **Low** — Few compliance concerns; basic documentation sufficient
- 🟡 **Medium** — Some high-risk factors; additional controls recommended
- 🟠 **High** — Multiple significant risks; governance plan needed
- 🔴 **Unacceptable** — Critical risks; system may need redesign or retirement

**Risk Score:** 0-100. Higher scores indicate more compliance work needed.

### Multiple Assessments

Each system gets one assessment. To assess a different system:
1. Click **"Assess Another System"** after viewing results, OR
2. Click a different system in the left sidebar
3. Fill out and submit its assessment

### Next Steps

After assessing your systems:
- Your dashboard shows your overall compliance picture
- You have a baseline for EU AI Act compliance
- Contact your onboarding specialist for guidance on next steps

---

## FAQ

### General

**Q: Do I have to complete all 3 steps at once?**  
A: No. Complete them at your own pace. You can sign off and come back anytime.

**Q: Can I edit my company profile after Step 1?**  
A: Not yet (coming in a future update). Contact support if you need to make changes.

**Q: Is my data secure?**  
A: Yes. Your data is isolated in your workspace, encrypted in transit and at rest, and protected by EU privacy standards (GDPR).

### AI Inventory

**Q: What if I can't remember all my AI systems?**  
A: Start with what you know. You can add more later. Check your:
- IT/ML team's tools
- SaaS subscriptions (e.g., ChatGPT Pro, other API services)
- Internal models
- Vendor-provided AI (analytics, recommendations)

**Q: Can I mark a system as "Deprecated" instead of deleting it?**  
A: Yes. Use the **Status** dropdown. Deprecated systems stay in your records for audit purposes.

**Q: What if I add a system by mistake?**  
A: Contact support to remove it. We don't have a self-serve delete yet.

### Risk Assessment

**Q: What if I don't know the answer to a question?**  
A: Leaving it unchecked (answering "no") is the safest option. Consult your team to be sure. Your risk score updates when you check boxes, so you can always go back and change answers.

**Q: Can I edit an assessment after submitting?**  
A: Not yet (coming in a future update). Contact support if you need to revise.

**Q: What does "Fundamental Rights" mean?**  
A: Systems that could affect human rights — employment decisions, benefits eligibility, loan approvals, etc. The EU AI Act has strict rules for these.

**Q: Does a "High" risk rating mean the system is dangerous?**  
A: Not necessarily. It means the system needs strong governance and documentation. Many "high-risk" systems are essential and can be used safely with proper controls.

---

## Troubleshooting

### I Can't Sign Up

**Error: "Email already in use"**
- You already have an account with that email
- Try signing in instead
- If you forgot your password, use "Forgot password?" on the signin page

**Error: "Password must be at least 8 characters"**
- Your password is too short
- Use a combination of uppercase, lowercase, numbers, and symbols

### I Can't Verify My Email

**"Verification link expired"**
- Sign in and request a new verification link (coming soon)
- Contact support if you need immediate help

**"I didn't receive the email"**
- Check your spam/junk folder
- Verify you entered the correct email
- Contact support to resend the link

### I Can't Find the Next Step

**"Company Setup is locked / grayed out"**
- You haven't completed it yet
- Click the card and fill in all required fields

**"AI Inventory is locked / grayed out"**
- Complete Company Setup first (Step 1)
- You need a workspace before you can add systems

**"Risk Assessment is locked / grayed out"**
- Add at least one AI system to your inventory first (Step 2)
- Then return to the Risk Assessment page

### Forms Won't Submit

**"Please fill in required fields"**
- All fields marked with * are required
- Make sure you've selected options for dropdowns (Country, Industry)

**"Failed to save. Please try again."**
- Network connection might have dropped
- Try submitting again
- Contact support if the error persists

### I Lost My Assessment Results

**"I submitted an assessment but don't see it on the dashboard"**
- Refresh your browser (Ctrl+R or Cmd+R)
- Go directly to `/risk-assessments` to see your full history
- Assessments are saved even if you navigate away

---

## Getting Help

### Onboarding Contact

You have a dedicated onboarding specialist who can help with:
- Product questions
- Compliance interpretation
- Next steps after MVP

**Contact your specialist directly** — They were provided in your welcome email.

### Submit Feedback

Have ideas? Found a bug? Tell us:
- Email: feedback@euroai.example (coming soon)
- In-app feedback form (coming soon)

### Known Limitations

**Launching Soon:**
- Team member invitations
- Assessment editing
- Custom compliance frameworks
- German language UI

---

## Next Steps After Onboarding

Once you complete all 3 steps, you have:

✅ Company profile  
✅ AI system catalog  
✅ Risk baseline  

**What's next:**
1. **Share results** with your leadership and compliance team
2. **Plan governance** for high-risk systems
3. **Document decisions** on how you'll address compliance gaps
4. **Check back regularly** as you add new AI systems or make changes

Your onboarding specialist can help guide these decisions.

---

## Privacy & Legal

- **Privacy Policy:** See `/privacy`
- **Terms of Service:** See `/terms`
- **GDPR Rights:** You can request access to or deletion of your data anytime

---

**Last Updated:** 2026-07-10  
**Version:** 1.0 (MVP)  
**Next Update:** After first customer pilot feedback
