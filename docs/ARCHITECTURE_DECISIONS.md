# Architecture Decision Record (ADR)

**Purpose:** Document key architectural decisions, their rationale, and alternatives considered  
**Audience:** Founder, developers, architects, future team members  
**Version:** 1.0  
**Last Updated:** 2026-07-15  

---

## Overview

This document records major architectural decisions made for NewsPulse AI. Each decision documents the problem, options considered, chosen solution, and tradeoffs.

**Format:** For each decision, we record:
- **Status:** Accepted / Proposed / Rejected
- **Context:** What problem we're solving
- **Decision:** What we chose
- **Rationale:** Why we chose it
- **Alternatives:** Other options considered
- **Tradeoffs:** What we gained/lost
- **Consequences:** What changed because of this decision

---

## ADR-1: Multi-Tenant Architecture at Workspace Level

**Status:** ✅ Accepted

**Context:**
NewsPulse AI supports multiple independent organizations (companies) using the same product. We need to isolate data between organizations while allowing single users to belong to multiple organizations.

**Decision:**
Implement multi-tenancy at the **workspace level**. A workspace is the top-level isolation boundary. All child tables (companies, AI systems, assessments, etc.) are scoped to a workspace. Users can be members of multiple workspaces but see only data in workspaces they're members of.

**Rationale:**
- Workspace isolation aligns with customer mental model (one workspace per organization)
- Enables future features (invite team members, manage teams per workspace)
- Simplifies data isolation (single foreign key to workspace_id)
- All RLS policies follow same pattern (check workspace membership)
- Easier to implement and debug than per-customer routing

**Alternatives:**
1. **Per-customer infrastructure:** Separate database per customer
   - Pros: Complete isolation, no risk of data leak
   - Cons: Expensive (~$25/customer), operational overhead
   - Rejected: Not economical for MVP

2. **Per-account multi-tenancy:** Isolation at user/account level
   - Pros: Simpler mental model (user = account)
   - Cons: Doesn't support team collaboration, shared workspaces
   - Rejected: Limits future features

3. **Hybrid:** Multiple workspaces per account
   - Similar to chosen but unnecessary complexity
   - Rejected: Workspace IS the account for MVP

**Tradeoffs:**
- ✅ Gained: Clean data isolation, easy debugging, scalable
- ✅ Gained: Workspace sharing (team features ready for future)
- ❌ Lost: Simplicity of single-tenant per user
- ❌ Lost: Per-workspace databases (but not needed for MVP)

**Consequences:**
- RLS policies must always check workspace_id
- Schema denormalizes workspace_id throughout (performance tradeoff)
- Future team collaboration features are architected in from day 1
- Data recovery/backup must respect workspace boundaries

---

## ADR-2: Database-Enforced Row-Level Security (RLS)

**Status:** ✅ Accepted

**Context:**
Data isolation is critical for compliance. We need to prevent unauthorized access even if application code is compromised or has bugs.

**Decision:**
Implement data isolation using **PostgreSQL Row-Level Security (RLS) policies**, not application-level checks. All 9 tables have RLS enabled. SQL injection cannot bypass RLS because policy checks execute in the database before rows are returned.

**Rationale:**
- Database-enforced isolation is more secure than application-level
- Defense in depth: even if app has bug, database protects data
- RLS policies are tested and verified (not dependent on application code)
- SQL injection attacks cannot bypass RLS
- Supabase makes RLS easy to configure and audit

**Alternatives:**
1. **Application-level checks:** Check authorization in Node.js code
   - Pros: Simpler to implement initially
   - Cons: Vulnerable to application bugs, SQL injection, developer error
   - Rejected: Not secure enough for sensitive data

2. **Capsule-based multi-tenancy:** Logical separation without RLS
   - Pros: Slightly more flexible
   - Cons: Relies entirely on application code, single point of failure
   - Rejected: Too risky

3. **Separate databases per workspace:** Physical separation
   - Pros: Maximum isolation
   - Cons: Expensive, operational overhead
   - Rejected: Not needed with RLS

**Tradeoffs:**
- ✅ Gained: High security even if app is compromised
- ✅ Gained: Simple to audit (policies are in database)
- ❌ Lost: Performance (RLS checks add ~5-10ms per query)
- ❌ Lost: Flexibility (harder to query across workspaces if needed)

