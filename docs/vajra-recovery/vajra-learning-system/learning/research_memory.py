"""Phase 6 — Research Memory. Nothing may be lost.

Every experiment permanently records hypothesis, evidence, dataset version,
parameters, results, statistical validation, decision, and lessons. Append-only:
supersede, never overwrite. Reuses the append-only store.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any

from .store import AppendOnlyStore


@dataclass
class ResearchRecord:
    hypothesis: str
    evidence: list[str]
    dataset_version: str          # e.g. the DataIntegrity fingerprint (SHA-256)
    parameters: dict[str, Any]
    results: dict[str, Any]
    statistical_validation: dict[str, Any]
    decision: str
    lessons_learned: list[str]
    supersedes: str | None = None
    id: str = field(default_factory=lambda: f"rr_{uuid.uuid4().hex[:12]}")
    ts: str = field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))

    def __post_init__(self) -> None:
        for k in ("hypothesis", "dataset_version", "decision"):
            if not str(getattr(self, k)).strip():
                raise ValueError(f"ResearchRecord requires '{k}' (traceability).")
        if not self.evidence:
            raise ValueError("ResearchRecord requires cited evidence.")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class ResearchMemory:
    def __init__(self, store: AppendOnlyStore | None = None) -> None:
        self.store = store or AppendOnlyStore()

    def record(self, rec: ResearchRecord) -> ResearchRecord:
        self.store.append(rec.to_dict())
        return rec

    def supersede(self, old_id: str, rec: ResearchRecord) -> ResearchRecord:
        rec.supersedes = old_id
        self.store.append(rec.to_dict())
        self.store.append({"id": f"mark_{rec.id}", "type": "supersession",
                           "superseded_id": old_id, "by_id": rec.id})
        return rec

    def all(self) -> list[dict[str, Any]]:
        return self.store.all()

    def by_dataset(self, fingerprint: str) -> list[dict[str, Any]]:
        return list(self.store.find(dataset_version=fingerprint))

    def __len__(self) -> int:
        return len(self.store)
