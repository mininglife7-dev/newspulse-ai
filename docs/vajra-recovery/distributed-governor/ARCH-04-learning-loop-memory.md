# ARCH-04 — Learning Loop & Organizational Memory

**Directive loop:** Observe → Verify → Record → Learn → Recommend → Execute
(only if authorized) → Observe again. *Every cycle shall increase Governor's
understanding of the system.*

## The seven stages

| Stage | Owner | Input → Output | Guarantees |
| ----- | ----- | -------------- | ---------- |
| **Observe** | Windows | reality → evidence bundle | READ-ONLY; no fabrication (S1/S3) |
| **Verify** | Cloud | bundle → verified/quarantined | integrity + schema + rule checks before use (S5); *Root Cause before Repair* |
| **Record** | both | verified evidence → append-only memory | evidence-cited; supersede, never edit |
| **Learn** | Cloud | memory → learning/hypothesis records | *Learning before Repetition*; uncertainty explicit |
| **Recommend** | Cloud | learning → recommendation (with cost/benefit) | *Economic Viability before Statistical Significance* |
| **Execute** | Windows | recommendation → action | **ONLY with a Founder authorization token** (S2); default mode executes nothing |
| **Observe again** | Windows | action/no-action → new evidence | closes the loop; verifies the effect |

In default mode the loop runs **Observe → Verify → Record → Learn → Recommend**
and **stops at the authorization gate**. Recommendations accumulate; nothing is
executed. That is success — understanding compounds without risk.

## Authorization gate (S2)

A recommendation becomes executable only when accompanied by a **scoped Founder
authorization token** naming: the exact action, the capability, the expected
artifact, and the automatic post-action verification. Absent a matching token,
the Execute stage is inert. Tokens are single-scope and non-transitive —
authorizing one action never implies another.

## Organizational memory

- **Format:** append-only JSONL of `learning-record` objects
  (`schemas/learning-record.schema.json`), aligned with the repo's existing
  `docs/governance/KNOWLEDGE-MEMORY.jsonl` convention (DNA-GOV-007). Proposed
  home for the VAJRA org: `evidence/memory/vajra-memory.jsonl` on the evidence
  channel (created when the first real record exists — not pre-seeded).
- **Shared:** both governors read and append. *Learning belongs to both.*
- **Evidence-cited:** every record cites evidence-bundle ids / artifact hashes /
  run ids. A record with no evidence is rejected.
- **Supersession, not edit:** new evidence appends a record that `supersedes`
  the prior `record_id`. History is never rewritten (mirrors the append-only
  raw store).
- **Hypotheses are first-class:** `type=hypothesis` records carry
  `hypothesis_state` that moves `proposed → under_test → supported/refuted/
  inconclusive` **on evidence only**. A refuted hypothesis stays in memory as a
  learning — refutation is knowledge.

## Bottleneck detection (a Learn-stage product)

The Cloud Governor scans memory + capability statuses for the constraint that
most limits progress toward sustainable 1% NET/day — e.g. a stale collector, an
unmeasured cost parameter, a rejection cluster. Bottlenecks are recorded
(`type=bottleneck`) with evidence and become candidate recommendations. *We fix
the binding constraint, not the loudest symptom.*

## Anti-patterns this loop forbids

- Optimizing before understanding (no Recommend without recorded, verified
  observation).
- Repeating a refuted approach (memory is consulted before any recommendation —
  *Learning before Repetition*).
- Silent state changes (every Execute leaves an evidence trail and a follow-up
  Observe).
