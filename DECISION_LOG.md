# DECISION_LOG

The canonical, append-only decision log is
[`docs/governance/DECISION_REGISTER.md`](docs/governance/DECISION_REGISTER.md)
(DR-0001 … DR-NNNN, newest first). It predates this kernel and holds the
full history — **do not start a second log; append there.**

## Entry format (required fields)

- **Date** · **Decision** · **Reason** · **Authority** (Founder / Governor
  autonomous / which law) · **Evidence** (run IDs, SHAs, PRs) · **Status**
  (Active / Superseded-by-DR-NNNN) · **Expected vs. Actual outcome** ·
  **Lessons** (link `docs/governor/lessons/LESSONS.md`)

## Rules

1. Every significant decision gets an entry before or with its merge.
2. Never reopen a settled decision without new evidence; cite the DR number
   when relying on one.
3. Decisions conflict → newest Active entry wins; conflicts with the
   Constitution → the Constitution wins and the entry is marked Superseded.
