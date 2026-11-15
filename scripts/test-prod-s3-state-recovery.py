#!/usr/bin/env python3
"""Pure offline tests for Bro & Bro PROD recovery guardrails."""
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import runpy
functions = runpy.run_path(str(Path(__file__).resolve().parent / "inspect-prod-s3-state-recovery.py"))
TARGETS, lifecycle_matches, is_stale_failed_run_lock = (
    functions["TARGETS"], functions["lifecycle_matches"], functions["is_stale_failed_run_lock"])

class TestProdRecovery(unittest.TestCase):
    def test_all_expected_buckets(self):
        self.assertEqual(len(TARGETS), 3)
        self.assertEqual(len({t[0] for t in TARGETS}), 3)
        self.assertEqual(len({t[1] for t in TARGETS}), 3)

    def test_lifecycle_match(self):
        sample = {"Rules": [{"ID": "noncurrent-versions", "Status": "Enabled",
            "Filter": {"Prefix": ""},
            "NoncurrentVersionExpiration": {"NoncurrentDays": 30},
            "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}}]}
        self.assertTrue(lifecycle_matches(sample, "noncurrent-versions"))
        self.assertFalse(lifecycle_matches(sample, "expire-old-versions"))
        self.assertFalse(lifecycle_matches({"Rules": []}, "noncurrent-versions"))
        sample["Rules"][0]["Filter"] = {"Tag": {"Key": "bad", "Value": "filter"}}
        self.assertFalse(lifecycle_matches(sample, "noncurrent-versions"))
        sample["Rules"][0]["Filter"] = {}
        sample["Rules"][0]["NoncurrentVersionExpiration"]["NoncurrentDays"] = 29
        self.assertFalse(lifecycle_matches(sample, "noncurrent-versions"))

    def test_failed_apply_lock_fingerprint(self):
        good = {"ID": "b18b0a32-f6c1-428c-8b14-f65d97993c6f",
                "Operation": "OperationTypeApply",
                "Path": "broandbro-tfstate-098859530205-ap-south-1/env/prod/terraform.tfstate",
                "Created": "2026-11-15T12:08:02.000Z"}
        self.assertTrue(is_stale_failed_run_lock(good))
        for field, new in (("Operation", "OperationTypePlan"),
                           ("Path", "other-bucket/terraform.tfstate"),
                           ("Created", "2026-11-15T16:00:00Z"),
                           ("ID", "invalid")):
            wrong = dict(good, **{field:new})
            self.assertFalse(is_stale_failed_run_lock(wrong))

if __name__ == "__main__":
    unittest.main()
