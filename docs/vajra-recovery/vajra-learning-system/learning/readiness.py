"""Phase 8 — Readiness Score.

A deterministic, explainable gate. Only experiments exceeding the approved
threshold may proceed to implementation. The score is the WEAKEST-link aware
weighted mean of six dimensions, each in [0,1]; any critical dimension at 0
forces the gate closed regardless of the others.
"""
from __future__ import annotations

from typing import Any

DIMENSIONS = ("data_quality", "evidence_quality", "statistical_confidence",
              "reproducibility", "robustness", "execution_readiness")

# Reproducibility and data_quality are hard gates: a 0 there fails outright.
_HARD_GATES = ("data_quality", "reproducibility")

_DEFAULT_WEIGHTS = {
    "data_quality": 0.20, "evidence_quality": 0.15, "statistical_confidence": 0.20,
    "reproducibility": 0.20, "robustness": 0.15, "execution_readiness": 0.10,
}


def readiness_score(scores: dict[str, float], *, threshold: float = 0.75,
                    weights: dict[str, float] | None = None) -> dict[str, Any]:
    w = weights or _DEFAULT_WEIGHTS
    missing = [d for d in DIMENSIONS if d not in scores]
    if missing:
        raise ValueError(f"readiness_score missing dimensions: {missing}")
    clipped = {d: min(1.0, max(0.0, float(scores[d]))) for d in DIMENSIONS}
    hard_fail = [d for d in _HARD_GATES if clipped[d] <= 0.0]
    weighted = sum(clipped[d] * w[d] for d in DIMENSIONS)
    passed = (not hard_fail) and weighted >= threshold
    return {"score": round(weighted, 4), "threshold": threshold, "passed": passed,
            "hard_gate_failures": hard_fail, "dimensions": clipped, "weights": w,
            "verdict": "READY — may proceed to implementation" if passed
                       else "NOT READY — below threshold or hard-gate failure"}
