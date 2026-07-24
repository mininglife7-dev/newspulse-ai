"""Unit tests — one concern per test. Run: python3 -m unittest discover -s tests"""
import unittest

from learning import (
    ObservationEngine, LessonLedger, PolicyEvolutionEngine, Lesson,
    score_confidence,
)
from learning.policy_engine import ProtectedZoneViolation
from learning.store import AppendOnlyStore
from learning.validation import welch_two_sample, meets_scientific_standards


def _lesson(**kw):
    base = dict(strategy="s1", market="NSE", market_regime="trend",
                confidence_score=0.8, evidence_summary="e", supporting_statistics={},
                contradicting_evidence="none recorded", source_experiment_ids=["evd_x"])
    base.update(kw)
    return Lesson(**base)


class TestObservationEngine(unittest.TestCase):
    def test_captures_without_conclusion(self):
        eng = ObservationEngine()
        obs = eng.capture("paper_trade", {"pnl": 12.0, "slippage": 0.3}, "sim")
        self.assertEqual(obs.kind, "paper_trade")
        self.assertEqual(len(eng.all()), 1)

    def test_rejects_conclusions(self):
        eng = ObservationEngine()
        with self.assertRaises(ValueError):
            eng.capture("x", {"pnl": 1.0, "conclusion": "strategy works"}, "sim")


class TestAppendOnlyStore(unittest.TestCase):
    def test_no_update_or_delete_api(self):
        s = AppendOnlyStore()
        self.assertFalse(hasattr(s, "update"))
        self.assertFalse(hasattr(s, "delete"))


class TestLessonLedgerAppendOnly(unittest.TestCase):
    def test_supersede_preserves_history(self):
        led = LessonLedger()
        l1 = led.record(_lesson(evidence_summary="v1"))
        l2 = led.supersede(l1.id, _lesson(evidence_summary="v2"))
        ids = [r.get("id") for r in led.store.all()]
        self.assertIn(l1.id, ids)            # original preserved
        self.assertIn(l2.id, ids)            # new present
        active_ids = [r["id"] for r in led.active()]
        self.assertNotIn(l1.id, active_ids)  # old no longer active
        self.assertIn(l2.id, active_ids)
        self.assertEqual(l2.version, 2)


class TestProtectedZone(unittest.TestCase):
    def test_protected_target_requires_approval(self):
        pol = PolicyEvolutionEngine()
        rec = pol.recommend(
            description="raise daily loss limit", target="daily_loss_limit",
            expected_benefit="more trades", potential_risks="more capital risk",
            rollback_plan="restore prior value", confidence=0.9, lessons=[_lesson()])
        self.assertTrue(rec.requires_founder_approval)
        self.assertIn("daily_loss_limit", rec.protected_zones)
        with self.assertRaises(ProtectedZoneViolation):
            pol.apply(rec)  # no token -> refused
        pol.apply(rec, founder_approval_token="FOUNDER-OK")  # token -> allowed
        self.assertEqual(rec.status, "deployed")

    def test_non_protected_applies_without_token(self):
        pol = PolicyEvolutionEngine()
        rec = pol.recommend(
            description="tune signal filter", target="signal_filter_threshold",
            expected_benefit="fewer false positives", potential_risks="fewer signals",
            rollback_plan="restore threshold", confidence=0.7, lessons=[_lesson()])
        self.assertFalse(rec.requires_founder_approval)
        pol.apply(rec)
        self.assertEqual(rec.status, "deployed")

    def test_rollback_required(self):
        pol = PolicyEvolutionEngine()
        with self.assertRaises(ValueError):
            pol.recommend(description="x", target="signal_filter", expected_benefit="b",
                          potential_risks="r", rollback_plan="   ", confidence=0.5,
                          lessons=[_lesson()])


class TestConfidence(unittest.TestCase):
    def test_oos_gate_lowers_confidence(self):
        strong = score_confidence(p_value=1e-6, effect_size=1.0, sample_size=300,
                                  out_of_sample_passed=True, regimes_covered=2, regimes_total=2)
        overfit = score_confidence(p_value=1e-6, effect_size=1.0, sample_size=300,
                                   out_of_sample_passed=False, regimes_covered=2, regimes_total=2)
        self.assertGreater(strong["score"], overfit["score"])
        self.assertEqual(overfit["components"]["reproducibility"], 0.0)
        self.assertLessEqual(strong["score"], 1.0)


class TestValidationGate(unittest.TestCase):
    def test_underpowered_rejected(self):
        ok, reason = meets_scientific_standards(sample_size=20, p_value=0.001,
                                                out_of_sample_passed=True, min_sample=60)
        self.assertFalse(ok)
        self.assertIn("underpowered", reason)

    def test_significant_difference_detected(self):
        a = [1.0 + 0.1 * ((i % 5) - 2) for i in range(80)]  # mean 1.0
        b = [0.0 + 0.1 * ((i % 5) - 2) for i in range(80)]  # mean 0.0
        out = welch_two_sample(a, b)
        self.assertTrue(out.significant)
        self.assertEqual(out.direction, 1)


if __name__ == "__main__":
    unittest.main()
