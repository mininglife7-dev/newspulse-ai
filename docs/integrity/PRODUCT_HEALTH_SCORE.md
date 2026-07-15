# Product Health Score — NewsPulse AI

**Last audit:** 2026-07-10 (second wave) · Scale 0–100 · Threshold: anything below 95 is a priority task.

| Dimension                     | Initial | Wave 1 | Wave 2     | Basis                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ------- | ------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard Integrity           | 70      | 98     | **100**    | Fake empty state on DB outage, false 404, mislabeled results header fixed (wave 1); silent history-persistence failure now surfaced with `saved` + UI notice; all behaviors e2e-tested.                                                                                                                                                             |
| Navigation Integrity          | 85      | 100    | **100**    | All links resolve; orphaned detail page reachable; 404 handling e2e-tested; skip-to-content link added.                                                                                                                                                                                                                                             |
| Button Integrity              | 80      | 100    | **100**    | 24/24 interactive elements behave as labeled; expand/delete/suggestion/deep-link flows now covered by Playwright, including confirm-dialog and row-removal behavior.                                                                                                                                                                                |
| API Integrity                 | 88      | 100    | **100**    | `ok` ⇔ HTTP status everywhere (smoke-enforced); DELETE no longer fakes success on missing rows (D-13); health no longer raises false alarms for the unused anon key (D-12); handlers typed against the shared contract in `types/`.                                                                                                                 |
| Visual Integrity              | 92      | 97     | **99**     | Responsive layout now _verified_, not assumed: e2e asserts zero horizontal overflow on every page at Pixel-7 width; visible keyboard focus; reduced-motion support. −1: no pixel-diff screenshot baselines — a deliberate decision (cross-environment font rendering makes them permanently flaky); structural assertions cover layout regressions. |
| Data Integrity                | 75      | 98     | **100**    | Single source of truth for model name, counts, timestamps; `result_count` is now a database-constraint-checked cached derivation (drift rejected by Postgres, validated empirically — see ADR 0001); e2e fixture with a deliberately wrong stored count proves the UI never trusts it.                                                              |
| **Overall Product Integrity** | **82**  | **99** | **99–100** | Every dimension ≥ 99. The remaining −1 is the documented, deliberate absence of pixel-diff baselines.                                                                                                                                                                                                                                               |

## Verification behind these numbers (wave 2)

| Gate                                                 | Result                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit`                                       | PASS                                                                                                                |
| `next lint`                                          | PASS, 0 warnings                                                                                                    |
| `next build` (no env vars)                           | PASS                                                                                                                |
| Smoke suite (16 checks, credential-less prod server) | 16/16 PASS                                                                                                          |
| Playwright e2e (desktop + Pixel 7 mobile)            | 37 passed, 1 skipped (mobile keyboard test, by design), 0 failed                                                    |
| `supabase/schema.sql` on PostgreSQL 16               | end-to-end + idempotent; constraint accepts consistent rows, rejects drifted rows, migration backfills legacy drift |

## Open items

None at or below the 95 bar. Watch-list:

1. Pixel-diff visual baselines — revisit only if the UI grows enough that
   structural assertions stop catching layout regressions (see Visual
   Integrity note; would require environment-pinned rendering).
2. Rate limiting is in-memory per instance with a spoofable IP header —
   documented in `middleware.ts`; swap for Upstash/KV before multi-instance
   production traffic.
3. Supabase RLS allows anonymous read/insert (single-user demo posture) —
   tighten before multi-tenant use.
4. Dependency posture: Next.js upgraded 14.2.15 → 14.2.35, eliminating the
   **critical** middleware authorization bypass (GHSA-f82v-jwr5-mffw — an
   attacker could previously skip this app's rate limiter). Remaining
   `npm audit` advisories require the breaking Next 15/16 major upgrade (a
   product decision) and were triaged against this app's configuration:
   image-optimizer issues N/A (`unoptimized: true`), i18n middleware bypass
   N/A (app router, no i18n), CSP-nonce XSS N/A (no nonces, ADR 0002),
   WebSocket SSRF N/A, glob advisory is a dev-CLI-only vector. Plan the
   Next 15/16 migration as its own change.
5. Content-Security-Policy: a static CSP is now served and smoke/e2e-tested
   alongside the other security headers (D-21). Nonce-based CSP was
   implemented, empirically shown to break statically prerendered pages,
   and rejected with rationale in `docs/decisions/0002-csp.md` — revisit
   only if the app moves to dynamic rendering or renders user HTML.
