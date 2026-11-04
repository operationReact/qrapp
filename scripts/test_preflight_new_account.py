#!/usr/bin/env python3
"""Network-rule safety tests for the read-only AWS preflight; no AWS access."""
import importlib.util
from pathlib import Path
import unittest

SOURCE = Path(__file__).resolve().with_name("preflight-new-account.py")
spec = importlib.util.spec_from_file_location("migration_preflight", SOURCE)
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)


class SecurityGroupRulesTest(unittest.TestCase):
    def test_public_ipv4_and_ipv6_ssh_forbidden(self):
        for ranges in (
            {"IpRanges": [{"CidrIp": "0.0.0.0/0"}]},
            {"Ipv6Ranges": [{"CidrIpv6": "::/0"}]},
        ):
            rule = {"IpProtocol": "tcp", "FromPort": 20, "ToPort": 22, **ranges}
            self.assertTrue(preflight.exposes_public_ssh(rule))

    def test_all_protocols_and_ports_forbidden(self):
        self.assertTrue(preflight.exposes_public_ssh({
            "IpProtocol": "-1", "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
        }))

    def test_normal_https_allowed(self):
        self.assertFalse(preflight.exposes_public_ssh({
            "IpProtocol": "tcp", "FromPort": 443, "ToPort": 443,
            "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
        }))

    def test_private_database_only_backend_group(self):
        allowed = {"sg-backend"}
        rule = {"IpProtocol": "tcp", "FromPort": 5432, "ToPort": 5432,
                "UserIdGroupPairs": [{"GroupId": "sg-backend"}]}
        self.assertTrue(preflight.approved_database_ingress(rule, allowed))
        for changes in [
            {"UserIdGroupPairs": [{"GroupId": "sg-other"}]},
            {"IpRanges": [{"CidrIp": "0.0.0.0/0"}]},
            {"Ipv6Ranges": [{"CidrIpv6": "::/0"}]},
            {"FromPort": 0, "ToPort": 65535},
            {"IpProtocol": "-1"},
            {"PrefixListIds": [{"PrefixListId": "pl-other"}]},
        ]:
            with self.subTest(changes=changes):
                self.assertFalse(preflight.approved_database_ingress(
                    {**rule, **changes}, allowed))

    def test_db_rule_requires_source_security_group(self):
        self.assertFalse(preflight.approved_database_ingress({
            "IpProtocol": "tcp", "FromPort": 5432, "ToPort": 5432
        }, {"sg-backend"}))


if __name__ == "__main__":
    unittest.main()
