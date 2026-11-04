#!/usr/bin/env bash
# Idempotent GitHub environment branch restrictions for AWS account migration.
# Requires authenticated gh CLI with repository Administration(write) rights.
set -euo pipefail
REPO="$1"
[[ "$REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || {
  echo "Usage: configure-github-environments.sh OWNER/REPO" >&2; exit 2;
}
command -v gh >/dev/null || exit 1
command -v python3 >/dev/null || exit 1
gh auth status >/dev/null 2>&1 || { echo "GitHub CLI authentication required" >&2; exit 1; }
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for ENV in dev prod; do
  if [[ "$ENV" == dev ]]; then BRANCH=dev; else BRANCH=main; fi
  if ! gh api "repos/$REPO/environments/$ENV" > "$TMP/current.json" 2>/dev/null; then
    printf '{}' > "$TMP/current.json"
  fi

  # Preserve existing reviewers and wait timers; refuse unknown protection rules.
  python3 - "$TMP/current.json" "$TMP/payload.json" <<'PY'
import json,sys
with open(sys.argv[1],encoding="utf-8") as f: current=json.load(f)
rules=current.get("protection_rules") or []
unexpected=[r.get("type") for r in rules
            if r.get("type") not in ("branch_policy","wait_timer","required_reviewers")]
if unexpected:
    raise SystemExit("Refusing unknown environment protection rules: "+str(unexpected))
payload={"deployment_branch_policy":{"protected_branches":False,"custom_branch_policies":True}}
for rule in rules:
    if rule["type"]=="wait_timer":
        payload["wait_timer"]=rule["wait_timer"]
    if rule["type"]=="required_reviewers":
        payload["prevent_self_review"]=rule.get("prevent_self_review",False)
        payload["reviewers"]=[{"type":r["type"],"id":r["reviewer"]["id"]}
                              for r in rule.get("reviewers",[]) if "reviewer" in r]
with open(sys.argv[2],"w",encoding="utf-8") as f: json.dump(payload,f)
PY
  gh api -X PUT "repos/$REPO/environments/$ENV" \
    --input "$TMP/payload.json" >/dev/null

  # Custom deployment policies allow only the exact expected branch.
  gh api "repos/$REPO/environments/$ENV/deployment-branch-policies?per_page=100" \
    > "$TMP/policies.json"
  python3 - "$TMP/policies.json" "$BRANCH" > "$TMP/changes.tsv" <<'PY'
import json,sys
with open(sys.argv[1],encoding="utf-8") as f: x=json.load(f)
existing=x.get("branch_policies") or []
if len(existing)>=100: raise SystemExit("Refusing to change truncated branch policy list")
desired=sys.argv[2]
for policy in existing:
    if policy["name"]!=desired: print("delete",policy["id"],sep="\t")
if not any(p["name"]==desired for p in existing): print("create",desired,sep="\t")
PY
  while IFS="$(printf '\t')" read -r ACTION VALUE; do
    case "$ACTION" in
      delete)
        gh api -X DELETE \
          "repos/$REPO/environments/$ENV/deployment-branch-policies/$VALUE" >/dev/null
        ;;
      create)
        gh api -X POST \
          "repos/$REPO/environments/$ENV/deployment-branch-policies" \
          -f name="$VALUE" -f type="branch" >/dev/null
        ;;
      *) echo "Unexpected environment operation" >&2; exit 1 ;;
    esac
  done < "$TMP/changes.tsv"

  gh api "repos/$REPO/environments/$ENV" > "$TMP/verified.json"
  gh api "repos/$REPO/environments/$ENV/deployment-branch-policies?per_page=100" \
    > "$TMP/policies.json"
  python3 - "$TMP/verified.json" "$TMP/policies.json" "$BRANCH" <<'PY'
import json,sys
with open(sys.argv[1],encoding="utf-8") as f: cfg=json.load(f)
with open(sys.argv[2],encoding="utf-8") as f: policies=json.load(f)
actual=cfg.get("deployment_branch_policy") or {}
assert actual.get("custom_branch_policies") is True
assert actual.get("protected_branches") is False
names=[x["name"] for x in policies.get("branch_policies") or []]
assert names==[sys.argv[3]], f"Unsafe deployment branches: {names}"
print("GitHub environment restricts deployments to branch:",sys.argv[3])
PY
done
