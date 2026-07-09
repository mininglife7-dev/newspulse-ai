# Priority Roadmap

Single ordering principle (Rule 5): does this raise the probability of a real, verified launch?

## Now — this week (reaches CONDITIONAL GO)

1. **Merge this PR** — restores build, adds tests/CI/security fixes and this documentation. (15 min)
2. **Close PR #1 as superseded** (its fix is contained here) and **decide PR #2** (PWA "Governor" — merge if mobile install matters; resolve the naming inconsistency first). (15 min)
3. **First verified deploy** — M-10: 3 GitHub secrets, 5 Vercel env vars, re-run `supabase/schema.sql`, dispatch deploy, verify `/api/health`. (30 min, founder credentials required)
4. **Uptime monitor** on `/api/health` — M-06. (1 h)
5. **Smoke evidence** — one real search in production, screenshots into README, short demo script. (2 h)

**Exit criteria:** green CI + green Deploy on main, `healthy` health check, monitored, demo-able.

## Next — before any public/paid launch (reaches GO)

6. **Auth for destructive endpoints** — M-05 (founder picks: admin token vs Supabase Auth). (0.5 d)
7. **Privacy + Terms + AI-transparency label** — M-07, with counsel. (1–2 d)
8. **Playwright E2E smoke suite** — M-08. (1 d)
9. **Product identity decision** — one name across app/PRs/docs. (founder)

**Exit criteria:** a stranger can be handed the URL without legal or data-destruction risk.

## Later — as traffic/customers materialize

10. Next 15/16 upgrade (M-04) — clears residual `npm audit` findings.
11. Durable rate limiting via Upstash/KV (M-09).
12. Structured logging + error tracking (Sentry or similar).
13. Localization (German first) — only when a German-speaking pilot exists.
14. Commercial pack (pricing, ROI one-pager, partner brief) — after identity decision.

## Explicit non-goals right now

- EU AI Act dossier beyond the transparency label (minimal-risk use case).
- Investor dashboards for an unnamed product.
- Any rebrand work until V2-10 is decided.
