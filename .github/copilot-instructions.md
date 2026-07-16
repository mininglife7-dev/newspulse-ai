# Repository instructions (all coding agents)

EURO AI: multi-tenant EU AI Act compliance platform. Next.js 16 App Router,
React 19, TypeScript strict, Supabase (RLS tenant isolation, cookie-based
SSR sessions), Vercel. Repo name `newspulse-ai` is historical.

**Before any work, read the Memory Kernel:** `AGENTS.md` (manual + execution
loop), `GOVERNOR_CONSTITUTION.md` (laws), `PROJECT_STATE.md` (verified
facts), `NEXT_ACTION.md` (the one active mission). Repository state is the
source of truth; `docs/archive/` never overrides active governance.

## Conventions

- TypeScript strict; Prettier + ESLint enforced (pre-commit hooks run them).
- Layout: `app/` customer surfaces + `app/api/` routes; `lib/` domain logic;
  `supabase/` schema (idempotent SQL, RLS on every tenant table); `tests/`.
- Every API route: auth check first (fail closed), Zod input validation,
  safe error responses (no stack traces), workspace-scoped queries.
- Never weaken an RLS policy or auth gate without a decision-log entry.

## Testing & verification

- Gate: `npm run lint && npm run type-check && npm test` locally;
  CI must be green before merge. E2E: `npm run test:e2e` / `test:smoke`.
- Evidence before claims: readiness/GO statements require run IDs. Label
  claims Verified / Estimated / Unknown / Blocked.

## Hard rules

- **Check main and open PRs before implementing** — duplicate parallel
  implementations are the #1 historical source of closed PRs (DR-0006).
- One mission at a time; smallest change that works.
- Secrets never in code, logs, PR text, or workflow inputs.
- Customer first: does this help the first customer register, assess,
  and generate compliance reports without developer help?
