"""Phase 4 — Market Regime Engine.

Rule-based, transparent classification (NOT a black-box model — an opaque
classifier would add unexplainable risk). Thresholds are documented heuristics,
flagged as such in the Assurance Boundary — they are conventions to calibrate,
not empirically fitted values.

Input: a window of periodic returns (and optional volumes). Output: a regime
label + the evidence that produced it.
"""
from __future__ import annotations

from statistics import fmean, pstdev
from typing import Sequence

REGIMES = ("trending", "mean_reverting", "high_volatility", "low_volatility",
           "range_bound", "event_driven", "unknown")


def _lag1_autocorr(x: Sequence[float]) -> float:
    n = len(x)
    if n < 3:
        return 0.0
    m = fmean(x)
    num = sum((x[i] - m) * (x[i - 1] - m) for i in range(1, n))
    den = sum((xi - m) ** 2 for xi in x)
    return num / den if den > 0 else 0.0


def classify_regime(returns: Sequence[float], *,
                    high_vol: float = 0.02, low_vol: float = 0.005,
                    trend_ratio: float = 0.5, event_sigma: float = 4.0) -> dict:
    """Classify a return window. Thresholds are documented heuristics.

    Precedence: event_driven > high/low volatility context, then
    trending vs mean_reverting vs range_bound from drift + autocorrelation.
    """
    n = len(returns)
    if n < 3:
        return {"regime": "unknown", "confidence": 0.0,
                "evidence": {"n": n}, "note": "insufficient window"}
    vol = pstdev(returns)
    mean_r = fmean(returns)
    cum = 1.0
    for r in returns:
        cum *= (1 + r)
    net = cum - 1.0
    total_abs = sum(abs(r) for r in returns) or 1e-12
    directionality = abs(net) / total_abs   # ~1 => straight line, ~0 => choppy
    ac1 = _lag1_autocorr(returns)

    # event-driven: a single bar many sigmas from the mean
    if vol > 0 and any(abs(r - mean_r) > event_sigma * vol for r in returns):
        regime, conf = "event_driven", 0.7
    elif directionality >= trend_ratio and ac1 >= 0:
        regime = "trending"
        conf = min(1.0, directionality)
    elif ac1 < -0.2:
        regime, conf = "mean_reverting", min(1.0, abs(ac1))
    else:
        regime, conf = "range_bound", 1.0 - directionality

    vol_context = ("high_volatility" if vol >= high_vol
                   else "low_volatility" if vol <= low_vol else "normal_volatility")
    return {"regime": regime, "confidence": round(conf, 4),
            "volatility_context": vol_context,
            "evidence": {"vol": round(vol, 6), "net_return": round(net, 6),
                         "directionality": round(directionality, 4),
                         "lag1_autocorr": round(ac1, 4), "n": n},
            "thresholds": {"high_vol": high_vol, "low_vol": low_vol,
                           "trend_ratio": trend_ratio, "event_sigma": event_sigma},
            "note": "rule-based heuristic; thresholds are conventions to calibrate"}
