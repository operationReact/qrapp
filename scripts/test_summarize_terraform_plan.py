"""Offline tests for scripts/summarize-terraform-plan.sh (needs bash + jq)."""
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("summarize-terraform-plan.sh")


def resource(rtype, name, actions=("create",)):
    address = f"module.m.{rtype}.{name}"
    return (
        {"address": address, "mode": "managed", "type": rtype, "name": name, "values": {}},
        {"address": address, "mode": "managed", "type": rtype, "name": name,
         "change": {"actions": list(actions)}},
    )


def plan(*resources):
    return {
        "planned_values": {"root_module": {"child_modules": [
            {"address": "module.m", "resources": [r[0] for r in resources]}
        ]}},
        "resource_changes": [r[1] for r in resources],
    }


@unittest.skipUnless(shutil.which("jq") and shutil.which("bash"), "jq/bash required")
class SummarizePlanTest(unittest.TestCase):
    def run_plan(self, data):
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(data, f)
        return subprocess.run(["bash", str(SCRIPT), "--json", f.name],
                              capture_output=True, text=True, check=False)

    def test_single_prod_stack_passes(self):
        result = self.run_plan(plan(
            resource("aws_instance", "backend"),
            resource("aws_db_instance", "this"),
            resource("aws_cloudfront_distribution", "this"),
            resource("aws_s3_bucket", "ui"),
        ))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Topology guard passed", result.stdout)
        self.assertIn("`module.m.aws_db_instance.this`", result.stdout)

    def test_second_ec2_is_blocked(self):
        result = self.run_plan(plan(resource("aws_instance", "a"), resource("aws_instance", "b")))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("aws_instance", result.stdout)

    def test_nat_gateway_is_blocked(self):
        result = self.run_plan(plan(resource("aws_nat_gateway", "this")))
        self.assertNotEqual(result.returncode, 0)

    def test_database_replacement_is_blocked(self):
        result = self.run_plan(plan(resource("aws_db_instance", "this", ("delete", "create"))))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("replace", result.stdout)

    def test_bucket_deletion_is_blocked(self):
        result = self.run_plan(plan(resource("aws_s3_bucket", "media", ("delete",))))
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
