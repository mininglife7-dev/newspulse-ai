"""Scientific validation framework — the statistics behind Evidence.

Dependency-free. Uses a Welch two-sample mean test with a normal
approximation for the p-value (documented limitation). No numpy/scipy so the
package stays portable; swap in exact distributions later if desired.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from statistics import NormalDist, fmean, pvariance, variance
from typing import Sequence


@dataclass
class TestOutcome:
    statistic: float          # z (Welch)
    p_value: float            # two-sided, normal approx
    effect_size: float        # Cohen's d (pooled)
    n: int                    # total sample
    significant: bool
    direction: int            # sign of (mean_a - mean_b): +1 / 0 / -1
    limitations: str


_PHI = NormalDist()


def welch_two_sample(
    a: Sequence[float], b: Sequence[float], *, alpha: float = 0.05
) -> TestOutcome:
    """Two-sample difference-of-means test (Welch), normal-approx p-value."""
    na, nb = len(a), len(b)
    if na < 2 or nb < 2:
        return TestOutcome(0.0, 1.0, 0.0, na + nb, False, 0,
                           "insufficient sample (need >=2 per group)")
    ma, mb = fmean(a), fmean(b)
    va, vb = variance(a), variance(b)
    se = math.sqrt(va / na + vb / nb)
    if se == 0.0:
        # No variance: degenerate. Report as non-significant to avoid false certainty.
        return TestOutcome(0.0, 1.0, 0.0, na + nb, False, 0,
                           "zero within-group variance; test degenerate")
    z = (ma - mb) / se
    p = 2.0 * (1.0 - _PHI.cdf(abs(z)))
    # Pooled SD for Cohen's d
    pooled_sd = math.sqrt(((na - 1) * va + (nb - 1) * vb) / max(na + nb - 2, 1))
    d = (ma - mb) / pooled_sd if pooled_sd > 0 else 0.0
    direction = 1 if (ma - mb) > 0 else (-1 if (ma - mb) < 0 else 0)
    return TestOutcome(
        statistic=round(z, 6),
        p_value=round(p, 8),
        effect_size=round(d, 6),
        n=na + nb,
        significant=p < alpha,
        direction=direction,
        limitations="Welch t-test with normal-approximation p-value; "
                    "assumes roughly independent samples. Exact t-distribution "
                    "not used (stdlib-only).",
    )


def meets_scientific_standards(
    *, sample_size: int, p_value: float, out_of_sample_passed: bool,
    min_sample: int = 60, alpha: float = 0.05,
) -> tuple[bool, str]:
    """Hard gate. A finding is accepted ONLY if it is adequately powered,
    significant, AND confirmed out-of-sample (anti-overfit)."""
    if sample_size < min_sample:
        return False, f"underpowered: n={sample_size} < min_sample={min_sample}"
    if p_value >= alpha:
        return False, f"not significant: p={p_value:.4g} >= alpha={alpha}"
    if not out_of_sample_passed:
        return False, "failed out-of-sample confirmation (possible overfit)"
    return True, "meets significance + power + out-of-sample standards"
