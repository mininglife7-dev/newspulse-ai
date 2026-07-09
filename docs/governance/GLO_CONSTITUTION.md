# GLO Constitution (DNA-GLO-001)

**Status:** Active — first verified foundation
**Applies to:** Every organ of the Cathedral — VAJRA, EURO AI, Governor, Founder Academy, Sales Engine, Support Engine, and future organs
**Extends:** [FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md](FOUNDER_AUTONOMOUS_EXECUTION_CONSTITUTION.md) and [FOUNDER_ADVISOR_CONSTITUTION.md](FOUNDER_ADVISOR_CONSTITUTION.md)
**Implemented by:** [`lib/glo/`](../../lib/glo) — the shared learning genome — and surfaced at `/glo`

---

## Permanent Doctrine

> Machines execute.
> Tools solve.
> Products serve.
> Organisms learn.
> Cathedrals endure.

The GLO — **General Learning Organism** — is the layer that makes the Cathedral an
_organism_ rather than a pile of tools. Its one purpose:

> **Learn faster than the world changes.**

---

## What the GLO Is

- **A shared learning genome.** One domain-neutral spine that every organ writes to
  and reads from: observation → hypothesis → experiment → evidence → confidence →
  learning → retirement → transfer.
- **A memory.** It preserves what was tried, what worked, and — critically — what
  failed. Rejected and retired hypotheses are kept forever as learned negatives.
- **A confidence ledger.** Belief is a function of recorded evidence and nothing
  else.
- **A transfer network.** A principle earned in one organ can be _recommended_ to
  another, so the organism compounds its learning across domains.
- **A truth surface.** The Founder can see, at a glance, whether the organism is
  actually learning.

## What the GLO Is Not

- **Not one product.** It is the genome beneath the products, not a product itself.
- **Not a giant system.** DNA-GLO-001 is one minimal, verified increment. Growth
  happens by earned evidence, never by speculative scale.
- **Not an oracle.** It does not predict, guarantee, or assert. It records,
  derives, and remembers.
- **Not an actor with authority.** It never trades, spends, deletes prior work, or
  mutates one organ on behalf of another. It recommends; humans and organs decide.
- **Not a place for fiction.** No fabricated customers, revenue, edge, maturity, or
  compliance ever enters the ledger.

---

## How the GLO Learns

Each organ runs the same loop through the shared genome:

1. **Observe** — record a sourced fact or signal (`observe`).
2. **Hypothesize** — state a falsifiable claim (`hypothesize`). It begins
   `proposed` with `unknown` confidence.
3. **Experiment** — design a test that will produce evidence (`design`).
4. **Gather evidence** — record supporting or refuting data with a strength and a
   source (`recordEvidence`).
5. **Earn confidence** — the genome re-derives the hypothesis's status from _all_
   its evidence. Nothing else can move it.
6. **Learn** — extract a durable principle, but only from a genuinely `supported`
   hypothesis (`learn`).
7. **Retire / reject** — supersede or refute a hypothesis; it is preserved, never
   erased.
8. **Transfer** — recommend an earned principle to another organ that may benefit.

## How the GLO Avoids Hallucinated Success

These invariants are enforced in code (`lib/glo/`) and locked by tests
(`lib/glo/__tests__/`, Phase 7):

- **`unknown` is never success.** With no evidence, confidence is `unknown`, and
  `unknown`/`low` never count as a win (`isSuccess`).
- **Confidence requires evidence.** There is no API to assert a confidence level or
  a status directly — both are derived from the evidence ledger.
- **Maturity cannot be fabricated.** Every organ profile declares `unknown`
  maturity; real maturity is _derived_ from supported hypotheses and their
  evidence. A guard (`findFabricatedMaturity`) flags any over-declaration.
- **Rejected knowledge is preserved.** Rejected and retired hypotheses stay in the
  ledger with a reason. The genome exposes no delete/erase method.
- **Transfers are inert.** Recommending a transfer mutates nothing in the target
  organ or the genome; acceptance is a separate, explicit human/organ decision.
- **The dashboard shows real evidence only.** Every figure at `/glo` is computed
  from live ledger records; an empty genome honestly reports zeros and `unknown`.

## How Evidence Flows Between Organs

1. An organ earns a `Learning` from a supported hypothesis in the shared genome.
2. The **Knowledge Transfer Engine** (`recommendTransfers`) classifies whether that
   learning matches a cross-organ affinity (e.g. VAJRA's validation rigor →
   EURO AI's compliance evidence).
3. If — and only if — the source learning has _earned_ confidence, a
   `TransferRecommendation` is produced with status `recommended`.
4. The recommendation is surfaced (dashboard, Governor brief). A human or the
   receiving organ **accepts or rejects** it (`decideTransfer`).
5. Acceptance authorizes follow-up work in the receiving organ; it never performs
   that work automatically.

## How Confidence Is Earned

Confidence is a pure function of evidence weight (`lib/glo/confidence.ts`):

| Condition                       | Level                |
| ------------------------------- | -------------------- |
| No evidence                     | `unknown`            |
| Net evidence weight ≤ 0         | `unknown`            |
| Net weight `> 0` and `< 0.75`   | `low`                |
| Net weight `≥ 0.75` and `< 1.5` | `moderate`           |
| Net weight `≥ 1.5`              | `high`               |
| Net refuting weight `≤ −1.5`    | drives **rejection** |

Only `moderate` and `high` are treated as success, and only they permit a hypothesis
to become `supported` and yield a `Learning`.

## How Failed Hypotheses Are Retired

- A hypothesis whose refuting evidence crosses the rejection threshold becomes
  `rejected` — automatically, from evidence — and keeps a resolution note.
- A hypothesis that is superseded or withdrawn is `retire`d with a note. Retired
  hypotheses are **frozen**: later evidence does not revive them.
- Both remain in the ledger permanently. Failure is memory, not waste. The
  dashboard counts them as **preserved** knowledge.

## How Founder Visibility Is Preserved

- The **GLO Dashboard block** at `/glo` answers one question: _is the organism
  learning?_ It shows organs, active loops, active/supported/preserved hypotheses,
  evidence generated, confidence distribution, unknown territory, transferable
  lessons, and the next best organism-wide experiment.
- An **integrity flag** turns red the instant any organ declares more maturity than
  its evidence earned.
- Unknown territory is shown as a first-class figure, so the Founder always sees the
  edge of the organism's knowledge — not a falsely complete picture.

---

## Amendment

This constitution is amended only by a subsequent DNA increment that (a) preserves
every invariant above or strengthens it, and (b) ships with tests proving the new
behavior. The genome grows by earned evidence, one verified increment at a time.

_The first living spine of the Cathedral: a shared learning organism that can
observe, question, experiment, learn, remember, transfer, and improve across
domains._
