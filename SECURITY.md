# Security Policy

## Reporting a vulnerability

If you discover a security issue in NewsPulse AI, please report it privately —
do **not** open a public GitHub issue for it.

- Open a [GitHub security advisory](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
  on this repository, or contact the maintainer directly.
- Please include steps to reproduce, the impact, and any suggested remediation.

We aim to acknowledge reports promptly and to fix confirmed issues before any
public disclosure.

## Current security posture

These controls are implemented in this repository:

- **Destructive actions are admin-gated and fail-closed.** `DELETE /api/history`
  and `DELETE /api/history/:id` require an admin token (`Authorization: Bearer`
  or `x-admin-token`) compared to `ADMIN_TOKEN` with a constant-time check. If
  `ADMIN_TOKEN` is unset, these endpoints are **disabled** (`503`) rather than
  open — an un-configured deployment cannot be wiped.
- **Input validation.** `POST /api/search` rejects non-string, empty, or
  overly long keywords with `400` before doing any work.
- **Secrets** are read from environment variables only; `.env*.local` is
  git-ignored and never committed. The Supabase service-role key is used only
  in server-side code.
- **Security headers** (`X-Frame-Options: DENY`, `X-Content-Type-Options:
nosniff`, `Referrer-Policy`, `Permissions-Policy`) are applied to every
  response, and `X-Powered-By` is disabled.
- **External links** use `rel="noopener noreferrer"` to prevent
  reverse-tabnabbing.
- **Rate limiting** throttles `/api/search` per IP.

## Known limitations (by design, for the current stage)

- There is **no end-user authentication**; the app has no user accounts. Read
  access to saved search history (`GET /api/history`) is public.
- The rate limiter is **in-memory** and per-instance; it resets on cold start.
  For multi-instance production, back it with a shared store (e.g. Upstash).
- There is **no Content-Security-Policy** yet.

See `DEPLOYMENT_REALITY_AUDIT.md` and `REMEDIATION_ROADMAP.md` for the full
gap analysis and the planned path to a production-grade posture.