**Consequences:**
- Every query runs through RLS policy checks
- Can't easily debug queries (need RLS context to see data)
- RLS policies must be tested and verified pre-launch
- Faster iteration in development (disable RLS in dev, enable in prod)

---

## ADR-3: Vercel for Frontend Hosting

**Status:** ✅ Accepted

**Context:**
We need to host the Next.js frontend with automatic deployments, HTTPS, CDN, and good performance.

**Decision:**
Use **Vercel** (the platform behind Next.js) for hosting. Vercel integrates tightly with GitHub, auto-deploys on push, provides global CDN, and manages certificates.

**Rationale:**
- Vercel is made by the creators of Next.js (official platform)
- Automatic deployments from GitHub (no manual CI/CD setup)
- Global CDN for fast page loads worldwide
- Built-in monitoring and logging
- Generous free tier for MVP, scales easily
- Excellent support

**Alternatives:**
1. **AWS Amplify:** AWS's managed hosting for web apps
   - Pros: Integrates with AWS ecosystem
   - Cons: More complex setup, less optimized for Next.js
   - Rejected: More overhead than needed for MVP

2. **Netlify:** Similar to Vercel, focuses on static sites
   - Pros: Good for static sites, similar developer experience
   - Cons: Less optimized for Next.js (dynamic API routes)
   - Rejected: Vercel is better for Next.js

3. **Self-hosted on EC2/DigitalOcean:** Full control, cheaper
   - Pros: Full control, low cost at small scale
   - Cons: Operational overhead (CI/CD setup, monitoring, updates)
   - Rejected: Time better spent on product

