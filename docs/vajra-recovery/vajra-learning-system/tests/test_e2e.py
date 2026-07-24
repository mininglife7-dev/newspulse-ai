"""End-to-end test — a full learning cycle on synthetic fixtures.

Observe -> Reflect -> Test -> Validate -> Record lesson -> Recommend -> Approve.
Fixtures are explicitly synthetic; nothing here is a claim about a real market.
"""
import unittest

from learning import (
    ObservationEngine, ReflectionEngine, EvidenceEngine, LessonLedger,
    PolicyEvolutionEngine, Lesson, LessonStatus, score_confidence,
)


def arr(mean, n, spread=0.1):
    return [mean + spread * ((i % 5) - 2) for i in range(n)]


class TestEndToEndCycle(unittest.TestCase):
    def test_full_cycle(self):
        obs = ObservationEngine()
        # 1. OBSERVE (synthetic paper trades; winners have higher 'rsi')
        for i in range(60):
            obs.capture("paper_trade", {"pnl": 1.0, "rsi": 1.0 + (i % 3) * 0.1}, "sim")
        for i in range(60):
            obs.capture("paper_trade", {"pnl": -1.0, "rsi": 0.0 + (i % 3) * 0.1}, "sim")

        # 2. REFLECT -> proposed hypotheses
        hyps = ReflectionEngine().hypotheses_from_trades(obs.of_kind("paper_trade"), ["rsi"])
        self.assertTrue(hyps)

        # 3. TEST + 4. VALIDATE (with out-of-sample confirmation)
        ev = EvidenceEngine(min_sample=60)
        result, hyp = ev.test_feature_hypothesis(
            hyps[0],
            in_sample_winners=arr(1.0, 90), in_sample_losers=arr(0.0, 90),
            oos_winners=arr(1.0, 90), oos_losers=arr(0.0, 90),
            regimes_covered=["trend"])
        self.assertTrue(result.passed)

        conf = score_confidence(
            p_value=result.p_value, effect_size=result.effect_size,
            sample_size=result.sample_size, out_of_sample_passed=result.out_of_sample_passed,
            regimes_covered=1, regimes_total=3)

        # 5. RECORD lesson (ledger starts empty; this is the first real lesson,
        #    derived from validated synthetic evidence)
        led = LessonLedger()
        self.assertEqual(len(led), 0)  # ships empty — no fabricated lessons
        lesson = led.record(Lesson(
            strategy="rsi_edge", market="NSE", market_regime="trend",
            confidence_score=conf["score"],
            evidence_summary=result.reason,
            supporting_statistics={"p_value": result.p_value, "effect": result.effect_size,
                                   "confidence_components": conf["components"]},
            contradicting_evidence="none in this synthetic sample",
            source_experiment_ids=[result.id]))
        self.assertEqual(lesson.status, LessonStatus.VALIDATED.value)
        self.assertEqual(len(led.active()), 1)

        # 6. RECOMMEND (non-protected target -> applies; protected -> gated)
        pol = PolicyEvolutionEngine()
        rec = pol.recommend(
            description="prefer entries when rsi feature is elevated",
            target="signal_filter_rsi_threshold",
            expected_benefit="raise expectancy per validated edge",
            potential_risks="fewer signals; regime dependence",
            rollback_plan="revert threshold to prior committed value",
            confidence=conf["score"], lessons=[lesson])
        self.assertFalse(rec.requires_founder_approval)
        pol.apply(rec)
        self.assertEqual(rec.status, "deployed")


if __name__ == "__main__":
    unittest.main()
