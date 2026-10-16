#!/usr/bin/env bash
# Pull everything the ntfy relay still holds (it keeps ~12 h) and merge it into results/relay.jsonl.
# One line per record id, LAST WRITE WINS: a player who adds detail after submitting re-sends the same id with update:true,
# and the newer version replaces the older one.
set -euo pipefail
OUT="${1:-results/relay.jsonl}"; mkdir -p "$(dirname "$OUT")"; touch "$OUT"
curl -fsS "https://ntfy.sh/dwpt-7f6b2541b2f338e6ae42/json?poll=1&since=all" | python3 -c '
import sys,json
out=sys.argv[1]; recs={}
for l in open(out):
    try: r=json.loads(l); recs[r["id"]]=r
    except Exception: pass
n=u=0
for l in sys.stdin:
    m=json.loads(l)
    if m.get("event")!="message": continue
    try: r=json.loads(m["message"])
    except Exception: continue
    if r["id"] in recs:
        if recs[r["id"]]!=r: u+=1
    else: n+=1
    recs[r["id"]]=r          # relay messages arrive oldest to newest, so the last one wins
with open(out,"w") as f:
    for r in recs.values(): f.write(json.dumps(r)+"\n")
print("added",n,"updated",u,"total",len(recs),"->",out)' "$OUT"
