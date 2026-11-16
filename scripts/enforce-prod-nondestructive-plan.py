#!/usr/bin/env python3
"""Fail-closed, secret-redacting policy gate on a Terraform plan JSON.

Read only: accepts `terraform show -json tfplan` from stdin; never logs
values, outputs, sensitive metadata or full plan contents.
Production-only migration may create resources but not replace, delete, or
mutate pre-existing ones without a separate reviewed change procedure.
"""
import json
import sys


def audit_plan(plan):
    if not isinstance(plan, dict) or not isinstance(plan.get("resource_changes"), list):
        raise ValueError("plan lacks resource_changes")
    creates = 0
    unexpected = []
    for resource in plan["resource_changes"]:
        name = resource.get("address")
        change = resource.get("change")
        if not isinstance(name, str) or not isinstance(change, dict):
            raise ValueError("resource entry malformed")
        actions = change.get("actions")
        if actions == ["create"]:
            creates += 1
        elif actions not in (["no-op"], ["read"]):
            unexpected.append((name, actions))
    return creates, unexpected


def main():
    try:
        creates, unexpected = audit_plan(json.load(sys.stdin))
    except (ValueError, TypeError, KeyError, json.JSONDecodeError):
        print("APPLY BLOCKED: unable to safely inspect Terraform plan action summary")
        return 2
    print(f"PRODUCTION APPLY SAFETY: {creates} resource additions, "
          f"{len(unexpected)} unsupported changes/deletes/replacements")
    for address, actions in unexpected:
        # Address is not a value/secret; do not print the plan or resource attributes.
        print("PLAN BLOCKER: " + address + " actions=" + str(actions))
    if unexpected:
        print("APPLY BLOCKED: non-creation Terraform changes require separate review")
        return 1
    print("PLAN ACTIONS ACCEPTED: no planned update, delete or replacement")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
