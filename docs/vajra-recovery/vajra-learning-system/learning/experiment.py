"""Scientific Experiment Framework + Evidence Infrastructure.

Priority 3: every experiment is pre-registered with hypothesis, objective, data
requirements, metrics, success/failure criteria, rollback, evidence &
verification plans — BEFORE it runs (no post-hoc storytelling).

Priority 4: four append-only ledgers so no undocumented experiment exists —
Experiment, Evidence, Decision, Learning. All reuse the append-only store
(supersede, never overwrite).
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any

from .store import AppendOnlyStore


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _uid(p: str) -> str:
    return f"{p}_{uuid.uuid4().hex[:12]}"


@dataclass
class Experiment:
    """A pre-registered experiment. All planning fields are required."""
    hypothesis: str
    objective: str
    data_requirements: str
    metrics: list[str]
    success_criteria: str
    failure_criteria: str
    rollback_plan: str
    evidence_plan: str
    verification_plan: str
    status: str = "registered"       # registered | running | complete | rejected
    id: str = field(default_factory=lambda: _uid("exp"))
    ts: str = field(default_factory=_now)

    def __post_init__(self) -> None:
        required = {
            "hypothesis": self.hypothesis, "objective": self.objective,
            "data_requirements": self.data_requirements,
            "success_criteria": self.success_criteria,
            "failure_criteria": self.failure_criteria,
            "rollback_plan": self.rollback_plan,
            "evidence_plan": self.evidence_plan,
            "verification_plan": self.verification_plan,
        }
        missing = [k for k, v in required.items() if not str(v).strip()]
        if missing:
            raise ValueError(f"Experiment missing required pre-registration fields: {missing}")
        if not self.metrics:
            raise ValueError("Experiment must declare at least one metric before running.")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class Ledger:
    """Append-only ledger. No update, no delete."""

    def __init__(self, name: str, store: AppendOnlyStore | None = None) -> None:
        self.name = name
        self.store = store or AppendOnlyStore()

    def record(self, record: dict[str, Any]) -> dict[str, Any]:
        return self.store.append(record)

    def all(self) -> list[dict[str, Any]]:
        return self.store.all()

    def __len__(self) -> int:
        return len(self.store)


class ExperimentLedger(Ledger):
    def __init__(self, store: AppendOnlyStore | None = None) -> None:
        super().__init__("experiment", store)

    def register(self, exp: Experiment) -> Experiment:
        self.record(exp.to_dict())
        return exp


class EvidenceLedger(Ledger):
    def __init__(self, store: AppendOnlyStore | None = None) -> None:
        super().__init__("evidence", store)


class DecisionLedger(Ledger):
    def __init__(self, store: AppendOnlyStore | None = None) -> None:
        super().__init__("decision", store)
