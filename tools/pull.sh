#!/usr/bin/env bash
# Pull everything the ntfy relay still holds (it keeps ~12 h) and merge it, de-duplicated by id, into results/relay.jsonl
set -euo pipefail
OUT="${1:-results/relay.jsonl}"; mkdir -p "$(dirname "$OUT")"; touch "$OUT"
curl -fsS "https://ntfy.sh/dwpt-7f6b2541b2f338e6ae42/json?poll=1&since=all" | python3 -c '
import sys,json
seen=set(); out=sys.argv[1]
for l in open(out):
    try: seen.add(json.loads(l)["id"])
    except Exception: pass
n=0
with open(out,"a") as f:
    for l in sys.stdin:
        m=json.loads(l)
        if m.get("event")!="message": continue
        try: r=json.loads(m["message"])
        except Exception: continue
        if r.get("id") in seen: continue
        seen.add(r["id"]); f.write(json.dumps(r)+"\n"); n+=1
print("added",n,"records ->",out)' "$OUT"
