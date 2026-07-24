"""Walk-forward audit tests — no leakage, no look-ahead, correct windows."""
import unittest

from learning.walkforward import generate_windows, Window, WalkForwardError


class TestWalkForwardInvariants(unittest.TestCase):
    def test_no_lookahead_and_no_overlap(self):
        wins = generate_windows(100, train_size=40, test_size=10)
        self.assertTrue(wins)
        for w in wins:
            # test strictly after train, contiguous, no overlap
            self.assertLessEqual(w.train_end, w.test_start)
            self.assertLess(w.train_start, w.train_end)
            self.assertLess(w.test_start, w.test_end)
            # disjoint index sets
            train = set(range(w.train_start, w.train_end))
            test = set(range(w.test_start, w.test_end))
            self.assertEqual(train & test, set())

    def test_windows_in_bounds(self):
        n = 95
        for w in generate_windows(n, train_size=30, test_size=15):
            self.assertLessEqual(w.test_end, n)
            self.assertGreaterEqual(w.train_start, 0)

    def test_rolling_step_default_is_test_size(self):
        wins = generate_windows(100, train_size=40, test_size=10)
        starts = [w.test_start for w in wins]
        self.assertEqual(starts, list(range(40, 91, 10)))

    def test_anchored_train_starts_at_zero(self):
        for w in generate_windows(100, train_size=40, test_size=10, anchored=True):
            self.assertEqual(w.train_start, 0)

    def test_insufficient_data_returns_empty(self):
        self.assertEqual(generate_windows(20, train_size=40, test_size=10), [])

    def test_invalid_sizes_raise(self):
        with self.assertRaises(ValueError):
            generate_windows(100, train_size=0, test_size=10)
        with self.assertRaises(ValueError):
            generate_windows(100, train_size=10, test_size=-1)

    def test_window_self_validation_catches_lookahead(self):
        bad = Window(train_start=0, train_end=50, test_start=40, test_end=60)  # overlap
        # Explicit exception (subclass of ValueError), NOT assert — so it is not
        # stripped under `python -O`. (Day 2 self-audit, Probe 4.)
        with self.assertRaises(WalkForwardError):
            bad.validate(100)
        self.assertTrue(issubclass(WalkForwardError, ValueError))


if __name__ == "__main__":
    unittest.main()
