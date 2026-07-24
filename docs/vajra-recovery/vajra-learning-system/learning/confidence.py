"""Confidence scoring model — deterministic and explainable.

Confidence is NOT a vibe: it is a bounded, reproducible function of the
evidence's strength. Every score returns its component breakdown so any lesson
can be explained and audited.
"""
from __future__ import annotations

import math
from typing import Any


def score_confidence(
    *,
    p_value: float,
    effect_size: float,
    sample_size: int,
    out_of_sample_passed: bool,
    regimes_covered: int,
    regimes_total: int,
    sample_target: int = 200,
    weights: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Return {'score': float in [0,1], 'components': {...}}.

    Components (each in [0,1]):
      significance  -log10(p) scaled; p>=1 -> 0
      effect        |d|/0.8 capped (0.8 ~ 'large' Cohen's d)
      sample        n/sample_target capped
      reproducibility  1.0 iff out-of-sample confirmed, else 0.0 (hard gate on overfit)
      regime_coverage  covered/total

    Reproducibility is weighted heavily: without OOS confirmation, confidence
    is structurally capped low — the system refuses to be confident on a single
    dataset (anti-overfit).
    """
    w = weights or {
        "significance": 0.25,
        "effect": 0.15,
        "sample": 0.15,
        "reproducibility": 0.35,
        "regime_coverage": 0.10,
    }
    p = min(max(p_value, 1e-12), 1.0)
    significance = 0.0 if p >= 1.0 else min(1.0, (-math.log10(p)) / 3.0)  # p=1e-3 -> 1.0
    effect = min(1.0, abs(effect_size) / 0.8)
    sample = min(1.0, sample_size / float(sample_target)) if sample_target > 0 else 0.0
    reproducibility = 1.0 if out_of_sample_passed else 0.0
    regime_coverage = (regimes_covered / regimes_total) if regimes_total > 0 else 0.0

    components = {
        "significance": round(significance, 4),
        "effect": round(effect, 4),
        "sample": round(sample, 4),
        "reproducibility": reproducibility,
        "regime_coverage": round(regime_coverage, 4),
    }
    score = sum(components[k] * w[k] for k in components)
    return {"score": round(min(1.0, max(0.0, score)), 4), "components": components, "weights": w}
