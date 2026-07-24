"""Phase 1 — Data Integrity Engine tests."""
import unittest

from learning.data_integrity import validate_dataset, fingerprint


def bar(ts, price=100.0, vol=10.0, **kw):
    b = {"ts": ts, "open": price, "high": price, "low": price, "close": price, "volume": vol}
    b.update(kw)
    return b


class TestDataIntegrity(unittest.TestCase):
    def test_clean_dataset_accepted(self):
        bars = [bar(i * 60) for i in range(10)]
        r = validate_dataset(bars, interval_seconds=60)
        self.assertTrue(r["accepted"])
        self.assertEqual(r["issues"], [])
        self.assertEqual(len(r["fingerprint"]), 64)  # sha-256 hex

    def test_duplicate_timestamp_rejected(self):
        bars = [bar(0), bar(0)]
        r = validate_dataset(bars)
        self.assertFalse(r["accepted"])
        self.assertIn("duplicate_timestamp", r["critical_issue_kinds"])

    def test_out_of_order_rejected(self):
        bars = [bar(120), bar(60)]
        r = validate_dataset(bars)
        self.assertFalse(r["accepted"])
        self.assertIn("out_of_order", r["critical_issue_kinds"])

    def test_bad_tick_rejected(self):
        bad = {"ts": 0, "open": 10, "high": 5, "low": 8, "close": 9, "volume": 1}  # high<low
        r = validate_dataset([bad])
        self.assertFalse(r["accepted"])
        self.assertIn("bad_tick", r["critical_issue_kinds"])

    def test_missing_candle_detected_but_not_critical(self):
        bars = [bar(0), bar(180)]  # 60s interval -> 2 missing
        r = validate_dataset(bars, interval_seconds=60)
        self.assertTrue(r["accepted"])
        self.assertTrue(any(x["kind"] == "missing_candles" for x in r["issues"]))

    def test_corruption_rejected(self):
        r = validate_dataset([{"ts": 0, "open": None, "high": 1, "low": 1, "close": 1, "volume": 1}])
        self.assertFalse(r["accepted"])

    def test_fingerprint_changes_with_data(self):
        self.assertNotEqual(fingerprint([bar(0)]), fingerprint([bar(0, price=101.0)]))

    def test_timezone_inconsistency_flagged(self):
        bars = [bar(0, tz="+00:00"), bar(60, tz="+05:30")]
        r = validate_dataset(bars)
        self.assertTrue(any(x["kind"] == "timezone_inconsistency" for x in r["issues"]))


if __name__ == "__main__":
    unittest.main()
