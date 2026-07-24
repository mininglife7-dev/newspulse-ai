"""Phase 5 — Strategy Autopsy Engine. Failures become institutional knowledge.

Structures a failed strategy's post-mortem. It requires the caller to supply
evidence for each field — it does NOT invent failure reasons. Where trade
returns are supplied, it derives the regime-of-failure from the Regime Engine
(evidence-backed), rather than guessing.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Sequence

from .regime import classify_regime


@dataclass
class StrategyAutopsy:
    strategy: str
    failure_reason: str
    broken_assumptions: list[str]
    regime_of_failure: str
    earliest_warning_indicators: list[str]
    lessons_learned: list[str]
    recommendations: list[str]
    evidence: list[str]
    id: str = field(default_factory=lambda: f"autopsy_{uuid.uuid4().hex[:12]}")
    ts: str = field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))

    def __post_init__(self) -> None:
        required = {"strategy": self.strategy, "failure_reason": self.failure_reason,
                    "regime_of_failure": self.regime_of_failure}
        missing = [k for k, v in required.items() if not str(v).strip()]
        if missing:
            raise ValueError(f"Autopsy missing required evidence fields: {missing}")
        if not self.evidence:
            raise ValueError("Autopsy must cite at least one piece of evidence (no invented reasons).")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def derive_regime_of_failure(failure_window_returns: Sequence[float]) -> dict:
    """Evidence-backed regime label for the window in which the strategy failed."""
    return classify_regime(failure_window_returns)
