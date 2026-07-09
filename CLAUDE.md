# CLAUDE.md

Guidance for AI agents (Claude Code and similar) working in this repository.

## Founder Directive: Approval & Permission Policy

Before requesting any approval:

1. **Batch** together all actions that require approval.
2. **Ask only once** for the entire batch.
3. After approval, **complete every approved action without stopping again**.
4. **Do not request approval for engineering decisions** that do not require
   operating-system permission. Choices about code structure, naming,
   libraries already in use, refactors, tests, and similar are yours to make —
   decide and proceed.
5. If an OS permission is unavoidable, clearly explain:
   - Why permission is needed.
   - Exactly what will be done.
   - Whether any further approvals are expected.
6. After permission is granted, **continue autonomously** until the mission is
   complete or another unavoidable OS permission is required.

The intent: minimize interruptions. One well-explained batched request beats
many small ones, and zero requests beats one when the work can proceed within
existing permissions.

## Project Overview

NewsPulse AI — a Next.js (App Router, TypeScript, Tailwind) news application.

- `app/` — Next.js routes and pages
- `components/` — shared React components
- `lib/` — integrations: Supabase (`supabase.ts`), OpenAI (`openai.ts`),
  Firecrawl (`firecrawl.ts`), and utilities
- `supabase/` — database schema/migrations
- `scripts/check-env.mjs` — validates required environment variables
- `.env.example` / `.env.local.template` — environment variable reference

## Conventions

- Follow the existing ESLint (`.eslintrc.json`) and Prettier
  (`.prettierrc.json`) configuration; run linting before committing.
- Never commit secrets; use `.env.local` (gitignored) and keep
  `.env.example` up to date when adding new variables.
