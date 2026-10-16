#!/usr/bin/env bash
# Download the whole results Sheet as JSON (surveys, games, seats) to results/sheet.json.
# The read key is NOT in the repo: export DW_READ_KEY, or put it alone on one line in .secrets (gitignored).
set -euo pipefail
cd "$(dirname "$0")/.."
KEY="${DW_READ_KEY:-}"; [ -z "$KEY" ] && [ -f .secrets ] && KEY="$(head -n1 .secrets | tr -d '\r\n')"
[ -z "$KEY" ] && { echo "Set DW_READ_KEY or create .secrets with the READ_KEY" >&2; exit 1; }
EXEC="$(sed -n 's/.*sheet: *"\([^"]*\)".*/\1/p' assets/config.js)"
mkdir -p results
curl -fsSL -G "$EXEC" --data-urlencode "key=$KEY" -o results/sheet.json
python3 -c 'import json;d=json.load(open("results/sheet.json"));print({k:len(v) for k,v in d.items()},"-> results/sheet.json")'
