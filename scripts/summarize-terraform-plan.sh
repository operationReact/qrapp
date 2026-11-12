#!/usr/bin/env bash
# Summarize a saved Terraform plan as Markdown and FAIL CLOSED on changes that
# break the production-only, cost-minimized topology:
#   * any delete/replace of the production database or state-bearing buckets
#   * a NAT gateway, load balancer, Auto Scaling group or extra DB instance
#   * more than one EC2 instance, RDS instance or CloudFront distribution
# Usage: summarize-terraform-plan.sh <saved-plan-file>   (run inside the TF dir)
# Offline test: summarize-terraform-plan.sh --json <plan.json>
set -euo pipefail

if [[ "${1:-}" == "--json" ]]; then
  PLAN_JSON="$(cat "$2")"
else
  PLAN_JSON="$(terraform show -json "$1")"
fi

jq -r '
  def act: (.change.actions | if . == ["delete","create"] or . == ["create","delete"] then "replace" else join(",") end);
  [.resource_changes[]? | select(.mode == "managed") | select(.change.actions != ["no-op"])] as $c
  | "## Terraform plan — production (account 098859530205)",
    "",
    "| Action | Count |", "|---|---|",
    ($c | group_by(act) | map("| \(.[0] | act) | \(length) |") | .[]),
    "",
    "<details><summary>Resource-by-resource changes</summary>",
    "",
    "| Action | Address |", "|---|---|",
    ($c | sort_by(.address) | map("| \(act) | `\(.address)` |") | .[]),
    "",
    "</details>"
' <<<"$PLAN_JSON"

FAIL=0
violation() { echo; echo "**BLOCKED:** $1"; echo "::error::$1" >&2; FAIL=1; }

# Count resources that will exist after apply (planned values, all modules).
count_type() {
  jq --arg t "$1" '[.. | objects | select(has("resources")) | .resources[]? | select(.mode == "managed" and .type == $t)] | length' \
    <<<"$(jq '.planned_values.root_module // {}' <<<"$PLAN_JSON")"
}

for t in aws_instance aws_db_instance aws_cloudfront_distribution; do
  n="$(count_type "$t")"
  [[ "$n" -le 1 ]] || violation "$n x $t planned; production-only topology allows at most one."
done
for t in aws_nat_gateway aws_lb aws_alb aws_autoscaling_group aws_rds_cluster aws_eks_cluster; do
  n="$(count_type "$t")"
  [[ "$n" -eq 0 ]] || violation "$t planned; not part of the approved low-cost topology."
done

DESTRUCTIVE="$(jq -r '
  .resource_changes[]? | select(.mode == "managed")
  | select(.type == "aws_db_instance" or .type == "aws_s3_bucket" or .type == "aws_route53_zone")
  | select(.change.actions | index("delete"))
  | .address' <<<"$PLAN_JSON")"
if [[ -n "$DESTRUCTIVE" ]]; then
  violation "plan deletes/replaces state-bearing resources: $(tr '\n' ' ' <<<"$DESTRUCTIVE")"
fi

if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi
echo
echo "Topology guard passed: <=1 EC2, <=1 RDS, <=1 CloudFront, no NAT/LB/ASG, no database or bucket deletion."
