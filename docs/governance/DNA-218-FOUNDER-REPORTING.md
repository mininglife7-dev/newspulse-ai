# DNA-218: Founder Executive Reporting Protocol

**Status:** Active — applies to every engineering report from 2026-07-09 onward.
**Location rationale:** `docs/governance/` per the convention established in PR #3.

Every engineering report must be written in two synchronized layers.

## Layer 1 — Founder Executive Summary (display first)

Include only:

- 🏛 Overall Status
- GO / NO-GO
- Current Readiness %
- Top 5 Risks
- Top 5 Wins
- Estimated Days to Launch
- Confidence Level
- Founder Decisions Required
- Estimated Founder Time Required

Nothing else. The Founder should understand the project within 30 seconds.

## Layer 2 — Engineering Detail (after the summary)

- Evidence
- Test results
- Root causes
- Technical analysis
- Commits
- CI
- Architecture
- Security
- Verification
- Rollback
- Risks

## Evidence Rules

Every statement must be classified as exactly one of:

- ✅ Verified
- 🟡 Measured but incomplete
- ⚪ Assumption
- 🔴 Founder decision pending

Never mix them.

## Recommendations

Always end with exactly three sections:

### Do Today

Highest ROI actions.

### Do This Week

Important but not blocking.

### Later

Non-critical improvements.

## Success Criterion

The Founder never has to read engineering details to understand project health, while engineers still receive complete technical depth underneath.
