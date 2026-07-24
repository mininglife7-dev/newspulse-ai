"""Walk-forward window generator — leakage-safe BY CONSTRUCTION.

Purpose: the reference implementation to audit VAJRA's Walk-Forward
Optimization against (Priority 2). It generates train/test index windows that
are guaranteed to have:
  * no overlap between train and test,
  * test strictly AFTER train (no look-ahead),
  * every index within bounds.

Windows are half-open [start, end). Rolling or anchored. Property/regression
tests enforce these invariants.
"""
from __future__ import annotations

from dataclasses import dataclass


class WalkForwardError(ValueError):
    """Raised when a walk-forward invariant is violated."""


@dataclass(frozen=True)
class Window:
    train_start: int
    train_end: int   # exclusive; also the test start (contiguous, no gap, no overlap)
    test_start: int
    test_end: int     # exclusive

    def validate(self, n: int) -> None:
        # Explicit raises (NOT assert): asserts are stripped under `python -O`,
        # which would silently disable this leakage-safety check. (Self-audit
        # Day 2, Probe 4.)
        if not (0 <= self.train_start < self.train_end):
            raise WalkForwardError("empty/invalid train window")
        if self.train_end > self.test_start:
            raise WalkForwardError("look-ahead: test window is not strictly after train")
        if not (self.test_start < self.test_end <= n):
            raise WalkForwardError("test window out of bounds")


def generate_windows(n: int, *, train_size: int, test_size: int,
                     step: int | None = None, anchored: bool = False) -> list[Window]:
    """Generate walk-forward windows over `n` observations.

    rolling (default): train window slides forward by `step` (default=test_size).
    anchored: train always starts at 0 and grows; test rolls forward.
    Returns [] when there is not enough data for even one window.
    """
    if train_size <= 0 or test_size <= 0:
        raise ValueError("train_size and test_size must be positive")
    step = step or test_size
    if step <= 0:
        raise ValueError("step must be positive")

    windows: list[Window] = []
    test_start = train_size
    while test_start + test_size <= n:
        train_start = 0 if anchored else test_start - train_size
        w = Window(train_start=train_start, train_end=test_start,
                   test_start=test_start, test_end=test_start + test_size)
        w.validate(n)  # fail fast if an invariant is ever violated
        windows.append(w)
        test_start += step
    return windows
