# EURO AI CUSTOMER FAQ
## Frequently Asked Questions About EU AI Act Compliance

**For:** First customers and German/EU SMEs  
**Version:** 1.0  
**Last Updated:** 2026-07-16

---

## GETTING STARTED

### Q: What is EURO AI and why do I need it?

**A:** EURO AI is a platform that helps your organization understand and demonstrate compliance with the EU AI Act. 

Instead of trying to read hundreds of pages of regulation on your own, EURO AI:
- Identifies which AI systems you have
- Assesses their risk level under EU AI Act
- Lists what compliance evidence you need
- Helps you organize that evidence
- Generates audit-ready reports

**In short:** Your compliance roadmap, automatically.

---

### Q: Do I have to use EURO AI?

**A:** No, it's voluntary. However, if your organization uses AI systems and your customers or auditors ask about EU AI Act compliance, you'll need to answer those questions somehow. 

EURO AI makes it much faster and easier than spreadsheets or hiring consultants.

---

### Q: Is EURO AI only for big companies?

**A:** No. EURO AI is designed for organizations of any size that use AI systems. We started with German/EU accounting firms, but the platform works for:
- Accounting firms (Anne Catherine's use case)
- Law firms
- Financial services
- Healthcare providers
- Any organization using AI systems

---

### Q: What does EURO AI cost?

**A:** [Pricing information to be provided by commercial team]

We expect to offer free tier (small organizations), startup tier, and enterprise tier based on number of users and systems.

---

## ABOUT EU AI ACT COMPLIANCE

### Q: What is the EU AI Act?

**A:** The EU AI Act is new European regulation (effective 2024-2026) that requires organizations to:
- Know which AI systems they're using
- Assess the risk level of those systems
- Implement controls proportional to the risk
- Keep documentation and evidence
- Be prepared to show an auditor

**Simple version:** Like data protection (GDPR) for AI instead of personal data.

---

### Q: How does EURO AI help with EU AI Act compliance?

**A:** EURO AI maps your AI systems to the regulation's requirements:

1. **Risk Assessment:** Classifies your AI systems as unacceptable/high/medium/low risk
2. **Obligation Identification:** Automatically lists what you need to do
3. **Evidence Collection:** Central place to store compliance proof
4. **Compliance Reporting:** Generates audit-ready documentation

**Result:** You go from "I don't know if we're compliant" to "Here's our evidence."

---

### Q: What if my AI system isn't covered by EU AI Act?

**A:** EURO AI helps you document that decision. Even if something isn't covered by the regulation, you probably want to track it for internal risk management.

---

### Q: Can EURO AI tell me if I'm compliant?

**A:** Not directly. Compliance is ultimately up to your legal/compliance team and auditors. But EURO AI does:
- Collect all the evidence
- Organize it against regulatory requirements
- Calculate a readiness percentage
- Flag gaps that need attention

**Think of it as:** EURO AI is your evidence collector; your legal team makes the final compliance determination.

---

## USING THE PLATFORM

### Q: How long does it take to use EURO AI?

**A:** 
- **Initial setup:** 15 minutes (registration + workspace + first AI system)
- **Risk assessment per system:** 20-30 minutes
- **Evidence gathering:** Depends on how much you already have documented
- **First compliance report:** 5 minutes (system generates it automatically)

**Total for organization with 3 systems:** 1-2 hours spread over 1-2 days.

---

### Q: Do I need technical knowledge to use EURO AI?

**A:** No. The platform is designed for compliance/business people, not technical staff. If you can use Google Docs or Excel, you can use EURO AI.

---

### Q: Can multiple people use EURO AI at my organization?

**A:** Yes. You can add team members with different roles:
- **Admin:** Can manage users and workspace
- **Assessor:** Can create and update assessments
- **Viewer:** Can view results but not make changes

This lets your whole team collaborate on compliance.

---

### Q: What if I forget my password?

**A:** Click "Forgot Password" on login page, reset link will be sent to your email.

---

### Q: How is my data protected?

**A:** 
- **Encryption:** All data encrypted in transit (HTTPS) and at rest
- **Isolation:** Your data is completely isolated from other customers (database-level enforcement)
- **Backup:** Automatic backups every day, 30-day retention
- **Access control:** Only people you invite can see your data
- **Compliance:** Infrastructure runs on Supabase (managed PostgreSQL) with enterprise security

---

### Q: Can you (the EURO AI team) see my data?

**A:** No. We cannot see your data. Your data is encrypted and isolated. We can only see usage metrics (how many systems, how many assessments) for platform improvement.

---

## COMPLIANCE QUESTIONS

### Q: What qualifies as an "AI system" under EU AI Act?

**A:** Generally, software that:
- Makes decisions or predictions about people or business
- Learns from data (machine learning)
- Processes information in a way that mimics human judgment

**Examples:**
- Recommendation engines (product suggestions, matching)
- Classification systems (document categorization, image recognition)
- Prediction models (forecasting, optimization)
- Large language models (ChatGPT-like systems)

**Probably not:**
- Traditional rule-based software
- Simple search
- Calculator functions

When in doubt, include it in your inventory. You can always assess it as "low risk" if it's actually simple software.

---

### Q: How do I determine risk level?

**A:** EURO AI guides you through the assessment by asking about:
- Input data: Is sensitive personal or financial data involved?
- Output impact: Can the system's decisions significantly affect a person or business?
- Override capability: Can a human easily override the system's decision?
- Transparency: Can users understand why the system made a decision?
- Scope: How many people does it affect?

Based on your answers, the platform calculates the risk level. Your compliance/legal team reviews and confirms.

---

### Q: What should I do if a system is "unacceptable risk"?

**A:** EU AI Act forbids unacceptable-risk systems. If you have one:
1. Stop using it immediately
2. Replace with lower-risk alternative
3. Document the transition
4. Update EURO AI with new system

**Examples of unacceptable risk:**
- Social credit scoring (rating people like the Chinese system)
- Subliminal manipulation systems
- Emotion recognition for decision-making (in certain contexts)

In practice, most commercial AI systems aren't unacceptable; they're high/medium/low risk.

---

### Q: What kind of evidence do I need?

**A:** Depends on the system's risk level. Generally:

**For low-risk systems:**
- Basic documentation (what does it do?)
- Performance testing (does it work?)

**For medium-risk systems:**
- Impact assessment
- Human oversight procedures
- Training data documentation
- Testing/validation records

**For high-risk systems:**
- Detailed impact assessment
- Bias testing results
- Human review procedures
- Ongoing monitoring plan
- Audit trail of decisions

EURO AI organizes evidence requirements by obligation, so you know exactly what's needed for each system.

---

### Q: Who is responsible for compliance?

**A:** Your organization is. Specifically:
- **Leadership/Founder:** Responsible for compliance posture
- **Compliance/Legal:** Interprets regulation
- **Business/Operations:** Identifies AI systems, gathers evidence
- **Technical:** Implements safeguards, maintains audit trails

EURO AI helps all these people see the same evidence and status.

---

## WORKFLOW & FEATURES

### Q: What is a "Workspace"?

**A:** Your organization's compliance project in EURO AI. Everything your team does (assessments, evidence, reports) is organized within your workspace.

Think of it as your compliance folder.

---

### Q: What is "Risk Assessment"?

**A:** Your documented decision about a single AI system's risk level and reasoning. It answers the question: "Why is this system medium-risk?"

Risk assessments are the foundation of compliance documentation. Once you finalize them, they can't be changed (for audit trail purposes).

---

### Q: What are "Obligations"?

**A:** The specific things you need to do for a given AI system to be compliant.

**Example:** If you have a high-risk system, obligations might include:
- Complete an impact assessment
- Document your human review process
- Keep logs of all recommendations
- Notify customers that AI is being used

EURO AI automatically identifies obligations based on your system's risk level.

---

### Q: What is "Evidence"?

**A:** Proof that you've done what an obligation requires.

**Example:** If obligation is "Document human review process", evidence might be:
- Your HR policy PDF
- Email showing team training on review procedures
- Screenshots of review log system

Evidence is how you prove compliance to auditors.

---

### Q: What is the "Compliance Dashboard"?

**A:** Real-time view of your compliance status. Shows:
- Total systems and how many are assessed
- Risk distribution (how many high/medium/low?)
- Assessment status (draft/in review/finalized?)
- Evidence collected
- Obligations progress
- Overall readiness percentage

It's your compliance health check.

---

### Q: What is the "Compliance Report"?

**A:** Audit-ready PDF you can send to regulators, auditors, or customers. It includes:
- All your AI systems
- Risk levels
- Assessments
- Evidence summary
- Compliance status
- Readiness percentage

It's generated automatically from your workspace data. If you update something, regenerate to get the latest version.

---

## AUDIT & REGULATORY

### Q: Will this report pass an audit?

**A:** Maybe. EURO AI helps you build a complete evidence file, but compliance determination ultimately belongs to:
- Your organization's legal team
- External auditors (if you hire them)
- Regulators (if they investigate)

EURO AI makes it much easier to have everything organized for them.

---

### Q: What if a regulator asks to see our AI Act compliance?

**A:** Give them your EURO AI compliance report. It shows:
- What systems you have
- How you assessed them
- What controls you implemented
- What evidence you collected

If it raises questions, your compliance team can dive into EURO AI to show supporting details.

---

### Q: Do we need to show EURO AI to our customers?

**A:** Depends on your industry. Your customer terms might require you to disclose AI use. EURO AI gives you a professional way to document and communicate that.

---

### Q: What if we discover we're not compliant?

**A:** That's what EURO AI is for. Better to discover gaps yourself than have a regulator find them.

EURO AI's readiness score tells you what's missing. You can:
1. Fix the gaps (update system, add controls, collect evidence)
2. Stop using the system
3. Accept the risk (documented decision)

The regulation is about being intentional about AI, not perfect.

---

## SUPPORT & HELP

### Q: What if I don't understand a question in the assessment?

**A:** Contact Governor with the specific question. We'll clarify what we're asking for and help you determine the right answer.

---

### Q: What if I can't find evidence I need?

**A:** Two options:
1. Create it (if it's something you should have documented anyway)
2. Accept the gap and note it as a follow-up action

EURO AI helps you see exactly what you're missing so you can prioritize.

---

### Q: How often should I update assessments?

**A:** When something changes:
- You deploy a new AI system → Add to inventory and assess it
- You change how a system works → Update assessment
- You add new controls (e.g., training) → Update evidence

At minimum, review and update once per year for audit purposes.

---

### Q: Can I export my data from EURO AI?

**A:** Yes:
- **Compliance report:** Download PDF anytime
- **Raw data:** Contact Governor for export formats (CSV, JSON)

You own your data; you can always get it out.

---

### Q: Is EURO AI compliant with GDPR?

**A:** Yes. EURO AI:
- Only collects necessary data
- Encrypts data in transit and at rest
- Deletes data on request
- Allows data export
- Maintains audit logs
- Uses only GDPR-compliant infrastructure

The platform is designed to help you meet GDPR too.

---

## ADVANCED TOPICS

### Q: Can we integrate EURO AI with other systems?

**A:** Currently integration is via API (contact Governor). In the future, we plan:
- Zapier/IFTTT integration
- Slack notifications
- GitHub/GitLab integration (for AI system tracking)
- Data warehouse connectors

Let Governor know what integrations would help you.

---

### Q: What happens if you (EURO AI) shut down?

**A:** Your data remains yours. You can export everything and:
- Share with your auditor/legal team
- Import into another system if you switch platforms
- Use for offline compliance tracking

We plan to stay around for a very long time, but you're never locked in.

---

### Q: How do you decide what features to build next?

**A:** Based on customer requests and the regulation. If you need a feature, tell Governor. If multiple customers need it, we'll prioritize it.

---

## TROUBLESHOOTING

### Q: Something doesn't work. Who do I contact?

**A:** Governor. Email with:
1. What you were trying to do
2. What error you saw
3. When it happened
4. Your browser type

Response within 4 business hours.

See `TROUBLESHOOTING_GUIDE.md` for common issues.

---

### Q: Is EURO AI down?

**A:** Check status at [status page URL]. Current status: 🟢 Operational

---

## ABOUT GOVERNOR & SUPPORT

### Q: Who is Governor?

**A:** Governor Ω is the AI system managing the EURO AI platform. Governor:
- Monitors platform health
- Responds to support requests
- Implements feature updates
- Ensures data security
- Tracks your compliance progress

Governor is your 24/7 platform steward.

---

### Q: What's the support response time?

**A:** 
- **Business hours (9-17 CET):** < 4 hours
- **After hours:** Emergency issues only, best-effort response

For non-urgent issues, weekend response may be delayed.

---

### Q: Can I schedule a demo?

**A:** Yes, email Governor to request a live walkthrough tailored to your use case.

---

## LEGAL & COMPLIANCE

### Q: Is using EURO AI legally required?

**A:** No. But using a platform specifically designed for EU AI Act compliance is good practice. It shows you're taking the regulation seriously.

---

### Q: Will using EURO AI make us fully compliant?

**A:** Not automatically. EURO AI is a tool that helps you understand what compliance requires and organize your evidence. Actual compliance depends on:
- Your AI systems and how you use them
- Your controls and safeguards
- Your evidence and documentation
- Regulatory interpretation (which changes over time)

Think of it as: EURO AI is the toolkit, compliance is what you build with it.

---

### Q: What if EU AI Act changes?

**A:** EURO AI is designed to evolve with regulation. We monitor changes and update obligations/guidance to reflect current requirements.

---

## FEEDBACK

### Q: How do I suggest a feature?

**A:** Email Governor with:
- What you want to do
- Why it's important
- How often you'd use it

We track all feature requests and prioritize based on customer impact.

---

### Q: How do I report a bug?

**A:** Email Governor with:
- What you were doing
- What happened (with screenshot if possible)
- What should have happened
- How often it happens

---

## GETTING HELP

**Still have questions?**

Email Governor: [support email]  
Subject: "EURO AI Question: [your question]"  
Response: < 4 hours business hours  

---

**FAQ Version:** 1.0  
**Last Updated:** 2026-07-16  
**Maintained By:** Governor Ω  
**For:** Anne Catherine and all EURO AI customers
