# CATHEDRAL_LINEAGE — Genome Versions and Evolution History

**Version:** 1.0.0  
**Created:** 2026-07-19  
**Status:** Active

---

## Purpose

CATHEDRAL_LINEAGE.md records the genealogy of Genome versions, showing parent-child relationships, what evolved, why, and by whose authority. This is the immutable record of how the Cathedral organism has adapted over time.

---

## Genome Versions

### Genome 1.0.0 (Initial Specification)

**Created:** 2026-07-19  
**DNA Version:** 1.0.0  
**Parent:** None (initial specification)  
**Status:** Active  
**Approved by:** Founder (Lalit)

**Summary:**
Initial machine-readable specification of Cathedral organism. Formalizes all 10 organs, 12 capabilities, policies, homeostasis thresholds, evolution rules, memory schemas, and observability framework.

**What changed from prior state:**
- Explicit specification of organ authority boundaries (engineering, compliance, memory, immune, learning, observability, knowledge, customer, operations, evolution)
- Codification of 12 capabilities and their provider chains
- Formalization of policy tiers (autonomous, audit_required, approval_required, prohibited)
- Thresholds for homeostasis response levels 1-5
- Mandatory evolution record template with baseline preservation
- Explicit prohibition of DNA self-modification

**Rationale:**
Phase 0.5 deliverable: Create machine-readable specifications that make the Cathedral organism fully reproducible. Governor OS Foundation depends on these specifications to execute missions autonomously and verify results.

**Why this version:**
- Genome 1.0.0 is baseline. All future evolutions reference this as parent.
- Semantic versioning: patches (1.0.x) for minor clarifications; minor versions (1.x.0) for organ/capability changes; major versions (2.0.0+) only for fundamental restructuring.

**Decision record:** DR-0007 (decision_register.md)

**Evidence:**
- CATHEDRAL_DNA.yaml (1.0.0) — immutable identity layer
- CATHEDRAL_GENOME.yaml (1.0.0) — complete specification
- CATHEDRAL_GENOME_SCHEMA.json (1.0.0) — machine-readable validation schema
- CATHEDRAL_ORGAN_REGISTRY.yaml (1.0.0) — per-organ details
- CATHEDRAL_IMMUNE_SYSTEM_SPEC.md (1.0.0) — threat detection and quarantine
- CATHEDRAL_HOMEOSTASIS_SPEC.md (1.0.0) — thresholds and response levels
- CATHEDRAL_REGENERATION_SPEC.md (1.0.0) — organ recovery procedures
- CATHEDRAL_EVOLUTION_PROTOCOL.md (1.0.0) — change classes and approval rules
- CATHEDRAL_COMPATIBILITY_MAP.md (1.0.0) — preservation rules and migration strategy

---

## Evolution Candidates (Pending)

None. Genome 1.0.0 is the initial specification. Evolution proposals will be added here as they are considered and decided.

---

## Rejected Evolution Proposals

None yet. Genome 1.0.0 is the initial version.

---

## Rollback History

No rollbacks. Genome 1.0.0 is the first version.

---

## Lineage Verification

**Last verified:** 2026-07-19  
**Verified by:** Founder (Lalit)  
**Verification method:** Phase 0.5 Batch 4 completion; all specifications committed to repository

---

## How to Propose Genome Evolution

1. **Identify need:** Which organ changed? Which capability was added/removed? Which policy threshold needs adjustment?
2. **Classify change:** Use CATHEDRAL_EVOLUTION_PROTOCOL.md change classes (Operational/Organ/Genome/DNA)
3. **Create evolution record:** Follow template in CATHEDRAL_EVOLUTION_PROTOCOL.md
4. **Sandbox test:** Validate change in non-production environment
5. **Seek approval:** Submit to Founder for decision (DNA changes only), or Governor + Founder agreement (Organ/Genome changes)
6. **Record lineage:** Add new version here with parent, change description, decision record, evidence
7. **Update genome:** Increment version number (semantic versioning)
8. **Deploy:** Apply change with monitoring per evolution protocol

---

## Next Genome Version Candidate

When Phase 1 (reference mission proof) completes, Genome 1.1.0 may be created to capture:
- Mission state machine implementation (deterministic fields only)
- Verified Capability Registry and Policy Engine working end-to-end
- Evidence Ledger schema confirmed (deterministic/volatile separation)
- Learning Candidate generator validated in sandbox

This would be an Organ/Governance evolution, requiring Founder approval per CATHEDRAL_EVOLUTION_PROTOCOL.md.
