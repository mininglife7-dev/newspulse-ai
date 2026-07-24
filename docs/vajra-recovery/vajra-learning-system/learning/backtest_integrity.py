"""Phase 2 — Backtest Integrity Engine.

Audits a DECLARATIVE backtest specification for the classic bias red flags and
produces a Backtest Integrity Report. It checks what the caller declares — it
does NOT claim to audit backtest code it cannot read (that stays OUT OF SCOPE
until the code is available). Every flag cites the spec field that triggered it.
"""
from __future__ import annotations

from typing import Any

SEVERITY = {"look_ahead_bias": "critical", "data_leakage": "critical",
            "future_information": "critical", "survivorship_bias": "high",
            "no_commission_model": "high", "no_slippage_model": "high",
            "execution_timing": "high", "position_sizing_inconsistency": "medium"}


def check_backtest(spec: dict[str, Any]) -> dict:
    """spec keys (all optional; absence is itself flagged where it matters):
      signal.bar_index, execution.bar_index, execution.fill_price
      features.max_reference_index, features.references_future
      universe.survivorship_free
      costs.commission_per_trade | costs.commission_model
      costs.slippage_model
      trades: [{size, ...}], position.max_size
    """
    flags: list[dict] = []

    def flag(kind: str, detail: str) -> None:
        flags.append({"kind": kind, "severity": SEVERITY.get(kind, "info"), "detail": detail})

    sig = spec.get("signal", {}) or {}
    exe = spec.get("execution", {}) or {}
    feats = spec.get("features", {}) or {}
    costs = spec.get("costs", {}) or {}
    uni = spec.get("universe", {}) or {}

    # look-ahead: execution must be strictly AFTER the signal bar
    if "bar_index" in sig and "bar_index" in exe and exe["bar_index"] <= sig["bar_index"]:
        flag("look_ahead_bias",
             f"execution bar {exe['bar_index']} not after signal bar {sig['bar_index']}")
    if exe.get("fill_price") == "signal_bar_close" and exe.get("bar_index", 0) == sig.get("bar_index", -1):
        flag("execution_timing", "fills at the same bar's close the signal was computed on")

    # data leakage / future information
    if feats.get("references_future") is True:
        flag("future_information", "features.references_future declared True")
    if "max_reference_index" in feats and "bar_index" in sig and feats["max_reference_index"] > sig["bar_index"]:
        flag("data_leakage",
             f"feature references index {feats['max_reference_index']} > decision bar {sig['bar_index']}")

    # survivorship
    if uni.get("survivorship_free") is not True:
        flag("survivorship_bias", "universe.survivorship_free is not True (delisted names may be excluded)")

    # costs
    if not costs.get("commission_model") and not (costs.get("commission_per_trade", 0) > 0):
        flag("no_commission_model", "no commission model and commission_per_trade <= 0")
    if not costs.get("slippage_model"):
        flag("no_slippage_model", "no slippage model declared")

    # position sizing consistency
    trades = spec.get("trades") or []
    max_size = (spec.get("position") or {}).get("max_size")
    if max_size is not None:
        bad = [i for i, t in enumerate(trades) if t.get("size", 0) > max_size]
        if bad:
            flag("position_sizing_inconsistency",
                 f"{len(bad)} trade(s) exceed declared max_size={max_size}")

    critical = [f for f in flags if f["severity"] == "critical"]
    return {"trustworthy": not critical, "n_flags": len(flags), "flags": flags,
            "critical": [f["kind"] for f in critical],
            "note": "audits declared spec only; backtest source code is OUT OF SCOPE until readable"}
