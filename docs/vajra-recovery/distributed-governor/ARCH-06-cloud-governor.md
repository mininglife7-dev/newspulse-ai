# ARCH-06 — Cloud Governor (Reasoning & Consumption)

**Role:** *thinks.* Consumes verified evidence, maintains organizational
memory, reasons scientifically, and produces recommendations — **executing
nothing itself** and authorizing execution only through the Founder gate.

## Consumption pipeline (the Verify + Record stages)

```
pull evidence branch
  → for each new bundle in sequence order:
       verify hash chain (R-STORE-2) ─ fail → quarantine + anomaly
       verify schema (evidence-bundle.schema.json) ─ fail → quarantine
       detect sequence gap/duplicate ─ gap → record known-unknown, alert
       scan for secret-shaped payload ─ hit → quarantine + anomaly (S4)
       → append verified observations to memory (append-only)
       → update capability statuses (never upgrade past observed evidence)
```

A bundle is **never trusted on its self-declared confidence** — the Cloud
Governor independently re-verifies everything it can from the bundle contents.

## Responsibilities → mechanism

| Responsibility | How it is done here |
| -------------- | ------------------- |
| Evidence verification | consumption pipeline above; integrity + schema + rules |
| Capability inventory | maintain `contracts/windows-capabilities.json` statuses from bundles |
| Memory | append-only `learning-record` JSONL (ARCH-04) |
| Learning | derive `learning`/`observation` records, each evidence-cited |
| Hypothesis management | `type=hypothesis` records; states move on evidence only |
| Bottleneck detection | scan statuses+memory for the binding constraint to 1% NET/day |
| Engineering review | assess collector/scheduler/pipeline health vs contracts |
| Research planning | plan next observations to collapse the highest-value UNKNOWN |
| Mission planning | sequence work behind the Research Gate (Execution Reality Engine) |
| Genome evolution | propose config/strategy changes **as recommendations only** |
| Scientific reasoning | apply the seven scientific laws to every conclusion |

## Recommendation format (the Recommend stage)

Each recommendation records: the observation/evidence it rests on, the
hypothesis it tests or the bottleneck it clears, the **expected cost and
benefit** (*Economic Viability before Statistical Significance*), the exact
action proposed, the capability it touches, and the **automatic post-action
verification** that will confirm or refute it. A recommendation with no
evidence, or no defined verification, is not emitted.

## What the Cloud Governor must never do

- Execute a mutation directly, or imply authority it lacks (S1/S2).
- Promote an UNKNOWN to a value without measured evidence (S3).
- Treat bridge silence as health — missing bundles ⇒ downstream capabilities
  become `stale-unknown`, not `healthy` (ARCH-02).
- Recommend an approach memory already records as refuted without new evidence
  (*Learning before Repetition*).

## Interaction with the Founder

Surface, in one place: current capability inventory (with evidence), the top
bottleneck, the pending recommendations awaiting authorization, and every open
UNKNOWN with what would collapse it. Follow the Constitution report shape:
State → Completed → Current → Next → Risks → Founder Attention. Ask for
authorization tokens explicitly, one scoped action at a time.
