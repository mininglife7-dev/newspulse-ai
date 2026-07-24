"""Phase 3 — Statistical Validation Engine.

Reproducible by construction: all resampling takes an explicit `seed`, so any
result can be regenerated bit-for-bit. Dependency-free.

Retires scientific debt SD-08 (metric confidence intervals) and SD-04
(bootstrap-based inference alongside the normal-approx test).
"""
from __future__ import annotations

import math
import random
from statistics import fmean, pstdev
from typing import Callable, Sequence


def bootstrap_ci(samples: Sequence[float], statistic: Callable[[Sequence[float]], float],
                 *, seed: int, n_boot: int = 2000, coverage: float = 0.95) -> dict:
    """Percentile bootstrap CI for an arbitrary statistic. Reproducible via seed."""
    if len(samples) < 2:
        return {"point": (statistic(samples) if samples else 0.0),
                "low": 0.0, "high": 0.0, "coverage": coverage, "n_boot": 0,
                "reproducible_seed": seed, "note": "insufficient sample"}
    rng = random.Random(seed)
    n = len(samples)
    stats = []
    for _ in range(n_boot):
        resample = [samples[rng.randrange(n)] for _ in range(n)]
        stats.append(statistic(resample))
    stats.sort()
    lo_i = max(0, int((1 - coverage) / 2 * n_boot) - 1)
    hi_i = min(n_boot - 1, int((1 + coverage) / 2 * n_boot) - 1)
    return {"point": statistic(samples), "low": stats[lo_i], "high": stats[hi_i],
            "coverage": coverage, "n_boot": n_boot, "reproducible_seed": seed}


def monte_carlo_robustness(returns: Sequence[float], statistic: Callable[[Sequence[float]], float],
                           *, seed: int, n_sim: int = 2000) -> dict:
    """Shuffle the order of returns to test path-dependence robustness.
    A statistic that is stable under reordering is more trustworthy."""
    if len(returns) < 2:
        return {"observed": statistic(returns) if returns else 0.0, "mc_mean": 0.0,
                "mc_std": 0.0, "percentile_of_observed": None, "reproducible_seed": seed}
    rng = random.Random(seed)
    obs = statistic(returns)
    sims = []
    base = list(returns)
    for _ in range(n_sim):
        rng.shuffle(base)
        sims.append(statistic(base))
    below = sum(1 for s in sims if s <= obs)
    return {"observed": obs, "mc_mean": fmean(sims), "mc_std": pstdev(sims),
            "percentile_of_observed": below / n_sim, "n_sim": n_sim,
            "reproducible_seed": seed}


def cohen_d(a: Sequence[float], b: Sequence[float]) -> float:
    if len(a) < 2 or len(b) < 2:
        return 0.0
    from statistics import variance
    na, nb = len(a), len(b)
    va, vb = variance(a), variance(b)
    pooled = math.sqrt(((na - 1) * va + (nb - 1) * vb) / max(na + nb - 2, 1))
    return (fmean(a) - fmean(b)) / pooled if pooled > 0 else 0.0


def benjamini_hochberg(p_values: Sequence[float], *, alpha: float = 0.05) -> dict:
    """Control the False Discovery Rate across multiple tests (guards against
    'found something' from many comparisons). Returns which are rejected."""
    m = len(p_values)
    if m == 0:
        return {"alpha": alpha, "threshold": 0.0, "rejected": [], "n_rejected": 0}
    order = sorted(range(m), key=lambda i: p_values[i])
    threshold = 0.0
    k_max = -1
    for rank, i in enumerate(order, start=1):
        if p_values[i] <= (rank / m) * alpha:
            k_max = rank
            threshold = (rank / m) * alpha
    rejected = [order[j] for j in range(k_max)] if k_max > 0 else []
    return {"alpha": alpha, "threshold": threshold, "rejected": sorted(rejected),
            "n_rejected": len(rejected), "n_tests": m}


def out_of_sample_stability(in_sample: float, out_of_sample: float,
                            *, rel_tol: float = 0.5) -> dict:
    """Compare a statistic in vs out of sample. Large degradation => unstable."""
    if in_sample == 0:
        degradation = 0.0 if out_of_sample == 0 else 1.0
    else:
        degradation = (in_sample - out_of_sample) / abs(in_sample)
    stable = degradation <= rel_tol and (in_sample == 0 or out_of_sample * in_sample >= 0)
    return {"in_sample": in_sample, "out_of_sample": out_of_sample,
            "degradation": degradation, "stable": stable, "rel_tol": rel_tol}
