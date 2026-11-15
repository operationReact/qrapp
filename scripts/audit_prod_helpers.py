"""Pure helpers shared by state-recovery scripts (no AWS or secrets)."""
import json

def state_addresses(state):
    out = set()
    for resource in state.get("resources", []):
        if resource.get("mode", "managed") != "managed":
            continue
        prefix = resource.get("module", "")
        base = (prefix + "." if prefix else "") + resource["type"] + "." + resource["name"]
        for inst in resource.get("instances", []):
            if "index_key" not in inst:
                out.add(base)
            else:
                key = inst["index_key"]
                out.add(base + "[" + (json.dumps(key) if isinstance(key, str) else str(key)) + "]")
    return out
