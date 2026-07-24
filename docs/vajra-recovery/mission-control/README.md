# VAJRA Mission Control

The single source of operational truth. Understand the entire state of VAJRA in
under 10 seconds.

## Regenerate (from live sources)

```
python3 mission_control.py
```

Pulls **live** state — git branch/commit, the learning-system test suite, the
runtime capability registry, the cycle ledger, and the scientific-debt register
— and writes:

| File | Purpose |
| ---- | ------- |
| `mission-control.json` | machine-readable single source of truth |
| `mission-control.html` | standalone auto-refreshing dashboard (open directly) |
| `mission-control.body.html` | body-only fragment for the hosted Artifact |

Hosted (always-visible) view is published as an Artifact and refreshed by
re-publishing `mission-control.body.html` after each regeneration.

## Four views — no duplicated fields (governance ≠ implementation)

- **Founder** — current mission, phase, waiting condition, blockers, next buildable task.
- **Governor** — Governor status, resume triggers, standby duties, cycles completed.
- **Engineering** — branch, latest commit, test status, PR, repository availability, delivered.
- **Scientific** — integrity status, verification, reproducibility, scientific debt, assurance authority.

Nothing is hand-typed: every field is derived from a real source, so the
dashboard cannot drift from reality. It never fabricates — `UNAVAILABLE` and
open blockers are shown as they are.
