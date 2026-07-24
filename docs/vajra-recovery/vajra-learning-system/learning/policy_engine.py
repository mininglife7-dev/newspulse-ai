"""Policy Evolution Engine — recommend improvements; never silently change.

Hard guarantee: the engine can PROPOSE anything but can APPLY nothing that
touches the Founder Protected Zone without an explicit Founder approval token.
It never reaches Execution — it only emits Recommendation records. Every
recommendation carries evidence, expected benefit, risks, rollback, confidence.
"""
from __future__ import annotations

from typing import Any

from .models import (
    Lesson, Recommendation, RecommendationStatus, PROTECTED_ZONES,
)
from .store import AppendOnlyStore


class ProtectedZoneViolation(RuntimeError):
    pass


class PolicyEvolutionEngine:
    def __init__(self, store: AppendOnlyStore | None = None) -> None:
        self.store = store or AppendOnlyStore()

    @staticmethod
    def _zones_touched(target: str) -> list[str]:
        t = target.lower()
        return sorted(z for z in PROTECTED_ZONES if z in t)

    def recommend(
        self, *, description: str, target: str, expected_benefit: str,
        potential_risks: str, rollback_plan: str, confidence: float,
        lessons: list[Lesson],
    ) -> Recommendation:
        if not lessons:
            raise ValueError("A recommendation must cite at least one validated lesson.")
        if not rollback_plan.strip():
            raise ValueError("Every recommendation must define a rollback plan (reversibility).")
        zones = self._zones_touched(target)
        rec = Recommendation(
            description=description, target=target,
            expected_benefit=expected_benefit, potential_risks=potential_risks,
            rollback_plan=rollback_plan, confidence=confidence,
            lesson_ids=[l.id for l in lessons],
            touches_protected_zone=bool(zones),
            protected_zones=zones,
            requires_founder_approval=bool(zones),
            status=RecommendationStatus.PROPOSED.value,
        )
        self.store.append(rec.to_dict())
        return rec

    def apply(self, rec: Recommendation, *, founder_approval_token: str | None = None) -> Recommendation:
        """Mark a recommendation deployed. Learning is independent from
        Execution: this records the *decision*; it does not itself mutate any
        production system. Protected-zone changes are refused without a token."""
        if rec.touches_protected_zone and not founder_approval_token:
            raise ProtectedZoneViolation(
                f"Recommendation {rec.id} touches Founder Protected Zone "
                f"{rec.protected_zones}; refused without Founder approval token."
            )
        rec.status = RecommendationStatus.DEPLOYED.value
        self.store.append({"id": f"apply_{rec.id}", "type": "apply",
                           "recommendation_id": rec.id,
                           "approved": bool(founder_approval_token),
                           "protected": rec.touches_protected_zone})
        return rec

    def rollback(self, rec: Recommendation, reason: str) -> Recommendation:
        rec.status = RecommendationStatus.ROLLED_BACK.value
        self.store.append({"id": f"rollback_{rec.id}", "type": "rollback",
                           "recommendation_id": rec.id, "reason": reason})
        return rec

    def all(self) -> list[dict[str, Any]]:
        return self.store.all()
