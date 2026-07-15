# Launch Day Log Template

**Purpose:** Structured log for documenting events, decisions, and metrics during launch day  
**Audience:** Founder and Governor (both log throughout the day)  
**Time Required:** 2-3 minutes per entry (as events occur)  
**Status:** Template  
**Date:** 2026-07-15

---

## Why Keep a Log?

During launch day, critical events happen fast. A log:
1. **Provides accountability** - Clear record of what happened and when
2. **Enables quick reference** - Find "what did we do when X happened?"
3. **Supports decision-making** - "Last time we fixed this by..."
4. **Feeds retrospective** - Week 1 retrospective uses this data
5. **Aids escalation** - If issues arise, we have timeline and context

**How to use this:** Open during launch day and update as events occur (don't wait until end of day).

---

## Master Launch Day Log

```
═══════════════════════════════════════════════════════════════
NEWSPULSE AI — LAUNCH DAY LOG
Launch Date: 2026-07-XX
Founder: [Your name]
Governor: [Governor name]
═══════════════════════════════════════════════════════════════

PHASE 1: PRE-DEPLOYMENT (T-30min to T+0:00)
─────────────────────────────────────────────────

T-30:00 [Time]: Pre-deployment checklist started
Status: IN PROGRESS
Details: Starting PRE_DEPLOYMENT_READINESS.md verification
Owner: [Founder]
Notes: [Any issues encountered or notes]

T-XX:XX [Time]: Pre-deployment checklist completed
Status: COMPLETE ✅
Details: All 10 verification items confirmed
Owner: [Founder]
Notes: [Any concerns or observations]

T-XX:XX [Time]: Readiness sign-off sent to Governor
Status: SENT
Details: LAUNCH_READINESS_SIGN_OFF.md completed and delivered
Owner: [Founder]
Notes: [Any final concerns mentioned in sign-off]

T-XX:XX [Time]: Governor confirms readiness
Status: CLEARED FOR LAUNCH ✅
Details: Governor reviewed all items and confirmed green light
Owner: [Governor]
Notes: [Any additional verification notes from Governor]

─────────────────────────────────────────────────

PHASE 2: SUPABASE DEPLOYMENT (T+0:00 to T+7:00)
──────────────────────────────────────────────────

T+0:00 [Time]: Supabase schema deployment started
Status: IN PROGRESS
Details: Deploying schema.sql to Supabase
Owner: [Founder]
Notes: [Any observations during deployment]

T+0:05 [Time]: Supabase schema deployment completed
Status: COMPLETE ✅
Details: 9 tables successfully created
Owner: [Founder]
Notes: [Any errors that were resolved or notes about deployment]

T+0:05 [Time]: Email authentication enablement started
Status: IN PROGRESS
Details: Navigating to Supabase Auth settings
Owner: [Founder]
Notes: [Any issues accessing settings]

T+0:07 [Time]: Email authentication enabled
Status: COMPLETE ✅
Details: Email provider toggle set to ON
Owner: [Founder]
Notes: [Email auth status and any issues]

T+0:07 [Time]: Founder notifies Governor of Supabase completion
Status: SENT
Details: Message sent to Governor to begin pre-flight verification
Owner: [Founder]
Notes: [Time Supabase was completed for Governor's coordination]

─────────────────────────────────────────────────

PHASE 3: PRE-FLIGHT VERIFICATION (T+7:00 to T+35:00)
─────────────────────────────────────────────────────

T+15:00 [Time]: Pre-flight verification started by Governor
Status: IN PROGRESS
Details: Governor begins automated verification suite
Owner: [Governor]
Notes: [Verification tests being run]

T+35:00 [Time]: Pre-flight verification results received
Status: COMPLETE ✅ or FAILED ❌
Details: [If passed: All checks passed. If failed: Which checks failed]
Owner: [Governor]
Notes: [Full test results and any concerns]

[If any pre-flight checks failed: Document remediation here]

T+XX:XX [Time]: Pre-flight issues remediated
Status: COMPLETE ✅
Details: [What was fixed and how]
Owner: [Founder or Governor]
Notes: [Verification re-run confirmation]

─────────────────────────────────────────────────

PHASE 4: LAUNCH DAY PROCEDURES (T+35:00 onwards)
────────────────────────────────────────────────

T+35:00 [Time]: Environment variables set in Vercel
Status: COMPLETE ✅
Details: NEXT_PUBLIC_SUPABASE_URL, anon key, service role key set
Owner: [Founder]
Notes: [Any issues setting variables]

T+37:00 [Time]: Vercel redeployment complete
Status: COMPLETE ✅
Details: Deployment shows "Ready ✓"
Owner: [Governor - monitoring]
Notes: [Deployment status confirmation]

T+40:00 [Time]: Customer signup test started
Status: IN PROGRESS
Details: Testing full signup flow (signup → email → verification → login)
Owner: [Founder]
Notes: [Steps completed successfully or issues encountered]

T+41:00 [Time]: Customer signup flow verified
Status: COMPLETE ✅
Details: Full flow works end-to-end without errors
Owner: [Founder]
Notes: [Signup response time and user experience notes]

T+41:00 [Time]: Launch announcement prepared
Status: READY
Details: Email and social media announcements ready to send
Owner: [Founder]
Notes: [Launch messaging confidence and timing notes]

T+42:00 [Time]: Launch announcement sent
Status: SENT
Details: Email sent to customer waitlist
Owner: [Founder]
Notes: [Send time and any delivery confirmation]

T+42:00 [Time]: Launch announcement posted to social media
Status: SENT
Details: LinkedIn and Twitter posts live
Owner: [Founder]
Notes: [Post times and engagement predictions]

T+42:00 [Time]: CUSTOMER SIGNUP ENABLED ✅
Status: LIVE
Details: Customers can now sign up and begin using NewsPulse AI
Owner: [Founder + Governor]
Notes: [System status and monitoring setup confirmation]

─────────────────────────────────────────────────

PHASE 5: FIRST WAVE MONITORING (T+42:00 to T+4:00)
────────────────────────────────────────────────────

[Record checkpoint updates hourly or as significant events occur]

T+1:00 [Time]: First wave monitoring — 1 hour mark
Status: MONITORING
Signups (last hour): [Number]
Signups (cumulative): [Number]
Error rate: [Percentage]
Uptime: [Percentage]
Issues: [Any issues encountered]
Owner: [Governor monitoring, Founder responding]
Notes: [Observations and status]

T+2:00 [Time]: First wave monitoring — 2 hour mark
Status: MONITORING
Signups (last hour): [Number]
Signups (cumulative): [Number]
Error rate: [Percentage]
Uptime: [Percentage]
Issues: [Any issues]
Owner: [Governor monitoring, Founder responding]
Notes: [Observations and status]

T+4:00 [Time]: Critical period complete
Status: COMPLETE ✅
Signups (Day 1 first 4 hours): [Total number]
Error rate (first 4 hours): [Percentage]
Uptime (first 4 hours): [Percentage]
Critical issues: [Any critical issues encountered and resolved]
Owner: [Governor]
Notes: [Overall health assessment and any notes]

─────────────────────────────────────────────────

PHASE 6: DAY 1 TRACKING (T+4:00 to T+24:00)
──────────────────────────────────────────────

T+12:00 [Time]: Day 1 half-day checkpoint
Status: MONITORING
Signups (cumulative): [Number]
Error rate: [Percentage]
Uptime: [Percentage]
Customer feedback: [Summary of feedback received]
Support tickets: [Number and nature]
Issues encountered: [Any issues or how they were handled]
Owner: [Founder recording]
Notes: [Observations and next 12 hours forecast]

T+24:00 [Time]: Day 1 complete
Status: COMPLETE ✅
Total signups (Day 1): [Final number]
Error rate (Day 1): [Final percentage]
Uptime (Day 1): [Final percentage]
Major customer feedback: [Summary]
Support response time: [Average]
Critical issues: [Any critical issues and resolution]
Owner: [Founder final log]
Notes: [Day 1 assessment: Success or concerns]

═══════════════════════════════════════════════════════════════
```

---

## How to Update the Log During Launch

### For Each Entry:
```
[Time] [Entry Title]:
Status: [IN PROGRESS / COMPLETE ✅ / FAILED ❌ / BLOCKED]
Details: [What happened, what was done, what was learned]
Owner: [Who was responsible]
Notes: [Any concerns, issues, questions, or observations]
```

### Status Options:
- **IN PROGRESS** - Currently happening
- **COMPLETE ✅** - Successfully finished
- **FAILED ❌** - Did not complete as expected
- **BLOCKED** - Cannot proceed (waiting for something)
- **MONITORING** - Ongoing without action needed
- **SENT** - Action delivered (message, deployment, etc.)

### Entry Timing:
- **Before each major phase** - Start and end logging
- **When issues arise** - Immediately log the issue
- **When decisions are made** - Log decision rationale
- **At checkpoints** - Hourly or per milestone
- **When status changes** - Any shift in system state

---

## Critical Events to Log

**Always log these events:**

| Event | Why | Timing |
|-------|-----|--------|
| Pre-deployment complete | Confirms readiness | T-30min |
| Schema deployment complete | Critical milestone | T+0:05 |
| Email auth enabled | Verify email works | T+0:07 |
| Pre-flight verification results | Confirms system ready | T+35min |
| Environment variables set | Confirms Vercel config | T+35min |
| Signup test passed | Confirms flow works | T+40min |
| Launch announcement sent | Marks customer launch | T+42min |
| First signup received | Confirms customers arriving | T+45-60min (approx) |
| Error rate exceeds threshold | Potential issue | If >1% |
| Uptime drops below threshold | Potential outage | If <99% |
| Customer reports issue | Feedback | Throughout |
| Issue remediated | Resolution | As resolved |

---

## Example: Real Launch Day Log Entry

```
T+2:30 [14:32 UTC]: First customer support request received
Status: HANDLED
Details: Customer reported "verification email not received"
  - Investigated: Email provider logs show email sent at T+2:28
  - Action taken: Resent verification email to customer
  - Result: Customer received second email within 30 seconds
  - Root cause: Email delay (likely provider latency)
  - Resolution: No action needed, provider working normally
Owner: [Founder] handling customer, [Governor] investigating logs
Notes: Email delivery has 30-90 second delay (acceptable). Monitor if worsens.
```

---

## Using the Log for Retrospective

After launch completes, use this log for your Week 1 Retrospective (see FIRST_WEEK_TRACKING.md):

**Questions to answer from the log:**
1. What was the timeline? (Use logged times)
2. What issues arose? (Search for FAILED or BLOCKED entries)
3. How were issues handled? (Check issue entries and resolutions)
4. What decisions were made? (Search decision entries)
5. Customer response? (Review customer feedback entries)
6. Team performance? (Who handled what, how quickly)
7. System performance? (Error rates and uptime logs)
8. Lessons learned? (Check final notes section)

---

## Real-Time Sharing

**Optional: Share log with team**

If you have a support team or broader team:
1. Keep log in shared document or Slack thread
2. Update in real-time during launch
3. Team can reference for context and questions
4. Creates transparency and shared ownership

**Example Slack update:**
```
🚀 LAUNCH DAY UPDATE — T+2:30
✅ 15 signups (cumulative)
✅ Error rate: 0.2%
✅ Uptime: 100%
✅ No critical issues
📧 First customer support: Handled (email delay, normal)
→ Continuing to monitor
```

---

## Archiving the Log

After launch:
1. **Save the log** - Keep as historical record
2. **Reference in retrospective** - Include relevant excerpts
3. **File away** - Archive for future reference
4. **Share findings** - Use lessons for future launches

---

## Quick Reference: Log Template for Copy/Paste

```
T+[HH:MM] [Time]: [Event title]
Status: [Status]
Details: [What happened]
Owner: [Who was responsible]
Notes: [Observations]

```

---

## Document Control

**Created:** 2026-07-15  
**Type:** Template  
**Purpose:** Real-time launch day documentation  
**Version:** 1.0

---

## Final Thoughts

This log serves three critical functions:
1. **During launch:** Real-time reference for what's happening
2. **During incidents:** Quick context when problems arise
3. **After launch:** Historical record and learning tool

Keep it open during the entire launch window (T-30min through T+24:00). Update entries as events occur—don't try to remember everything at the end of the day.

When launch is complete, this becomes your most valuable document for understanding what happened and how to do better next time.

🚀 **Open this template on launch morning and start logging from T-30min.**
