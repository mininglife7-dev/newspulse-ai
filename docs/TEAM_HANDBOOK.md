# Team Handbook

**Purpose:** Guide for team operations, roles, responsibilities, and decision-making  
**Audience:** Founder, Operations team, Advisors  
**Effective:** 2026-07-11  

---

## Team Structure

### Current Team (Launch Phase)

**Founder/CEO:** Lalit Kumar
- Overall business strategy
- Customer relationships
- Capital and partnerships
- Final decision authority

**Chief of Staff / Governor:** AI Assistant
- Engineering execution
- Security and compliance
- Operations management
- Day-to-day coordination

**Future Roles (Post-Launch):**
- Customer Success Lead
- Sales/Business Development
- Additional Engineering
- Finance/Admin

---

## Roles & Responsibilities

### Founder

**Responsibilities:**
- Strategic direction
- Customer acquisition
- Capital management
- Legal/compliance authority
- Final approval on major decisions
- Public representation

**During Launch:**
- Deploy Supabase schema
- Monitor first week closely
- Handle escalated customer issues
- Approve any emergency decisions
- Make key product decisions

**Post-Launch:**
- Weekly team syncs
- Monthly metrics review
- Quarterly strategic planning
- Respond to escalations within 4 hours

---

### Chief of Staff / Governor

**Responsibilities:**
- Engineering execution
- Security hardening
- Monitoring and alerting
- Documentation
- Day-to-day operations
- Team coordination

**During Launch:**
- Monitor `/api/production-health` continuously
- Respond to alerts immediately
- Track customer issues
- Support founder with escalations
- Document any incidents

**Post-Launch:**
- Daily monitoring (15 min)
- Weekly metrics review
- Incident response lead
- Performance optimization
- New feature verification

---

## Decision Authority

### Decisions Founder Makes Alone

- **Strategic:** Product vision, market positioning, business model
- **Financial:** Pricing, budget allocation, major spending
- **Legal:** Terms of service, privacy policy, legal agreements
- **Partnerships:** Integration partners, channel partnerships
- **Fundraising:** Capital raises, investor relations

### Decisions Governor Makes Alone (Engineering/Operations)

- **Code:** Architecture, refactoring, performance optimization
- **Security:** Security implementations, vulnerability fixes, hardening
- **Monitoring:** Alert thresholds, monitoring configuration
- **Operations:** Deployment decisions, rollbacks, incident response
- **Documentation:** Process docs, runbooks, guides
- **Testing:** Test strategy, coverage goals

### Decisions Requiring Discussion

- **Product features:** (Founder vision + Governor feasibility)
- **Roadmap:** (Founder priorities + Governor effort estimates)
- **Scaling:** (Founder growth targets + Governor infrastructure needs)
- **Hiring:** (Founder needs + Governor technical requirements)

### Emergency Decisions

**If blocking production/customers:**
- Governor can execute fix without approval
- Notify Founder immediately after
- Document decision and rationale

**If affecting customer data/privacy:**
- Governor escalates immediately
- Founder makes final decision
- Both execute together

---

## Communication

### Daily Standup (During Launch Week)

**Time:** 10 AM UTC (daily for first week, then 3x/week)

**Attendees:** Founder, Governor

**Format:** 15 minutes
- What's working
- What's not
- Blockers
- Next priorities

### Weekly Sync (Post-Launch)

**Time:** Monday 10 AM UTC

**Attendees:** Founder, Governor

**Topics:**
- Metrics review
- Customer feedback
- Product roadmap
- Operational issues
- Strategic updates

### Escalation

**For urgent issues:**
- Email with subject: "URGENT: [Issue]"
- Use phone/SMS if critical
- Founder checks email every 2 hours
- Governor checks every 30 minutes

### Communication Channels

**Email:** Primary for decisions and documentation  
**Slack:** (If set up) For real-time chat  
**GitHub:** For code review and technical discussion  
**Calendar:** For scheduling and planning  

---

## Metrics & Reporting

### Daily (First Week)

- ✅ Uptime: `/api/production-health`
- ✅ Error rate: `/api/error-rate` < 1%
- ✅ New signups: Count
- ✅ Critical issues: None

### Weekly (Post-Launch)

