"""Integration tests — Reflection feeding Evidence, incl. the anti-overfit gate."""
import unittest

from learning import ReflectionEngine, EvidenceEngine, HypothesisState


def arr(mean, n, spread=0.1):
    # deterministic values with mean == `mean` and non-zero variance
    return [mean + spread * ((i % 5) - 2) for i in range(n)]


class TestReflectionToEvidence(unittest.TestCase):
    def setUp(self):
        self.reflect = ReflectionEngine()
        self.evidence = EvidenceEngine(min_sample=60, alpha=0.05)

    def test_reflection_emits_only_proposed(self):
        trades = ([{"payload": {"pnl": 5.0, "rsi": 1.0}} for _ in range(5)] +
                  [{"payload": {"pnl": -5.0, "rsi": 0.0}} for _ in range(5)])
        hyps = self.reflect.hypotheses_from_trades(trades, ["rsi"])
        self.assertTrue(hyps)
        self.assertTrue(all(h.state == HypothesisState.PROPOSED.value for h in hyps))

    def test_supported_requires_out_of_sample(self):
        hyps = self.reflect.hypotheses_from_trades(
            [{"payload": {"pnl": 1, "rsi": 1.0}}, {"payload": {"pnl": 1, "rsi": 1.1}},
             {"payload": {"pnl": -1, "rsi": 0.0}}, {"payload": {"pnl": -1, "rsi": 0.1}}],
            ["rsi"])
        res, hyp = self.evidence.test_feature_hypothesis(
            hyps[0],
            in_sample_winners=arr(1.0, 80), in_sample_losers=arr(0.0, 80),
            oos_winners=arr(1.0, 80), oos_losers=arr(0.0, 80),
            regimes_covered=["trend"])
        self.assertTrue(res.passed)
        self.assertEqual(hyp.state, HypothesisState.SUPPORTED.value)

    def test_in_sample_only_is_refuted_as_overfit(self):
        hyps = self.reflect.hypotheses_from_trades(
            [{"payload": {"pnl": 1, "rsi": 1.0}}, {"payload": {"pnl": 1, "rsi": 1.1}},
             {"payload": {"pnl": -1, "rsi": 0.0}}, {"payload": {"pnl": -1, "rsi": 0.1}}],
            ["rsi"])
        res, hyp = self.evidence.test_feature_hypothesis(
            hyps[0],
            in_sample_winners=arr(1.0, 80), in_sample_losers=arr(0.0, 80),
            oos_winners=arr(0.5, 80), oos_losers=arr(0.5, 80),   # OOS: no difference
            regimes_covered=["trend"])
        self.assertFalse(res.passed)
        self.assertTrue(res.in_sample_passed)
        self.assertFalse(res.out_of_sample_passed)
        self.assertEqual(hyp.state, HypothesisState.REFUTED.value)


if __name__ == "__main__":
    unittest.main()
