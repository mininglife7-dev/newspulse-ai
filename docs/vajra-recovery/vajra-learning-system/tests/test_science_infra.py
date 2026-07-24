"""Phases 2, 5, 6, 7, 8 — backtest integrity, autopsy, research memory,
skeptic, readiness."""
import unittest

from learning.backtest_integrity import check_backtest
from learning.autopsy import StrategyAutopsy, derive_regime_of_failure
from learning.research_memory import ResearchRecord, ResearchMemory
from learning.skeptic import challenge, assess_challenge, MANDATORY_QUESTIONS
from learning.readiness import readiness_score


class TestBacktestIntegrity(unittest.TestCase):
    def _clean(self):
        return {"signal": {"bar_index": 10}, "execution": {"bar_index": 11, "fill_price": "next_open"},
                "features": {"max_reference_index": 10, "references_future": False},
                "universe": {"survivorship_free": True},
                "costs": {"commission_model": "per_share", "slippage_model": "spread"}}

    def test_clean_spec_trustworthy(self):
        r = check_backtest(self._clean())
        self.assertTrue(r["trustworthy"])
        self.assertEqual(r["n_flags"], 0)

    def test_lookahead_is_critical(self):
        s = self._clean(); s["execution"]["bar_index"] = 10  # not after signal
        r = check_backtest(s)
        self.assertFalse(r["trustworthy"])
        self.assertIn("look_ahead_bias", r["critical"])

    def test_leakage_is_critical(self):
        s = self._clean(); s["features"]["max_reference_index"] = 20
        r = check_backtest(s)
        self.assertIn("data_leakage", r["critical"])

    def test_missing_costs_flagged_not_critical(self):
        s = self._clean(); s["costs"] = {}
        r = check_backtest(s)
        self.assertTrue(r["trustworthy"])  # high severity, not critical
        kinds = {f["kind"] for f in r["flags"]}
        self.assertIn("no_commission_model", kinds)
        self.assertIn("no_slippage_model", kinds)

    def test_position_sizing_inconsistency(self):
        s = self._clean(); s["position"] = {"max_size": 100}; s["trades"] = [{"size": 50}, {"size": 200}]
        r = check_backtest(s)
        self.assertTrue(any(f["kind"] == "position_sizing_inconsistency" for f in r["flags"]))


class TestAutopsy(unittest.TestCase):
    def test_requires_evidence(self):
        with self.assertRaises(ValueError):
            StrategyAutopsy(strategy="s", failure_reason="drawdown", broken_assumptions=[],
                            regime_of_failure="high_volatility", earliest_warning_indicators=[],
                            lessons_learned=[], recommendations=[], evidence=[])

    def test_valid_autopsy(self):
        a = StrategyAutopsy(strategy="s", failure_reason="edge decayed",
                            broken_assumptions=["stationarity"], regime_of_failure="mean_reverting",
                            earliest_warning_indicators=["rising slippage"], lessons_learned=["monitor regime"],
                            recommendations=["add regime filter"], evidence=["exp_123"])
        self.assertTrue(a.id.startswith("autopsy_"))

    def test_derive_regime(self):
        d = derive_regime_of_failure([0.0] * 30 + [0.1])
        self.assertEqual(d["regime"], "event_driven")


class TestResearchMemory(unittest.TestCase):
    def _rec(self, **kw):
        base = dict(hypothesis="h", evidence=["e1"], dataset_version="fp123",
                    parameters={"p": 1}, results={"sharpe": 1.2},
                    statistical_validation={"p_value": 0.01}, decision="adopt",
                    lessons_learned=["l1"])
        base.update(kw); return ResearchRecord(**base)

    def test_append_only_and_supersede(self):
        mem = ResearchMemory()
        r1 = mem.record(self._rec())
        r2 = mem.supersede(r1.id, self._rec(decision="revise"))
        ids = [x.get("id") for x in mem.all()]
        self.assertIn(r1.id, ids)  # preserved
        self.assertIn(r2.id, ids)
        self.assertFalse(hasattr(mem.store, "update"))

    def test_requires_traceability(self):
        with self.assertRaises(ValueError):
            self._rec(dataset_version="")

    def test_by_dataset(self):
        mem = ResearchMemory(); mem.record(self._rec(dataset_version="fpX"))
        self.assertEqual(len(mem.by_dataset("fpX")), 1)


class TestSkeptic(unittest.TestCase):
    def test_challenge_has_all_questions(self):
        c = challenge("rsi edge is real")
        self.assertEqual(set(c["questions"].keys()), set(MANDATORY_QUESTIONS))

    def test_unanswered_rejected(self):
        ans = {q: "x" for q in MANDATORY_QUESTIONS}
        ans["falsification_test"] = ""  # blank one
        self.assertFalse(assess_challenge(ans)["passed"])

    def test_fully_answered_passes(self):
        ans = {q: "substantive answer" for q in MANDATORY_QUESTIONS}
        self.assertTrue(assess_challenge(ans)["passed"])


class TestReadiness(unittest.TestCase):
    def test_all_high_passes(self):
        s = {d: 0.9 for d in ("data_quality", "evidence_quality", "statistical_confidence",
                              "reproducibility", "robustness", "execution_readiness")}
        self.assertTrue(readiness_score(s)["passed"])

    def test_hard_gate_data_quality_zero_fails(self):
        s = {d: 0.9 for d in ("data_quality", "evidence_quality", "statistical_confidence",
                              "reproducibility", "robustness", "execution_readiness")}
        s["data_quality"] = 0.0
        r = readiness_score(s)
        self.assertFalse(r["passed"])
        self.assertIn("data_quality", r["hard_gate_failures"])

    def test_below_threshold_fails(self):
        s = {d: 0.5 for d in ("data_quality", "evidence_quality", "statistical_confidence",
                              "reproducibility", "robustness", "execution_readiness")}
        self.assertFalse(readiness_score(s, threshold=0.75)["passed"])

    def test_missing_dimension_raises(self):
        with self.assertRaises(ValueError):
            readiness_score({"data_quality": 1.0})


if __name__ == "__main__":
    unittest.main()