- ✅ Total active users
- ✅ Signup to workspace rate
- ✅ Average error rate
- ✅ Customer satisfaction
- ✅ Support response time
- ✅ Support resolution time
- ✅ System uptime

### Monthly (30+ Days)

- ✅ Total revenue (if applicable)
- ✅ Customer retention
- ✅ Churn rate
- ✅ NPS score
- ✅ Feature usage
- ✅ Performance trends
- ✅ Competitive activity

### Reporting Format

**Brief summary (1 page):**
- Top 3 wins
- Top 3 challenges
- Key metrics
- Next week priorities

**Detailed dashboard (if applicable):**
- Full metrics
- Trends
- Comparisons

---

## Incident Response

### Severity Levels

| Level | Response | Example |
|-------|----------|---------|
| P1 (Critical) | 5 min | Complete outage, data breach |
| P2 (High) | 30 min | High error rate, feature broken |
| P3 (Medium) | 2 hours | Slow feature, minor bug |
| P4 (Low) | 1 day | Typo, minor UX issue |

### Response Protocol

**P1 incidents:**
1. Governor: Immediate investigation
2. Governor: Activate emergency response
3. Governor: Notify Founder (phone if after hours)
4. Founder: Available for escalation
5. Execute fix/rollback as needed

**P2 incidents:**
1. Governor: Investigate within 30 minutes
2. Governor: Email Founder with status
3. Governor: Execute fix if obvious
4. Founder: Approve if uncertain

**P3+ incidents:**
1. Governor: Track and plan fix
2. Governor: Email update to Founder
3. Founder: Review in next standup

### Post-Incident

After any incident:
1. Document what happened
2. Note root cause
3. Note how it was caught
4. Plan prevention
5. Review in next standup
6. Update runbooks if needed

---

## Product Roadmap

### Phase 1: Launch (Week 1)
- ✅ Supabase deployment
- ✅ Customer signup
- ✅ Dashboard
- ✅ Basic monitoring

### Phase 2: Stabilization (Weeks 2-4)
- [ ] First 100 customers
- [ ] Feedback collection
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Enhanced documentation

### Phase 3: Feature Expansion (Month 2)
- [ ] Team collaboration features
- [ ] API access
- [ ] Advanced analytics
- [ ] Compliance reporting
- [ ] Export/import features

### Phase 4: Scale (Quarter 2+)
- [ ] Multi-language support
- [ ] Advanced integrations
- [ ] Custom workflows
- [ ] White-label option
- [ ] Enterprise features

**Note:** Roadmap adjusts based on customer feedback and market conditions.

---

## Company Policies

### Work Schedule

**Normal:** Flexible (results-focused)  
**Launch Week:** On-call (immediate response needed)  
**Post-Launch:** Business hours + on-call rotation (if team grows)  

### Decision Making

- **Default:** Trust team expertise
- **Disagreement:** Discuss respectfully, Founder decides
- **Reversible:** Execute and learn
- **Irreversible:** Get approval first

### Conflict Resolution

1. **Direct conversation** first
2. If unresolved: **Email summary** to other party
3. If still unresolved: **Founder mediation**
4. Document decision and move forward

### Confidentiality

- Customer data: Never share outside team
- Financial info: Never discuss publicly
- Strategy: Discuss only with authorized people
- Security issues: Never disclose without approval

---

## Onboarding New Team Members

When hiring (post-launch):

**Day 1:**
- [ ] Account setup (email, access, tools)
- [ ] Read: TEAM_HANDBOOK.md
- [ ] Read: Product overview
- [ ] Meet with Founder

**Week 1:**
- [ ] Read key docs (PRE_LAUNCH_CHECKLIST, OPERATIONS_RUNBOOK)
- [ ] Set up development environment
- [ ] Deploy to staging
- [ ] Pair programming on small task
- [ ] Attend standup

**Week 2:**
- [ ] Deploy to production
- [ ] Own small feature/bug
- [ ] Complete security training
- [ ] Shadow customer support

**Week 3:**
- [ ] Lead small project
- [ ] Participate in product decisions
- [ ] Build relationship with customers

**Month 1:**
- [ ] Full responsibility for area
- [ ] 30-day check-in with Founder
- [ ] Feedback and adjustment

---

## Security & Confidentiality

### Access Control

**What different people can access:**

