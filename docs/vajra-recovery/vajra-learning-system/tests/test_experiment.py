"""Experiment framework + evidence-infrastructure tests."""
import unittest

from learning.experiment import (
    Experiment, ExperimentLedger, EvidenceLedger, DecisionLedger,
)


def _exp(**kw):
    base = dict(
        hypothesis="rsi edge exists in trend regime",
        objective="measure expectancy uplift from rsi filter",
        data_requirements=">=200 paper trades, in+out of sample",
        metrics=["sharpe", "expectancy", "max_drawdown"],
        success_criteria="OOS expectancy > 0 at p<0.05",
        failure_criteria="OOS not significant or drawdown worsens",
        rollback_plan="revert filter threshold to committed value",
        evidence_plan="record all trades to Evidence Ledger",
        verification_plan="recompute metrics with the oracle; walk-forward split",
    )
    base.update(kw)
    return Experiment(**base)


class TestExperimentPreRegistration(unittest.TestCase):
    def test_valid_experiment(self):
        e = _exp()
        self.assertEqual(e.status, "registered")

    def test_missing_rollback_rejected(self):
        with self.assertRaises(ValueError):
            _exp(rollback_plan="   ")

    def test_missing_metrics_rejected(self):
        with self.assertRaises(ValueError):
            _exp(metrics=[])


class TestLedgersAppendOnly(unittest.TestCase):
    def test_experiment_ledger_records(self):
        led = ExperimentLedger()
        led.register(_exp())
        self.assertEqual(len(led), 1)
        self.assertFalse(hasattr(led.store, "update"))
        self.assertFalse(hasattr(led.store, "delete"))

    def test_all_four_ledgers_are_distinct_and_appendable(self):
        exp, ev, dec = ExperimentLedger(), EvidenceLedger(), DecisionLedger()
        exp.register(_exp())
        ev.record({"id": "evd_1", "experiment_id": "exp_x", "result": "supported"})
        dec.record({"id": "dec_1", "decision": "adopt", "evidence": ["evd_1"]})
        self.assertEqual((len(exp), len(ev), len(dec)), (1, 1, 1))
        self.assertEqual((exp.name, ev.name, dec.name),
                         ("experiment", "evidence", "decision"))


if __name__ == "__main__":
    unittest.main()