**Tradeoffs:**
- ✅ Gained: Automatic deployments, global CDN, minimal ops
- ✅ Gained: Easy monitoring and observability
- ❌ Lost: Low-level control (can't customize server)
- ❌ Lost: Cost savings (Vercel Pro $20/month vs free tier)

**Consequences:**
- All code must be compatible with Vercel Serverless Functions
- Database queries must complete within 60-second timeout
- 3,008 MB memory limit per function (sufficient for MVP)
- Deployments are immutable (can't modify after deploy)

---

## ADR-4: Supabase for Backend & Database

**Status:** ✅ Accepted

**Context:**
We need a production-ready backend with PostgreSQL database, authentication, and RLS support.

**Decision:**
Use **Supabase** (open-source Firebase alternative) for database and authentication. Supabase provides PostgreSQL with RLS policies, Supabase Auth for email/password auth, and real-time subscriptions.

**Rationale:**
- Supabase is built on PostgreSQL (industry-standard RDBMS)
- RLS support (database-enforced authorization)
- SOC 2 certified (compliant for enterprise customers)
- Automatic backups and point-in-time recovery
- Email auth out of the box
- No vendor lock-in (can migrate to self-hosted PostgreSQL)

**Alternatives:**
1. **Firebase (Google Cloud):** Managed backend
   - Pros: Easy to get started, many features
   - Cons: NoSQL (no RLS), expensive, vendor lock-in
   - Rejected: RLS policies are critical, Firebase doesn't support

2. **Self-hosted PostgreSQL:** Full control
   - Pros: Cheapest option, full control
   - Cons: Operational overhead (backups, monitoring, security)
   - Rejected: Team too small for operational overhead

3. **MongoDB Atlas:** NoSQL database
   - Pros: Flexible schema, easy scaling
   - Cons: No RLS support, not good for relational data
   - Rejected: Our data is highly relational, need RLS

**Tradeoffs:**
- ✅ Gained: Managed database, backups, security (SOC 2)
- ✅ Gained: PostgreSQL (battle-tested, widely supported)
- ✅ Gained: RLS policies (built-in security)
- ❌ Lost: NoSQL flexibility (schema must be defined upfront)
- ❌ Lost: Cost (Supabase Pro $25/month vs self-hosted free)

**Consequences:**
- Database schema is defined upfront (migrations required for changes)
- All complex queries must work with RLS policies
- Backups are automatic (daily, 30-day retention)
- Can migrate away to PostgreSQL if needed (open-source backend)

---

## ADR-5: Next.js API Routes for Backend Logic

**Status:** ✅ Accepted

**Context:**
We need API endpoints to handle authentication, workspace creation, AI system registration, etc.

**Decision:**
Use **Next.js API Routes** (serverless functions) to implement backend logic. API routes are co-located with frontend code in the app directory.

**Rationale:**
- API Routes are built into Next.js (no separate backend needed)
- No separate deployment (API and frontend deploy together)
- Automatic HTTPS and global CDN
- Easy authentication (built into Supabase auth)
- Fast iteration (change code, redeploy, test)

**Alternatives:**
1. **Separate Express/Node.js backend:** Traditional approach
   - Pros: Familiar, many libraries
   - Cons: Separate deployment, more operational overhead
   - Rejected: Adds complexity

2. **Serverless framework (AWS Lambda, Google Cloud Functions):** Event-driven
   - Pros: Pay per invocation, auto-scales
   - Cons: More complex setup, harder to debug
   - Rejected: Next.js API Routes simpler for this scale

3. **Hasura (GraphQL backend):** Instant API from database
   - Pros: No backend code to write
   - Cons: Less flexible, steeper learning curve
   - Rejected: We need custom logic (rate limiting, validation)

**Tradeoffs:**
- ✅ Gained: Simplicity (single codebase, single deploy)
- ✅ Gained: Fast cold starts (60 seconds, usually much faster)
- ✅ Gained: Cost (included with Vercel, no separate backend cost)
- ❌ Lost: Flexibility (serverless has constraints)
- ❌ Lost: Database connections (managed connection pooling required)

**Consequences:**
- Backend logic in same repository as frontend
- All API routes subject to 60-second timeout
- Limited to 3,008 MB memory per function
- Cold starts may impact user experience (first request slower)

---

## ADR-6: Input Validation with Zod Schemas

**Status:** ✅ Accepted

**Context:**
We need to validate all user input before processing. Invalid input can cause bugs, security issues, or data corruption.

**Decision:**
Use **Zod** (TypeScript-first schema library) to define and validate all API request bodies. Every endpoint has a Zod schema that defines expected inputs and constraints.

**Rationale:**
- Zod is type-safe (TS types generated from schemas)
- Declarative validation (schemas are readable documentation)
- Integrates with TypeScript compiler
- Produces clear error messages
- Runtime validation (catches issues at API boundary)

**Alternatives:**
1. **Joi:** Another validation library
   - Pros: Mature, flexible
   - Cons: Not TypeScript-first, more verbose
   - Rejected: Zod is simpler for TS projects

2. **Manual validation:** Check inputs in code
   - Pros: No dependencies
   - Cons: Easy to miss cases, hard to maintain
   - Rejected: Error-prone, doesn't scale

3. **Class validators:** OOP-style decorators
   - Pros: Object-oriented
   - Cons: More verbose for simple cases
   - Rejected: Overkill for MVP

**Tradeoffs:**
- ✅ Gained: Type-safe validation, clear error messages
- ✅ Gained: Documented API contracts (schemas ARE documentation)
- ✅ Gained: Protection against XSS, SQL injection, malformed input
- ❌ Lost: Flexibility (must define schema before validation)
- ❌ Lost: Performance (validation adds ~1-2ms per request)

**Consequences:**
- Every new API endpoint requires a Zod schema first
- Schemas must be kept in sync with database
- Validation errors produce consistent response format
- Testing is easier (schemas provide test data generators)

---

## ADR-7: GitHub + Vercel for CI/CD

**Status:** ✅ Accepted

**Context:**
We need automated testing, linting, and deployment on every code change.

**Decision:**
Use **GitHub Actions** for CI (testing, linting) and **Vercel** for CD (deployment). On every push to main, tests run then Vercel auto-deploys.

**Rationale:**
- GitHub Actions is free and integrated with GitHub
- Vercel auto-deploys on push (no manual deployment needed)
- Workflows are checked into git (version controlled)
- Clear feedback on PRs (tests pass/fail before merge)
- Fast feedback loop (tests run in 2-3 minutes)

**Alternatives:**
1. **Jenkins:** Self-hosted CI/CD
   - Pros: Full control, flexible
   - Cons: Operational overhead, setup complexity
   - Rejected: Too much overhead for startup

2. **GitLab CI:** Alternative CI/CD
   - Pros: Integrated into GitLab
   - Cons: We use GitHub, would require migration
   - Rejected: GitHub Actions is already integrated

3. **Manual testing + deployment:** No CI/CD
   - Pros: Simple initially
   - Cons: Error-prone, slow, doesn't scale
   - Rejected: Unacceptable for production

**Tradeoffs:**
- ✅ Gained: Automatic testing on every PR, confident deployments
- ✅ Gained: Zero-downtime deployments, easy rollbacks
- ✅ Gained: Clear visibility (tests pass/fail on PR)
- ❌ Lost: Flexibility (limited to GitHub/Vercel ecosystem)
- ❌ Lost: Local CI control (can't run locally easily)

**Consequences:**
- CI configuration lives in .github/workflows/
- Tests must pass before merge to main
- Deployments are automatic (no manual approval needed for MVP)
- Rollbacks are one-click (git revert + push)

---

## ADR-8: No File Uploads (MVP)

**Status:** ✅ Accepted

**Context:**
We could support file uploads (evidence documents, compliance reports) but this adds complexity.

**Decision:**
**Do not support file uploads in MVP.** File upload support is deferred to post-launch (Phase 2).

**Rationale:**
- MVP focus: core functionality (workspace, AI systems, compliance tracking)
- File uploads add complexity: storage setup, virus scanning, permissions
- Can be added later without changing core architecture
- Post-launch can prioritize based on customer demand

**Alternatives:**
1. **Implement file uploads now:** Use Supabase Storage
   - Pros: Complete solution from day 1
   - Cons: Extra complexity, distracts from core features
   - Rejected: MVP should be minimal

2. **External storage (AWS S3):** More flexible
   - Pros: Works at any scale, industry standard
   - Cons: Extra setup, costs increase
   - Rejected: Supabase Storage sufficient later

**Tradeoffs:**
- ✅ Gained: Simpler MVP, faster launch
- ✅ Gained: Focused on core value proposition
- ❌ Lost: Compliance workflow completeness (no document storage)

**Consequences:**
- Evidence records can link to external URLs (workaround)
- File upload feature will be added in Phase 2
- Architecture is ready for uploads (no changes needed to add later)
- Early customers must store compliance docs elsewhere initially

---

## ADR-9: No Real-Time Subscriptions (MVP)

**Status:** ✅ Accepted

**Context:**
Supabase supports real-time subscriptions (users see updates instantly), but this adds complexity.

**Decision:**
**No real-time subscriptions in MVP.** Users must refresh to see updates. Real-time is deferred to Phase 2.

**Rationale:**
- MVP focus: functional compliance tracking, not collaborative real-time
- Real-time adds complexity: WebSocket connections, subscriptions management
- Not essential for MVP value proposition
- Can be added later if customers demand it

**Alternatives:**
1. **Implement real-time now:** Use Supabase Realtime
   - Pros: Collaborative experience from day 1
   - Cons: Extra complexity, WebSocket infrastructure
   - Rejected: Not MVP priority

2. **Polling:** Client polls every 5 seconds
   - Pros: Simple to implement
   - Cons: Inefficient, poor UX
   - Rejected: Worse than manual refresh

**Tradeoffs:**
- ✅ Gained: Simpler MVP, faster launch
- ✅ Gained: No WebSocket infrastructure needed
- ❌ Lost: Collaborative real-time experience
- ❌ Lost: Notifications (can't notify when data changes)

**Consequences:**
- Dashboard must be refreshed manually to see updates
- Team collaboration features limited (can't see others' edits live)
- Realtime subscription code can be added in Phase 2
- Architecture supports Realtime (no changes needed to add later)

---

## ADR-10: Role-Based Access Control (Future)

**Status:** ✅ Proposed (Not Implemented in MVP)

**Context:**
Workspace members might have different permission levels (owner, admin, member, viewer). We've designed support for this but not implemented it.

**Decision:**
**Design workspace members table with role field, but enforce only basic access control in MVP.**

In MVP:
- ✅ Roles are stored in database (owner, admin, member, viewer)
- ✅ Workspace membership checked by RLS policies
- ❌ Role-specific permissions NOT enforced (all members have same access)

In Phase 2:
- Implement permission checks for each role
- Viewer: read-only access to dashboard
- Member: can edit systems but not members
- Admin: can edit systems and manage members
- Owner: full control including delete

**Rationale:**
- MVP need: Basic workspace isolation (all members = full access)
- Future need: Granular permissions (future team collaboration)
- Design allows adding permissions later without schema changes
- Early customers likely solo or small teams (don't need granular control)

**Alternatives:**
1. **No role support:** Delete role field, simple membership
   - Pros: Simpler MVP
   - Cons: Can't add permissions later without migration
   - Rejected: Closing off future capabilities

2. **Full RBAC in MVP:** Implement all permissions now
   - Pros: Complete solution
   - Cons: Extra complexity, distracts from core features
   - Rejected: Not MVP priority

**Tradeoffs:**
- ✅ Gained: Future-proof design (ready for permissions)
- ✅ Gained: Schema supports roles (no migration needed later)
- ❌ Lost: Granular permissions (not enforced in MVP)

**Consequences:**
- Role field stored in database but ignored in application logic
- Permissions can be added in Phase 2 without schema changes
- Early implementation of RBAC is straightforward (just needs UI + permission checks)

---

## ADR-11: Telemetry & Analytics (None)

**Status:** ✅ Accepted

**Context:**
We could track user behavior (page views, features used, etc.) with Google Analytics or Mixpanel.

**Decision:**
**Do not implement analytics in MVP.** Telemetry is deferred post-launch based on needs.

**Rationale:**
- MVP focus: functional product, not analytics
- Privacy-first approach (no third-party tracking)
- Can monitor usage via database queries (server-side)
- Customers may prefer no analytics (compliance-sensitive)

**Alternatives:**
1. **Google Analytics:** Easy to implement
   - Pros: Free, widely used
   - Cons: Privacy concerns, third-party tracking
   - Rejected: Privacy-first approach

2. **Mixpanel:** Advanced product analytics
   - Pros: Deep insights, funnels
   - Cons: Expensive, adds complexity
   - Rejected: Overkill for MVP

**Tradeoffs:**
- ✅ Gained: Privacy (no third-party tracking)
- ✅ Gained: Simpler product (no analytics code)
- ✅ Gained: Customer trust (transparent data handling)
- ❌ Lost: Usage insights (can't see feature adoption)
- ❌ Lost: Funnel analysis (can't track user journeys)

**Consequences:**
- Usage tracking happens via server-side database queries
- Can add analytics later if needed (architecture unchanged)
- Customer dashboard shows their own data, not cross-customer analytics

---

## Future Decisions (Post-Launch)

These decisions are on the roadmap but deferred beyond MVP:

- **Mobile app:** Web-first MVP, mobile later (Phase 3)
- **GraphQL API:** REST API MVP, GraphQL for external customers (Phase 3)
- **Custom workflows:** Fixed workflows MVP, custom later (Phase 2)
- **Enterprise SSO:** Email auth MVP, SSO for enterprises (Phase 4)
- **Multi-language:** English MVP, i18n later (Phase 3)
- **White-label:** Branded MVP, white-label option later (Phase 4)

---

## Decision Log

| ADR | Decision | Status | Date |
|-----|----------|--------|------|
| ADR-1 | Multi-tenant at workspace level | ✅ Accepted | 2026-07-01 |
| ADR-2 | Database-enforced RLS | ✅ Accepted | 2026-07-01 |
| ADR-3 | Vercel for hosting | ✅ Accepted | 2026-06-15 |
| ADR-4 | Supabase for backend | ✅ Accepted | 2026-06-15 |
| ADR-5 | Next.js API Routes | ✅ Accepted | 2026-07-01 |
| ADR-6 | Zod for validation | ✅ Accepted | 2026-07-10 |
| ADR-7 | GitHub + Vercel CI/CD | ✅ Accepted | 2026-07-05 |
| ADR-8 | No file uploads (MVP) | ✅ Accepted | 2026-07-11 |
| ADR-9 | No real-time (MVP) | ✅ Accepted | 2026-07-11 |
| ADR-10 | RBAC design (not enforced MVP) | ✅ Proposed | 2026-07-11 |
| ADR-11 | No analytics (MVP) | ✅ Accepted | 2026-07-11 |

---

## How to Update This Document

When making new architectural decisions:
1. Add new ADR section (ADR-N)
2. Document status, context, decision, rationale
3. List alternatives and consequences
4. Update decision log table
5. Commit to git

When circumstances change (e.g., we DO add file uploads):
1. Change status from "Proposed" to "Accepted" or "Rejected"
2. Add note about why circumstances changed
3. Link to PR/issue that implemented the decision

---

## Document Control

**Prepared by:** Governor, Chief of Staff  
**Reviewed by:** [Pending - requires Founder review]  
**Created:** 2026-07-15  
**Last Updated:** 2026-07-15  

---

**This record documents why we built what we built. Reference this when making future architectural decisions.**