**Founder:**
- [ ] Vercel dashboard (all)
- [ ] Supabase dashboard (all)
- [ ] Email (all support emails)
- [ ] GitHub (all)
- [ ] Customer data (read-only)

**Governor:**
- [ ] Vercel dashboard (deployments, logs)
- [ ] Supabase dashboard (read-mostly)
- [ ] Email (technical escalations)
- [ ] GitHub (all)
- [ ] Customer data (for troubleshooting)

**Support Team (Future):**
- [ ] Limited Supabase access (specific tables)
- [ ] Email (customer support)
- [ ] GitHub (issue tracking)
- [ ] Customer data (their workspace only)

### Data Protection

- Never export customer data for external use
- Don't discuss customer details publicly
- Secure deleted data (30-day retention)
- Log all admin access
- Rotate credentials quarterly

### Security Incidents

If security concern discovered:
1. **Do not panic** — act methodically
2. **Contain immediately** — disable access if needed
3. **Notify Founder** — within 1 hour
4. **Investigate thoroughly** — what happened?
5. **Remediate** — fix root cause
6. **Communicate** — to customers if needed
7. **Learn** — prevent recurrence

---

## Performance & Evaluation

### Founder Goals

**Year 1:**
- 500+ active workspaces
- $50K+ ARR (if paid model)
- Product-market fit validated
- Team of 3+

### Governor Goals

**Q3 2026 (Launch to 3 months):**
- Zero production outages (99.5%+ uptime)
- < 1% average error rate
- Sub-1-second response times
- Successful RLS audit
- All monitoring crons active

**Q4 2026 (3-6 months post-launch):**
- 500 successful customer signups
- Zero data isolation breaches
- < 5% customer churn
- 40+ NPS score
- API available to customers

---

## Compensation & Benefits

**Currently:** Founder and Governor working closely together

**Post-Launch (if equity/employment):**
- [ ] Discuss with Founder
- [ ] Formalize arrangement
- [ ] Document in agreement
- [ ] Review quarterly

---

## Knowledge Management

### Documentation Standards

- [ ] All major decisions documented
- [ ] All procedures have runbooks
- [ ] All systems have architecture docs
- [ ] All code has comments (where needed)
- [ ] Regular update schedule (quarterly)

### Knowledge Transfer

- [ ] Critical knowledge: Founder + Governor
- [ ] Runbooks: Easy to follow, no jargon
- [ ] Passwords: Secure shared vault
- [ ] Decisions: Explained in docs
- [ ] Lessons: Captured in playbooks

---

## Feedback & Improvement

### Continuous Improvement

**Weekly:**
- Note improvements in standup
- Track blockers and solve them
- Adjust processes if needed

**Monthly:**
- Retrospective on key decisions
- Review documentation
- Plan for next month

**Quarterly:**
- Major review of strategy
- Assessment of progress
- Pivot if needed

### Feedback Loop

1. **Identify issue** (Gov or Founder)
2. **Discuss** (in standup or email)
3. **Decide** (who's responsible)
4. **Execute** (make change)
5. **Review** (was it better?)
6. **Document** (update handbook)

---

## Company Values

### Core Principles

1. **Customer First** — Understand their needs
2. **Security First** — Never compromise on security
3. **Transparency** — Honest communication always
4. **Quality** — Excellence in what we do
5. **Learning** — Always improve and adapt

### Decision-Making Values

- Bias toward action (ship, then optimize)
- Reversible decisions: move fast
- Irreversible decisions: slow down and think
- Default to transparency
- Trust until proven otherwise

---

## Contact Information

**Founder (Lalit Kumar)**
- Email: mininglife7@gmail.com
- Phone: [Add as needed]
- Timezone: [IST]
- Response time: 2-4 hours

**Governor (Chief of Staff)**
- Email: mininglife7@gmail.com (escalations)
- Availability: 24/7 (during launch week), then business hours + on-call
- Timezone: UTC
- Response time: < 30 minutes

**Support Email**
- mininglife7@gmail.com
- Monitored: Business hours + on-call

---

## Document Approval

**Created by:** Governor  
**Approved by:** Pending (requires Founder review)  
**Last Updated:** 2026-07-11  
**Next Review:** 2026-08-11  

---

**This handbook is a living document. Update as the team grows and processes evolve.**

