"""Trusted performance-metric reference library.

Purpose: be the INDEPENDENT ORACLE that VAJRA's reported numbers are checked
against — "I trust every number VAJRA produces" starts here. Formulas are
explicit, conventions are documented, and every function is covered by
numerical known-answer + property tests. Dependency-free (stdlib only).

Conventions:
  * `returns` are periodic fractional returns (0.01 == +1%).
  * `periods_per_year` annualizes (252 trading days by default).
  * Zero-volatility inputs return 0.0 for ratio metrics (a metric with no risk
    estimate is not trustworthy) — documented, not silently infinite.
  * Drawdown is returned as a non-positive fraction.
"""
from __future__ import annotations

import math
from statistics import fmean, stdev
from typing import Sequence


def _equity_curve(returns: Sequence[float], initial: float = 1.0) -> list[float]:
    eq, curve = initial, []
    for r in returns:
        eq *= (1.0 + r)
        curve.append(eq)
    return curve


def sharpe(returns: Sequence[float], *, risk_free: float = 0.0,
           periods_per_year: int = 252) -> float:
    if len(returns) < 2:
        return 0.0
    excess = [r - risk_free for r in returns]
    sd = stdev(excess)
    if sd == 0.0:
        return 0.0
    return (fmean(excess) / sd) * math.sqrt(periods_per_year)


def sortino(returns: Sequence[float], *, target: float = 0.0,
            periods_per_year: int = 252) -> float:
    if len(returns) < 2:
        return 0.0
    excess = [r - target for r in returns]
    downside = [min(0.0, e) ** 2 for e in excess]
    dd = math.sqrt(sum(downside) / len(excess))
    if dd == 0.0:
        return 0.0
    return (fmean(excess) / dd) * math.sqrt(periods_per_year)


def profit_factor(pnls: Sequence[float]) -> float:
    gains = sum(p for p in pnls if p > 0)
    losses = -sum(p for p in pnls if p < 0)
    if losses == 0.0:
        return math.inf if gains > 0 else 0.0
    return gains / losses


def max_drawdown(returns: Sequence[float]) -> float:
    """Return the worst peak-to-trough decline as a non-positive fraction."""
    if not returns:
        return 0.0
    peak, mdd = -math.inf, 0.0
    for eq in _equity_curve(returns):
        peak = max(peak, eq)
        mdd = min(mdd, eq / peak - 1.0)
    return mdd


def win_rate(pnls: Sequence[float]) -> float:
    if not pnls:
        return 0.0
    return sum(1 for p in pnls if p > 0) / len(pnls)


def expectancy(pnls: Sequence[float]) -> float:
    """Mean profit per trade (same units as pnls)."""
    return fmean(pnls) if pnls else 0.0


def kelly_fraction(pnls: Sequence[float]) -> float:
    """f* = W - (1-W)/R, where W=win rate, R=avg_win/avg_loss (payoff ratio).
    Returns 0.0 when undefined (no wins or no losses)."""
    wins = [p for p in pnls if p > 0]
    losses = [-p for p in pnls if p < 0]
    if not wins or not losses:
        return 0.0
    w = len(wins) / len(pnls)
    payoff = fmean(wins) / fmean(losses)
    if payoff == 0.0:
        return 0.0
    return w - (1.0 - w) / payoff


def cagr(returns: Sequence[float], *, periods_per_year: int = 252) -> float:
    if not returns:
        return 0.0
    final = _equity_curve(returns)[-1]
    if final <= 0.0:
        return -1.0
    years = len(returns) / periods_per_year
    if years <= 0.0:
        return 0.0
    return final ** (1.0 / years) - 1.0


def verify_metric(name: str, reported: float, recomputed: float,
                  *, tol: float = 1e-6) -> dict:
    """Compare a reported metric to this oracle's recomputation.
    Returns a verdict record — the atom of 'trust every number'."""
    if math.isinf(reported) or math.isinf(recomputed):
        agree = (reported == recomputed)
        diff = 0.0 if agree else math.inf
    else:
        diff = abs(reported - recomputed)
        agree = diff <= tol
    return {"metric": name, "reported": reported, "recomputed": recomputed,
            "abs_diff": diff, "tolerance": tol, "verified": agree}
