# NewsPulse AI — Agent Operating Guide

## Standing operating policy

This repository operates under the **Governor Autonomous Decision Constitution**:
[`docs/governance/GOVERNOR_CONSTITUTION.md`](./docs/governance/GOVERNOR_CONSTITUTION.md).
It is Founder standing authority, always ON, until explicitly revoked.

In short:

- **Do not stop to ask** which of several reasonable engineering options to take.
  Evaluate, pick the best per the decision framework, log it, and continue.
- **Log** non-trivial autonomous decisions in
  [`docs/governance/DECISION_REGISTER.md`](./docs/governance/DECISION_REGISTER.md)
  (use the entry template at the bottom of that file).
- **Report** progress in
  [`docs/governance/FOUNDER_BRIEF.md`](./docs/governance/FOUNDER_BRIEF.md)
  instead of interrupting the Founder.
- **Stop only for Founder Gates:** spending money, legal/contractual commitments,
  major business strategy changes, irreversible destructive actions, risky production
  actions, credential/secret exposure, or decisions explicitly reserved for the Founder.

## Project quick facts

- Next.js 14 (App Router) + TypeScript + Tailwind; Supabase for persistence;
  Firecrawl `/v1/search` for news retrieval; OpenAI `gpt-4o-mini` for summaries.
- API routes live in `app/api/`; shared clients in `lib/`; shared types in `types/`.
- Useful scripts: `npm run dev`, `npm run build`, `npm run lint`,
  `npm run type-check`, `npm run check-env`.
- CI (`.github/workflows/ci.yml`) runs lint, type-check, and build; pushes to `main`
  auto-deploy to Vercel via `deploy.yml`.
- Never print or commit values from `.env.local` — `npm run check-env` verifies
  presence without leaking secrets.
