"""Observation Engine — capture everything, conclude nothing."""
from __future__ import annotations

from typing import Any

from .models import Observation
from .store import AppendOnlyStore


class ObservationEngine:
    """Captures observations into an append-only store. It never interprets."""

    def __init__(self, store: AppendOnlyStore | None = None) -> None:
        self.store = store or AppendOnlyStore()

    def capture(self, kind: str, payload: dict[str, Any], provenance: str,
                confidence: str = "measured") -> Observation:
        obs = Observation(kind=kind, payload=payload, provenance=provenance,
                          confidence=confidence)  # __post_init__ rejects conclusions
        self.store.append(obs.to_dict())
        return obs

    def all(self) -> list[dict[str, Any]]:
        return self.store.all()

    def of_kind(self, kind: str) -> list[dict[str, Any]]:
        return list(self.store.find(kind=kind))
