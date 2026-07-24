#!/usr/bin/env python3
"""Runnable example of one full learning cycle on SYNTHETIC data.

  python3 examples/example_cycle.py     (run from the package root)

The numbers here are a synthetic fixture to demonstrate the machinery — NOT a
claim about any real market. The Lesson Ledger starts empty; a lesson is
recorded only after the evidence passes the out-of-sample gate.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from learning import (  # noqa: E402
    ObservationEngine, ReflectionEngine, EvidenceEngine, LessonLedger,
    PolicyEvolutionEngine, Lesson, score_confidence,
)


def arr(mean, n, spread=0.1):
    return [mean + spread * ((i % 5) - 2) for i in range(n)]


def main() -> None:
    obs = ObservationEngine()
    for i in range(60):
        obs.capture("paper_trade", {"pnl": 1.0, "rsi": 1.0 + (i % 3) * 0.1}, "sim")
    for i in range(60):
        obs.capture("paper_trade", {"pnl": -1.0, "rsi": 0.0 + (i % 3) * 0.1}, "sim")
    print(f"[observe]   captured {len(obs.all())} observations (no conclusions)")

    hyps = ReflectionEngine().hypotheses_from_trades(obs.of_kind("paper_trade"), ["rsi"])
    print(f"[reflect]   {len(hyps)} hypothesis(es) PROPOSED (not facts): {hyps[0].statement}")

    res, hyp = EvidenceEngine(min_sample=60).test_feature_hypothesis(
        hyps[0],
        in_sample_winners=arr(1.0, 90), in_sample_losers=arr(0.0, 90),
        oos_winners=arr(1.0, 90), oos_losers=arr(0.0, 90), regimes_covered=["trend"])
    print(f"[test]      p={res.p_value:.2e} effect={res.effect_size:.2f} "
          f"in_sample={res.in_sample_passed} oos={res.out_of_sample_passed} "
          f"-> hypothesis is now {hyp.state.upper()}")
    print(f"[validate]  accepted={res.passed} ({res.reason})")
    if not res.passed:
        print("            -> no lesson recorded; failures are preserved, not hidden.")
        return

    conf = score_confidence(p_value=res.p_value, effect_size=res.effect_size,
                            sample_size=res.sample_size,
                            out_of_sample_passed=res.out_of_sample_passed,
                            regimes_covered=1, regimes_total=3)
    led = LessonLedger()
    lesson = led.record(Lesson(
        strategy="rsi_edge", market="NSE", market_regime="trend",
        confidence_score=conf["score"], evidence_summary=res.reason,
        supporting_statistics={"p_value": res.p_value, "components": conf["components"]},
        contradicting_evidence="none in this synthetic sample",
        source_experiment_ids=[res.id]))
    print(f"[record]    lesson {lesson.id} confidence={conf['score']} "
          f"(reproducibility={conf['components']['reproducibility']})")

    pol = PolicyEvolutionEngine()
    rec = pol.recommend(description="prefer entries when rsi elevated",
                        target="signal_filter_rsi_threshold",
                        expected_benefit="raise expectancy", potential_risks="regime dependence",
                        rollback_plan="revert to prior committed threshold",
                        confidence=conf["score"], lessons=[lesson])
    print(f"[recommend] {rec.id} protected_zone={rec.touches_protected_zone} "
          f"requires_founder_approval={rec.requires_founder_approval}")

    protected = pol.recommend(description="raise daily loss limit", target="daily_loss_limit",
                              expected_benefit="more exposure", potential_risks="capital risk",
                              rollback_plan="restore limit", confidence=conf["score"],
                              lessons=[lesson])
    print(f"[guard]     protected recommendation {protected.id} -> "
          f"requires_founder_approval={protected.requires_founder_approval} "
          f"(cannot auto-apply)")


if __name__ == "__main__":
    main()
