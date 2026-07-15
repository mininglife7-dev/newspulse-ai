# 🧬 CEIS — User Guide

## The `/evolution` dashboard

Open **Evolution** in the top navigation.

- **Top tiles** — Evolution Score, Architecture Health, Evidence Confidence,
  Launch Readiness Impact, Customer Impact, ROI Estimate (all 0–100 with
  meters), plus Knowledge Genome size and Learning Velocity.
- **Run Evolution Cycle** — triggers a full observe→learn→propose cycle now
  (it also runs automatically every Monday). Takes up to a few minutes.
- **DNA sections** — Queue, Under Review, Approved, Rejected. Click a card to
  expand the full mission: problem, business value, architecture, plan,
  rollback, evidence links, and the nine quality gates.
- **Gates** — on an expanded card, ✓/✗ each pending gate. **Approve** works
  only when all nine gates are passed; **Reject** asks for a reason.
- **Latest Evolution Report** — the weekly markdown digest at the bottom.

## API quick reference

| Endpoint                  | Method     | Purpose                                                                                                                                                                |
| ------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/ceis/run`           | POST / GET | Trigger a cycle (`?dry=1` = preview, no writes). Bearer-protected when `CEIS_CRON_SECRET` is set                                                                       |
| `/api/ceis/dashboard`     | GET        | Aggregated dashboard payload                                                                                                                                           |
| `/api/ceis/report`        | GET        | Latest weekly report (`?all=1` = recent 12)                                                                                                                            |
| `/api/ceis/proposals`     | GET        | List proposals (`?status=proposed\|under-review\|approved\|rejected`)                                                                                                  |
| `/api/ceis/proposals/:id` | GET        | Full mission document                                                                                                                                                  |
| `/api/ceis/proposals/:id` | PATCH      | `{"action":"start-review"}` · `{"action":"gate","gate":"security-review","status":"passed","notes":"…"}` · `{"action":"approve"}` · `{"action":"reject","reason":"…"}` |

## FAQ

**Why is the queue empty after a cycle?** The immune system rejected
everything, or nothing scored ≥55/100. Check the report's _Intentionally
Ignored_ section — every rejection explains why.

**Why can't I approve?** At least one quality gate isn't passed. The error
message lists which ones.

**Will a rejected idea come back?** Only if CEIS later finds meaningfully
stronger evidence for it; your rejection reason is stored permanently.
