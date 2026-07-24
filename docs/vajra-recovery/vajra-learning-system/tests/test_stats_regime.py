"""Phase 3 (statistics) + Phase 4 (regime) tests."""
import unittest

from statistics import fmean
from learning.stats_validation import (
    bootstrap_ci, monte_carlo_robustness, cohen_d, benjamini_hochberg,
    out_of_sample_stability,
)
from learning.regime import classify_regime


class TestStats(unittest.TestCase):
    def test_bootstrap_reproducible(self):
        s = [0.1, -0.2, 0.3, 0.0, 0.15, -0.1, 0.2, -0.05, 0.12, -0.03]
        a = bootstrap_ci(s, fmean, seed=42, n_boot=500)
        b = bootstrap_ci(s, fmean, seed=42, n_boot=500)
        self.assertEqual((a["low"], a["high"], a["point"]), (b["low"], b["high"], b["point"]))
        self.assertLessEqual(a["low"], a["point"])
        self.assertLessEqual(a["point"], a["high"])

    def test_bootstrap_constant_sample(self):
        r = bootstrap_ci([5.0, 5.0, 5.0, 5.0], fmean, seed=1, n_boot=100)
        self.assertEqual(r["low"], 5.0)
        self.assertEqual(r["high"], 5.0)

    def test_benjamini_hochberg_known(self):
        # p=[0.001,0.9,0.02,0.03], alpha=0.05 -> reject indices 0,2,3
        r = benjamini_hochberg([0.001, 0.9, 0.02, 0.03], alpha=0.05)
        self.assertEqual(r["rejected"], [0, 2, 3])
        self.assertEqual(r["n_rejected"], 3)

    def test_benjamini_hochberg_none_significant(self):
        r = benjamini_hochberg([0.6, 0.7, 0.8], alpha=0.05)
        self.assertEqual(r["n_rejected"], 0)

    def test_cohen_d_separated_groups_large(self):
        a = [1.0 + 0.1 * ((i % 5) - 2) for i in range(40)]
        b = [0.0 + 0.1 * ((i % 5) - 2) for i in range(40)]
        self.assertGreater(cohen_d(a, b), 2.0)

    def test_monte_carlo_reproducible(self):
        r = [0.01, -0.02, 0.03, 0.0, 0.02, -0.01]
        m1 = monte_carlo_robustness(r, fmean, seed=7, n_sim=200)
        m2 = monte_carlo_robustness(r, fmean, seed=7, n_sim=200)
        self.assertEqual(m1["mc_mean"], m2["mc_mean"])

    def test_oos_stability(self):
        stable = out_of_sample_stability(1.0, 0.8)
        self.assertTrue(stable["stable"])
        unstable = out_of_sample_stability(1.0, -0.5)
        self.assertFalse(unstable["stable"])


class TestRegime(unittest.TestCase):
    def test_trending(self):
        self.assertEqual(classify_regime([0.01] * 12)["regime"], "trending")

    def test_mean_reverting(self):
        alt = [0.01 if i % 2 == 0 else -0.01 for i in range(20)]
        self.assertEqual(classify_regime(alt)["regime"], "mean_reverting")

    def test_event_driven(self):
        self.assertEqual(classify_regime([0.0] * 30 + [0.1])["regime"], "event_driven")

    def test_high_volatility_context(self):
        alt = [0.03 if i % 2 == 0 else -0.03 for i in range(20)]
        self.assertEqual(classify_regime(alt)["volatility_context"], "high_volatility")

    def test_insufficient_window(self):
        self.assertEqual(classify_regime([0.01])["regime"], "unknown")


if __name__ == "__main__":
    unittest.main()
