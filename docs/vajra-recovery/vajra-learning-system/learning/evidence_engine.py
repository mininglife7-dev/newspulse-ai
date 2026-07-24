"""Evidence Engine — test every hypothesis; accept only what survives.

Requires BOTH in-sample significance AND out-of-sample confirmation in the
same direction before a hypothesis can be marked SUPPORTED. This is the core
anti-overfit gate. Rejected hypotheses are returned too — failures are kept,
never hidden.
"""
from __future__ import annotations

from typing import Sequence

from .models import EvidenceResult, Hypothesis, HypothesisState
from .validation import welch_two_sample, meets_scientific_standards


class EvidenceEngine:
    def __init__(self, *, min_sample: int = 60, alpha: float = 0.05) -> None:
        self.min_sample = min_sample
        self.alpha = alpha

    def test_feature_hypothesis(
        self,
        hypothesis: Hypothesis,
        *,
        in_sample_winners: Sequence[float],
        in_sample_losers: Sequence[float],
        oos_winners: Sequence[float],
        oos_losers: Sequence[float],
        regimes_covered: list[str] | None = None,
    ) -> tuple[EvidenceResult, Hypothesis]:
        """Run the in-sample test, then require OOS confirmation (same sign)."""
        ins = welch_two_sample(in_sample_winners, in_sample_losers, alpha=self.alpha)
        oos = welch_two_sample(oos_winners, oos_losers, alpha=self.alpha)

        oos_confirms = (
            oos.significant and ins.direction != 0 and oos.direction == ins.direction
        )
        n_total = ins.n + oos.n
        accepted, reason = meets_scientific_standards(
            sample_size=n_total, p_value=ins.p_value,
            out_of_sample_passed=oos_confirms,
            min_sample=self.min_sample, alpha=self.alpha,
        )

        result = EvidenceResult(
            hypothesis_id=hypothesis.id,
            method="out_of_sample+significance_test",
            sample_size=n_total,
            statistic=ins.statistic,
            p_value=ins.p_value,
            effect_size=ins.effect_size,
            in_sample_passed=ins.significant,
            out_of_sample_passed=oos_confirms,
            passed=accepted,
            reason=reason,
            limitations=ins.limitations,
            regimes_covered=regimes_covered or [],
        )
        # Update hypothesis state from evidence — never from preference.
        if accepted:
            hypothesis.state = HypothesisState.SUPPORTED.value
        elif ins.significant and not oos_confirms:
            hypothesis.state = HypothesisState.REFUTED.value  # in-sample only => overfit
        elif not ins.significant:
            hypothesis.state = HypothesisState.INCONCLUSIVE.value
        else:
            hypothesis.state = HypothesisState.INCONCLUSIVE.value
        return result, hypothesis
