"""Phase 1 — Data Integrity Engine.

Verify every dataset BEFORE any experiment. Invalid datasets are rejected, not
silently used. Produces a report with a SHA-256 fingerprint so an experiment is
forever tied to the exact bytes it ran on.

Bar contract: dict with int `ts` (epoch seconds), numeric open/high/low/close,
non-negative `volume`. Optional per-bar `tz` (offset string). Interval (seconds)
enables missing-candle detection.
"""
from __future__ import annotations

import hashlib
import json
import math
from typing import Any, Sequence

_CRITICAL = {"corruption", "bad_tick", "duplicate_timestamp", "out_of_order"}
_REQUIRED = ("ts", "open", "high", "low", "close", "volume")


def _is_num(x: Any) -> bool:
    return isinstance(x, (int, float)) and not (isinstance(x, float) and math.isnan(x))


def fingerprint(bars: Sequence[dict]) -> str:
    return hashlib.sha256(
        json.dumps(bars, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()


def validate_dataset(bars: Sequence[dict], *, interval_seconds: int | None = None,
                     session: tuple[int, int] | None = None,
                     holidays_epoch_days: set[int] | None = None) -> dict:
    """Return an integrity report: {accepted, issues[], fingerprint, n}."""
    issues: list[dict] = []

    def add(kind: str, idx: int | None, detail: str) -> None:
        issues.append({"kind": kind, "index": idx, "detail": detail})

    prev_ts = None
    seen_ts: set = set()
    tzs: set = set()
    for i, b in enumerate(bars):
        # corruption / required fields
        if any(k not in b or b[k] is None for k in _REQUIRED):
            add("corruption", i, "missing/None required field"); continue
        if not all(_is_num(b[k]) for k in ("ts", "open", "high", "low", "close", "volume")):
            add("corruption", i, "non-numeric field / NaN"); continue
        o, h, l, c, v, ts = b["open"], b["high"], b["low"], b["close"], b["volume"], b["ts"]
        # bad tick
        if h < l or not (l <= o <= h) or not (l <= c <= h) or min(o, h, l, c) <= 0 or v < 0:
            add("bad_tick", i, f"OHLC/volume invalid: o={o} h={h} l={l} c={c} v={v}")
        # duplicate / order
        if ts in seen_ts:
            add("duplicate_timestamp", i, f"ts={ts} repeats")
        seen_ts.add(ts)
        if prev_ts is not None:
            if ts < prev_ts:
                add("out_of_order", i, f"ts={ts} < prev={prev_ts}")
            elif interval_seconds and (ts - prev_ts) > interval_seconds and (ts - prev_ts) % interval_seconds == 0:
                missing = (ts - prev_ts) // interval_seconds - 1
                add("missing_candles", i, f"{missing} missing candle(s) before ts={ts}")
            elif interval_seconds and (ts - prev_ts) % interval_seconds != 0:
                add("interval_mismatch", i, f"gap {ts - prev_ts}s not a multiple of {interval_seconds}s")
        if "tz" in b:
            tzs.add(b["tz"])
        if session is not None:
            tod = ts % 86400
            if not (session[0] <= tod <= session[1]):
                add("session_violation", i, f"time-of-day {tod}s outside session {session}")
        if holidays_epoch_days is not None and (ts // 86400) in holidays_epoch_days:
            add("calendar_mismatch", i, f"bar on a holiday (epoch-day {ts // 86400})")
        prev_ts = ts

    if len(tzs) > 1:
        add("timezone_inconsistency", None, f"mixed tz values: {sorted(tzs)}")

    accepted = not any(x["kind"] in _CRITICAL for x in issues)
    return {"accepted": accepted, "n": len(bars), "issues": issues,
            "fingerprint": fingerprint(bars),
            "critical_issue_kinds": sorted({x["kind"] for x in issues if x["kind"] in _CRITICAL})}
