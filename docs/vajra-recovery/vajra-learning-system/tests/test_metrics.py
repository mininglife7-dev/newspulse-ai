"""Metric oracle tests — numerical known-answers + properties.

These are the tests that make "I trust every number" mean something: if VAJRA
reports a Sharpe, it is checked against this verified reference.
"""
import math
import unittest

from learning import metrics as M


class TestKnownAnswers(unittest.TestCase):
    def test_profit_factor_known(self):
        self.assertAlmostEqual(M.profit_factor([10, -5, 20, -5]), 30 / 10)

    def test_profit_factor_all_wins_is_inf(self):
        self.assertEqual(M.profit_factor([1, 2, 3]), math.inf)

    def test_win_rate_known(self):
        self.assertAlmostEqual(M.win_rate([1, -1, 1, 1, -1]), 3 / 5)

    def test_kelly_known(self):
        # W=0.6, avg_win=2, avg_loss=1 -> R=2 -> f = 0.6 - 0.4/2 = 0.4
        pnls = [2, 2, 2, -1, -1] + [2, -1, 2, -1, 2]  # 7 wins? recompute below
        # Construct exactly: 6 wins of 2, 4 losses of 1 -> W=0.6, R=2
        pnls = [2] * 6 + [-1] * 4
        self.assertAlmostEqual(M.kelly_fraction(pnls), 0.4)

    def test_max_drawdown_monotonic_up_is_zero(self):
        self.assertAlmostEqual(M.max_drawdown([0.01, 0.02, 0.03]), 0.0)

    def test_max_drawdown_known(self):
        # +10% then -50% -> equity 1.1 then 0.55; peak 1.1 -> dd = 0.55/1.1 - 1 = -0.5
        self.assertAlmostEqual(M.max_drawdown([0.10, -0.50]), -0.5, places=9)

    def test_max_drawdown_ruin_is_capped_at_minus_one(self):
        # Day 2 self-audit Probe 1: returns <= -100% are capital ruin, capped -1.0
        self.assertEqual(M.max_drawdown([-2.0]), -1.0)
        self.assertEqual(M.max_drawdown([0.1, -1.5]), -1.0)
        self.assertEqual(M.max_drawdown([-1.0]), -1.0)

    def test_cagr_known(self):
        # one year (252 periods) doubling -> CAGR ~ 100%
        r = [(2 ** (1 / 252)) - 1] * 252
        self.assertAlmostEqual(M.cagr(r, periods_per_year=252), 1.0, places=6)


class TestProperties(unittest.TestCase):
    def test_sharpe_scale_invariance_rf0(self):
        r = [0.01, -0.02, 0.03, 0.00, 0.015, -0.01, 0.02, -0.005]
        s1 = M.sharpe(r)
        s2 = M.sharpe([x * 10 for x in r])
        self.assertAlmostEqual(s1, s2, places=9)

    def test_zero_volatility_returns_zero(self):
        self.assertEqual(M.sharpe([0.01, 0.01, 0.01]), 0.0)
        self.assertEqual(M.sortino([0.01, 0.01, 0.01]), 0.0)

    def test_max_drawdown_non_positive(self):
        self.assertLessEqual(M.max_drawdown([0.05, -0.1, 0.2, -0.3, 0.1]), 0.0)

    def test_win_rate_bounded(self):
        wr = M.win_rate([1, -1, 0, 2, -3])
        self.assertTrue(0.0 <= wr <= 1.0)

    def test_sortino_ge_zero_for_positive_drift(self):
        r = [0.02, -0.01, 0.03, -0.005, 0.01]
        self.assertGreater(M.sortino(r), 0.0)


class TestVerifyMetric(unittest.TestCase):
    def test_verify_agreement(self):
        r = [0.01, -0.02, 0.03, 0.0, 0.02]
        recomputed = M.sharpe(r)
        v = M.verify_metric("sharpe", reported=recomputed, recomputed=recomputed)
        self.assertTrue(v["verified"])

    def test_verify_disagreement_flagged(self):
        v = M.verify_metric("sharpe", reported=2.0, recomputed=1.0, tol=1e-6)
        self.assertFalse(v["verified"])
        self.assertGreater(v["abs_diff"], 0)


if __name__ == "__main__":
    unittest.main()
