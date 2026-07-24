"""Reflection Engine — generate hypotheses, never facts.

Given trade observations, it asks "why did winners win / losers lose?" by
contrasting a numeric feature between winning and losing trades, and emits
PROPOSED hypotheses. It draws no conclusions and asserts nothing — every output
is a candidate to be tested by the Evidence Engine.
"""
from __future__ import annotations

from statistics import fmean
from typing import Any

from .models import Hypothesis, HypothesisState, LearningCategory


class ReflectionEngine:
    def __init__(self, proposer: str = "reflection_engine") -> None:
        self.proposer = proposer

    def hypotheses_from_trades(
        self, trades: list[dict[str, Any]], features: list[str],
        pnl_key: str = "pnl",
    ) -> list[Hypothesis]:
        """Contrast each feature between winners (pnl>0) and losers (pnl<0)."""
        winners = [t for t in trades if t.get("payload", t).get(pnl_key, 0) > 0]
        losers = [t for t in trades if t.get("payload", t).get(pnl_key, 0) < 0]
        out: list[Hypothesis] = []
        if not winners or not losers:
            return out

        def vals(rows: list[dict[str, Any]], feat: str) -> list[float]:
            xs = []
            for r in rows:
                p = r.get("payload", r)
                if feat in p and isinstance(p[feat], (int, float)):
                    xs.append(float(p[feat]))
            return xs

        for feat in features:
            wv, lv = vals(winners, feat), vals(losers, feat)
            if len(wv) < 2 or len(lv) < 2:
                continue
            direction = "higher" if fmean(wv) > fmean(lv) else "lower"
            out.append(Hypothesis(
                question=f"Does '{feat}' differ between winning and losing trades?",
                statement=(f"Winning trades tend to have {direction} '{feat}' than "
                           f"losing trades (candidate — untested)."),
                proposed_by=self.proposer,
                supporting_observation_ids=[r.get("id", "") for r in winners + losers],
                category=LearningCategory.FEATURE_IMPORTANCE.value,
                state=HypothesisState.PROPOSED.value,
            ))
        return out
